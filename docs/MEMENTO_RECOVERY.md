# 🧠 MEMENTO 𝜋: Recuperación de Desastre (v3.7.3)

## 🚨 Incidente: Apagón y Colapso de DB Local
- **Fecha:** Febrero 2026
- **Problema:** `supabase db reset` no mostraba tablas.
- **Causa:** Migración `20260213145552_my_schema.sql` contenía comandos `DROP` que eliminaban todo el schema recién creado.

## 🛠️ Acciones de Recuperación
1. **Neutralización:** Se vació el contenido de `20260213145552_my_schema.sql`.
2. **Auto-Seed:** Se configuró `seed.sql` para invocar `create_new_tenant` automáticamente.
3. **Credenciales DEV:**
   - **Org:** Reisbloc Lab
   - **Admin:** R1ck Admin
   - **PIN:** `0000`

## 📍 Estado Actual
- **Schema:** Multi-tenant (v3.7.3) con RLS activo.
- **Ambiente:** DEV Local.
- **Próximo Paso:** Ejecutar `npx supabase db reset` para reconstruir con el seed.

## 🔄 Sincronización Local-Nube (Clean Slate Protocol)
- **Conflicto:** `migration history does not match` debido a edición manual de archivos.
- **Solución:**
  1. `npx supabase migration repair --status reverted 20260213132245` (Corregir historial remoto).
  2. `rm supabase/migrations/*.sql` (Eliminar historial local corrupto).
  3. `npx supabase db pull` (Traer la verdad desde DEV).
  4. `npx supabase db reset` (Aplicar a local).

---
> "Si la data está limpia, el sistema es invencible."
> — R1ck