# SKILL.md — Protocolo del proyecto reisbloc-retail
> LÉEME ANTES DE TOCAR NADA. Este archivo protege a productores/producción/clientes. Si algo aquí contradice un merge request, gana este archivo.

## 1. REGLAS DE ORO (infringir cualquiera = desastre)

1. **NUNCA tocar Production (`store.reisbloc.com`, Supabase PROD `nmovxyaibnixvxtepbod`).** Toda feature nueva se prueba en DEV (`jnyyaclrelqcqzjummwe`).
2. **NUNCA hacer push/merge a `main` sin orden explícita del dueño.** Trabajar en ramas (`feat/*`). `main` dispara deploys a producción de TODOS los clientes.
3. **NO usar nunca `*.reisbloc.com` (sin la palabra "dev") para probar deploys nuevos** — `src/config/supabase.ts` fuerza a PROD con esos hostnames.
4. Secretos: service_role keys solo para ops de DEV, nunca escapar al bundle ni al git.

## 2. ARQUITECTURA MULTI-TENANT

### Detección de tenant
- `src/config/branding.ts`: `checkIsModaMiel` / `checkIsLosChunches` (por org id, org slug, hostname).
- Tema: `src/hooks/useTenantTheme.ts`. No hardcodear estilos por cliente fuera de ahí.

### Aislamiento de features (CANDADO)
- **`src/config/tenantFeatures.ts`** es el ÚNICO registro de flags por tenant. Defaults `false`; solo org `a1b2c3d4-e5f6-4a7b-9c9d-0e1f2a3b4c5d` (Los Chunches) tiene flags activos hoy: `unitCost`, `webReference`.
- Regla: **feature tenant-específica = flag en tenantFeatures.ts; usarse con hooks/try checks reales en RENDER**, no esconder con CSS. Si el flag está apagado, el JSX no se monta (null).
- Los datos de features tenant (costos, comparisons) viven en tablas con `organization_id` → RLS por-org. NO crear tablas globales con datos de un solo cliente.
- Datos privados (costo de venta) SOLO se muestran a `role === 'admin'`. Ni manager, ni employee, ni POS.

## 3. TABLAS QUE IMPORTAN (DEV hoy)

- `products` — catálogo público/marca de página (con `cost_price`, `wholesale_price`, `wholesale_min_qty`).
- `retail_products` — TABLA DEL INVENTARIO y del POS (la que se lee en `Inventory.tsx`, `PPO`); tiene `unit_cost` (costo privado, columna agregada 26-oct-2026).
- Cualquier producto nuevo del tenant Chunches requiere filas en `retail_products` (y el resto usa el espejo por SKU/nombre/precio/categoría).

## 4. FLUJO DE BUILD + DEPLOY (solo rama feature)

```powershell
# 1. Build local (debe salir sin errores antes de deployar)
npm run build

# 2. Deploy al proyecto VERCEL del tenant (NOTA: NO es el proyecto 'reisbloc-retail' original)
Copy-Item .vercel\project.json .vercel\project.json.bak -Force
vercel link --yes --project loschunches
vercel deploy --prod        # deploya el URL del proyecto loschunches.vercel.app
Copy-Item .vercel\project.json.bak .vercel\project.json -Force
Remove-Item .vercel\project.json.bak -Force
```

- Vercel CLI está logueado como `rickdichee`. Env vars del proyecto tienen las credenciales DE PERMANENCIA (`VITE_SUPABASE_URL=https://jnyyaclrelqcqzjummwe.supabase.co`, etc.) — hacen OVERRIDE de `.env.production` en el build de Vercel.
- Tras cada deploy: fetch del `index-*.js` de producción y auditar que contiene `jnyyaclrelqcqzjummwe` (DEV) y NO las credenciales de PROD.

## 5. COMUNICACIÓN CON LA DB (REST desde PowerShell)

- **SIEMPRE**: escribir el JSON como bytes UTF-8 (los acentos rompen los strings de PS). PowerShell 5.1: `Invoke-RestMethod -Body ([System.Text.Encoding]::UTF8.GetBytes($json))`.
- Acentos y diacritichebroken con strings directas en PowerShell por encoding.
- `curl.exe` + archivo temporal sin BOM: `[IO.File]::WriteAllText($path, $json, [Text.UTF8Encoding]::new($false))` (si hay BOM, violás JSON con 400 `bad_json`).
- 422 en `/auth/v1/token` = ver el campo `error_code` en el cuerpo: `email_provider_disabled` → proveedor deshabilitado en el proyecto.
- Supabase Dev ObjectMapper: API de administración accesible con el token del CLI (`Get-SupabaseAccessToken` via `~\.supabase` credencial "Supabase CLI:supabase" en el Windows Credential Manager; usar `PDF Query API` `/v1/projects/jnyyaclrelqcqzjummwe/database/query` para SQL Data Definition Language (ALTER etc.).

## 6. SEGUIMIENTO DE FIXES YA REALIZADOS (no regresaer)

- **Egress (fixes en rama, pendientes de merge a main)**: colonia offline con backoff (OfflineIndicator), cuarentena tras 5 retries (syncService), throttle 5-min de catálogo (supabaseService.getAllProducts()).
- **Login**: página de login soporta email+password (signInWithPassword) + Google OAuth. El supabase DEV tenía el proveedor EMAIL deshabilitado — se re-habilitó el 26-oct-2026 vía Management API (`external_email_enabled: true`).
- **ProductModal**: campo `showPricingOptions` faltaba `useState` (artefacto de merge). Ya corregido en la rama — ¡verificar que exista en main al merge!

## 7. PENDIENTES / ROADMAP

- Unir `feat/loschunches-dev` → `main` con revisión (dispara deploys de PROD de todos: plan TODO el release mínimo).
- En PROD (cuando el dueño apruebe): deployar Edge Functions (`log-auth-event` CORS, `token-manager`), migraciones de `purchase_orders`, revisar canal realtime de `POS.tsx` (refetch del catálogo completo).
- **Sistema de toggles por cliente** (idea del dueño): recuadros por feature en el admin (activar/deshactivar módulos y su comportamiento en el flujo de inputs). Es la próxima gran release: extender `tenantFeatures.ts` a una tabla `organizations.feature_flags jsonb` editable por UI.
