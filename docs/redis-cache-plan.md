# Plan de caché con Redis (Upstash) para Reisbloc

> Estado: **DISEÑO — no implementado en esta rama.**
> Esta rama solo deja el diseño listo para revisar. La implementación
> (Edge Function + cliente) es el siguiente paso y va en otra rama.
> El mismo esquema se aplicará después a los libros de Grow Together,
> que tendrán muchos usuarios y el mismo riesgo de egress.

## 1. Problema y objetivo

La org Supabase Reisbloc se pasó de cuota (7.78 GB de 5.5 GB de egress
en el ciclo). El throttle de 5 minutos y la compresión de fotos bajan el
consumo, pero cada lectura de catálogo sigue pegándole a Postgres: cada
terminal, cada visita a la tienda web y cada evento Realtime es una
query completa. Redis va **por debajo de la base de datos** como capa
de lectura: lo que ya se leyó una vez y no cambió, se sirve desde
caché sin tocar Supabase.

Meta: que el catálogo (lo más pesado y lo más leído) se lea de Postgres
una vez cada varios minutos por organización, no una vez por terminal,
por visita o por evento.

## 2. Dónde va Redis

```
POS / Tienda web
   │  (nunca hablan directo con Redis)
   ▼
Edge Function `catalog-cache` (Supabase, Deno)
   │  GET key → hit: responde desde Redis
   │  MISS: lee Supabase → SET con TTL → responde
   ▼
Upstash Redis (REST API)            Supabase Postgres
```

Regla dura: **el token de Upstash NUNCA va al front.** El front
(Vite) y la app móvil solo llaman a la Edge Function. La Edge Function
guarda `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN` como
secrets de Supabase. Se usa la REST API de Upstash (HTTP), no TCP:
funciona en Edge Functions sin pool de conexiones.

## 3. Qué se cachea

| Dato | Clave | TTL inicial | Notas |
|---|---|---|---|
| Catálogo público (tienda web) por org | `reisbloc:{org}:catalog:public:v1` | 600 s (10 min) | JSON del RPC `get_public_storefront_catalog` |
| Catálogo interno POS por org | `reisbloc:{org}:catalog:pos:v1` | 300 s (5 min) | Mismo intervalo que el throttle que ya existe |
| Ficha de producto | `reisbloc:{org}:product:{id}` | 900 s (15 min) | Solo lectura por id |
| Resultado del storefront por org | `reisbloc:{org}:storefront:v1` | 600 s | Si se separa del catálogo público |

Los TTL son puntos de partida: se ajustan con el dashboard de
Supabase (egress por servicio) y con el de Upstash (comandos/día).
Los valores se guardan como **string JSON** (un catálogo típico anda
en ~300 KB; el límite por request de Upstash Free es 10 MB, sobra).

## 4. Qué NO se cachea

- **Stock en tiempo real para cobrar:** el stock que se descuenta en
  una venta se lee de Postgres, no de Redis. El catálogo cacheado
  puede mostrar stock de hace hasta 5 minutos; la venta valida stock
  contra la base (el RPC `update_retail_stock_batch` ya lo hace).
- **Pagos, cobros y terminales:** nada de Clip/Mercado Pago pasa por caché.
- **Sesiones y Auth:** nunca en Redis (o solo con TTL corto y sin
  datos sensibles, fuera de este plan).
- **Datos por usuario/cliente:** saldos, deudas, apartados, historial.
  El caché es por organización, nunca por usuario.
- **Reportes y cierres:** se calculan contra la base.
- **Tickets:** se generan y se comparten; no se cachea el PDF/JPEG.
- **Fotos (bytes):** Redis guarda URLs, no los archivos. Los bytes de
  las fotos los sirve Storage (con la compresión a ~100 KB de esta
  rama) y, en fase posterior, un CDN delante.

## 5. Lectura (cache-aside)

1. La Edge Function hace `GET` de la clave.
2. **Hit:** responde el JSON tal cual (1 comando Redis).
3. **Miss:** lee Supabase, hace `SET key <json> EX <ttl>` y responde.
4. Si Supabase falla en un miss, se responde el último valor aunque
   esté vencido solo si existe (stale-while-revalidate opcional, fase 2).

**Estampida (thundering herd):** si el TTL vence y llegan 10
terminales a la vez, las 10 pegan a Postgres. Fase 1 lo acepta (el
volumen es bajo y el TTL es corto). Fase 2: lock corto con
`SET lock:{key} NX EX 10` — quien lo toma regenera, los demás esperan
100 ms y reintentan el GET, y si no hay valor, leen directo de
Postgres sin cachear.

## 6. Escritura e invalidación

Redis no es fuente de verdad: todo se reconstruye desde Postgres.
Cada escritura que cambia el catálogo **borra** las claves del org:

| Evento | Acción |
|---|---|
| Crear / editar / eliminar producto | `DEL reisbloc:{org}:catalog:public:v1 reisbloc:{org}:catalog:pos:v1` + `DEL reisbloc:{org}:product:{id}` |
| Venta (mueve stock) | `DEL` de las dos claves de catálogo del org |
| Cambio de precio | Igual que editar producto |
| Cambio de imágenes | Igual que editar producto |

Dónde se hace (fase 1): en los mismos servicios que ya mutan
(`supabaseService.createRetailProduct/update/delete` y la venta),
llamando a la Edge Function `catalog-cache/invalidate` con
`{ org, productId? }`. La Edge Function es la única que habla con
Redis, así el front no necesita el token ni para invalidar.

Fase 2 (opcional): trigger de Postgres + `pg_net` que avisa a la
Edge Function en cada cambio de `retail_products`. Más automático,
pero es otro componente que operar; solo si la invalidación manual
se olvida en algún flujo.

## 7. Conexión con Upstash (lo que ya tiene Daniel)

- Daniel ya tiene cuenta de Upstash (Redis serverless, acceso con
  Google). En la consola de Upstash se crea una base Redis y se copian
  **REST URL** y **REST TOKEN** (no la contraseña TCP).
- Secrets en Supabase (Dashboard → Edge Functions → Secrets):
  `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.
- Desde la Edge Function (Deno) se usa `fetch` directo a la REST API
  (`POST {url}/get/{key}`, `POST {url}/set/{key}/{valor}`) o el SDK
  `@upstash/redis`, que funciona en Deno. La REST API cobra 1 comando
  por llamada, igual que el protocolo TCP.
- En local (Vite) no se usa Redis directo: se llama a la Edge
  Function en local con `supabase functions serve` o contra staging.

## 8. Límites y costos de Upstash (verificado 2026-11-23)

Fuente: documentación oficial de Upstash (precios). La página de
precios y la FAQ no coinciden en comandos, así que se planea con la
cifra más baja.

| Límite | Free |
|---|---|
| Precio | $0 / mes |
| Datos | 250 MB |
| Comandos | 500K / mes según precios; la FAQ menciona 10K / día — planear con 10K / día |
| Bandwidth | 10 GB / mes |
| Bases de datos | 1 |
| Máx. por request / por registro | 10 MB / 100 MB |

Pay-as-you-go (si se pasa del Free): $0.20 por cada 100K comandos,
storage $0.25 / GB (primer GB gratis), bandwidth gratis hasta 200 GB
y luego $0.03 / GB. Se recomienda poner **presupuesto mensual** en
Upstash: al llegar al tope, la base se limita en vez de seguir
cobrando.

**Estimación:** cada lectura de catálogo son 1–2 comandos Redis
(GET, y SET solo en miss). Con ~1,000 lecturas de catálogo al día
son ~1,000–2,000 comandos/día: cabe en el Free incluso con la cifra
de 10K/día. Un catálogo de ~300 KB × pocas orgs cabe de sobra en
250 MB. Si el tráfico crece, el salto a PAYG es de centavos al mes
a estos volúmenes.

## 9. Aplicación a Grow Together (libros)

Mismo patrón, con TTL más largos porque el contenido del libro
cambia poco y se lee muchísimo:

| Dato | Clave | TTL inicial |
|---|---|---|
| Página del libro (contenido + actividades) | `gt2:page:{n}:v1` | 86,400 s (24 h) |
| Manifiesto del libro (estructura, audios) | `gt2:book:manifest:v1` | 86,400 s |
| Catálogo de libros / portada | `gt2:catalog:v1` | 3,600 s (1 h) |
| Progreso por alumno | **NO se cachea** | — |

Invalidación: al publicar una nueva versión del libro se hace `DEL`
de las claves afectadas (o se sube la versión `v1` → `v2` en la
clave). El progreso y las calificaciones siempre van directo a la
base, igual que el stock en Reisbloc.

## 10. Rollout por fases

- **Fase 0 (esta rama):** diseño + throttle Realtime + compresión de
  fotos. Sin cliente Redis todavía.
- **Fase 1:** Edge Function `catalog-cache` + solo la tienda web
  pública (mayor egress, menor riesgo: es solo lectura y el contenido
  cambia poco).
- **Fase 2:** catálogo interno del POS + invalidación en ventas y
  edición de productos. Medir egress en el dashboard de Supabase
  antes y después.
- **Fase 3:** fotos por CDN delante de Storage + TTLs ajustados con
  datos reales. Después, el mismo esquema para GT2.

## 11. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Lecturas desactualizadas (precio/stock viejo hasta 5–10 min) | TTL corto + invalidación explícita en cada escritura; la venta valida stock en Postgres |
| Redis caído o sin cuota | Fallback: la Edge Function lee directo de Supabase y responde igual (sin cachear). Redis es acelerador, no dependencia |
| Token expuesto | Solo vive como secret de Supabase; el front nunca lo ve |
| Costo sorpresa en Upstash | Presupuesto mensual en la consola + alertas; el Free cubre el volumen actual con margen |
| Doble fuente de verdad | Redis solo guarda copias con TTL; todo se reconstruye desde Postgres borrando claves |
| Claves gigantes (catálogo enorme) | Límite 10 MB por request en Free; un catálogo de ~300 KB está lejos; si crece, partir por categoría |

## 12. Checklist para implementar (siguiente paso)

1. Crear la base Redis en Upstash y copiar REST URL + token.
2. Guardar los secrets en el proyecto Supabase (PROD y DEV).
3. Crear `supabase/functions/catalog-cache/index.ts` (GET + SET +
   `invalidate`) con Deno + fetch a Upstash.
4. Cambiar el storefront público para leer por la Edge Function.
5. Añadir la llamada a `invalidate` en crear/editar/eliminar
   producto y en la venta.
6. Medir egress 1 semana y ajustar TTLs.
7. Repetir el esquema para GT2 (claves `gt2:*`, TTL 24 h).
