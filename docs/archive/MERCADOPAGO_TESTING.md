# 🔧 Guía de Integración MercadoPago - Pruebas Prácticas

## 🧪 Cuentas de Prueba (Sandbox)

### 1. Panel de Desarrolladores MercadoPago

#### Paso 1: Obtener Credenciales de Prueba
1. Ve a https://www.mercadopago.com.mx/developers/es/docs/checkout-api/landing
2. En el dashboard, ve a **Credenciales de prueba**
3. Copiar:
   - **Public Key (TEST)**: Comienza con `TEST-` 
   - **Access Token (TEST)**: Comienza con `APP_USR-...` (modo TEST)

#### Paso 2: Usuarios de Prueba
MercadoPago crea automáticamente 2 usuarios:
- **Vendedor**: Recibe los pagos (tu cuenta)
- **Comprador**: Realiza los pagos (para testing)

### 2. Actualizar `.env.local`

```dotenv
# Credenciales de PRUEBA (TEST)
VITE_MERCADOPAGO_PUBLIC_KEY=TEST-a1b2c3d4e5f6g7h8i9j0
VITE_MERCADOPAGO_ACCESS_TOKEN=APP_USR-123456789-abcdefghij-klmnopqrst-uvwxyz1234

# URL local
VITE_APP_URL=http://localhost:5173
VITE_APP_ENV=development
```

### 3. Tarjetas de Prueba

| Tarjeta | Número | Exp | CVV | Resultado |
|---------|--------|-----|-----|-----------|
| Visa APRO | 4509 9535 6623 3704 | 11/25 | 123 | ✅ Aprobado |
| Visa OTHE | 4000 0000 0000 0002 | 11/25 | 123 | ❌ Rechazado |
| Master APRO | 5031 7557 3453 0604 | 11/25 | 123 | ✅ Aprobado |
| Amex APRO | 3711 803032 57522 | 11/25 | 123 | ✅ Aprobado |

**Para todas las tarjetas**:
- Nombre: `APRO` (u otro)
- Email: `test@test.com`

---

## 📋 Flujo de Testing Completo

### Escenario 1: Pago con Tarjeta (Efectivo simulado)

```
1. App abierta en http://localhost:5173
2. Login → Seleccionar un usuario
3. POS → Agregar productos
4. Carrito → Clic en "Enviar a cocina"
5. Panel de pago → Método: Efectivo
6. Ver confirmación ✅
```

### Escenario 2: Pago con MercadoPago (futuro - Checkout Pro)

```
1. Agregar productos al carrito
2. Clic en "Pagar"
3. Panel de pago → Seleccionar "Tarjeta" o "Digital"
4. Se abre formulario de pago (en versión 2.1+)
5. Ingresar datos de tarjeta de prueba
6. Completar pago
```

---

## 🔌 API Endpoints de MercadoPago

### 1. Crear Preferencia de Pago

```bash
curl -X POST \
  'https://api.mercadopago.com/checkout/preferences' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer APP_USR-YOUR_TOKEN' \
  -d '{
    "items": [
      {
        "title": "Mesa 5 - Orden 12345",
        "quantity": 1,
        "currency_id": "MXN",
        "unit_price": 250.00
      }
    ],
    "external_reference": "order-12345",
    "payer": {
      "email": "customer@email.com"
    }
  }'
```

**Respuesta**:
```json
{
  "id": "preference_id_123456",
  "init_point": "https://www.mercadopago.com/checkout/v1/redirect?pref_id=...",
  "sandbox_init_point": "https://sandbox.mercadopago.com/checkout/v1/redirect?pref_id=..."
}
```

### 2. Obtener Lista de Terminales (Físicas)

```bash
curl -X GET \
  'https://api.mercadopago.com/terminals/v1/list?limit=50' \
  -H 'Authorization: Bearer APP_USR-YOUR_PRODUCTION_TOKEN'
```

**Nota**: Solo funciona con credenciales **PRODUCTIVAS**, no de prueba.

### 3. Consultar Estado de Pago

```bash
curl -X GET \
  'https://api.mercadopago.com/v1/payments/PAYMENT_ID' \
  -H 'Authorization: Bearer APP_USR-YOUR_TOKEN'
```

**Estados posibles**:
- `pending` - Pendiente de confirmación
- `approved` - Aprobado ✅
- `rejected` - Rechazado ❌
- `cancelled` - Cancelado
- `refunded` - Reembolsado

---

## 🛠️ Integración en Código

### En `src/services/mercadopagoService.ts` (Ya implementado)

```typescript
import mercadopagoService from '@/services/mercadopagoService'

// Crear una preferencia
const preference = await mercadopagoService.createPaymentPreference({
  amount: 250.00,
  description: "Mesa 5 - Orden 12345",
  orderId: "order-12345",
  email: "customer@email.com"
})

// Link de pago generado
console.log(preference.sandbox_init_point) // https://sandbox.mercadopago.com/...
```

### En `src/components/pos/PaymentPanel.tsx` (Ya implementado)

```typescript
// El componente maneja:
// 1. Método de pago (cash, card, digital)
// 2. Cálculo de propina
// 3. Integración con MercadoPago
// 4. Animaciones y feedback visual
```

---

## ✅ Checklist de Testing

### Setup Inicial
- [ ] ✅ Credenciales de TEST en `.env.local`
- [ ] ✅ `npm install` completado
- [ ] ✅ `npm run dev` ejecutándose sin errores
- [ ] ✅ Navegador abierto en `http://localhost:5173`

### Pruebas Funcionales
- [ ] Login funciona
- [ ] POS carga productos
- [ ] Agregar productos al carrito
- [ ] Aumentar/disminuir cantidad
- [ ] Enviar a cocina
- [ ] Panel de pago abre
- [ ] Propina se calcula correctamente
- [ ] Pago efectivo se confirma

### Próximas Versiones
- [ ] Integración de Checkout Pro
- [ ] Webhooks de confirmación
- [ ] Soporte para terminales físicas
- [ ] Dashboard de transacciones

---

## 🐛 Troubleshooting

### Error: "VITE_MERCADOPAGO_ACCESS_TOKEN no definido"
**Solución**: 
```bash
# 1. Verifica .env.local
cat .env.local | grep MERCADOPAGO

# 2. Reinicia el dev server
npm run dev

# 3. Si sigue, limpia caché
rm -rf node_modules/.vite
npm run dev
```

### Error: 401 Unauthorized
**Causa**: Credenciales inválidas o expiradas
**Solución**:
1. Ve a https://www.mercadopago.com.mx/developers
2. Regenera las credenciales
3. Actualiza `.env.local`
4. Reinicia dev server

### Error: "CORS error" en consola
**Causa**: Llamada directa a API desde frontend (no recomendado)
**Solución**: Mover lógica a Cloud Function backend

### El 404 que ves en consola
**Probable causa**: Favicon faltante
**Solución**: Agregar favicon a `index.html` o ignorar (no afecta funcionalidad)

---

## 📊 Estructura de Pago

```
Usuario selecciona productos
         ↓
Hace clic en "Pagar"
         ↓
Se abre PaymentPanel
         ↓
    ¿Método?
    /    |    \
  Cash  Card  Digital
    |    |      |
    ✓    ❌      ❌
    (solo cash (Futuro:
    funciona)  Checkout Pro)
    |
    ✓ Confirmación
```

---

## 🚀 Roadmap de Integración

### v2.0 (Actual)
- ✅ Servicio de MercadoPago
- ✅ Panel de pago con UI moderna
- ✅ Método efectivo funcional
- ✅ Documentación

### v2.1 (Próximo)
- Checkout Pro embebido
- Webhooks de confirmación
- Cloud Function backend

### v2.2
- Terminales físicas (NEWLAND_N950, PAX_A910)
- Dashboard de transacciones
- Reembolsos

### v3.0
- App móvil nativa
- Reportes avanzados
- Integración con contabilidad

---

## 📚 Referencias Oficiales

- [Checkout Pro](https://www.mercadopago.com.mx/developers/es/docs/checkout-pro/landing)
- [Checkout API](https://www.mercadopago.com.mx/developers/es/docs/checkout-api/landing)
- [API Reference Completa](https://www.mercadopago.com.mx/developers/es/reference)
- [Status de API](https://status.mercadopago.com/)

---

**Última actualización**: 23 de enero de 2026
