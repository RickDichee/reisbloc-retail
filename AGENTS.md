# AGENTS.md — Protocolo para Agentes de IA

Antes de realizar cualquier modificación en este repositorio, lee y obedece estrictamente:
1. **`SKILL.md`**: Protocolo operativo completo (aislamiento multi-tenant, ambientes DEV vs PROD, reglas de despliegue en Vercel, API rules y checklist pre-merge).
2. **`GEMINI.md`**: Referencia técnica del stack, arquitectura, rutas, estructura de carpetas y comandos del proyecto.

### Reglas Esenciales en Breve:
- **Base de código única para múltiples tenants:** Toda funcionalidad específica de un cliente debe registrarse en `src/config/tenantFeatures.ts` bajo la política *deny-by-default*.
- **Ambientes aislados:** Todas las pruebas, migraciones y registros se realizan exclusivamente en **DEV** (`jnyyaclrelqcqzjummwe`). El Supabase de **PROD** (`nmovxyaibnixvxtepbod`) está protegido y nunca se toca directamente.
- **Flujo de Git:** Trabajar en ramas feature (`feat/*`). Jamás hacer push ni merge a `main` sin autorización expresa del propietario, ya que `main` dispara automáticamente despliegues a producción para todos los clientes en Vercel.
- **Temas de Marca:** Estilos dinámicos centralizados en `src/config/branding.ts`, `src/hooks/useTenantTheme.ts` y `src/styles/globals.css`. No hardcodear colores específicos fuera de estos módulos.
