# Reisbloc POS

**Sistema de Punto de Venta SaaS para retail mexicano** - Una plataforma moderna de gestión comercial con multi-sucursal, pagos integrados y asistente IA.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb)](https://reactjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Enabled-3ecf8e)](https://supabase.com/)

## 🚀 Demo

🌐 **[reisbloc.store](https://reisbloc.com)** - Landing page de producto

## ✨ Features

### Core POS
- **Punto de Venta** - Venta en 3 taps con múltiples formas de pago
- **Inventario Inteligente** - Control de stock, alertas de reabastecimiento
- **Multi-Sucursal** - Gestiona varias tiendas desde un solo panel
- **Caja y Turnos** - Control de efectivo con arqueo automático

### Pagos Integrados
- **MercadoPago QR** - Cobro sin contacto con código QR dinámico
- **Clip Smart Match** - Sincronización automática de terminales bancarias
- **Efectivo/Tarjeta** - Soporte para cualquier forma de pago

### Inteligencia de Negocio
- **Dashboard Analytics** - Ventas, tendencias y métricas en tiempo real
- **Reportes Avanzados** - Productos top, ganancias por período, exports
- **Asistente IA** - Chatbot de WhatsApp con respuestas automatizadas (Dify)

### Monetización & Facturación
- **CFDI 4.0** - Facturación electrónica con PAC integrado
- **Tokens** - Sistema de créditos para features premium
- **Planes de Suscripción** - Launch, Grow, Scale (multi-tenant SaaS)

### Seguridad Enterprise
- **Row Level Security (RLS)** - Aislamiento total por organización
- **Device Fingerprinting** - Validación de dispositivos autorizados
- **Rate Limiting** - Protección contra abuse en webhooks
- **OAuth 2.0** - Autenticación con Google

## 🏗️ Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| Frontend | React 18, TypeScript, Vite |
| Estilos | Tailwind CSS, Lucide Icons |
| Estado | Zustand |
| Backend | Supabase (PostgreSQL + Edge Functions) |
| Auth | Supabase Auth + Google OAuth |
| Pagos | MercadoPago SDK, Clip Webhooks |
| IA | Dify.ai, Gemini Pro |
| Facturación | Facturapi (CFDI 4.0) |
| Móvil | Capacitor (Android/iOS-ready) |

## 📁 Estructura del Proyecto

```
reisbloc-store/
├── src/
│   ├── components/        # Componentes reutilizables
│   │   ├── admin/        # Panel administrativo
│   │   ├── auth/          # Login, OAuth, PIN
│   │   ├── layout/       # NavBar, Sidebar
│   │   └── pos/           # Componentes de punto de venta
│   ├── pages/             # Vistas principales
│   │   ├── POS.tsx        # Punto de Venta
│   │   ├── Inventory.tsx  # Gestión de inventario
│   │   ├── Analytics.tsx  # Dashboard de métricas
│   │   ├── Invoicing.tsx  # Facturación CFDI
│   │   └── Settings.tsx   # Configuración
│   ├── hooks/             # Custom React hooks
│   ├── services/          # API clients y servicios
│   └── utils/             # Helpers y utilities
├── supabase/
│   ├── functions/         # Edge Functions (Deno)
│   │   ├── clip-webhook/  # Webhook de Clip
│   │   ├── whatsapp-webhook/ # Bot IA de WhatsApp
│   │   ├── mercadopago-proxy/ # Proxy de pagos
│   │   └── ai-insights/   # Análisis con IA
│   ├── migrations/        # Schema y migrations DB
│   └── seed.sql           # Datos iniciales
├── docs/                   # Documentación técnica
└── landing/               # Landing page estática
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm o pnpm
- Cuenta de [Supabase](https://supabase.com)
- Git

### Instalación

```bash
# Clonar el repositorio
git clone https://github.com/RickDichee/reisbloc-retail.git
cd reisbloc-retail

# Instalar dependencias
npm install

# Copiar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales de Supabase

# Iniciar desarrollo
npm run dev
```

### Variables de Entorno

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_ENVIRONMENT=development
```

### Deploy de Edge Functions

```bash
# Login a Supabase CLI
npx supabase login

# Deploy función individual
supabase functions deploy clip-webhook

# Deploy todas las funciones
supabase functions deploy
```

## 🔐 Seguridad

- **Multi-Tenancy**: Cada organización tiene su propio espacio de datos aislado
- **RLS Policies**: Row Level Security en todas las tablas
- **JWT Validation**: Verificación de tokens en cada request
- **Device Authorization**:-whitelist de dispositivos por usuario
- **Webhook Signatures**: Validación HMAC de webhooks externos

## 📈 Roadmap

- [ ] PWA offline mode completo
- [ ] App móvil nativa (iOS/Android)
- [ ] Integración con más PACs de facturación
- [ ] Panel de admin multi-tenant
- [ ] Webhooks para integraciones de terceros

## 🤝 Contributing

1. Fork el repositorio
2. Crea tu branch (`git checkout -b feature/amazing-feature`)
3. Commit tus cambios (`git commit -m 'feat: add amazing feature'`)
4. Push a la branch (`git push origin feature/amazing-feature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

---

**Construido con ❤️ para el retail mexicano**
