# 🗺️ Plan Maestro de Modernización, Refactorización y Deuda Técnica
**Reisbloc Retail POS (2026)**

Este documento consolida el plan de acción integral para transformar el repositorio en un estándar 100% de grado de producción, eliminando código legacy, reforzando la integridad transaccional y unificando el almacenamiento offline.

---

## 📊 Matriz de Fases y Estado

| Fase | Título | Estado | Prioridad |
|---|---|---|---|
| **Fase 1** | Hardening de Seguridad & Multi-Tenant | ✅ **Completado en `dev`** | Crítica |
| **Fase 2** | Transaccionalidad (RPC Atómico) & Sincronización Offline | ✅ **Completado en `dev`** | Alta |
| **Fase 3** | Descomposición Monolítica & Limpieza de Deuda Restaurante | 🟡 **En Progreso** | Media-Alta |
| **Fase 4** | Consolidación de Modelos Duales de DB & Reglas Hardcodeadas | 🟡 **En Progreso** | Media-Alta |
| **Fase 5** | Pruebas Automatizadas, Documentación & Licencias | ⚪ **Pendiente** | Media |

---

## 🟢 Fase 1: Hardening de Seguridad & Multi-Tenant (✅ COMPLETADO)
- [x] **Eliminación del fallback inseguro en `getOrganizationBySlug()`**:
  - `src/utils/tenantValidation.ts` y `src/services/supabaseService.ts`: Eliminado `data[0]`. Búsqueda estricta por UUID o slug exacto vía `.maybeSingle()`.
- [x] **Permisos estrictos en RPC `update_retail_stock_batch`**:
  - `supabase/migrations/20260918094500_phase1_security_hardening.sql`: Revocado a `anon`/`PUBLIC`. Concedido únicamente a `authenticated` y `service_role`. Validación estricta de `caller_org == item_org`.
- [x] **Aislamiento Fail-Closed en Clip & API serverless**:
  - `vite.config.ts`, `api/clip-pinpad.ts`, `src/services/clipPinpadService.ts`: Falla cerrada cuando faltan secretos en servidor.
- [x] **Release AAB Android v1.0.5 (`com.reisbloclabs.pos`)**:
  - Compilación y firma con `versionCode 5` y fingerprint SHA-256 verificado.

---

## 🟢 Fase 2: Confiabilidad Transaccional & Sincronización Offline (✅ COMPLETADO)

### 2.1 RPC Transaccional Atómico de Ventas (`process_retail_sale_transaction`)
- [x] **Migración SQL PostgreSQL**:
  - Archivo: `supabase/migrations/20260918120000_process_retail_sale_transaction.sql`.
  - Operación en una sola transacción atómica ACID (`BEGIN ... COMMIT`):
    1. Validar tenant (`organization_id`).
    2. Comprobar idempotencia con `client_mutation_id`.
    3. Insertar encabezado en `retail_sales`.
    4. Insertar partidas en `retail_sale_items`.
    5. Insertar abono en `retail_sale_payments`.
    6. Actualizar acumulado de compras del cliente (`clients.total_spent`).
    7. Descontar inventario atómico en `retail_products` (con bloqueo de fila `FOR UPDATE`).
    8. Registrar auditoría en `audit_logs`.
  - Probado y verificado en Supabase DEV (`jnyyaclrelqcqzjummwe`).
- [x] **Integración en Frontend**:
  - `src/services/supabaseService.ts`: `createRetailSale` actualizado para invocar el RPC transaccional con fallback seguro.

### 2.2 Unificación de Capas Offline
- [x] **Eliminado `offlineDBService.ts`** (IndexedDB legacy 'TPVSolutions').
- [x] **Consolidado `offlineStorage.ts`**:
  - Motor IndexedDB unificado (`idb`) con base `reisbloc_sync_queue_db`.
  - Soporte para acción `CREATE_RETAIL_SALE` en cola `sync_queue`.
  - `src/services/syncService.ts` configurado para procesar ventas retail con `clientMutationId`.
  - `src/pages/POS.tsx`: ventas fallidas o sin conexión se encolan automáticamente en modo offline.
  - `src/hooks/useOfflineSync.ts`: refactorizado para monitorear la cola unificada.

---

## 🟡 Fase 3: Descomposición Monolítica & Limpieza de Deuda de Restaurante

### 3.1 Purgar Aliases de Restaurante en `appStore.ts` y `POS.tsx`
- [x] Reemplazar todas las llamadas a `clearDraftForTable` por `clearDraftForTicket` en `POS.tsx`.
- [ ] Reemplazar `currentTableNumber` por `currentTicketNumber`.
- [ ] Renombrar `tables` a `tickets` / `registers` (cajas).
- [ ] Eliminar métodos `@deprecated` en `src/store/appStore.ts`.

### 3.2 Modularización de `POS.tsx` (2,466 líneas)
- [ ] Crear estructura modular en `src/features/pos/`:
  - `hooks/`: `usePOSCatalog`, `usePOSCart`, `usePOSCheckout`, `usePOSPricing`, `usePOSOfflineSync`.
  - `components/`: `POSHeader`, `TicketSelector`, `ProductCatalog`, `CartSummary`, `CheckoutModal`, `CashCutModal`.
  - `utils/`: `pricing.ts` (lógica pura de precios extraída), `stockValidation.ts`.

### 3.3 Descomposición de `supabaseService.ts` (2,871 líneas)
- [ ] Separar por dominios de negocio en `src/services/`:
  - `auth/`, `products/`, `sales/`, `inventory/`, `clients/`, `reports/`, `storefront/`.

---

## 🟡 Fase 4: Consolidación de Esquemas de BD & Eliminación de Hardcodes

### 4.1 Consolidación de Modelos Duales
- [x] **`shiftService.ts`**:
  - Actualizado: `calculateExpectedAmount` ahora consulta `retail_sales` (monto y propina reales) con fallback transparente.
- [x] **`Reports.tsx` y `Analytics.tsx`**:
  - Actualizado: Selectores de conteo de productos ahora consultan `retail_products` con fallback.
- [ ] Migrar el resto de consultas residuales en `supabaseService.ts` a tablas retail canónicas.

### 4.2 Eliminación de Reglas y Excepciones Hardcodeadas
- [ ] Eliminar bypasses de `isLu` / `isRick` y UUID de organización quemados en `src/App.tsx`.
- [ ] Asegurar perfiles de usuario completos directamente en `public.users` en Supabase.

---

## ⚪ Fase 5: Pruebas Automatizadas, Documentación & Licencias

### 5.1 Documentación y Licencias
- [ ] Definir licencia oficial única (AGPL-3.0 / GPL-3.0) y unificar `README.md` y `package.json`.
- [ ] Purgar archivos de documentación en `docs/` que hacen referencia obsoleta a Firebase/Firestore/Redux.

### 5.2 Calidad y CI/CD
- [ ] Pruebas unitarias para `pricing.ts`.
- [ ] Pruebas de integración para la cola offline y el RPC de ventas.
