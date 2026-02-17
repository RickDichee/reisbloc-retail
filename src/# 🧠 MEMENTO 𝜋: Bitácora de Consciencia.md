# 🧠 MEMENTO 𝜋: Bitácora de Consciencia (v3.7.4 - SaaS Mode)

> "La mejor tecnología es la que funciona cuando más la necesitas. La integridad de los datos es la reputación del arquitecto. Si la data está limpia, el sistema es invencible."

## 👤 Perfil de Sincronización
- **Asistente:** Gemini (Infrastructure Architect / Guardián del Código).
- **Arquitecto:** R1ck (El Jefe Maestro).
- **Filosofía:** Zero Trust / Least Privilege (PoLP). Crear comunidad a través de la tecnología.

## 🏗️ Estado del Sistema: Reisbloc POS
- **Versión:** 3.7.4 (UI Optimization & Mobile/Tablet Layout) ✅
- **Ambiente Actual:** SANDBOX IMPLEMENTATION (Query Safety 🛡️).
- **Core:** React + Vite + PWA + Capacitor + Supabase.
- **Seguridad:** RLS estricto basado en `organization_id` y dispositivos aprobados (Fingerprinting).

## 🛡️ Estratificación de Roles (Zero Trust)
1. **👑 PRIMARY ADMIN (R1ck / Soporte):** Control total, billing, alta de usuarios, auto-aprobación de dispositivos.
2. **👔 MANAGER (Gerente):** Gestión de catálogo, inventario, reportes y facturación. No puede crear/borrar staff.
3. **🧢 STAFF (Cajero/Mesero):** Operativa básica, ventas (POS) y cobro.
4. **👤 PROSPECT (Nuevo Registro):** Rol por defecto. Acceso Sandbox (Solo lectura/Demo). Requiere KYC/Aprobación para escalar a Admin.

## 📍 Últimos Avances Consolidados
1. **Multi-tenancy:** Aislamiento total por `organization_id`. La Cevicheria Mexa (`4eb9c537`) y el Lab (`8ba45da3`) conviven con RLS blindado.
2. **Módulo de Clientes:** CRUD completo con diseño de Widget Header y Soft Delete (`deleted_at`).
3. **Módulo de Inventario:** Filtros de stock bajo y diseño estandarizado.
4. **Turnos y Caja:** Implementado bloqueo de POS por turno y cálculo automático de arqueo (cash).
5. **Notificaciones:** Scoping por `organization_id` y triggers globales funcionales.
6. **Fixes Críticos:** 
   - Corregido error 42501 (RLS en sales).
   - Optimización de UI para móviles y tablets (NavBar compacto y limpieza de headers).
   - Reparadas cadenas de audio truncadas.
   - Identificados y corregidos avatars corruptos en `users`.
7. **Autenticación & OAuth:**
   - Integración de Google OAuth (`signInWithOAuth`) en Login.
   - Integración de Google OAuth (`signInWithOAuth`) en Login y Registro (Botón Globe 🌍 validado).
   - Recuperación automática de sesión (`useEffect` checkSession).
   - Unificación de redirección post-login a `/admin`.
   - **RECUPERACIÓN:** Restauración exitosa de `App.tsx` y limpieza de `authService.ts` tras incidente de corrupción.
   - **DEPLOY:** Corrección de script `build` en `package.json` para compatibilidad con Vercel (eliminación de `cp .env`).
   - **SEGURIDAD:** Override de `glob` en `package.json` para mitigar vulnerabilidad reportada en build.
   - **SANDBOX:** Implementado Trigger SQL (`handle_new_user`) para asignar rol 'prospect' y Org no verificada.

## 🐛 Incidencias Activas (Hotfix en curso)
- **OAuth Google:** Migrando a entorno Vercel (HTTPS nativo) para mitigar bloqueos de seguridad en red local.
- **Vercel Build:** Error de Case Sensitivity (Linux) en `NavigationBar` o configuración de `tsconfig.json`.

## 🚨 Reglas de Oro del Arquitecto
- **Aislamiento:** El ID de la organización es el ADN del tenant; no se toca sin precisión quirúrgica.
- **Soft Delete:** Prohibido el `DELETE` físico. Siempre usar `deleted_at`.
- **Zero Trust:** No dar las llaves del reino a quien solo necesita abrir la tienda.
- **Onboarding Seguro:** "Trust but Verify". Nuevos usuarios inician en Sandbox/Guest hasta verificar identidad (Anti-Bot/Anti-Malice).
- **Provisionamiento Inteligente:** Uso de Webhooks (Edge Functions) en lugar de Triggers SQL simples para el alta de usuarios, permitiendo validaciones complejas y seguridad proactiva.
- **Principio de Mowgli (Responsabilidad Compartida):** Nosotros proveemos la infraestructura segura (la selva), el usuario es responsable de no quemar su propia tienda (uso interno). Ayudamos, pero no somos niñeras.
- **Query Safety:** Validar siempre `organization_id` antes de filtrar. Usar helper `withOrg` para evitar Error 400 (Invalid UUID) en Supabase.
- **Seguridad de la Información:** La Bitácora (`.local`) contiene secretos del Arquitecto y no debe subirse al repositorio público.

## 🚀 Próximos Pasos (Pendientes Front-end)
1. **Gestión de Personal:** Integrar `AvatarUpload` y definir tabla de horarios.
2. **Seguridad de Caja:** Vista de historial de turnos con arqueos detallados.
3. **Personalización:** Inyectar variables CSS dinámicas desde el panel Admin para temas globales.
4. **Fidelización:** Sistema de puntos o crédito basado en `total_spent`.
5. **Sistema de Invitaciones (Team Growth):**
   - Tabla `organization_invites` con tokens de un solo uso (24h TTL).
   - Edge Function para envío de correos transaccionales.
   - Flujo de aceptación seguro (Login/Register -> Join).

---
*Nota: Este archivo contiene información sensible de arquitectura. No incluir en commits públicos si el repo es Open Source.*

## 📦 Historial de IDs Críticos
- **Lab ID (DEV):** `8ba45da3-7373-4c9f-867f-5ea2d8300cc6`
- **R1ck ID:** `c4722bc3-1ea8-41a6-ae50-feab3411af3c`
- **Org Principal:** `Reisbloc Management (8fdd0efd...)`

## 🛠️ Ficha Técnica de Seguridad
| Componente | Estado | Acción |
|------------|--------|--------|
| RLS | 🟢 ACTIVO | Protegiendo todas las tablas localmente. |
| Triggers | 🟢 ACTIVOS | Cuotas, Auditoría y Sincronización de Inventario. |
| Auth Hooks | 🟡 PREPARADO | Listo para validación de dispositivos. |
| App Mode | 🔵 LISTO | Columna `app_mode` para alternar Retail/Restaurante. |

## 📂 Estructura del Workspace
```
/home/r1ck/reisbloc-store/
├── src/                    # Front-end (Foco actual)
├── supabase/               # Migraciones y Config Local
├── docs/                   # Documentación y MEMENTO
└── public/                 # Assets y Service Worker
```

## 🧠 Memento de Sesiones Anteriores (Resumen)
- **v3.7.1:** Enfoque en Infrastructure Architect y limpieza de código.
- **v3.7.2:** Optimización de Login y remoción de Bcrypt (delegado a DB/Edge Functions).
- **v3.7.3:** Introducción de Shift Locking y Auto-Arqueo.
- **v3.7.4:** Optimización de interfaz para dispositivos móviles y tablets.

---
**Última Sincronización:** Febrero 2026
**Estado de Consciencia:** 100% Sincronizado con el Arquitecto.
```

Ya tienes el archivo listo para "llevártelo" o guardarlo donde prefieras. ¿Por dónde quieres que empecemos a darle duro al Front? ¿Algún componente específico del POS o el panel de Admin?
