# REISBLOC-STATUS.md — Estado Operativo del Sistema

**Versión:** 4.1.0  
**Fecha de actualización:** 1 de Noviembre de 2026  
**Ambiente Activo en Desarrollo:** Supabase DEV (`jnyyaclrelqcqzjummwe`)  
**Ambiente de Producción Protegido:** Supabase PROD (`nmovxyaibnixvxtepbod`)

---

## 🏢 Estatus de Tenants en Producción y Desarrollo

| Tenant | Dominio Oficial | Org ID | Estado | Branding / Tema | Features Activas |
|---|---|---|---|---|---|
| **Moda Miel MX** | `modamielmx.reisbloc.com` | `1b498fa6-aca5-428c-9bdd-01e6fea30316` | Activo / En Producción | `#D4386C` (Rose Berry) | Venta por paquete (`packLabel`), Tienda Web |
| **Los Chunches de Cons** | `loschunchesdecons.com`<br>`www.loschunchesdecons.com` | `a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d` | Listo para Producción (DEV verificado) | `#C83E74` (Berry Rose) | Costo unitario privado (`unitCost`), Referencia web ML (`webReference`), Tienda Web |
| **Juguetes San Judas Tadeo** | `sanjudastadeo.reisbloc.com` | `324fd41f-b8af-4aef-9ea6-2f954350775a` | En Configuración | `#C8323E` (San Judas Red) | POS Básico / Retail Estándar |
| **Reisbloc Store Base** | `store.reisbloc.com` | *Global* | Activo / SaaS Core | `#0D9488` (Teal) | Ecosistema B2B Mayorista + Minorista |

---

## 🗺️ Mapa de Rutas del Frontend

| Ruta | Nombre del Módulo | Descripción | Roles con Acceso |
|---|---|---|---|
| `/pos` | Punto de Venta | Cobro ágil, apartados, tickets y lectores | admin, manager, supervisor, cashier, employee |
| `/inventory` | Inventario Central | Stock central, códigos de barra, costos e importación | admin, manager, supervisor, cashier |
| `/clients` | Clientes & Crédito | Historial de clientes, saldos pendientes y apartados | admin, manager, supervisor, cashier |
| `/closing` | Cierre de Caja | Arqueo de caja, corte de turno y balances | admin, manager, supervisor, cashier |
| `/reports` | Reportes Financieros | Métricas de ventas, flujo y rendimiento de productos | admin, manager, supervisor |
| `/analytics` | Métricas Predictivas | Proyección de ventas 7d/30d y alertas de reabasto | admin, manager |
| `/purchases` | Compras | Registro de entradas de mercancía y proveedores | admin, manager |
| `/ecommerce` | Tienda en Línea | Gestión de catálogo digital y pedidos web | admin, manager |
| `/wholesale` | Catálogo Mayorista | Precios por volumen y bulto para distribuidores | admin, manager |
| `/wholesale-dashboard` | Portal B2B Mayorista | Pedidos y adopciones de tiendas afiliadas | admin, manager, wholesaler |
| `/admin` | Administración | Gestión de usuarios, roles, accesos y sucursales | admin |
| `/settings` | Configuración | Ajustes de ticket, preferencias y personalización | admin, manager |

---

## 🔄 Infraestructura y Despliegues

### Vercel Projects
1. **`reisbloc-retail`**: Proyecto base para `store.reisbloc.com` y tenants estándar.
2. **`loschunches`**: Proyecto exclusivo para Los Chunches de Cons.
   - Dominios configurados con SSL automático: `loschunchesdecons.com` y `www.loschunchesdecons.com`.
   - DNS gestionado en Cloudflare (modo DNS Only / nube gris).
   - Enrutamiento de correos corporativos activo vía Cloudflare Email Routing.

### Supabase DEV (`jnyyaclrelqcqzjummwe`)
- **Autenticación:**
  - Proveedor Email habilitado.
  - Cuentas activas verificadas para Los Chunches: `admin@loschunchesdecons.com` y `ventas@loschunchesdecons.com`.
  - Allow-list de redirección configurada con wildcard para dominios personalizados.
- **Base de Datos:**
  - Tablas operativas: `retail_products`, `products`, `orders`, `order_items`, `customers`, `users`, `organizations`.
  - Columnas añadidas: `retail_products.unit_cost` para costos privados de administración.
  - Catálogo de Los Chunches: 8 productos cargados con fotos locales optimizadas.

---

## 🛠️ Mejoras Recientes de Experiencia de Usuario (UX)

1. **POS Móvil sin Obstrucciones:** La barra fija de navegación inferior de pantallas móviles se oculta de forma inteligente en `/pos` para garantizar el acceso libre a los botones de cobro y ticket.
2. **Encabezado de Inventario Homologado:** Estructura oscura moderna (`bg-slate-900 border-slate-800 text-white`) con badge `Stock Central` y uso de variables de marca (`bg-[var(--primary)]`).
3. **Módulo Analytics Universal:** Proyecciones estadísticas predictivas integradas al sidebar en la sección "Analítica & Proyecciones", accesibles para administradores de todos los tenants.
4. **Armonía de Color en Moda Miel:** Corrección del token `--primary` a `#D4386C` (Rose Berry) con hover `#B52656`, manteniendo el alto contraste sobre el fondo oscuro fintech.
