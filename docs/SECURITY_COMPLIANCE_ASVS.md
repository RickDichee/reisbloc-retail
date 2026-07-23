# 🛡️ Matriz de Cumplimiento OWASP ASVS Nivel 2 — Reisbloc Retail

**Programa de Seguridad de la Información y Certificación de Código**  
**Versión:** 1.0 (Julio 2026)  
**Alcance (Scope):** Reisbloc POS Web/Mobile, Supabase Auth/PostgreSQL RLS, Edge Functions Serverless.

---

## 📑 Resumen del Estado de Cumplimiento

| Capítulo ASVS | Dominio de Seguridad | Estado | Evidencia / Mecanismo de Control |
| :--- | :--- | :--- | :--- |
| **V1: Arquitectura** | Aislamiento Multitenant y Diseño Seguro | **CUMPLIDO** | RLS estricto por `organization_id` en Supabase ([20260723000001_security_hardening.sql](file:///Users/Daniel/reisbloc-retail/supabase/migrations/20260723000001_security_hardening.sql)). |
| **V2: Autenticación** | Gestión de Identidad y Verificación | **CUMPLIDO** | Email verification forzoso sin auto-confirmación; Hashing `Bcrypt` en PINs. |
| **V3: Control de Acceso** | Autorización RBAC y Principio de Menor Privilegio | **CUMPLIDO** | Restricción RPC `get_user_id_by_email` a `service_role`; Validación RBAC en Edge Functions. |
| **V4: Validación de Inputs** | Prevención de XSS e Inyecciones | **CUMPLIDO** | Sanitización de HTML vía `DOMPurify.sanitize()` en [sanitize.ts](file:///Users/Daniel/reisbloc-retail/src/utils/sanitize.ts). |
| **V5: Criptografía** | Gestión de Secretos y Algoritmos | **CUMPLIDO** | Eliminación de tokens cliente; Almacenamiento seguro en Supabase Vault / Env Vars. |
| **V7: Protección de Datos** | Minimización de Datos y Privacidad (GDPR/LFPDPPP) | **CUMPLIDO** | Proyección selectiva de columnas; Anonimización de métricas en agentes IA. |
| **V10: Notificación y Logs** | Trazabilidad e Idempotencia de Webhooks | **CUMPLIDO** | Verificación de firma `HMAC-SHA256` en [mercadopago-webhook/index.ts](file:///Users/Daniel/reisbloc-retail/supabase/functions/mercadopago-webhook/index.ts). |
| **V14: Seguridad HTTP** | Encabezados de Seguridad y CSP | **CUMPLIDO** | Headers `HSTS`, `CSP`, `X-Frame-Options: DENY`, `nosniff` en [vercel.json](file:///Users/Daniel/reisbloc-retail/vercel.json). |

---

## 🛠️ Procedimiento de Auditoría Continua

1. **Escaneo Automático en CI/CD:** El archivo [.github/workflows/security-audit.yml](file:///Users/Daniel/reisbloc-retail/.github/workflows/security-audit.yml) ejecuta pruebas estáticas (SAST), escaneo de secretos (TruffleHog) y auditoría de dependencias (`npm audit`) en cada Pull Request.
2. **Restricciones de Planes SaaS:** Las Edge Functions de Facturación (`create-invoice`), IA Insights (`ai-insights`) y Redes Sociales (`social-agent`) verifican el plan del negocio y bloquean con HTTP 403 en cuentas gratuitas.
3. **Revisión Trimestral de Roles:** Revisión de privilegios `is_primary_admin` y políticas de RLS en base de datos.
