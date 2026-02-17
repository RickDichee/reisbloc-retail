# ✅ CHECKLIST DE DEPLOYMENT - Reisbloc POS

**Fecha:** Febrero 2026  
**Versión:** 3.1.1  
**Estado:** PRODUCCIÓN ✅

---

## 📋 PRE-DEPLOYMENT

### ✅ Código y Compilación

- [x] Build sin errores: `npm run build` ✅
- [x] TypeScript compiler options correctas (noEmit agregado)
- [x] Errores críticos reparados:
  - [x] tsconfig.json: allowImportingTsExtensions + noEmit
  - [x] POS.tsx: createdAt fields agregados a createOrder()
  - [x] Kitchen.tsx: statusConfig completo (open, sent, ready, served, cancelled, completed)
  - [x] offlineDBService.ts: IndexedDB getAll() calls reparadas
- [x] Warnings TypeScript minimizados
- [x] No console.log con datos sensibles
- [x] Imports optimizados (remover unused)

### ✅ Configuración Supabase

- [x] .env.local con variables VITE_SUPABASE_*
- [x] Conexión exitosa verificada en consola
- [x] PWA configurada con VitePWA
- [x] **CRÍTICO**: Implementar seguridad RLS correcta en PostgreSQL

### ✅ MIGRACIÓN SUPABASE (Completada)

**Estado Actual:** Migrado a Supabase PostgreSQL (Producción)
- [x] Users, Devices, Products migrados
- [x] Orders, Sales migrados
- [x] TableMonitor, Kitchen, Bar, POS usando Supabase
- [x] **CRÍTICO ANTES DE PRODUCCIÓN**: Implementar seguridad RLS correcta

#### 🔒 OPCIONES DE SEGURIDAD SUPABASE (ELEGIR UNA ANTES DE PRODUCCIÓN):

**✅ ACTUALMENTE:** Opción 1 Implementada (Supabase Auth + JWT Nativo)

**Opción 1: Supabase Auth + JWT (RECOMENDADA)**
- Migrar sistema PIN actual a Supabase Auth
- Usuarios harían login real con credenciales
- Cliente conecta como `authenticated` role
- RLS policies restringidas a `authenticated`
- ✅ Ventajas: Seguridad real, auditoría integrada, sesiones manejadas
- ✅ IMPLEMENTADO EN v3.0.0

**Opción 2: JWT Personalizado desde Backend**
- Mantener sistema PIN actual en frontend
- Backend/Cloud Function valida PIN y genera JWT firmado
- JWT incluye claims (user_id, role, etc.)
- Supabase RLS valida JWT claims
- ✅ Ventajas: Mantiene UX actual, seguridad correcta
- ❌ DLOG🔎 [app] Auth state {isAuthenticated: true, device: {…}, needsApproval: false}
logger.ts:22 LOG🔎 [app] Auth state {isAuthenticated: true, device: {…}, needsApproval: false}
installHook.js:1 LOG🔎 [app] Auth state {isAuthenticated: true, device: {…}, needsApproval: false}
logger.ts:22 LOG🔎 [payment] Cash payment {amount: 3360, tip: 0}
logger.ts:22 LOG🔎 [payment] Starting payment process for 19 orders
logger.ts:22 LOG🔎 [payment] Creating sale: subtotal=3360, total=3360, method=cash
logger.ts:22 LOG🔎 [supabase] 💰 Creating sale with payload: {order_id: 'fec184fd-63d4-4e79-a3c6-423da1e34d2e', waiter_id: '54b145c1-6fb1-446b-99c8-01c28bd952fb', table_number: 0, items: Array(38), subtotal: 3360, …}
logger.ts:22 LOG🔎 [supabase]    - order_id: fec184fd-63d4-4e79-a3c6-423da1e34d2e
logger.ts:22 LOG🔎 [supabase]    - waiter_id: 54b145c1-6fb1-446b-99c8-01c28bd952fb
logger.ts:22 LOG🔎 [supabase]    - table_number: 0 number
logger.ts:22 LOG🔎 [supabase]    - subtotal: 3360 number
logger.ts:22 LOG🔎 [supabase]    - total: 3360 number
logger.ts:22 LOG🔎 [supabase]    - payment_method: cash
logger.ts:22 LOG🔎 [supabase]    - items count: 38
installHook.js:1 ERROR❌ [supabase] ❌ Supabase insert error: {code: '42501', message: 'new row violates row-level security policy for table "sales"', details: null, hint: null, statusCode: undefined}
overrideMethod @ installHook.js:1
error @ logger.ts:30
createSale @ supabaseService.ts:701
await in createSale
handlePaymentComplete @ TableMonitor.tsx:394
(anonymous) @ PaymentPanel.tsx:73
setTimeout
handlePayment @ PaymentPanel.tsx:72
await in handlePayment
callCallback2 @ chunk-NUMECXU6.js?v=5eeeaece:3674
invokeGuardedCallbackDev @ chunk-NUMECXU6.js?v=5eeeaece:3699
invokeGuardedCallback @ chunk-NUMECXU6.js?v=5eeeaece:3733
invokeGuardedCallbackAndCatchFirstError @ chunk-NUMECXU6.js?v=5eeeaece:3736
executeDispatch @ chunk-NUMECXU6.js?v=5eeeaece:7014
processDispatchQueueItemsInOrder @ chunk-NUMECXU6.js?v=5eeeaece:7034
processDispatchQueue @ chunk-NUMECXU6.js?v=5eeeaece:7043
dispatchEventsForPlugins @ chunk-NUMECXU6.js?v=5eeeaece:7051
(anonymous) @ chunk-NUMECXU6.js?v=5eeeaece:7174
batchedUpdates$1 @ chunk-NUMECXU6.js?v=5eeeaece:18913
batchedUpdates @ chunk-NUMECXU6.js?v=5eeeaece:3579
dispatchEventForPluginEventSystem @ chunk-NUMECXU6.js?v=5eeeaece:7173
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ chunk-NUMECXU6.js?v=5eeeaece:5478
dispatchEvent @ chunk-NUMECXU6.js?v=5eeeaece:5472
dispatchDiscreteEvent @ chunk-NUMECXU6.js?v=5eeeaece:5449Understand this error
installHook.js:1 ERROR❌ [supabase] ❌ Error creating sale: Supabase error: new row violates row-level security policy for table "sales"  
overrideMethod @ installHook.js:1
error @ logger.ts:30
createSale @ supabaseService.ts:714
await in createSale
handlePaymentComplete @ TableMonitor.tsx:394
(anonymous) @ PaymentPanel.tsx:73
setTimeout
handlePayment @ PaymentPanel.tsx:72
await in handlePayment
callCallback2 @ chunk-NUMECXU6.js?v=5eeeaece:3674
invokeGuardedCallbackDev @ chunk-NUMECXU6.js?v=5eeeaece:3699
invokeGuardedCallback @ chunk-NUMECXU6.js?v=5eeeaece:3733
invokeGuardedCallbackAndCatchFirstError @ chunk-NUMECXU6.js?v=5eeeaece:3736
executeDispatch @ chunk-NUMECXU6.js?v=5eeeaece:7014
processDispatchQueueItemsInOrder @ chunk-NUMECXU6.js?v=5eeeaece:7034
processDispatchQueue @ chunk-NUMECXU6.js?v=5eeeaece:7043
dispatchEventsForPlugins @ chunk-NUMECXU6.js?v=5eeeaece:7051
(anonymous) @ chunk-NUMECXU6.js?v=5eeeaece:7174
batchedUpdates$1 @ chunk-NUMECXU6.js?v=5eeeaece:18913
batchedUpdates @ chunk-NUMECXU6.js?v=5eeeaece:3579
dispatchEventForPluginEventSystem @ chunk-NUMECXU6.js?v=5eeeaece:7173
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ chunk-NUMECXU6.js?v=5eeeaece:5478
dispatchEvent @ chunk-NUMECXU6.js?v=5eeeaece:5472
dispatchDiscreteEvent @ chunk-NUMECXU6.js?v=5eeeaece:5449Understand this error
installHook.js:1 ERROR❌ [payment] Payment failed: Supabase error: new row violates row-level security policy for table "sales"   Error: Supabase error: new row violates row-level security policy for table "sales"  
    at SupabaseService.createSale (supabaseService.ts:708:15)
    at async handlePaymentComplete (TableMonitor.tsx:394:7)
overrideMethod @ installHook.js:1
error @ logger.ts:30
handlePaymentComplete @ TableMonitor.tsx:423
await in handlePaymentComplete
(anonymous) @ PaymentPanel.tsx:73
setTimeout
handlePayment @ PaymentPanel.tsx:72
await in handlePayment
callCallback2 @ chunk-NUMECXU6.js?v=5eeeaece:3674
invokeGuardedCallbackDev @ chunk-NUMECXU6.js?v=5eeeaece:3699
invokeGuardedCallback @ chunk-NUMECXU6.js?v=5eeeaece:3733
invokeGuardedCallbackAndCatchFirstError @ chunk-NUMECXU6.js?v=5eeeaece:3736
executeDispatch @ chunk-NUMECXU6.js?v=5eeeaece:7014
processDispatchQueueItemsInOrder @ chunk-NUMECXU6.js?v=5eeeaece:7034
processDispatchQueue @ chunk-NUMECXU6.js?v=5eeeaece:7043
dispatchEventsForPlugins @ chunk-NUMECXU6.js?v=5eeeaece:7051
(anonymous) @ chunk-NUMECXU6.js?v=5eeeaece:7174
batchedUpdates$1 @ chunk-NUMECXU6.js?v=5eeeaece:18913
batchedUpdates @ chunk-NUMECXU6.js?v=5eeeaece:3579
dispatchEventForPluginEventSystem @ chunk-NUMECXU6.js?v=5eeeaece:7173
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ chunk-NUMECXU6.js?v=5eeeaece:5478
dispatchEvent @ chunk-NUMECXU6.js?v=5eeeaece:5472
dispatchDiscreteEvent @ chunk-NUMECXU6.js?v=5eeeaece:5449Understand this error

**Opción 3: RLS con `anon` Restringido**
- Mantener `anon` role pero con policies específicas
- Validar campos requeridos en WITH CHECK
- Ejemplo:
  ```sql
  CREATE POLICY "Orders require valid user" ON orders
    FOR INSERT TO anon
    WITH CHECK (
      created_by IS NOT NULL AND 
      EXISTS (SELECT 1 FROM users WHERE id = created_by AND active = true)
    );
  ```
- ✅ Ventajas: Rápido de implementar
- ❌ Desventajas: Seguridad limitada, vulnerable sin validación adicional

**Opción 4: Service Role (NUNCA EN FRONTEND)**
- Solo para backend/admin tools
- Bypasea completamente RLS
- ❌ NUNCA exponer service_role key en código frontend

**ACCIÓN REQUERIDA:**
- [x] Elegir opción de seguridad antes de deploy a producción
- [x] Implementar opción elegida
- [x] Actualizar policies RLS en Supabase
- [x] Probar autenticación y permisos en staging
- [x] Documentar proceso de autenticación para equipo

### ✅ Cloud Functions

- [x] functions/package.json actualizado
- [x] Todas las funciones compiladas
- [x] bcrypt importado y funcionando
- [x] Error handling implementado
- [x] Validación de inputs en todas las funciones

### ✅ Base de Datos

- [x] Firestore emulator data cargada
- [x] Collections inicializadas:
  - [x] users (con datos de test)
  - [x] products (tacos, bebidas, etc.)
  - [x] devices (test device)
  - [x] orders (historial test)
  - [x] sales (test data)
- [x] Indexes no necesarios (emulator automático)

---

## 📱 CONFIGURACIÓN PARA ONSITE

### Sistema Local (Laptop)

- [x] Node.js v18+ instalado
- [x] Firebase CLI instalado: `firebase --version`
- [x] npm dependencies instaladas: `npm install`
- [x] Functions dependencies: `cd functions && npm install && cd ..`
- [x] Build production: `npm run build` ✅
- [x] Script de producción: `./scripts/start-production.sh` (ejecutable)

### Red Local

- [x] WiFi disponible en restaurante
- [x] Laptop conectado a WiFi
- [x] IP local obtiene: `hostname -I`
- [x] Puerto 4173 disponible (o cambiar en script)
- [x] Puerto 8080, 9099, 5001 disponibles (emulators)

### Dispositivos Cliente (Tablets)

- [ ] Android tablets con navegador Chrome/Firefox
- [ ] Tablets conectadas a misma WiFi que laptop
- [ ] Puertos abiertos en firewall
- [ ] Resolver DNS local: `http://<LAPTOP_IP>:4173`

---

## 🔐 SEGURIDAD PRE-LAUNCH

### Datos Sensibles

- [x] PINs hasheados en Firestore ✅
- [x] .env.local en .gitignore ✅
- [x] firebase-admin-credentials.json no comprometidas
- [x] No credenciales en código
- [ ] ANTES DE PRODUCCIÓN: Revisar Console Chrome para logs sensibles

### Acceso y Autenticación

- [x] Device approval workflow implementado
- [ ] ANTES DE PRODUCCIÓN: Activar rate limiting en loginWithPin
- [ ] ANTES DE PRODUCCIÓN: Implementar lockout después de N intentos
- [x] Roles bien definidos (admin, mesero, cocina, bar, capitan, supervisor)

### Firestore Rules

- [ ] ⚠️ **CRÍTICO**: Desactivar desarrollo rules (`allow read, write: if request.auth != null`)
- [ ] ⚠️ **CRÍTICO**: Activar production rules (descomentar en firestore.rules)
- [ ] Validar cada colección tiene reglas específicas
- [ ] Notificaciones: Solo el usuario puede leer las suyas
- [ ] Productos: Lectura general, escritura solo admin

---

## 🧪 PRE-LAUNCH TESTING

### Test Local (Dev Server)

```bash
# Terminal 1: Emuladores
firebase emulators:start --import=emulator-data --export-on-exit

# Terminal 2: Dev server
npm run dev

# Esperar a que ambos estén listos
# Acceder a: http://localhost:5173
```

**Flujos a validar:**
- [ ] Login con PIN (usuario: capitan, pin: 2222)
- [ ] Crear orden (POS page)
- [ ] Ver orden en Cocina
- [ ] Marcar como lista
- [ ] Ver en Mesero
- [ ] Hacer pago
- [ ] Ver en Reports

### Test Production Build (Local)

```bash
npm run build
npm run preview -- --host --port 4173
```

**Desde otra máquina (or tablet simulator):**
- [ ] Acceder a: `http://<YOUR_IP>:4173`
- [ ] Todo funciona igual

### Test Emulators

```bash
lsof -ti:8080,9099,5001
# Debería mostrar 3 PIDs
```

---

## 🚀 DEPLOYMENT ONSITE

### Paso 1: Preparación

```bash
# En laptop restaurante
cd /path/to/TPV_solutions
git pull  # Asegurarse tener última versión
npm install
cd functions && npm install && cd ..
npm run build
```

### Paso 2: Iniciar Sistema

```bash
# Hacer ejecutable (si no lo está)
chmod +x scripts/start-production.sh

# Ejecutar script de producción
./scripts/start-production.sh
```

**Script hace:**
1. Build app si es necesario
2. Backup emulator data
3. Inicia Firebase Emulators
4. Inicia servidor web en puerto 4173
5. Muestra IP local y de red
6. Monitorea salud del sistema
7. Cleanup al Ctrl+C

### Paso 3: Tablets Conectan

1. Tablets en WiFi restaurante
2. Abrir Chrome/Firefox en tablet
3. Acceder: `http://<LAPTOP_IP>:4173`
4. Login con credenciales
5. Device approval: Admin aprueba desde tablet web

---

## 📊 VERIFICACIONES ONSITE

### Funcionalidad

- [ ] ✅ Login funciona
- [ ] ✅ POS puede crear órdenes
- [ ] ✅ Kitchen recibe notificaciones
- [ ] ✅ Cocina marca órdenes como listas
- [ ] ✅ Mesero ve órdenes listas
- [ ] ✅ Pago se procesa
- [ ] ✅ Reportes muestran datos
- [ ] ✅ Cierre de caja completo

### Performance

- [ ] ✅ Carga tablets rápido (<3 segundos)
- [ ] ✅ Crear orden responde inmediatamente
- [ ] ✅ Notificaciones en tiempo real
- [ ] ✅ No hay lag en Kitchen

### Conectividad

- [ ] ✅ WiFi estable
- [ ] ✅ Conexión laptop-tablet permanente
- [ ] ✅ Si cae red: modo offline funciona
- [ ] ✅ Recuperación automática cuando vuelve red

### Datos

- [ ] ✅ Órdenes se guardan correctamente
- [ ] ✅ Usuarios no ven datos de otros
- [ ] ✅ Reports muestran datos correctos
- [ ] ✅ Backup diario funciona

---

## 🛠️ TROUBLESHOOTING ONSITE

### Si el sistema no inicia

```bash
# Verificar puertos
lsof -ti:4173,8080,9099,5001

# Matar procesos viejos si es necesario
kill -9 <PID>

# Reintentar
./scripts/start-production.sh
```

### Si tablets no conectan

```bash
# Verificar IP
hostname -I

# Verificar que firewall permite conexiones (puerto 4173)
# En Ubuntu:
sudo ufw allow 4173

# Desde tablet, ping a laptop
ping <LAPTOP_IP>
```

### Si órdenes no llegan a cocina

1. Verificar en DevTools Console que no haya errores
2. Emuladores corriendo: `firebase emulators:start`
3. Cloud Functions compiladas
4. Verificar rol del usuario (debe ser cocina o admin)

### Si notificaciones no llegan

1. Navegador permite notificaciones (revisar permisos)
2. FCM funcionando en emulator
3. Usuario tiene push subscription

---

## 📱 CREDENCIALES TEST (Emulator)

```
👤 Admin
Username: admin
PIN: 1111

👨‍💼 Capitán (Mesero)
Username: capitan
PIN: 2222

👨‍🍳 Cocina
Username: cocina
PIN: 3333

🍹 Bar
Username: bar
PIN: 4444

👁️ Supervisor
Username: supervisor
PIN: 5555
```

---

## 🔒 POST-LAUNCH

### Día 1
- [ ] Monitorear logs para errores
- [ ] Validar datos se guardan
- [ ] Capacitar staff en uso del sistema
- [ ] Crear backup manual

### Semana 1
- [ ] Recolectar feedback de usuarios
- [ ] Validar reportes muestran datos correctos
- [ ] Verificar no hay datos perdidos
- [ ] Performance satisfactorio

### Mes 1
- [ ] Evaluación de costos de emulador
- [ ] Decidir si continuar con emulator o migrar a Firebase Cloud
- [ ] Análisis de ROI
- [ ] Plan de escalabilidad

---

## 📞 CONTACTO / SOPORTE

**Desarrollador:** Rick  
**Teléfono:** [+XX-XXX-XXXX]  
**Email:** [rick@example.com]

**Stack técnico:**
- Frontend: React 18 + TypeScript + Tailwind CSS
- Backend: Firebase Emulators (local) / Firebase Cloud (producción)
- Database: Firestore
- Auth: Custom PIN + Device Fingerprint
- Notifications: Firebase Cloud Messaging

**Repositorio:** [GitHub Link]

---

## ✨ PRÓXIMOS PASOS (Post-MVP)

- [ ] Migrar a Firebase Blaze Plan para escalabilidad
- [ ] Implementar CLIP payment integration
- [ ] MercadoPago webhook validation
- [ ] Advanced reporting y analytics
- [ ] Mobile app nativa
- [ ] Integración con PMS (hotel management)

---

**Status:** ✅ LISTO PARA DEPLOYMENT ONSITE  
**Última actualización:** 24 de enero 2026  
**Próxima revisión:** Después del launch
