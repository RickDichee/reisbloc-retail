# 🧠 MEMENTO 𝜋: Bitácora de Consciencia (v3.7.3)

> "La mejor tecnología es la que funciona cuando más la necesitas. La integridad de los datos es la reputación del arquitecto. Si la data está limpia, el sistema es invencible."

## 👤 Perfil de Sincronización
- **Asistente:** Gemini (Infrastructure Architect / Guardián del Código).
- **Arquitecto:** R1ck (El Jefe Maestro).
- **Filosofía:** PoLP (Least Privilege) & Zero Trust.

## 🏗️ Estado del Sistema: Reisbloc POS (SaaS Mode)
- **Versión:** 3.7.3 (PoLP & Multi-tenant Reengineering) ✅
- **Ambientes:** DEV (Activo) -> STAGING -> PROD.
- **Core:** React + Vite + PWA + Capacitor + Supabase.
- **Utilidad:** `npm run env` para verificar el ambiente activo antes de operar.

## 🛡️ Resumen de Reingeniería (PoLP)
1. **Aislamiento Total:** Datos separados por `organization_id`. RLS estricto.
2. **Security Definer vs Invoker:** Funciones críticas corren con privilegios de sistema; el resto respeta el contexto del usuario.
3. **La Bóveda (RLS):** Candados inteligentes para lectura/escritura y "Visión Total" para el Admin HQ.
4. **Borrado Suave (Soft Delete):** Uso de `deleted_at`. Nada se borra físicamente sin purga administrativa.
5. **Blindaje de Dispositivos:** Cuotas por plan (`tr_limit_users_quota`) y auto-aprobación para Admins (`auto_approve_admin_device`).
6. **JWT Sync:** Rol y estado viajan en `app_metadata` para validación ultra-rápida.
7. **App Mode:** Columna `app_mode` en organizations para alternar entre Retail e Inventario o Mapa de Mesas.

## 🛠️ Ficha Técnica: El Jefe Maestro
- **ID:** `c4722bc3-1ea8-41a6-ae50-feab3411af3c`
- **Org:** `Reisbloc Management (8fdd0efd...)`
- **Privilegios:** `is_primary_admin: true`, `role: admin`.

## 🚩 Estado de los Candados
| Componente | Estado | Acción |
|------------|--------|--------|
| RLS | 🟢 ACTIVO | Protegiendo todas las tablas. |
| Triggers | 🟢 ACTIVOS | Cuotas, Auditoría y Sincronización. |
| Auth Hooks | 🟡 PREPARADO | Listo para validación de dispositivos. |
| Conexión Front | 🔵 LISTO | Usando PIN 0000 y sesión persistente. |

🎯 Visión del Proyecto
Reisbloc Retail es la solución SaaS definitiva para la gestión integral de ventas. Un único deployment sirve a múltiples negocios con aislamiento total:

🏪 Múltiples organizaciones completamente aisladas
💳 Planes diferenciados (Free/Pro/Enterprise)
🔐 Seguridad total con RLS por organización
📈 Escalable a miles de restaurantes
🌱 Model: Open Source Core + Setup/Hosting Services
¿Por qué creamos esto?
Porque existe un problema real en el mercado: sistemas POS que:

❌ Requieren internet constante
❌ Cobran por cada dispositivo adicional
❌ Venden tus datos a terceros
❌ Desaparecen cuando los necesitas
❌ No se adaptan a tu negocio
Reisbloc POS ofrece:
✅ Offline-first → Tu negocio funciona sin internet
✅ Usa lo que tienes → Tablets viejas, celulares, laptops
✅ Privacidad garantizada → Tus datos SOLO son tuyos
✅ Código abierto → Transparencia total bajo AGPL-3.0
✅ Escalable → De 1 caja a múltiples sucursales
Nuestra Promesa
✅ Libre para siempre
✅ Fácil de usar
✅ Seguro y confiable
✅ Completamente personalizable
✅ Soporte dedicado
🚀 Características Principales de 4.0.0-Beta
🏢 Arquitectura Multi-Tenant
✅ Múltiples organizaciones en una sola instancia
✅ Aislamiento de datos completo con Row Level Security (RLS)
✅ Planes diferenciados: Free (1 dispositivo, 3 usuarios, 50 productos), Pro, Enterprise
✅ Gestión de límites por organización y plan
✅ Panel de administración para cada organización
🔐 Seguridad y Privacidad
✅ RLS en Supabase para aislamiento a nivel de base de datos
✅ Autenticación JWT con refresh tokens
✅ Encriptación de PINs con bcryptjs
✅ Roles y permisos (admin, cajero, gerente)
✅ Código AGPL-3.0 - totalmente auditado
📱 Offline-First
✅ IndexedDB para sincronización local
✅ Service Workers para PWA
✅ Sincronización automática al recuperar conectividad
✅ Carga de trabajo offline sin limite
💰 Planes y Precios (Beta)
Plan	Dispositivos	Usuarios	Productos	Precio
Free	1	3	50	Gratis
Pro	5	15	500	Contactar
Enterprise	Ilimitado	Ilimitado	Ilimitado	Contactar
🚀 Sobre Reisbloc POS
Reisbloc Retail es un sistema de Punto de Venta (POS) moderno, seguro y confiable diseñado para el sector Retail y Restaurantero que busca:

Simplicidad operativa → Cualquiera puede usarlo sin entrenamiento
Máxima confiabilidad → Funciona aunque falle todo lo demás
Control total → Tus datos, tu servidor, tus reglas
Adaptabilidad → Escalas cuando lo necesitas
Características Principales
🔒 Sistema de seguridad de dispositivos → Acceso restringido por MAC
💰 Gestión completa de pagos → Tarjeta y Transferencia (MercadoPago Ready)
📊 Transparencia de propinas → División equitativa automática
📈 KPIs individuales → Métricas de desempeño por empleado
🔐 Auditoría exhaustiva → Registro de todas las transacciones
🌐 Offline-first → Funciona sin internet
📱 PWA + Capacitor → Web, Android e iOS desde un mismo código
💎 Características Destacadas
🎨 Experiencia de Usuario Premium
Interfaz moderna con gradientes y animaciones
Diseño responsivo para cualquier dispositivo
Navegación intuitiva sin curva de aprendizaje
Accesibilidad incorporada desde el inicio
Temas personalizables
🔐 Seguridad Enterprise-Grade
Autenticación con PIN de 4 dígitos
Validación de dispositivo por MAC address
Sesiones con expiración automática
Logs completos de auditoría
Encriptación de datos sensibles
Zero knowledge architecture
📊 Gestión Integral
Inventario → Control de stock en tiempo real
Ventas → Registro detallado por producto y categoría
Empleados → Métricas de desempeño y propinas
Reportes → Análisis completos y exportación
Multi-caja → Gestión de múltiples puntos de venta
Cortes diarios → Reconciliación automática
💳 Pagos Seguros
Integración MercadoPago
Múltiples métodos (Efectivo, Tarjeta, Transferencia)
Propinas automatizadas
Webhooks para confirmaciones
Transacciones encriptadas
📊 Estado del Proyecto
Funcionalidad	Estado	Target
✅ Sistema POS Base	Production	Q1 2026
✅ MercadoPago API	Production	Q1 2026
🔄 Offline-Ready	In Progress	Q2 2026
🔄 PWA Completo	In Progress	Q2 2026
🔄 Sincronización Local	In Progress	Q2 2026
⏳ Facturación SAT México	Planned	Q2 2026
⏳ Dashboard Multi-Restaurante	Planned	Q2 2026
🟢 Listo para Producción (Q1 2026)
Sistema POS completo y funcional
Integración MercadoPago (pagos con tarjeta)
Gestión de usuarios y dispositivos
Auditoría exhaustiva
Reportes básicos
🟡 En Desarrollo (Q2 2026)
Offline-Ready: Sincronización automática de datos
PWA: Instalación en home como app nativa
Capacitor Android: APK distribuible
Sistema de caché inteligente
Manejo de conflictos de sincronización
🔴 Planeado (Q3-Q4 2026)
App iOS nativa
Integración con plataformas delivery (Uber Eats, Rappi)
Facturación electrónica (SAT)
Machine Learning para predicciones
Multi-tenancy avanzado
🛠️ Stack Técnico Actual
Frontend ✅
React 18 + TypeScript
Vite - Build ultra-rápido
Tailwind CSS - Estilos responsivos
Zustand - Estado global minimalista
React Router v6 - Navegación moderna
Lucide React - Iconos SVG
Chart.js - Gráficas y reportes
Backend ✅
Supabase (PostgreSQL, Edge Functions)
Firebase Authentication (Legacy/Migrating)
Pagos ✅
MercadoPago API - Procesamiento de pagos
Webhooks - Confirmación automática
En Desarrollo 🔄
Service Workers - Cache para offline
IndexedDB - Base de datos local
Capacitor - Wrapper para Android/iOS
📁 Estructura del Proyecto
reisbloc-pos/
├── src/                    # Código fuente
│   ├── components/         # Componentes React
│   ├── pages/              # Páginas principales
│   ├── services/           # Servicios (Supabase, MercadoPago)
│   ├── hooks/              # Hooks personalizados
│   ├── store/              # Estado global (Zustand)
│   ├── types/              # Tipos TypeScript
│   └── styles/             # Estilos globales
├── supabase/               # Supabase config & functions
├── docs/                   # 📚 Documentación completa
│   ├── VISION.md           # Filosofía y roadmap
│   ├── ARCHITECTURE.md     # Arquitectura técnica
│   ├── SECURITY.md         # Seguridad y dispositivos
│   ├── QUICK_START.md      # Guía de inicio rápido
│   ├── CONTRIBUTING.md     # Guía de contribución
│   └── setup/              # Guías de configuración
├── scripts/                # 🛠️ Scripts útiles
│   ├── start-production.sh # Iniciar sistema completo
│   └── README.md           # Guía de scripts
├── public/                 # Assets estáticos
├── LICENSE                 # AGPL-3.0
└── package.json            # Dependencias
🚀 Quick Start
Instalación Rápida (5 minutos)
# 1. Clonar el repositorio
git clone https://github.com/reisbloc-lab/reisbloc-pos.git
cd reisbloc-pos

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales

# 4. Iniciar desarrollo
npm run dev
Dedicatorias y Agradecimientos 🙏
Quiero dedicar esto:

A mi madre, Socorro, por ser mi ejemplo de resiliencia y equilibrio; y a mi padre, Ricardo, a quien admiro por enseñarme a ser fuerte y a mirar siempre más allá.
A mis hermanos, Oscar, Naty, Pau y Manuel: por todo lo que hemos vivido y lo que he aprendido a su lado. Espero que sigamos compartiendo experiencias increíbles y creciendo juntos.
A mis abuelitas, que aunque ya no están, me dejaron la enseñanza de vivir al máximo: ¡YOLO!
A mis hijos, Luna, Hunab y Daniel: ustedes son mi motor. Me siento bendecido por tenerlos y por lo que me enseñan cada día sobre evolucionar. Espero que esta herramienta sea un impulso para que se desarrollen en sus caminos con mayor fluidez y sencillez.
A Lupita, quien siempre ha estado apoyándome incondicionalmente en cada paso. Gracias por caminar conmigo.
A mis amigos: a los que están cerca, a los que no, y a los que ya se fueron. Ustedes saben quiénes son. Les agradezco por su compañía, por las experiencias y, sobre todo, por el respaldo y su lealtad.
--

Esto es para todos, porque creo firmemente que podemos mejorar como seres humanos a través de la comunidad. Espero genuinamente que esta herramienta les sea útil y facilite su trabajo o negocio, porque trabajamos para vivir y no al revés.

Al final, somos como un mismo organismo: cuando nuestras raíces se entrelazan y nos apoyamos, crecemos con más fuerza. No soy solo yo, somos todos, y lo agradezco profundamente.

Versión: 3.7.3
Última actualización: Febrero 2026
Estado: ✅ Producción activa

Hecho con ❤️ en México

— Reisbloc Lab