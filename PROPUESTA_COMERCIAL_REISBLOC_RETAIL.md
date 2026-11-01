# Propuesta Comercial y Técnica: Suite Reisbloc Retail
## Plataforma Punto de Venta & Motor de Inventarios Multi-Sucursal en Tiempo Real con Traspasos Express (FastTransfer)

---

**Fecha de Emisión:** Octubre 2026  
**Documento:** Propuesta de Solución e Implementación Tecnológica  
**Dirigido a:** Dirección General, Gerencia de Operaciones y Administración Retail  
**Elaborado por:** Equipo de Arquitectura e Ingeniería Reisbloc POS  

---

## 1. Resumen Ejecutivo

El sector retail contemporáneo exige inmediatez, control milimétrico del inventario y cero fricción operativa entre sucursales. La pérdida de ventas por desconocimiento de existencias en tiendas hermanas y los errores humanos derivados de traspasos manuales representan una de las mayores fugas de capital y tiempo operativo.

Presentamos la solución integral para su cadena comercial: la **Adquisición e Implementación de Reisbloc Retail**, complementada con el desarrollo especializado del módulo **Multi-Store Realtime Sync & FastTransfer**.

Esta solución dota a su negocio de:
1. **Control de Inventarios en Tiempo Real:** Visibilidad simultánea e instantánea de existencias en todas las sucursales, sincronizada vía WebSockets.
2. **Traspasos de Tienda a Tienda "Effortless & Fast":** Despacho y recepción en menos de 60 segundos mediante lectura de códigos de barras, generación de manifiestos con código QR y recepción en 1 tap.
3. **Confiabilidad Transaccional y Seguridad Grado Bancario (ACID):** Eliminación absoluta de inventarios fantasma y mermas no registradas mediante procedimientos atómicos en base de datos y cadena de custodia inmutable.
4. **Plataforma POS Integral:** Punto de venta ágil, cortes de caja ciegos, facturación electrónica CFDI 4.0 SAT, pagos integrados y operación offline-first garantizada.

---

## 2. Diagnóstico del Negocio y Objetivos Clave

| Reto Operativo Actual | Consecuencia en el Negocio | Solución con Reisbloc Retail |
| :--- | :--- | :--- |
| **Desconocimiento de existencias en otras tiendas** | Ventas perdidas en mostrador ("no lo tengo en esta sucursal") y llamadas telefónicas continuas entre cajeros. | **Matriz de Stock en Vivo:** Consulta instantánea en caja que indica existencias exactas en cada sucursal en milisegundos. |
| **Traspasos lentos, manuales o en papel** | Horas perdidas capturando artículos uno por uno; errores de dedo y discrepancias numéricas. | **Modo Pistola / One-Scan:** Escaneo continuo de códigos de barra para salida y confirmación de entrada mediante escaneo de QR. |
| **Mercancía "volando" sin registro de custodia** | Pérdidas y robos hormiga durante el traslado físico entre tiendas; nadie se hace responsable. | **Estado "En Tránsito" + Vale Digital:** El stock se descuenta al salir, queda asegurado en tránsito y requiere confirmación de quien recibe. |
| **Inconsistencias por fallas de conexión** | Si se cae la red a mitad de un movimiento, los inventarios quedan desbalanceados. | **Atomicidad ACID en PostgreSQL:** Bloqueo de registros a nivel base de datos; la operación o se completa al 100% o no afecta nada. |

---

## 3. Arquitectura y Módulos de la Solución

### A. Core Suite Reisbloc Retail (Listo para Operar)
* **Punto de Venta de Alta Velocidad (POS):** Cobro en 3 toques, soporte de códigos de barra, ventas mixtas (efectivo, tarjeta, transferencias, QR MercadoPago) y apartados de mercancía.
* **Resiliencia Offline-First:** Motor local en IndexedDB con Outbox Pattern que permite seguir cobrando sin internet; sincroniza en ráfaga de fondo al restablecerse la red.
* **Caja y Control de Turnos:** Arqueos de caja ciegos, control de gastos, cálculo de diferencias y reportes de liquidación.
* **Facturación Electrónica SAT (CFDI 4.0):** Integración nativa con Facturapi para timbrado fiscal automático.
* **Seguridad y Control de Dispositivos:** Whitelist y autorización de terminales por hardware, autenticación con PIN rápido y control de roles (Administrador, Gerente, Supervisor, Cajero).
* **Compatibilidad de Hardware:** Funciona en PC, laptops, terminales táctiles y tabletas Android (vía app nativa Capacitor), compatible con pistolas lectoras e impresoras térmicas ESC-POS estándar.

---

### B. Módulo Especializado: Inventarios en Tiempo Real (Real-Time Sync)
* **Motor WebSockets con Supabase:** La base de datos emite pulsos automáticos (`REPLICA IDENTITY FULL`) cada vez que ocurre una venta o ajuste en cualquier sucursal.
* **Visualizador Cruzado en Mostrador:** El cajero puede teclear o escanear un SKU y ver una ventana emergente:
  * *Sucursal Matriz:* 14 unidades
  * *Sucursal Plaza Norte:* 3 unidades
  * *Sucursal Centro:* Agotado
* **Alertas Inteligentes de Reabastecimiento:** Notificación automática en el panel de compras cuando una tienda llega a su stock mínimo operativo.

---

### C. Módulo Especializado: Traspasos Express (FastTransfer Engine)
* **Paso 1 - Despacho de Salida (30 segundos):**
  1. El encargado selecciona sucursal destino.
  2. Pasa la pistola lectora de códigos de barra sobre los artículos.
  3. Presiona *"Despachar Traspaso"*.
  4. El stock de origen se descuenta en ese instante exacto para impedir que se venda dos veces.
  5. Se imprime un ticket/manifiesto físico o digital con un código QR de traslado.
* **Paso 2 - Mercancía en Custodia (En Tránsito):**
  * La mercancía no pertenece a la tienda de origen ni ha ingresado a la de destino; se clasifica contablemente en estatus `EN TRÁNSITO`.
* **Paso 3 - Recepción Express en Destino (1 Clic):**
  * La sucursal receptora abre su pantalla de traspasos pendientes o escanea directamente el código QR del bulto/manifiesto.
  * Valida las piezas y presiona *"Confirmar Recepción"*.
  * El inventario se abona de inmediato en su stock local.
* **Paso 4 - Control de Discrepancias:**
  * Si se enviaron 10 unidades y se reciben 9, el sistema levanta una alerta de merma/faltante asignada al folio con registro inmutable en auditoría.

---

## 4. Plan de Trabajo y Cronograma de Implementación

El proyecto se despliega de manera ágil y controlada en un plazo total de **3 semanas**, garantizando cero interrupción en la operación actual:

| Semana | Hito / Fase | Entregables Principales |
| :---: | :--- | :--- |
| **Semana 1** | **Alistamiento de Reisbloc & Arquitectura Multi-Tienda** | • Despliegue de base de datos aislada en Supabase.<br>• Creación del modelo relacional de inventario por sucursal (`branch_inventory`).<br>• Carga e importación del catálogo maestro de productos y códigos de barra.<br>• Alta de usuarios, sucursales y permisos. |
| **Semana 2** | **Desarrollo del Motor FastTransfer & Realtime** | • Activación de canales WebSocket para actualización en vivo.<br>• UI del visor de existencias multi-sucursal en POS e Inventario.<br>• Módulo de despacho por escaneo de código de barras.<br>• Generador de vales de traslado y código QR con soporte de impresión. |
| **Semana 3** | **Seguridad Transaccional, Pruebas & Puesta en Marcha** | • Procedimiento RPC atómico PostgreSQL (`process_branch_transfer`) con bloqueo `FOR UPDATE`.<br>• Módulo de recepción en 1 tap y registro de discrepancias.<br>• Pruebas de estrés y corte de red.<br>• Capacitación al personal operativo y salida a producción. |

---

## 5. Propuesta Económica y Opciones de Inversión

Ofrecemos dos esquemas transparentes de adquisición e implementación adaptados a las necesidades operativas de su negocio:

### Opción 1: Paquete "Reisbloc Pro + FastTransfer" (Recomendado)
*Ideal para cadenas de 2 a 10 sucursales que buscan velocidad, certeza de inventario y cero pérdida de producto.*

* **Alcance Incluido:**
  * Licencia de uso completo de la plataforma Reisbloc Retail POS.
  * Módulo de Inventarios Multi-Sucursal en Tiempo Real (WebSockets).
  * Motor de Traspasos Express mediante código de barras y vales QR.
  * Procedimientos transaccionales ACID de alta seguridad en base de datos.
  * Migración y carga inicial del catálogo maestro de productos.
  * Capacitación virtual para administradores, encargados y cajeros.
* **Inversión Inicial de Implementación & Setup:** **$1,750 USD** *(o $33,500 MXN)*
  * *Esquema de pago:* 50% de anticipo al inicio de trabajos, 50% al entregar el sistema probado en producción.
* **Cuota Mensual de Servicio Cloud & Mantenimiento:** **$79 USD / mes** *(o $1,500 MXN / mes)*
  * Incluye: Servidor de base de datos en la nube (Supabase), soporte técnico prioritario, respaldos diarios automatizados y actualizaciones continuas del sistema.

---

### Opción 2: Paquete "Reisbloc Enterprise Omnicanal"
*Diseñado para cadenas en rápida expansión con logística centralizada y choferes de reparto.*

* **Todo lo incluido en el Paquete Pro, más:**
  * **Notificaciones Automatizadas por WhatsApp:** Alertas automáticas enviadas al gerente o encargado de tienda cuando un traspaso sale de almacén y cuando es recibido.
  * **App Móvil de Traslados para Chofer:** Módulo web-móvil para transportista con captura de firma digital en pantalla al entregar la mercancía.
  * **Tablero de Auditoría y Detección de Faltantes:** Gráficas de mermas e incidencias de traslado por chofer y por sucursal.
* **Inversión Inicial de Implementación & Setup:** **$2,650 USD** *(o $50,500 MXN)*
  * *Esquema de pago:* 50% anticipo, 25% a la entrega del hito de traspasos, 25% a la entrega final.
* **Cuota Mensual de Servicio Cloud & Mantenimiento:** **$129 USD / mes** *(o $2,450 MXN / mes)*

---

## 6. Retorno de Inversión (ROI) y Beneficios Tangibles

1. **Recuperación Inmediata de Ventas Perdidas:** Al permitir que cualquier cajero identifique en 3 segundos si otra sucursal tiene la prenda o artículo solicitado, se rescata entre un **12% y un 18% de ventas** que antes se daban por perdidas.
2. **Ahorro de Tiempo Operativo (90% menos tiempo):** Un traspaso que antes tomaba 15 a 25 minutos de llamadas, notas en papel y captura manual se ejecuta en **menos de 60 segundos** con pistola de códigos de barra.
3. **Cero Fugas y Pérdidas de Mercancía:** Al existir un responsable emisor, un vale con código QR y un responsable receptor, se acaba el extravío de mercancía "en el camino".
4. **Tranquilidad Tecnológica:** La arquitectura no se cuelga ni duplica datos; la base de datos PostgreSQL respalda cada centavo e inventario de su patrimonio comercial.

---

## 7. Próximos Pasos para Iniciar

1. **Aprobación de la Propuesta:** Selección de paquete preferido y formalización.
2. **Reunión de Alineación Inicial (Kickoff):** Recepción de catálogo maestro de productos (Excel/CSV) y definición de sucursales a registrar.
3. **Despliegue y Entrega:** Ejecución del cronograma de 3 semanas con entregas funcionales semanales para pruebas de su equipo.

---

*Reisbloc Retail — Software de Punto de Venta y Gestión Comercial para Cadenas Retail*  
*Contacto: Soporte y Soluciones de Ingeniería Reisbloc POS*
