# Reisbloc Store - Sistema POS Multi-Tenant v3.7.3

Sistema POS SaaS para minoristas con modelo de ecosistema circular (mayoristas → tiendas → compradores).

## 🚀 Estado Actual

### Ecosistema B2B --listo

| Módulo | Supabase | Frontend | Estado |
|--------|---------|---------|--------|
| **Mayoristas** | ✅ | ✅ | Listo |
| **Catálogo Mayorista** | ✅ | ✅ | Listo |
| **Panel Mayorista** | ✅ | ✅ | Listo |
| **Adoption Tracking** | ✅ | ✅ | Listo |
| **Tienda Pública** | ✅ | ✅ | Listo |
| **PDF Export** | - | ✅ | Listo |

---

## 📊 Base de Datos

### Tablas del Ecosistema

```sql
-- Tablas existentes (legacy)
stores              -- Tiendas (legacy, por organization_id)
wholesale_catalog  -- Catálogo de productos mayoristas
store_inventory    -- Inventario de cada tienda
ecosystem_events   -- Tracking de adopciones (imports, views, reorders)
```

### Migration Keys

| Archivo | Propósito |
|---------|---------|
| `20260425_ecosystem_schema.sql` | stores, wholesale_catalog, store_inventory |
| `20260426_ecosystem_events.sql` | ecosystem_events + seeds |
| `20260427_adoption_trend_function.sql` | RPC get_wholesaler_adoption_trend |

---

## 🌐 Edge Functions

| Función |URL| Propósito |
|--------|---|----------|
| `add-product-to-store` | `/functions/v1/add-product-to-store` | Importar productos al inventario |
| `create-subscription` | `/functions/v1/create-subscription` | Suscripciones MercadoPago |
| `create-invoice` | `/functions/v1/create-invoice` | Facturación Facturapi |
| `crypto-payment` | `/functions/v1/crypto-payment` | Pagos Solana |
| `ai-insights` | `/functions/v1/ai-insights` | Analytics IA |
| `token-manager` | `/functions/v1/token-manager` | Sistema de tokens |
| `payment-webhook` | `/functions/v1/payment-webhook` | Webhook de pagos |
| `mercadopago-webhook` | `/functions/v1/mercadopago-webhook` | Webhook MP |
| `send-invitation` | `/functions/v1/send-invitation` | Invitaciones |
| `social-agent` | `/functions/v1/social-agent` | Agente social |
| `log-auth-event` | `/functions/v1/log-auth-event` | Auditoría auth |

---

## 🖥️ Frontend - Rutas

| Ruta | Página | Acceso |
|------|-------|--------|
| `/pos` | POS | admin, manager, supervisor, cashier |
| `/wholesale` | Catálogo Mayorista | admin, manager |
| `/wholesale-dashboard` | Panel Mayorista | admin, manager, wholesaler |
| `/p/:slug` | Tienda Pública | Público (QR) |
| `/analytics` | Analytics | admin, manager |
| `/agent` | IA Agent | admin, manager, supervisor |
| `/marketing` | Marketing | admin |
| `/invoicing` | Facturación | admin |
| `/settings` | Ajustes | admin |

---

## 🎨 Tema Visual

### paletas de Colores

**POS Estándar** (oscuro):
- Fondo: `#0B0B0B`
- Primary: `#10B981` (emerald)
- Secondary: `#F59E0B` (amber)

**Mayorista/Wholesale** (claro Costco/Sams):
- Fondo: `#F8FAFC`
- Primary Blue: `#035CAB`
- Red Accent: `#E31836`
- Teal Accent: `#76A5BA`
- Success: `#10B981`

---

## 🔧 Configuración

### Planes SaaS

| Plan | Precio | Features |
|------|--------|---------|
| Starter | $499/mo | 1 store, 3 users, básico |
| Growth | $999/mo | 3 stores, 10 users, inventory |
| Scale | $2,499/mo | 10 stores, 25 users, full |
| Enterprise | $4,999/mo | Unlimited |

### Roles RBAC

- `admin` - Acceso total
- `manager` - Gestión tienda
- `supervisor` - Supervisión
- `cashier` - Caja
- `employee` - Empleado

### Roles Ecosistema

- `admin` --admin
- `wholesaler` - Mayorista
- `store_owner` - Dueno de tienda
- `buyer` - Comprador

---

## 📱 i18n

Idiomas soportados:
- Español (`es`)
- Inglés (`en`)

Switcher en NavBar.

---

## 🔐 Auth

- Google OAuth (principal)
- Email/password (legacy)
- Email verification
- Device verification

---

## 🛒 Pagos

| Método | Estado |
|--------|--------|
| MercadoPago (card) | ✅ |
| Solana (crypto) | ✅ |
| Cash (offline) | ✅ |

---

## ⚙️ Variables de Entorno (.env)

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_MERCADO_PAGO_ACCESS_TOKEN=
VITE_SOLANA_RPC_URL=
VITE_SOLANA_PAYMENT_ADDRESS=
```

---

## 📦 Dependencias Clave

```json
{
  "react": "^18.3.1",
  "react-router-dom": "^6.28.0",
  "@supabase/supabase-js": "^2.48.0",
  "recharts": "^3.7.0",
  "jspdf": "^4.2.1",
  "html2canvas": "^1.4.1",
  "zustand": "^5.0.0",
  "lucide-react": "^0.469.0"
}
```

---

## 🚀 Despliegue

### Build
```bash
npm run build
```

### Supabase
```bash
supabase db push
supabase functions deploy add-product-to-store
```

---

## 📝 Notas

### Pendiente

1. **Ejecutar SQL**: `get_wholesaler_adoption_trend` function en Supabase SQL Editor
2. **RLS ecosystem_events**: Habilitar políticas por organización
3. **Public Storefront**: Mejorar UI para mostrar stock "En existencia"

### Pre-existing Issues

- Duplicados en `appStore.ts` (clearDraftForTicket, clearDraftForTable) - warnings
- `organizationSettings` unused en NavBar - warning

---

## 📅 Changelog Reciente

### v3.7.3 (2026-04-25)

- ✅ Ecosistema B2B completo
- ✅ Panel Mayorista con analytics
- ✅ Tracking de adopciones (ecosystem_events)
- ✅ PDF Export para reportes
- ✅ Tema Costco/Sams para Wholesale
- ✅ Tienda pública con QR (`/p/:slug`)
- ✅ Fix Chinese text en dashboard
- ✅ Google OAuth fix
- ✅ i18n Español/Inglés
- ✅ RLS policies auditadas

---

## 📞 Contacto

- WhatsApp: Configurado via Twilio
- Email: Facturapi integration
- Push: FCMPN tokens