# 🚀 Setup Supabase - Pasos Rápidos

## Paso 1: Crear Proyecto (5 min)

1. Ve a https://supabase.com
2. "New project"
3. **Name:** reisbloc-pos
4. **Database Password:** [generar fuerte]
5. **Region:** South America (São Paulo)
6. "Create new project"

⏳ Espera ~2 minutos...

---

## Paso 2: Crear Schema PostgreSQL (3 min)

1. Dashboard Supabase → **SQL Editor**
2. "New query"
3. **Abre el archivo:** [supabase-schema.sql](supabase-schema.sql)
4. **Copia TODO** el contenido
5. **Pega** en el SQL Editor
6. **Haz clic en "Run"**

✅ Deberías ver: "2 queries executed successfully"

---

## Paso 3: Verificar Tablas (1 min)

1. Dashboard → **Table Editor**
2. Deberías ver todas estas tablas:
   - ✅ users
   - ✅ devices
   - ✅ products
   - ✅ orders
   - ✅ sales
   - ✅ audit_logs

---

## Paso 4: Obtener Credenciales (2 min)

1. Dashboard → **Settings → API**
2. Copia:
   - **Project URL** (ej: `https://abc123.supabase.co`)
   - **anon public** (empieza con `eyJ...`)
   - **service_role** ⚠️ (secreta, empieza con `eyJ...`)

---

## Paso 5: Configurar .env.local (2 min)

En `/path/to/reisbloc-pos/.env.local`, actualiza:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://TU_PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...TU_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=eyJ...TU_SERVICE_ROLE_KEY

# Después de migrar datos:
VITE_SUPABASE_DB_ENABLED=true
```

---

## Paso 6: Migrar Datos (10 min)

```bash
cd /path/to/reisbloc-pos
npm install  # si no lo hiciste
npm run migrate:supabase
```

Verás:
```
🗄️  Migración Firebase → Supabase
📦 Migrando colección: users...
✅ users: 5/5 exitosos
...
✅ ¡Migración completada con éxito!
```

---

## Paso 7: Probar (5 min)

```bash
npm run dev
```

Abre DevTools → Console → Busca:
```
[database] Using Supabase for database operations
```

Si ves eso, ¡**está funcionando**! 🎉

---

## ⚠️ Si algo falla

### Error: "Syntax error at line 115"
→ Estás usando el Markdown en lugar del SQL limpio
→ **Usa [supabase-schema.sql](supabase-schema.sql) directamente**

### Error: "Row Level Security policy violation"
→ Verifica que las políticas se crearon
→ Dashboard → Authentication → Policies

### La app sigue usando Firebase
→ Verifica que `.env.local` tenga:
```bash
VITE_SUPABASE_DB_ENABLED=true
```
→ Reinicia: `npm run dev`

---

## 📚 Archivos Importantes

- [supabase-schema.sql](supabase-schema.sql) - SQL limpio (úsalo directamente)
- [SUPABASE_MIGRATION.md](SUPABASE_MIGRATION.md) - Guía técnica detallada
- [SUPABASE_QUICK_START.md](SUPABASE_QUICK_START.md) - Guía paso a paso

---

**¡Listo! Pasaste de Firebase a Supabase. 🎉**
