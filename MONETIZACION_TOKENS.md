# 📋 PLAN DE MONETIZACIÓN: SISTEMA DE TOKENS

## Concepto

En lugar de versiones estáticas (Free/Pro/Enterprise), Reisbloc usará **tokens** como moneda digital que los usuarios compran y consumen según su uso de features premium.

---

## 💎 Cómo Funcionan los Tokens

### Flujo
```
Usuario compra tokens → Tokens en wallet → Usa features → Tokens consumidos
                                    ↓
                    Puede comprar más cuando quiera
```

### Características
- **No expiran** (a menos que el usuario quiera)
- **Recargables** en cualquier momento
- **Transferibles** (para multi-store)
- **Compatibles** con todos los planes

---

## 🎛️ Features y Costos de Tokens

### Feature Matrix

| Feature | Costo (Tokens) | Descripción |
|---------|----------------|-------------|
| **AI Chat (Reisbloc Agent)** | 1 por query | Conversaciones con el agente |
| **Generar Post Marketing** | 5 por post | Contenido para Twitter/LinkedIn |
| **AI Insights Avanzados** | 3 por consulta | Dashboard de métricas IA |
| **Reporte PDF Premium** | 10 por reporte | Reportes descargables |
| **Exportar Datos** | 2 por export | CSV/Excel de inventario |
| **Multi-device Sync** | 1 por día | Sincronización activa |
| **Notificaciones Push** | 0.5 por notificación | Alertas de stock bajo |
| **API Access** | 20 por 1000 requests | API para integraciones |

### Operaciones Gratuitas (Plan Free)
```
✓ POS básico (ventas, inventario)
✓ Hasta 2 dispositivos
✓ 50 productos
✓ Reportes básicos
✓ 20 queries de AI/día (limitación soft)
```

---

## 💰 Plan de Precios

### Paquetes de Tokens

| Paquete | Tokens | Precio MXN | Precio USD | $/token |
|---------|--------|------------|-----------|---------|
| **Starter** | 500 | $99 | $5.50 | $0.20 |
| **Growth** | 2,000 | $299 | $16.50 | $0.15 |
| **Scale** | 5,000 | $599 | $33.00 | $0.12 |
| **Pro** | 15,000 | $1,299 | $72.00 | $0.09 |
| **Business** | 50,000 | $3,499 | $194.00 | $0.07 |

### Planes Suscripción (Tokens Mensuales)

| Plan | Tokens/Mes | Precio MXN/mes | Equivalente diario |
|------|------------|---------------|-------------------|
| **Free** | 60 (2/día) | $0 | 2 queries AI |
| **Starter** | 1,500 | $149 | 50 queries AI |
| **Growth** | 5,000 | $399 | 165 queries AI |
| **Scale** | 15,000 | $799 | 500 queries AI |
| **Pro** | 50,000 | $1,999 | 1,600 queries AI |

---

## 🏗️ Implementación Técnica

### 1. Tabla de Tokens en Supabase

```sql
CREATE TABLE token_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  tokens INTEGER NOT NULL,
  price_mxn DECIMAL(10,2) NOT NULL,
  price_usd DECIMAL(10,2),
  is_subscription BOOLEAN DEFAULT false,
  monthly_tokens INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  balance INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE token_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  amount INTEGER NOT NULL, -- positivo = compra, negativo = uso
  type TEXT NOT NULL, -- 'purchase', 'usage', 'refund', 'bonus'
  feature TEXT, -- 'ai_chat', 'post_generation', etc.
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE token_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  feature TEXT NOT NULL,
  tokens_spent INTEGER NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. Edge Function: Token Manager

```typescript
// supabase/functions/token-manager/index.ts
Deno.serve(async (req) => {
  const { action, userId, feature, amount } = await req.json();
  
  // action: 'check_balance' | 'deduct' | 'refund' | 'purchase'
  
  // Validar usuario...
  // Deducir/Añadir tokens...
  // Loggear transacción...
  
  return Response.json({ success, newBalance });
});
```

### 3. Frontend: Wallet Component

```tsx
// src/components/WalletWidget.tsx
function WalletWidget() {
  const { balance, transactions } = useTokenBalance();
  
  return (
    <div className="p-4 bg-slate-900 rounded-xl text-white">
      <p className="text-xs text-slate-400">Tokens disponibles</p>
      <p className="text-3xl font-black">{balance}</p>
      <button className="mt-2 bg-indigo-500 px-4 py-2 rounded-lg font-bold">
        Recargar
      </button>
    </div>
  );
}
```

### 4. Hook: useTokens

```typescript
// src/hooks/useTokens.ts
export function useTokens() {
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  
  const checkBalance = async () => { /* ... */ };
  
  const deductTokens = async (feature: string, amount: number) => {
    const res = await supabase.functions.invoke('token-manager', {
      body: { action: 'deduct', feature, amount }
    });
    if (res.error) throw new Error('Tokens insuficientes');
    setBalance(res.data.newBalance);
  };
  
  return { balance, deductTokens, checkBalance };
}
```

### 5. Integración con Features

```tsx
// Antes de usar feature premium
const { deductTokens } = useTokens();

async function handleAIGenerate() {
  await deductTokens('ai_chat', 1);
  // Llamar al agente...
}
```

---

## 🔄 Flujo de Usuario

### 1. Registro
```
Usuario se registra → Recibe 60 tokens gratis (Free trial)
```

### 2. Uso Normal
```
Usa POS gratis → Quiere insights AI → Deduce 3 tokens → 
Tokens insuficientes → "Recargar" modal
```

### 3. Recarga
```
Usuario compra paquete → Tokens añadidos → Continúa usando
```

### 4. Suspensión
```
Tokens agotados → Feature premium deshabilitada → 
Solo acceso a POS básico
```

---

## 📊 Dashboard de Usuario

### Mi Wallet (Perfil)
```
┌─────────────────────────────────────┐
│ 🎫 Mi Wallet                        │
├─────────────────────────────────────┤
│                                     │
│     ████  1,234 tokens            │
│                                     │
│  [  Recargar  ]  [  Historial  ]  │
│                                     │
├─────────────────────────────────────┤
│ Historial Reciente                  │
│ • -3 tokens: AI Chat (hace 5 min)  │
│ • -5 tokens: Post Twitter (hace 1h)│
│ • +500 tokens: Compra Growth (hoy) │
└─────────────────────────────────────┘
```

---

## 🚀 Plan de Implementación

### Fase 1: Backend (1 semana)
- [ ] Crear tablas de tokens
- [ ] Edge function token-manager
- [ ] RLS para tablas de tokens
- [ ] RPC para deducir/anadir tokens

### Fase 2: Frontend (1 semana)
- [ ] Componente WalletWidget
- [ ] Hook useTokens
- [ ] Modal de recarga
- [ ] Página de historial

### Fase 3: Integración (3 días)
- [ ] Integrar en AI Agent
- [ ] Integrar en Marketing Agent
- [ ] Mostrar costos en UI
- [ ] Testing E2E

### Fase 4: Launch (2 días)
- [ ] Configurar productos en Stripe/PayPal
- [ ] Página de pricing actualizada
- [ ] Announcement a usuarios beta
- [ ] Monitorizar usage

---

## 📈 Proyecciones de Revenue

### Mes 1 (Beta)
- 50 usuarios beta
- 20% compra tokens ($50 avg)
- **Revenue: $500 MXN**

### Mes 3 (Launch)
- 200 usuarios activos
- 30% convierte a paid
- 1,500 tokens avg por usuario
- **Revenue: $30,000 MXN**

### Mes 6
- 1,000 usuarios
- 25% conversion
- **Revenue: $150,000 MXN**

### Mes 12
- 5,000 usuarios
- 20% conversion
- **Revenue: $750,000 MXN**

---

## ⚠️ Consideraciones Importantes

1. **Tokens no son dinero**: No hay obligation de reembolsar
2. **Límite de almacenamiento**: Max 100,000 tokens por usuario
3. **Anti-fraude**: Rate limit en compras, verificar identidad
4. **Impuestos**: Los tokens son probablemente taxable como ingreso
5. **Tokens gratis**: Limitar a 60/mes para evitar abuse

---

*Documento creado: Marzo 2026*
*Versión: 1.0*
