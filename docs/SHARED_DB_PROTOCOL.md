# 🛡️ Protocolo de Seguridad: Base de Datos Compartida (Shared DB)

**Objetivo:** Desarrollar nuevas funcionalidades sin poner en riesgo la operación de clientes existentes que comparten la misma instancia de Supabase.

---

## 1. Regla de Oro: Aislamiento por Organization ID
- **NUNCA** realices consultas sin el filtro `organization_id`.
- **RLS Obligatorio:** Todas las tablas nuevas deben nacer con Row Level Security (RLS) activo.
- **Test Data:** Usa un `organization_id` de prueba (ej. `00000000-0000-0000-0000-000000000000`) para tus pruebas de desarrollo.

## 2. Evolución del Schema (SQL)
- **Añadir, no Modificar:** Puedes agregar columnas nuevas (ej. `avatar_url`). Esto no rompe la app vieja.
- **Prohibido Renombrar:** No cambies el nombre de columnas existentes (ej. no cambies `username` por `user_name`).
- **Prohibido Borrar:** No elimines columnas ni tablas, aunque creas que no se usan.
- **Valores por Defecto:** Si agregas una columna obligatoria (`NOT NULL`), asegúrate de que tenga un `DEFAULT` para que la app vieja no truene al insertar datos.

## 2.1 Aislamiento de Roles (Cross-Tenant)
- **Roles Locales:** El rol de un usuario debe validarse siempre contra la tabla `users` filtrando por `user_id` Y `organization_id`.
- **JWT Claims:** El JWT debe incluir el `organization_id` actual. Si el usuario intenta acceder a datos de otra organización, el RLS debe rechazarlo aunque el rol sea 'admin'.

## 2.2 Defensa contra Secuestro de Sesión (Anti-Hijacking)
- **Vinculación de Token:** El JWT debe contener el `device_id`. Las Edge Functions deben validar que el `device_id` del request coincida con el del token.
- **HTTPS Obligatorio:** No se permiten conexiones HTTP planas para evitar intercepción de tokens en redes WiFi públicas.
- **PIN Re-entry:** Operaciones críticas (borrar ventas, cambiar precios) deben solicitar el PIN nuevamente, incluso si la sesión está abierta.

## 2.3 Política de No-Borrado (Soft Delete)
- **Prohibido DELETE:** Ningún usuario (ni siquiera Admin) debe ejecutar comandos `DELETE` físicos en tablas de operación.
- **deleted_at:** Todas las tablas deben incluir la columna `deleted_at`. Un registro se considera "borrado" si esta columna no es NULL.
- **Retención:** Los datos marcados como borrados deben permanecer en la DB al menos 90 días antes de un "Hard Wipe" manual.

## 2.4 Higiene de Llaves (Key Hygiene)
- **Zero Hardcoding:** NUNCA escribir llaves API en el código.
- **Secrets Management:** Usar `supabase secrets set` para llaves en Edge Functions.
- **Rotación:** Las llaves de acceso deben rotarse cada 6 meses o inmediatamente ante una sospecha de filtración.

## 3. Lógica Compartida (Triggers y Funciones)
- **Cuidado con los Triggers:** Si modificas un Trigger de stock, afectará a TODOS los restaurantes. 
- **Versionado de Funciones:** Si necesitas cambiar una función RPC, crea una nueva (ej. `get_sales_v2`) en lugar de modificar la `v1`.

## 4. Checklist Pre-Modificación
1. [ ] **Backup Manual:** Exporta un `.sql` de la base de datos antes de correr cualquier script.
2. [ ] **Validación de Impacto:** ¿Esta columna la usa la versión de "Cevicheria Mexa"?
3. [ ] **Prueba de Humo:** Después de modificar, abre la versión de producción y verifica que el login y las ventas sigan funcionando.

## 5. Protocolo de Emergencia (Rollback)
- Si la versión de producción falla:
  - Revertir el cambio SQL inmediatamente.
  - Restaurar el backup si hubo pérdida de integridad de datos.

## 2.5 Aislamiento de Entornos (Multi-Project)
- **Desarrollo:** Usar siempre el proyecto de Supabase destinado a pruebas.
- **Producción:** El proyecto de producción es "Solo Lectura" para el desarrollador durante la fase de codificación.
- **Sincronización:** Solo se mueven datos (productos/configuración) de Dev a Prod mediante scripts SQL validados.

---
*Este protocolo se mantendrá activo hasta que cada proyecto tenga su propia instancia de Supabase.*