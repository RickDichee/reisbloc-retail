# 🔒 IMPLEMENTACIÓN JWT Y RLS - ESTADO ACTUAL

**Fecha:** 27 de enero 2026  
**Estado:** ✅ IMPLEMENTADO Y LISTO PARA TESTEAR

---

## ✅ CAMBIOS IMPLEMENTADOS

### 1. **JWT Personalizado**
- ✅ Creado `jwtService.ts` para generar y manejar tokens
- ✅ Cloud Function `generate-access-token.ts` que firma JWT con HS256
- ✅ Integración en `useAuth.ts` - genera token después de validar PIN
- ✅ Token almacenado en localStorage (cambiar a sessionStorage en producción)
- ✅ Expiry: 24 horas

**Flujo:**
```
Usuario ingresa PIN 
  ↓
validateUser(pin) en Supabase
  ↓
Cloud Function firma JWT con user_id + role + deviceId
  ↓
Token guardado en localStorage
  ↓
Supabase client incluye token en cada request
  ↓
RLS policies validan token
```

### 2. **RLS Policies Actualizadas**
Ya corriste estas políticas. Estado actual:

✅ **Notifications** - Solo usuarios ven sus propias notificaciones
✅ **Orders** - Cocina/Bar/Mesero ven órdenes por rol
✅ **Sales** - Solo Admin/Supervisor ven ventas
✅ **Users** - Acceso restringido por rol

### 3. **Seguridad de Datos**
| Tabla | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| users | auth only | admin | admin | admin |
| devices | auth + device-approval | user | user | - |
| orders | role-based | auth | auth | - |
| sales | admin/supervisor | admin | admin | - |
| notifications | own notifications | all roles | auth | - |
| audit_logs | admin | system | - | - |

---

## 🧪 PRÓXIMOS PASOS

### 1. **Testear JWT en Desarrollo**
```bash
# El servidor debe estar corriendo
npm run dev

# Login con PIN → revisa Console:
# Deberías ver: "JWT generado exitosamente"
# localStorage → "reisbloc_auth_token" debe existir
```

### 2. **Desplegar Cloud Function**
```bash
# Asegúrate de tener secrets configurados en Supabase
supabase secrets set JWT_SECRET="your-secure-secret-here"

# Desplegar función
supabase functions deploy generate-access-token
```

### 3. **Verificar RLS en Supabase**
```
Supabase Dashboard → SQL Editor
→ Ejecutar: SELECT * FROM information_schema.role_routine_grants;
→ Deberías ver las políticas aplicadas
```

### 4. **Testing de Seguridad**
- [ ] Verificar que anon key NO puede acceder a sales
- [ ] Verificar que cocina NO puede ver audit logs
- [ ] Verificar que mesero solo ve sus notificaciones
- [ ] Verificar que token expira después de 24 horas

---

## 📋 CHECKLIST DE PRODUCCIÓN

- [ ] Cambiar JWT_SECRET a valor seguro (mínimo 32 chars random)
- [ ] Cambiar localStorage → sessionStorage
- [ ] Habilitar HTTPS (obligatorio con cookies/tokens)
- [ ] Configurar CORS en Supabase (whitelist dominio de producción)
- [ ] Revisar RLS policies finales antes de deploy
- [ ] Backup de BD Supabase
- [ ] Testing E2E de flujo login → operación → logout
- [ ] Monitoreo de failed_login en audit_logs

---

## 🔑 SECRETOS NECESARIOS EN PRODUCCIÓN

**Variables de entorno (Supabase):**
```
JWT_SECRET=<generate-random-32-char-string>
JWT_EXPIRY=86400  (24 horas en segundos)
```

**Variables frontend (.env.production):**
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
VITE_SUPABASE_AUTH_ENABLED=true
VITE_SUPABASE_DB_ENABLED=true
```

---

## 🚀 PRÓXIMAS FASES (DESPUÉS DE TESTING)

1. **Rate limiting** en login (prevenir brute force)
2. **2FA** con código temporario (verificación adicional)
3. **Refresh tokens** para renovar sin re-login
4. **Log de cambios** en datos sensibles
5. **Integración con Sentry** para monitoreo errores

---

## 📞 SOPORTE

Si hay problemas:
1. Revisar console.log en navegador
2. Verificar Cloud Function logs en Supabase
3. Validar secrets en Supabase Functions
4. Confirmar RLS policies están habilitadas
