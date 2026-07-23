# 📜 Política General de Seguridad de la Información — Reisbloc Retail

**Reisbloc Store S.A. de C.V.**  
**Versión:** 1.0 (Julio 2026)  
**Clasificación:** Uso Interno y Clientes Corporativos  
**Estándares de Referencia:** PCI-DSS v4.0 (Req. 12), ISO/IEC 27001 (Cláusula 5), SOC 2 (Trust Services Criteria)

---

## 1. Objetivo y Alcance
Esta política establece las directrices fundamentales para garantizar la confidencialidad, integridad y disponibilidad de la información de los usuarios, comerciantes y operaciones de cobro en la plataforma **Reisbloc Retail**.

Aplica a todo el software, bases de datos, microservicios, personal de ingeniería y proveedores externos involucrados en la operación de Reisbloc.

---

## 2. Principios de Seguridad

1. **Aislamiento Multitenant Estricto:** Toda información de los comercios (ventas, clientes, cierres de caja) está segregada lógicamente mediante Row Level Security (RLS). Ningún comerciante puede acceder a los datos de otra organización.
2. **Minimización de Datos y Privacidad:** Solo se recolectan y procesan los datos estrictamente necesarios para operar el servicio POS y la facturación fiscal.
3. **Cero Almacenamiento de Tarjetas:** Queda estrictamente prohibido almacenar números de tarjetas de crédito/débito (PAN), códigos de seguridad (CVV) o datos de banda magnética en cualquier infraestructura propia de Reisbloc. Todo cobro se tokeniza a través de pasarelas certificadas PCI-DSS Nivel 1 (MercadoPago / Conekta).
4. **Gestión Segura de Claves y Tokens:** Las claves secretas de producción (Service Role Keys, Webhook Tokens, API Keys) se resguardan en variables de entorno cifradas de servidor y nunca se exponen al código cliente (React/PWA).
5. **Sanitización y Prevención XSS/Inyección:** Todo contenido ingresado por usuarios o renderizado dinámicamente debe ser sanitizado con `DOMPurify` antes de ser procesado o impreso.

---

## 3. Roles y Responsabilidades

- **Chief Information Security Officer (CISO) / Líder de Ingeniería:** Responsable de revisar anualmente esta política, coordinar análisis de código en CI/CD y gestionar incidentes de seguridad.
- **Equipo de Desarrollo:** Responsable de seguir prácticas de codificación segura (OWASP ASVS), revisar pull requests y asegurar que ningún commit contenga credenciales expuestas.
- **Comerciantes / Administradores de Tienda:** Responsables de mantener la confidencialidad de sus contraseñas y PINs de acceso al punto de venta.

---

## 4. Respuesta a Incidentes de Seguridad

En caso de sospecha o confirmación de un incidente de seguridad (e.g. intento de intrusión, comportamiento anómalo en webhooks):
1. **Notificación:** Notificar inmediatamente a `security@reisbloc.store`.
2. **Contención:** Inactivar la API Key o sesión afectada en Supabase Dashboard / Vercel.
3. **Análisis y Corrección:** Realizar trazabilidad mediante logs de auditoría en Edge Functions y aplicar el parche de seguridad correspondiente en un plazo no mayor a 24 horas.
