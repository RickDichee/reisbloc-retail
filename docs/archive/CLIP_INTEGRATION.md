# Integración con Terminal Clip - Reisbloc POS

## 📱 Descripción General

Reisbloc POS integra la terminal de pagos Clip de Dinero para procesar pagos digitales, con soporte para propinas automáticas y conciliación de transacciones.

## 🔑 Credenciales y Configuración

### 1. Obtener Credenciales de Clip

1. Accede a tu cuenta en [Clip Dinero](https://www.clipdinero.com)
2. Navega a: `Configuración > API` o `Integraciones`
3. Genera una nueva API Key
4. Copia tu Merchant ID
5. Obtén la URL base de la API

### 2. Variables de Entorno

Crea archivo `.env.local`:

```env
# Clip Configuration
VITE_CLIP_API_KEY=your_api_key_here
VITE_CLIP_MERCHANT_ID=your_merchant_id
VITE_CLIP_BASE_URL=https://api.clip.mx/v1
```

### 3. Configuración en la Aplicación

```typescript
// src/config/constants.ts
export const CLIP_CONFIG = {
  apiKey: import.meta.env.VITE_CLIP_API_KEY,
  merchantId: import.meta.env.VITE_CLIP_MERCHANT_ID,
  baseUrl: import.meta.env.VITE_CLIP_BASE_URL,
};

// src/main.tsx
import clipService from '@services/clipService';

// Inicializar al cargar la app
clipService.initialize(CLIP_CONFIG);
```

## 💳 Flujo de Pago

### Proceso General

```
┌──────────────────────────────────────────┐
│ Cliente selecciona pagar con Clip         │
└──────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────┐
│ Mostrar opción de propina                 │
│ ☐ Sin propina                             │
│ ☐ 10% ($50)                              │
│ ☐ 15% ($75)                              │
│ ☐ 20% ($100)                             │
│ ◉ Propina personalizada: [____]           │
└──────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────┐
│ Iniciar transacción en terminal Clip      │
│ Esperando confirmación...                 │
└──────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────┐
│ ✓ Pago aprobado                           │
│ Monto: $500.00                            │
│ Propina: $75.00                           │
│ Total: $575.00                            │
│ Referencia: CLIP123456789                 │
└──────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────┐
│ Guardar venta con información del pago   │
│ Actualizar inventario                     │
│ Generar ticket                            │
└──────────────────────────────────────────┘
```

### Estados de Transacción

```typescript
type ClipTransactionStatus = 
  | 'pending'    // En proceso
  | 'completed'  // Exitosa
  | 'failed'     // Rechazada
  | 'refunded'   // Reembolsada
```

## 🧾 Ejemplo de Implementación

### Componente de Pago

```typescript
import React, { useState } from 'react';
import clipService from '@services/clipService';

function PaymentModal({ sale, onSuccess, onCancel }) {
  const [tipPercentage, setTipPercentage] = useState(0);
  const [customTip, setCustomTip] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const calculateTip = (): number => {
    if (customTip) {
      return parseFloat(customTip);
    }
    return (sale.total * tipPercentage) / 100;
  };

  const handlePayment = async () => {
    try {
      setIsProcessing(true);
      setError('');

      const tip = calculateTip();

      const payment = await clipService.processPayment({
        amount: sale.total,
        saleId: sale.id,
        tip,
      });

      if (payment.status === 'completed') {
        // Actualizar venta con información del pago
        await updateSaleWithPayment(sale.id, payment);
        onSuccess(payment);
      } else {
        setError('El pago fue rechazado. Intenta de nuevo.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar pago');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="payment-modal">
      <h2>Pago con Clip</h2>
      
      <div className="amount-display">
        <p>Total: ${sale.total.toFixed(2)}</p>
      </div>

      <div className="tip-selection">
        <h3>¿Agregar propina?</h3>
        
        {/* Opciones predefinidas */}
        <div className="tip-options">
          {[0, 10, 15, 20].map(percent => (
            <button
              key={percent}
              onClick={() => { setTipPercentage(percent); setCustomTip(''); }}
              className={tipPercentage === percent ? 'active' : ''}
            >
              {percent === 0 ? 'Sin propina' : `${percent}% ($${(sale.total * percent / 100).toFixed(2)})`}
            </button>
          ))}
        </div>

        {/* Propina personalizada */}
        <div className="custom-tip">
          <label>Propina personalizada:</label>
          <input
            type="number"
            value={customTip}
            onChange={(e) => { setCustomTip(e.target.value); setTipPercentage(0); }}
            placeholder="0.00"
          />
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="buttons">
        <button onClick={onCancel} disabled={isProcessing}>
          Cancelar
        </button>
        <button onClick={handlePayment} disabled={isProcessing}>
          {isProcessing ? 'Procesando...' : `Pagar $${(sale.total + calculateTip()).toFixed(2)}`}
        </button>
      </div>
    </div>
  );
}

export default PaymentModal;
```

## 💰 Gestión de Propinas

### Registro de Propinas

Cada transacción puede incluir propina:

```typescript
interface SaleWithClip extends Sale {
  paymentMethod: 'clip';
  clipTransactionId: string;
  tip: number;              // Propina en pesos
  tipSource: 'digital';     // Viene de terminal
}
```

### Cálculo de Propinas en Cierre de Caja

```typescript
const generateDailyClose = async (sales: Sale[]) => {
  // Separar propinas por fuente
  const tipsByCash = sales
    .filter(s => s.paymentMethod === 'cash')
    .reduce((sum, s) => sum + (s.tip || 0), 0);

  const tipsByClip = sales
    .filter(s => s.paymentMethod === 'clip')
    .reduce((sum, s) => sum + (s.tip || 0), 0);

  // Total de propinas
  const totalTips = tipsByCash + tipsByClip;

  // Distribuir equitativamente entre los que trabajaron
  const tipsPerEmployee = totalTips / workingEmployees.length;

  // Registrar en cierre de caja
  return {
    totalTips,
    tipsFromCash: tipsByCash,
    tipsFromClip: tipsByClip,
    tipsPerEmployee,
    employees: [...],
  };
};
```

## 🔄 Reembolsos y Cancelaciones

### Procesar Reembolso

```typescript
// Reembolso total
await clipService.refundTransaction(transactionId);

// Reembolso parcial
await clipService.refundTransaction(transactionId, partialAmount);
```

### Flujo de Cancelación de Venta

```
Mesero solicita cancelación de venta
    ↓
Verificar si fue con Clip
    ├─ No → Simplemente eliminar
    └─ Sí → Iniciar reembolso
              ↓
              Procesar reembolso
              ↓
              Actualizar inventario
              ↓
              Registrar en auditoría
              ↓
              Mostrar confirmación
```

## 📊 Reportes y Conciliación

### Balance de la Terminal

```typescript
const balance = await clipService.getBalance();
console.log(`Balance en terminal Clip: $${balance}`);
```

### Historial de Transacciones

```typescript
const history = await clipService.getTransactionHistory(100);

history.forEach(transaction => {
  console.log({
    date: transaction.createdAt,
    amount: transaction.amount,
    tip: transaction.tip,
    reference: transaction.reference,
    status: transaction.status,
  });
});
```

### Reporte Diario de Clip

```typescript
const generateClipReport = async (date: Date) => {
  const transactions = await clipService.getTransactionHistory(500);
  
  const filtered = transactions.filter(t => 
    new Date(t.createdAt).toDateString() === date.toDateString()
  );

  return {
    date,
    totalTransactions: filtered.length,
    totalAmount: filtered.reduce((sum, t) => sum + t.amount, 0),
    totalTips: filtered.reduce((sum, t) => sum + (t.tip || 0), 0),
    transactions: filtered,
  };
};
```

## 🔐 Seguridad en Transacciones

### Validaciones

```typescript
// Validar antes de procesar
const validatePaymentRequest = (request: ClipTransactionRequest) => {
  if (!request.amount || request.amount <= 0) {
    throw new Error('Monto inválido');
  }
  
  if (request.tip && request.tip < 0) {
    throw new Error('Propina no puede ser negativa');
  }

  if (request.tip && request.tip > request.amount * 0.5) {
    throw new Error('Propina no puede exceder 50% del monto');
  }

  return true;
};
```

### Auditoría

Cada transacción de Clip se registra:

```typescript
{
  timestamp: "2026-01-21T14:30:00Z",
  action: "CLIP_PAYMENT",
  saleId: "sale_123",
  userId: "user_456",
  transactionId: "CLIP789456",
  amount: 500.00,
  tip: 75.00,
  status: "completed",
  deviceId: "device_789",
  ipAddress: "192.168.1.100"
}
```

## 🚨 Manejo de Errores

### Errores Comunes

| Error | Causa | Solución |
|-------|-------|----------|
| API Key inválida | Credenciales incorrectas | Verificar `.env.local` |
| Terminal desconectada | Terminal sin conexión | Verificar WiFi/Red móvil |
| Transacción rechazada | Tarjeta rechazada | Informar al cliente |
| Timeout | Red lenta | Reintentar transacción |
| Monto inválido | Monto <= 0 | Validar antes de enviar |

### Reintentos Automáticos

```typescript
const retryPayment = async (
  request: ClipTransactionRequest,
  maxRetries: number = 3
): Promise<ClipPayment> => {
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await clipService.processPayment(request);
    } catch (error) {
      lastError = error as Error;
      console.warn(`Intento ${i + 1} falló, reintentando...`);
      await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
    }
  }

  throw new Error(
    `Pago fallido después de ${maxRetries} intentos: ${lastError?.message}`
  );
};
```

## 📱 Testing

### Test Local

```typescript
// Usar modo sandbox de Clip
const CLIP_CONFIG_SANDBOX = {
  apiKey: 'pk_test_...',
  merchantId: 'test_merchant',
  baseUrl: 'https://sandbox.clip.mx/v1',
};

// Test de transacción
async function testClipPayment() {
  const result = await clipService.processPayment({
    amount: 100,
    saleId: 'test_sale_123',
    tip: 10,
  });

  console.log('Payment result:', result);
}
```

## ✅ Checklist de Implementación

- [ ] Obtener credenciales de Clip
- [ ] Configurar variables de entorno
- [ ] Implementar ClipPaymentService
- [ ] Crear componente PaymentModal
- [ ] Integrar en flujo de checkout
- [ ] Implementar gestión de propinas
- [ ] Crear reporte de transacciones
- [ ] Testing con sandbox
- [ ] Manejo de errores
- [ ] Documentar para usuarios
- [ ] Capacitación de personal

---

**Última actualización**: 21 de enero de 2026
