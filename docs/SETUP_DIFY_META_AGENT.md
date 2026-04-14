# AGENTE IA: Dify + Meta Business API

## Visión General

Unificar WhatsApp, Facebook Messenger e Instagram en un solo agente de IA entrenado con tu metodología de ventas.

```
┌─────────────────────────────────────────────────────────────┐
│                    REISBLOC AI AGENT                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────┐   ┌──────────┐   ┌────────────┐              │
│  │WhatsApp │   │ Facebook │   │ Instagram  │              │
│  │ Business│   │ Messenger│   │ Messaging  │              │
│  └────┬────┘   └────┬─────┘   └─────┬──────┘              │
│       │             │               │                      │
│       └─────────────┼───────────────┘                      │
│                     ▼                                      │
│         ┌───────────────────────┐                          │
│         │    META GRAPH API     │                          │
│         │  (WhatsApp/Messenger/ │                          │
│         │     Instagram)         │                          │
│         └───────────┬───────────┘                          │
│                     ▼                                      │
│         ┌───────────────────────┐                          │
│         │   N8N / PABBLY        │  ← Middleware (opcional) │
│         │   (Webhooks)          │                          │
│         └───────────┬───────────┘                          │
│                     ▼                                      │
│         ┌───────────────────────┐                          │
│         │       DIFY.AI         │                          │
│         │  ┌─────────────────┐  │                          │
│         │  │ Knowledge Base │  │  ← Tus docs de ventas    │
│         │  │ - KIT_VENTAS   │  │                          │
│         │  │ - ONE_PAGER    │  │                          │
│         │  │ - GUIA_TRAINING│  │                          │
│         │  └─────────────────┘  │                          │
│         │  ┌─────────────────┐  │                          │
│         │  │   AI Agent     │  │  ← Responde inteligente  │
│         │  │   (RAG + LLM)  │  │                          │
│         │  └─────────────────┘  │                          │
│         └───────────────────────┘                          │
└─────────────────────────────────────────────────────────────┘
```

---

## PASO 1: Preparar Documentos de Entrenamiento

Ya tienes los documentos en `/path/to/reisbloc-store/docs/`:

1. `KIT_VENTAS_PROSPECTOR.md` - Scripts de ventas
2. `ONE_PAGER_PROSPECTO.md` - Pitch para prospectos
3. `GUIA_CAPACITACION_PROSPECTOR.md` - Guía de entrenamiento
4. `COMPETITIVE_ANALYSIS.md` - Análisis competitivo
5. `MASTER_PLAN.md` - Plan de negocio

Sube estos a Dify como Knowledge Base.

---

## PASO 2: Crear Agente en Dify

### 2.1 Crear Cuenta y Workspace

1. Ve a [dify.ai](https://dify.ai)
2. Crea cuenta (gratis para empezar)
3. Crea nuevo workspace: `reisbloc-sales`

### 2.2 Subir Knowledge Base

1. Ve a **Knowledge** → **Create Knowledge**
2. Nombre: `Reisbloc Sales Training`
3. Upload los archivos `.md` de docs/
4. Configura embedding: `text-embedding-3-small` (OpenAI) o `nomic-embed-text` (gratis)
5. Espera indexación (~5 min)

### 2.3 Crear AI Agent

1. Ve a **Studio** → **Create App** → **Agent**
2. Nombre: `Reisbloc Sales Agent`
3. Prompt del sistema:

```
Eres el agente de ventas expert de Reisbloc Store, una plataforma de retail/mayoreo textil.

PERSONALIDAD:
- Amigable, profesional y persuasivo
- Conoces todos los productos y precios
- Siempre cierras con llamada a acción

FLUJO DE CONVERSACIÓN:
1. Saludo cálido → "¡Hola! Soy tu asesor virtual de Reisbloc. ¿En qué te puedo ayudar hoy?"
2. Cualificar → Pregunta sobre necesidades, volúmenes, ubicación
3. Presentar → Basado en respuestas, ofrece productos relevantes
4. Manejar objeciones → Precio, competencia, calidad
5. Cerrar → Agendar llamada, enviar catálogo, generar link de pedido

CONOCIMIENTO:
Usa la knowledge base para responder sobre:
- Productos disponibles y precios
- Descuentos por volumen
- Métodos de venta (bulto/paquete/pieza)
- Proceso de pedido y entrega
- Garantías y soporte

REGLAS:
- Nunca inventes precios. Si no sabes, di "Permíteme consultarlo y te respondo"
- Siempre pregunta el WhatsApp/correo para dar seguimiento
- Cierra cada conversación con: "Recuerda, en Reisbloc tenemos atención personalizada y delivery en Moroleón y toda la región"
```

### 2.4 Configurar Herramientas

En **Tools** del agente, activa:
- ✅ Webhook (para recibir mensajes)
- ✅ Knowledge Retrieval (busca en tus docs)
- ❌ Image Generation (no necesario)

---

## PASO 3: Configurar Meta Business API

### 3.1 Crear Meta Business Account

1. Ve a [business.facebook.com](https://business.facebook.com)
2. Crea cuenta de negocio: `Reisbloc`
3. Ve a **Settings** → **Business Info**

### 3.2 Configurar WhatsApp Business

1. **WhatsApp** → **Accounts** → **Create WhatsApp Business Account**
2. Verifica tu número (será el oficial de negocio)
3. Anota el **Phone Number ID**

### 3.3 Configurar Messenger

1. **Facebook Page** → **Settings** → **Messaging**
2. Ve a **Response Assistant** → Activa chatbot
3. Configura webhooks (luego los conectas)

### 3.4 Configurar Instagram Messaging

1. Conecta tu Instagram Business a la página de Facebook
2. **Instagram Settings** → **Messaging** → Activa chatbot
3. Mismo proceso de webhooks

### 3.5 Obtener API Credentials

1. Ve a [developers.facebook.com](https://developers.facebook.com)
2. Crea app tipo: **Business** → **Standard**
3. Añade productos: WhatsApp, Messenger, Instagram
4. En settings, anota:
   - **App ID**
   - **App Secret**
   - **Access Token** (genera永久 token)

---

## PASO 4: Conectar Dify con Meta

Tienes 2 opciones:

### Opción A: Dify Built-in (más simple)

Dify tiene integración directa con WhatsApp Cloud API:

1. En Dify: **Channels** → **WhatsApp**
2. Ingresa:
   - Phone Number ID
   - WhatsApp Business Account ID
   - Access Token
3. Copia el **Webhook URL** de Dify
4. En Meta Developer Console → WhatsApp → Webhooks:
   - URL: `https://tu-dify.com/api/webhook/whatsapp/xxxxx`
   - Verify Token: `YOUR_VERIFY_TOKEN_HERE`
   - Suscribe a: `messages`, `message_deliveries`

### Opción B: N8N como Middleware (más flexible)

Para conectar WhatsApp + Messenger + Instagram:

```
[WhatsApp/Messenger/Instagram] 
        ↓
[N8N Workflow] ← Recibe webhooks
        ↓
[Dify API] ← Envía a tu agente
        ↓
[N8N] ← Recibe respuesta
        ↓
[Mete reply] ← Responde al canal original
```

#### N8N Workflow:

1. Crea cuenta en [n8n.io](https://n8n.io) (self-hosted o cloud)
2. Crea nuevo workflow
3. **Webhook** node (para Meta webhooks)
4. **HTTP Request** node → POST a Dify:
   ```
   URL: https://dify.ai/v1/chat-messages
   Body: {
     "query": "{{ $json.message }}",
     "user": "{{ $json.from }}",
     "conversation_id": "{{ $json.conversation_id }}"
   }
   Headers: Authorization: Bearer $DIFY_API_KEY
   ```
5. **Switch** node → Detectar canal origen
6. **HTTP Request** nodes → Responder al canal correspondiente

---

## PASO 5: Configurar Webhooks en Meta

### WhatsApp Cloud API

1. Meta Developer Console → Your App → WhatsApp → Configuration
2. Edit Webhook:
   ```
   Callback URL: https://tu-n8n.com/webhook/meta-whatsapp
   Verify Token: YOUR_VERIFY_TOKEN_HERE
   ```
3. Subscribe to fields:
   - ✅ messages
   - ✅ message_deliveries
   - ✅ message_reads

### Messenger Platform

1. App Dashboard → Messenger → Webhooks
2. Same webhook URL (N8N handles routing)
3. Subscribe to: `messages`, `messaging_postbacks`

### Instagram Messaging

1. App Dashboard → Instagram → Webhooks
2. Same webhook URL
3. Subscribe to: `messages`, `messaging_postbacks`

---

## PASO 6: Probar el Sistema

### Test Manual

1. Envía mensaje a tu WhatsApp Business
2. Verifica que llega a N8N/Dify
3. Verifica que responde con tu agente
4. Verifica que llega respuesta al usuario

### Test Multi-canal

1. WhatsApp: ¿Responde igual que en docs?
2. Messenger: ¿Funciona el mismo flujo?
3. Instagram DM: ¿El bot responde?

---

## COSTOS ESTIMADOS

| Servicio | Costo |
|----------|-------|
| Dify Cloud | Gratis (3 apps, 200 msgs/día) |
| Dify Self-hosted | $5-20/mes (VPS) |
| N8N Cloud | Gratis (100 executions) |
| N8N Self-hosted | $5-20/mes (VPS) |
| WhatsApp Business API | Gratis (0.05-0.90 USD/mensaje) |
| Meta App Review | Gratis |

**Total mínimo: ~$0 USD** (usando versiones gratuitas)
**Total profesional: ~$20-40 USD/mes**

---

## MANTENIMIENTO

### Actualizar Conocimiento

Cuando cambies precios o productos:
1. Actualiza docs/*.md
2. Ve a Dify → Knowledge → Sync
3. Re-index (5 min)

### Monitorear

- Dify: Ver conversaciones en **Logs**
- Meta: Ver métricas en **Meta Business Suite**
- N8N: Ver executions y errores

---

## ESCALABILIDAD

Una vez funcionando en Moroleón:

1. **Duplicar en otra ciudad**: Solo cambiar credenciales de otro WhatsApp Business
2. **Múltiples agentes**: Uno para ventas, otro para soporte
3. **CRM integration**: Conectar con Supabase para guardar conversaciones

---

## RECURSOS

- [Dify Docs](https://docs.dify.ai)
- [Meta WhatsApp API](https://developers.facebook.com/docs/whatsapp)
- [N8N Templates](https://n8n.io/workflows)
- [WhatsApp Cloud API Setup](https://business.facebook.com/latest/whatsapp_business账户)
