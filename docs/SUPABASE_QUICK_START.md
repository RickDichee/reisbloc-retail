# 🚀 Guía Rápida: Migración a Supabase

Esta guía te lleva paso a paso para migrar Reisbloc POS de Firebase a Supabase.

## ⏱️ Tiempo estimado: 30-45 minutos

---

## 📋 Pre-requisitos

- [x] Cuenta de Supabase (gratis en [supabase.com](https://supabase.com))
- [x] Acceso a tu proyecto Firebase actual
- [x] Node.js instalado (v18+)
- [x] Este repositorio clonado localmente

---

## 🎯 Paso 1: Crear Proyecto en Supabase (5 min)

### 1.1 Registrarse en Supabase
1. Ve a [supabase.com](https://supabase.com)
2. Clic en "Start your project"
3. Crear cuenta (con GitHub es más rápido)

### 1.2 Crear Nueva Organización
1. Dashboard → "New organization"
2. Nombre: `Reisbloc Lab`
3. Plan: **Free** (para empezar)

### 1.3 Crear Nuevo Proyecto
1. "New project"
2. **Name:** `reisbloc-pos`
3. **Database Password:** [Generar contraseña fuerte y GUARDARLA]
4. **Region:** `South America (São Paulo)` (más cercano)
5. "Create new project"

⏳ **Espera ~2 minutos** mientras Supabase crea tu proyecto...

---

## 🔑 Paso 2: Obtener Credenciales (2 min)

### 2.1 API Keys
1. Dashboard → Settings → API
2. Copiar:
   - **Project URL** (ej: `https://abc123.supabase.co`)
   - **anon public key** (empieza con `eyJ...`)
   - **service_role key** (⚠️ ¡SECRETA! empieza con `eyJ...`)

### 2.2 Guardar en .env.local
```bash
cd /home/r1ck/reisbloc-pos
cp .env.example .env.local
```

Editar `.env.local` y agregar:
```bash
VITE_SUPABASE_URL=https://TU_PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=eyJ...tu_service_role_key

# Feature flags (inicialmente false)
VITE_SUPABASE_AUTH_ENABLED=false
VITE_SUPABASE_DB_ENABLED=false
VITE_SUPABASE_STORAGE_ENABLED=false
```

⚠️ **IMPORTANTE:** Nunca subir `.env.local` a git (ya está en .gitignore)

---

## 🗄️ Paso 3: Crear Schema PostgreSQL (5 min)

### 3.1 Abrir SQL Editor
1. Dashboard Supabase → SQL Editor
2. "New query"

### 3.2 Copiar y Ejecutar Schema
Copia TODO el contenido de `docs/SUPABASE_MIGRATION.md` sección **2.1 Crear Schema PostgreSQL**

O ejecuta directo desde terminal:
```bash
# Crear archivo SQL
cat > /tmp/schema.sql << 'EOF'
[COPIAR TODO EL SCHEMA AQUÍ]
EOF

# Ejecutar en Supabase (necesitas supabase CLI)
npx supabase db push
```

### 3.3 Verificar Tablas Creadas
Dashboard → Table Editor → Deberías ver:
- ✅ users
- ✅ devices
- ✅ products
- ✅ orders
- ✅ sales
- ✅ audit_logs

---

## 🔐 Paso 4: Configurar Row Level Security (3 min)

### 4.1 Ejecutar RLS Policies
En el mismo SQL Editor de Supabase, ejecuta el contenido de la sección **2.2 Row Level Security (RLS)** de `docs/SUPABASE_MIGRATION.md`

### 4.2 Verificar Políticas
Dashboard → Authentication → Policies → Deberías ver las políticas creadas

---

## 📦 Paso 5: Migrar Datos de Firebase (10 min)

### 5.1 Instalar dependencias (si no lo has hecho)
```bash
npm install
```

### 5.2 Configurar variables de Firebase
Asegúrate de que tu `.env.local` tenga las variables de Firebase:
```bash
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_PROJECT_ID=...
# etc.
```

### 5.3 Ejecutar Migración
```bash
npm run migrate:supabase
```

Verás algo así:
```
🗄️  Migración Firebase → Supabase
=====================================

⚙️  Configuración:
   Firebase Project: reisbloc-pos-123
   Supabase URL: https://abc123.supabase.co
   
⚠️  ¿Continuar con la migración? (y/n): y

📦 Migrando colección: users...
   📊 5 documentos encontrados
   ✅ Batch 0-5 migrado
   📊 Resumen: 5/5 exitosos, 0 fallidos

[...]

✅ ¡Migración completada con éxito!
```

### 5.4 Verificar Datos en Supabase
Dashboard → Table Editor → users → Deberías ver tus usuarios migrados

---

## 🧪 Paso 6: Testing (10 min)

### 6.1 Habilitar Feature Flag de Database
Editar `.env.local`:
```bash
VITE_SUPABASE_DB_ENABLED=true  # ⬅️ Cambiar a true
```

### 6.2 Levantar App en Dev
```bash
npm run dev
```

### 6.3 Testing Checklist
- [x] Login funciona
- [ ] Ver productos
- [ ] Crear nueva orden
- [ ] Actualizar orden
- [ ] Ver historial de ventas
- [ ] Dispositivos se aprueban correctamente

### 6.4 Monitorear Logs
Abrir DevTools → Console → Deberías ver:
```
[database] Using Supabase for database operations
```

---

## ✅ Paso 7: Rollout Gradual (Opcional)

Si todo funciona perfecto en local, puedes hacer rollout en producción:

### 7.1 Deploy a Producción
```bash
npm run build
firebase deploy  # O tu método de deploy actual
```

### 7.2 Configurar Variables en Hosting
Si usas Netlify/Vercel/etc., agregar las variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_DB_ENABLED=true`

### 7.3 Monitorear 7 días
- Ver logs de errores
- Comparar performance Firebase vs Supabase
- Verificar que no hay data loss

---

## 🔄 Rollback (Si algo falla)

Si algo sale mal:

```bash
# En .env.local, cambiar:
VITE_SUPABASE_DB_ENABLED=false  # ⬅️ Volver a false
```

La app volverá a usar Firebase automáticamente. No pierdes datos.

---

## 📊 Costos Comparados

### Firebase (después de crecer a 1000 restaurantes)
```
Firestore: ~$102/mes
Functions: ~$40/mes
Storage: ~$26/mes
TOTAL: ~$168/mes
```

### Supabase (1000 restaurantes)
```
Plan Pro: $25/mes
TOTAL: $25/mes
```

**Ahorro: ~85% ($143/mes)**

---

## 🎉 ¡Listo!

Si llegaste aquí, ya tienes Supabase funcionando. Próximos pasos:

1. **Monitorear 7 días** en producción
2. **Desactivar Firebase** cuando todo esté estable:
   ```bash
   VITE_SUPABASE_DB_ENABLED=true
   # Y dejar de pagar Firebase 💰
   ```
3. **Eliminar código legacy** de Firebase (opcional)

---

## 🆘 Troubleshooting

### Error: "No project URL provided"
- Verifica que `.env.local` tenga `VITE_SUPABASE_URL`
- Reinicia el servidor (`npm run dev`)

### Error: "Row Level Security policy violation"
- Verifica que ejecutaste todas las policies RLS
- Dashboard → Authentication → Policies

### Error: "Migration failed - invalid credentials"
- Verifica que usaste `SUPABASE_SERVICE_ROLE_KEY` (no anon key)
- La service key debe empezar con `eyJ...`

### Los datos no aparecen
- Verifica que `VITE_SUPABASE_DB_ENABLED=true`
- Abre DevTools → Console → Busca "[database] Using Supabase"
- Si dice "Using Firebase", las variables no se cargaron

---

## 📚 Recursos

- [Documentación Supabase](https://supabase.com/docs)
- [SUPABASE_MIGRATION.md](./SUPABASE_MIGRATION.md) (guía técnica detallada)
- [PostgreSQL Tutorial](https://www.postgresql.org/docs/current/tutorial.html)
- [Supabase Dashboard](https://supabase.com/dashboard)

---

**¿Dudas?** Revisa `docs/SUPABASE_MIGRATION.md` para detalles técnicos.
