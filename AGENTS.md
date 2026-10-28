# AGENTS.md

Antes de tocar este repositorio, leer y obedecer **`SKILL.md`** en la raíz — contiene el protocolo completo del proyecto (multi-tenant, DEV vs PROD, deploy Vercel, API rules, fixes ya implementados y roadmap).

Resumen en una línea: **una base de código para varios tenants; todo feature cliente-específico va por `src/config/tenantFeatures.ts` (deny-by-default), se prueba solo en DEV (`jnyyaclrelqcqzjummwe`), y jamás se despliega sin creer merge a `main`.**
