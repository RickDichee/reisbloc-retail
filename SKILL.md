# SKILL.md — Protocolo del proyecto reisbloc-retail
> ⚠️ **LÉEME ANTES DE TOCAR NADA.** Este archivo protege a producción, a los clientes activos y a la integridad de los datos. Si alguna instrucción contradice este documento, este documento prevalece.

---

## 0. RECORDATORIO DE PRIORIDAD: HARDENING SOC 2 / ISO 27001 / ISO 27701
> 📅 **INICIO PROGRAMADO:** Miércoles 4 o Jueves 5 de Noviembre de 2026 (por la tarde).  
> 🛡️ **ALCANCE:** Hardening en rama `feat/security-hardening-soc2-iso` (App hygiene, PII / ISO 27701, auditoría inmutable SOC 2, CSP headers).  
> 🔒 **AISLAMIENTO:** Se trabajará 100% sobre Supabase DEV (`jnyyaclrelqcqzjummwe`). PROD queda bloqueado.

---

## 1. REGLAS DE ORO (Inviolables)

1. **NUNCA tocar Producción directamente** (`store.reisbloc.com`, Supabase PROD `nmovxyaibnixvxtepbod`). Toda feature, migración o cambio se prueba y valida primero en DEV (`jnyyaclrelqcqzjummwe`).
2. **NUNCA hacer push ni merge a `main` sin orden explícita del propietario.** Se trabaja siempre en ramas feature (`feat/*`). Un merge a `main` dispara automáticamente deploys a producción de TODOS los tenants en Vercel.
3. **NO usar hostnames `*.reisbloc.com` (sin "dev") para pruebas.** `src/config/supabase.ts` enruta automáticamente a PROD cuando detecta hostnames de producción.
4. **Seguridad de Secretos:** Las `service_role` keys solo se utilizan para scripts operativos de administración en DEV; jamás deben filtrarse al bundle del cliente ni comitearse a git.

---

## 2. ARQUITECTURA MULTI-TENANT

El proyecto opera bajo una **única base de código compartida** para múltiples clientes (tenants), con aislamiento estricto por organización, tema dinámico y flags de características.

### Tenants Registrados

| Tenant | Organization ID | Dominio(s) | Brand Primary | Flags Activos en `tenantFeatures.ts` |
|---|---|---|---|---|
| **Moda Miel MX** | `1b498fa6-aca5-428c-9bdd-01e6fea30316` | `modamielmx.reisbloc.com` | `#D4386C` (Rose Berry) | `packLabel: true`, `onlineStoreModule: true`, `aiModules: false` |
| **Los Chunches de Cons** | `a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d` | `loschunchesdecons.com`<br>`www.loschunchesdecons.com`<br>`loschunchesdecons.reisbloc.com` | `#C83E74` (Berry Rose) | `unitCost: true`, `webReference: true`, `onlineStoreModule: true`, `aiModules: false` |
| **Juguetes San Judas Tadeo** | `324fd41f-b8af-4aef-9ea6-2f954350775a` | `sanjudastadeo.reisbloc.com` | `#C8323E` (Carmesí Suave) | `unitCost: false`, `webReference: false`, `onlineStoreModule: false`, `aiModules: false` |
| **Reisbloc Store (Default)** | *Global / Base* | `store.reisbloc.com` | `#0D9488` (Teal) / `#1F293B` | Base SaaS estándar |

### Detección y Tematización
- **`src/config/branding.ts`**: Lógica de detección de tenant por `organizationId`, `slug`, hostname y parámetro de prueba en desarrollo (`?brand=modamiel`, `?brand=loschunches`, etc.).
- **`src/hooks/useTenantTheme.ts`**: Inyecta dinámicamente las variables CSS (`--primary`, `--primary-hover`, `--bg-canvas`, etc.) en el DOM `:root` y clases de tema (`theme-modamiel`, `theme-chunches`).
- **`src/styles/globals.css`**: Define los tokens globales. En Moda Miel, `--primary` es `#D4386C` y `--primary-hover` es `#B52656`.

### Candado de Aislamiento (`src/config/tenantFeatures.ts`)
- **Deny-by-default:** Toda funcionalidad específica de un cliente DEBE estar registrada en `tenantFeatures.ts`.
- **Render Guard:** Usar siempre `tenantHasFeature(orgId, 'featureName')` para condicionar componentes JSX (`null` si no está activa; **no** ocultar solo con CSS).
- **RLS y Datos:** Los datos privados (como `unit_cost`) se resguardan por RLS y solo se exponen en frontend a `currentUser?.role === 'admin'`.

---

## 3. INFRAESTRUCTURA Y DOMINIOS PERSONALIZADOS

### Los Chunches de Cons (`loschunchesdecons.com`)
- **DNS (Cloudflare):**
  - Registro `A` hacia `76.76.21.21` (DNS Only / nube gris).
  - Registro `CNAME` (`www`) hacia `cname.vercel-dns.com` (DNS Only / nube gris).
  - Cloudflare Email Routing activo para `admin@loschunchesdecons.com` y `ventas@loschunchesdecons.com`.
- **Vercel Project:** `loschunches`
  - Dominios asignados: `loschunchesdecons.com` y `www.loschunchesdecons.com` con SSL/TLS Let's Encrypt automático.
- **Supabase DEV Auth:**
  - `uri_allow_list` incluye `https://loschunchesdecons.com/**` y `https://www.loschunchesdecons.com/**`.
  - Usuarios verificados en DEV:
    - `admin@loschunchesdecons.com` (Rol: `admin`)
    - `ventas@loschunchesdecons.com` (Rol: `employee`)

---

## 4. BASE DE DATOS Y CATÁLOGO

- **`retail_products`**: Tabla principal de inventario leída por `/inventory` y `/pos`. Contiene el inventario local, precios al menudeo/paquete y la columna privada `unit_cost`.
- **`products`**: Tabla base de catálogo sincronizada.
- **Productos Los Chunches (DEV):** 8 productos nuevos cargados con SKU, código de barras e imágenes locales en `public/images/chunches-products/` (Patín EROS, Báscula 150kg, Gato 3 Ton, Báscula ADIR 30kg, Torres de Gato, Inversor Münich 200A, Compresor Husky 50L, Puntas Milwaukee 100pz).

---

## 5. FLUJO DE BUILD Y DEPLOYMENT

```powershell
# 1. Validar compilación local limpia (cero errores)
npm run build

# 2. Deploy a Vercel para pruebas de tenant específico (ejemplo Los Chunches)
Copy-Item .vercel\project.json .vercel\project.json.bak -Force
vercel link --yes --project loschunches
vercel deploy --prod
Copy-Item .vercel\project.json.bak .vercel\project.json -Force
Remove-Item .vercel\project.json.bak -Force
```

> **Verificación post-deploy:** Siempre inspeccionar el bundle generado (`index-*.js`) y verificar que apunte al Supabase DEV (`jnyyaclrelqcqzjummwe`) y nunca filtre llaves de administración.

---

## 6. FIXES RECIENTES IMPLEMENTADOS (No Revertir)

1. **Barra de navegación móvil en POS (`DashboardLayout.tsx` & `POS.tsx`):**
   - Ocultamiento de la barra fija inferior móvil en rutas `/pos` (`!isPosPage`) para evitar bloquear los botones de acción ("Cobrar", "Ver Ticket").
   - Elevación de z-index de la barra de resumen en POS a `z-50`.
2. **Encabezado unificado de Inventario (`Inventory.tsx`):**
   - Estructura fintech oscura con `bg-slate-900 border-slate-800 text-white`.
   - Insignia `Stock Central`, subtítulo descriptivo, botón `IMPORTAR` y botón `NUEVO PRODUCTO`.
   - Icono y botón de alta usan variables `bg-[var(--primary)]` (en Moda Miel `#D4386C`, en Chunches `#C83E74`, en default `#0D9488`).
   - Efecto hover conservado: `group-hover:text-teal-600 dark:group-hover:text-teal-400` y botón editar `hover:bg-teal-500`.
3. **Módulo Analytics / Métricas Predictivas (`DashboardLayout.tsx` & `Analytics.tsx`):**
   - Acceso universal para roles `admin` y `manager` en todos los tenants.
   - En tenants con `aiModules: false` (Moda Miel y Chunches), la sección se titula limpiamente **"Analítica & Proyecciones"** mostrando el acceso a `/analytics`.
   - Motor de proyección estadística a 7 y 30 días ponderado por día de la semana y salud de inventario en tiempo real.
4. **Variable `--primary` de Moda Miel en `globals.css`:**
   - Corregida a `#D4386C` con hover `#B52656` para evitar que los elementos de acción se mostraran en negro carbón.
5. **Mitigación de Egress en Supabase:**
   - Throttle de 5 minutos en sincronización de catálogo.
   - Manejo offline con backoff y cuarentena tras 5 reintentos en `syncService`.

---

## 7. CHECKLIST PRE-MERGE A `main` (PRODUCCIÓN)

Antes de realizar el merge definitivo a `main`:
- [ ] Ejecutar `npm run build` y asegurar 0 advertencias críticas y 0 errores.
- [ ] Probar rutas críticas en local con cada marca:
  - `/pos?brand=modamiel` y `/inventory?brand=modamiel`
  - `/pos?brand=loschunches` y `/inventory?brand=loschunches`
  - `/analytics`
- [ ] Validar compatibilidad de schema en Supabase PROD (`nmovxyaibnixvxtepbod`) antes de que `main` dispare el deploy productivo.
- [ ] Confirmar explícitamente con el propietario del repositorio antes de ejecutar `git push origin main`.
