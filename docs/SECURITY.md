# Documentación de Seguridad - Reisbloc POS

## 🏆 ESTADO DE MIGRACIÓN: ESTABLE

### 🏆 HITOS ESTABLES (PUNTOS DE RESTAURACIÓN)

| Versión/Tag | Descripción | Fecha |
|-------------|-------------|-------|
| `v3.1.1-stable` | Fix: Error Boundary + Edge Function Diagnostics (aa37bd6) | Feb 2026 |

**ESTADO:** Sincronización completada. Rama `master` alineada con `staging` (feat/supabase-backend).

### 🔒 SS
**CONFIGURACIÓN FINAL - RAMA: master / staging**

```sql
-- ✅ _
-- ✅ IMPLEMENTADO: Restricción total de role 'anon' en tablas sensibles.
-- ✅ IMPLEMENTADO: Estandarización forzada de nombres a snake_case.
-- ✅ IMPLEMENTADO: RLS restrictivo para la tabla sales (Fix Error 42501)
-- ✅ IMPLEMENTADO: Despliegue de Edge Function 'generate-access-token' en Staging
-- ✅ IMPLEMENTADO: RLS permisivo en Staging para desbloqueo de Demo
-- ✅ IMPLEMENTADO: Sincronización de ramas feat/supabase-backend -> Staging
-- ✅ IMPLEMENTADO: Configuración de JWT_SECRET en Supabase Secrets (Staging)
-- ✅ IMPLEMENTADO: Sincronización de entornos (Local, Staging, Prod)
-- ✅ IMPLEMENTADO: Endurecimiento de RLS basado en Roles de JWT (v3.0.0-stable-auth)
-- ✅ IMPLEMENTADO: Validación de Roles RLS en Staging (Zero Trust)
-- ✅ IMPLEMENTADO: Sincronización de Inventario vía Triggers PostgreSQL
-- ✅ IMPLEMENTADO: Migración a Supabase Auth + JWT Nativo (Opción 1)
```

Esto permite desarrollo rápido pero **NO ES SEGURO** para producción.

### Configuración de Entornos (Vercel)

| Variable | Local | Staging (Vercel Preview) | Producción |
|----------|-------|--------------------------|------------|
| VITE_SUPABASE_URL | localhost:54321 | staging-project.supabase.co | prod-project.supabase.co |
| VITE_SUPABASE_DB_ENABLED | true | true | true |
| VITE_SUPABASE_AUTH_ENABLED | true | true | true |
| JWT_SECRET | dev-secret | ✅ Configurado | supabase secrets set |

### Sobre la Anon Key
La `VITE_SUPABASE_ANON_KEY` **no es una brecha de seguridad**. Es un identificador público necesario para que el cliente se comunique con la API. La seguridad real reside en:
1. **RLS Policies:** Que impiden que un rol `anon` acceda a datos sensibles.
2. **Edge Functions:** Que validan el PIN antes de entregar un JWT con privilegios.
3. **JWT Secret:** Que reside únicamente en el servidor (Supabase Secrets) y firma los tokens de acceso.

---

## 🔒 OPCIONES DE SEGURIDAD PARA PRODUCCIÓN

**DEBE implementarse UNA de estas opciones antes del deploy:**

### Opción 1: Supabase Auth + JWT (⭐ RECOMENDADA)

**Descripción:** Migrar completamente a sistema de autenticación Supabase

**Implementación:**
1. Crear usuarios en Supabase Auth (email/password)
2. Mapear usuarios existentes → Supabase Auth
3. Modificar login para usar `supabase.auth.signInWithPassword()`
4. Cliente automáticamente obtiene JWT
5. Actualizar RLS policies:
```sql
-- Solo usuarios autenticados
CREATE POLICY "Orders viewable by authenticated" ON orders
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Orders insertable by authenticated" ON orders
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = created_by);
```

**Pros:**
- Seguridad robusta out-of-the-box
- Manejo de sesiones automático
- Renovación de tokens integrada
- Auditoría y logs de Supabase

**Contras:**
- Requiere refactorizar sistema PIN
- Cambio en UX de login
- Migración de usuarios existentes

**Esfuerzo:** 2-3 días

---

### Opción 2: JWT Personalizado desde Cloud Function (⭐ RECOMENDADA para mantener UX actual)

**Descripción:** Mantener login con PIN, generar JWT válido para Supabase

**Implementación:**
1. Crear Cloud Function/Serverless endpoint:
```typescript
// functions/generateSupabaseToken.ts
export const generateSupabaseToken = functions.https.onCall(async (data, context) => {
  const { pin } = data;
  
  // Validar PIN contra Supabase
  const user = await supabase
    .from('users')
    .select('*')
    .eq('pin', hashedPin)
    .single();
    
  if (!user) throw new Error('Invalid PIN');
  
  // Generar JWT firmado con secret de Supabase
  const token = jwt.sign(
    {
      sub: user.id,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24h
    },
    SUPABASE_JWT_SECRET
  );
  
  return { token, user };
});
```

2. Frontend usa token:
```typescript
// useAuth.ts
const { token } = await generateSupabaseToken({ pin });
supabase.auth.setSession({ access_token: token });
```

3. RLS policies validan JWT:
```sql
CREATE POLICY "Orders viewable by role" ON orders
  FOR SELECT TO authenticated
  USING (
    (auth.jwt()->>'role')::text IN ('admin', 'capitan', 'mesero')
  );
```

**Pros:**
- Mantiene UX actual (PIN login)
- Seguridad correcta con JWT
- Compatible con sistema de dispositivos

**Contras:**
- Requiere backend/function adicional
- Manejo manual de renovación de tokens

**Esfuerzo:** 1-2 días

---

### Opción 3: RLS Restrictivo con `anon`

**Descripción:** Mantener `anon` role pero con validación estricta

**Implementación:**
```sql
-- Validar que created_by sea usuario válido
CREATE POLICY "Orders insertable with valid user" ON orders
  FOR INSERT TO anon
  WITH CHECK (
    created_by IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = created_by 
      AND active = true
    )
  );

-- Validar que updates solo cambien campos permitidos
CREATE POLICY "Orders updatable restricted" ON orders
  FOR UPDATE TO anon
  USING (true)
  WITH CHECK (
    -- No permitir cambiar created_by
    created_by = (SELECT created_by FROM orders WHERE id = orders.id)
  );
```

**Pros:**
- Rápido de implementar
- No requiere cambios en código

**Contras:**
- Menos seguro que opciones 1 y 2
- Vulnerable sin capa adicional de validación
- Difícil auditar quién hizo qué

**Esfuerzo:** 1 día

---

### Opción 4: Service Role Key (❌ NUNCA EN FRONTEND)

**Solo para:**
- Scripts de migración/admin
- Herramientas internas
- Backend servers

```typescript
// CORRECTO: Solo en backend
const supabaseAdmin = createClient(url, SERVICE_ROLE_KEY);

// ❌ INCORRECTO: Nunca en frontend
const supabase = createClient(url, SERVICE_ROLE_KEY); // NO HACER
```

---

## 📝 Checklist de Implementación

Antes de producción:

- [ ] Elegir opción de seguridad (1, 2, o 3)
- [ ] Implementar opción elegida
- [ ] Actualizar todas las RLS policies
- [ ] Eliminar policies con `TO anon` abiertas
- [ ] Probar autenticación en staging
- [ ] Probar permisos por role
- [ ] Auditar logs de acceso
- [ ] Documentar flujo para equipo
- [ ] Plan de rollback en caso de problemas

---

## 🔒 Sistema de Registro de Dispositivos

### Descripción General
Reisbloc POS implementa un sistema robusto de registro y validación de dispositivos para garantizar que solo los empleados autorizados puedan acceder a la aplicación desde dispositivos conocidos.

### 1. Información del Dispositivo Capturada

Cada dispositivo registrado almacena:

```typescript
{
  id: string;                    // ID único del dispositivo
  userId: string;                // Usuario propietario
  macAddress: string;            // MAC address único (o fingerprint)
  deviceName: string;            // Nombre del dispositivo (iPhone, Android, etc.)
  network: 'wifi' | 'mobile';   // Tipo de conexión
  os: string;                    // Sistema operativo (iOS, Android, Windows, etc.)
  browser: string;               // Navegador usado
  registeredAt: Date;            // Cuándo se registró
  lastAccess: Date;              // Último acceso
  isApproved: boolean;           // Aprobado por admin
}
```

### 2. Proceso de Registro de Dispositivo

#### Primera vez que un usuario inicia sesión:
1. El usuario ingresa su PIN
2. Se valida el PIN
3. Se captura información del dispositivo actual
4. Se genera un fingerprint único del dispositivo
5. El dispositivo se marca como "pendiente de aprobación"
6. El admin recibe notificación de nuevo dispositivo
7. Una vez aprobado, el usuario puede acceder

#### Flujo:
```
Usuario intenta login
    ↓
Ingresa PIN
    ↓
Validar PIN
    ↓
Obtener info del dispositivo
    ↓
¿Dispositivo registrado?
    ├─ No → Registrar, mostrar "Pendiente de aprobación"
    └─ Sí → ¿Está aprobado?
            ├─ No → Rechazar acceso
            └─ Sí → Permitir login
```

### 3. Obtención de MAC Address

Para máxima compatibilidad:

**Navegadores móviles**: Se usa WebRTC para obtener IP local y se genera MAC derivado
**Navegadores desktop**: Se usa WebRTC + fingerprinting del navegador
**Fallback**: Si WebRTC no funciona, se usa fingerprint de:
- User Agent
- Idioma del navegador
- Zona horaria
- Resolución de pantalla
- Número de cores

```typescript
// Ejemplo de generación de fingerprint
const fingerprint = generateFromWebRTC() || generateFromBrowserData();
// Resultado: "2C:A1:FF:FF:FF:FF" (formato MAC-like)
```

### 4. Validación de Dispositivo

En cada login:
1. Se obtiene el fingerprint del dispositivo actual
2. Se compara con los dispositivos registrados del usuario
3. Se valida estado de aprobación
4. Se actualiza `lastAccess`

```typescript
// Validación
const deviceInfo = await getDeviceInfo();
const registeredDevice = user.devices.find(d => 
  compareDevices(d, deviceInfo)
);

if (!registeredDevice) {
  throw new Error('Device not registered');
}

if (!registeredDevice.isApproved) {
  throw new Error('Device not approved');
}
```

### 5. Panel Admin para Gestión de Dispositivos

El admin puede:
- Ver todos los dispositivos registrados por usuario
- Aprobar/rechazar nuevos dispositivos
- Revocar acceso a dispositivos específicos
- Ver historial de acceso de cada dispositivo
- Forzar cierre de sesión de dispositivos

```
┌─────────────────────────────────────────┐
│ GESTIÓN DE DISPOSITIVOS                 │
├─────────────────────────────────────────┤
│                                         │
│ Usuario: José García (Capitán)         │
│                                         │
│ ☐ iPhone 12 (iOS 15)                   │
│   WiFi | Última entrada: Hoy 14:30    │
│   [Aprobado] [Revocar] [Ver logs]      │
│                                         │
│ ◆ Samsung Galaxy S21 (Android 12)      │
│   Móvil | Última entrada: Hoy 10:15   │
│   [Pendiente] [Aprobar] [Rechazar]     │
│                                         │
└─────────────────────────────────────────┘
```

## 🔐 Seguridad de Sesiones

### Expiración de Sesión
- Sesión expira después de 8 horas de inactividad
- Inactividad detectada por falta de eventos del usuario
- Se requiere volver a ingresar PIN

### Cierre de Sesión Remoto
- Admin puede cerrar sesión de cualquier usuario
- Útil si dispositivo se pierde o empleado se va

### Token de Sesión
```typescript
interface SessionToken {
  sessionId: string;
  userId: string;
  deviceId: string;
  createdAt: Date;
  expiresAt: Date;
  lastActivity: Date;
}
```

## 📊 Auditoría de Acceso

Se registra automáticamente:
- ✓ Cada login exitoso (usuario, dispositivo, hora, IP)
- ✓ Intentos de login fallidos (usuario, dispositivo, hora)
- ✓ Cambios de dispositivo aprobado/rechazado
- ✓ Acceso a dispositivo no registrado
- ✓ Cierres de sesión

```typescript
{
  timestamp: "2026-01-21T14:30:00Z",
  action: "LOGIN_SUCCESS",
  userId: "user_123",
  deviceId: "device_456",
  ipAddress: "192.168.1.100",
  network: "wifi",
  result: "APPROVED"
}
```

## 🚨 Casos de Seguridad

### Caso 1: Nuevo dispositivo móvil
1. Empleado intenta login desde nuevo iPhone
2. Sistema detecta dispositivo desconocido
3. Se registra como "Pendiente de aprobación"
4. Admin recibe notificación
5. Admin aprueba en el panel
6. Empleado puede acceder en siguientes logins

### Caso 2: Dispositivo perdido
1. Empleado reporta pérdida de dispositivo
2. Admin accede a "Dispositivos" del empleado
3. Admin hace clic en [Revocar] en el dispositivo
4. Ese dispositivo ya no puede acceder (incluso con PIN correcto)
5. Empleado puede registrar nuevo dispositivo

### Caso 3: Intento de acceso no autorizado
1. Alguien intenta usar iPhone de empleado A desde cuenta de empleado B
2. Sistema valida que el dispositivo no está asociado a empleado B
3. Login falla
4. Intento se registra en auditoría
5. Admin puede ver múltiples intentos fallidos


## 📱 Restricción por Dispositivo

Una vez que un empleado tiene dispositivos registrados:
- Solo puede acceder desde esos dispositivos aprobados
- No puede cambiar de dispositivo sin aprobación del admin
- Si pierde su dispositivo, admin debe revocar acceso
- Luego puede registrar uno nuevo

**Excepciones:**
- Admin siempre puede acceder (con validaciones)
- Supervisor puede acceder desde dispositivos aprobados

## 🛡️ Protección contra Ataques

### Fuerza Bruta
- Máximo 3 intentos de PIN fallidos
- Bloqueo temporal de 15 minutos
- Registro de intentos fallidos

### Suplantación de Identidad
- Validación de MAC/dispositivo en cada request
- Token de sesión vinculado a dispositivo
- Si token en dispositivo diferente → logout

### Man-in-the-Middle
- Usar HTTPS siempre
- Certificados SSL válidos
- WebRTC sobre conexión segura

## ✅ Checklist de Implementación

- [ ] Crear colecciones en Firestore
- [ ] Implementar DeviceService
- [ ] Integrar en componente de login
- [ ] Crear panel de gestión de dispositivos
- [ ] Implementar auditoría
- [ ] Crear reglas de seguridad en Firestore
- [ ] Testing de casos de seguridad
- [ ] Documentación de usuario
- [ ] Capacitación de admin

---

**Última actualización**: 21 de enero de 2026
