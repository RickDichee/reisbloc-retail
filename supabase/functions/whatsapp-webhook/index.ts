import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-hub-signature-256',
}

const VERIFY_TOKEN = Deno.env.get('WHATSAPP_VERIFY_TOKEN') || 'WHATSAPP_VERIFY_TOKEN_PLACEHOLDER'
const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')!
const WHATSAPP_ACCESS_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN')!

const WHATSAPP_BUSINESS_NUMBER = '5215665848231'

interface ConversationState {
  stage: 'new' | 'greeting' | 'qualifying' | 'interest' | 'demo' | 'closing' | 'closed'
  name?: string
  business?: string
  needs?: string[]
  products?: string[]
  interest?: string
  nextAction?: string
  lastContact?: string
  messages: Message[]
}

interface Message {
  from: string
  body: string
  timestamp: string
  direction: 'inbound' | 'outbound'
}

// Pricing info
const PRICING = {
  launch: { name: 'Launch', price: 997, features: ['1 sucursal', '1 usuario', '500 ventas/mes', 'Inventario básico'] },
  grow: { name: 'Grow', price: 2497, features: ['3 sucursales', '5 usuarios', '2,000 ventas/mes', 'Agente IA', 'Reportes avanzados'] },
  scale: { name: 'Scale', price: 4997, features: ['Sucursales ilimitadas', 'Usuarios ilimitados', '10,000 ventas/mes', 'API'] }
}

const PRODUCT_FEATURES = [
  { keyword: 'caja', feature: '💰 Punto de Venta - Vende en 3 taps, múltiples formas de pago' },
  { keyword: 'inventario', feature: '📦 Inventario Inteligente - Control automático, alertas de stock bajo' },
  { keyword: 'reporte', feature: '📊 Reportes - Ventas diarias, productos top, ganancias' },
  { keyword: 'offline', feature: '⚡ Funciona sin internet - Nunca pierdes una venta' },
  { keyword: 'sucursal', feature: '🏪 Multi-sucursal - Controla todo desde un panel' },
  { keyword: 'ticket', feature: '🎫 Tickets digitales - Envía por WhatsApp directo' },
  { keyword: 'cfdi', feature: '📄 Facturas CFDI 4.0 - Integración con PAC' },
  { keyword: 'credito', feature: '💳 Control de Crédito - Gestiona fiados y cobros' },
  { keyword: 'empleado', feature: '👥 Gestión de Empleados - Horarios, permisos, ventas por vendedor' }
]

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const mode = url.searchParams.get('hub.mode')
    const token = url.searchParams.get('hub.verify_token')
    const challenge = url.searchParams.get('hub.challenge')

    if (mode === 'subscribe') {
      if (token === VERIFY_TOKEN) {
        console.log('WhatsApp Sales Agent verified successfully')
        return new Response(challenge, { status: 200, headers: corsHeaders })
      } else {
        return new Response('Forbidden', { status: 403, headers: corsHeaders })
      }
    }

    const payload = await req.json()
    console.log('WhatsApp Sales Agent received:', JSON.stringify(payload))

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    for (const entry of payload.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field === 'messages') {
          await handleMessages(supabase, change.value)
        }
      }
    }

    return new Response('ok', { status: 200 })
  } catch (error) {
    console.error('WhatsApp Sales Agent error:', error)
    return new Response('error', { status: 500 })
  }
})

async function handleMessages(supabase: any, value: any) {
  const phoneNumberId = value.metadata?.phone_number_id
  const messages = value.messages || []

  for (const message of messages) {
    const from = message.from
    const messageId = message.id
    const body = message.text?.body || ''

    if (!body) continue

    await logMessage(supabase, from, phoneNumberId, body, messageId, 'inbound')
    await markAsRead(phoneNumberId, messageId)

    const response = await processMessage(supabase, from, body, phoneNumberId)
    
    if (response) {
      await sendMessage(from, response)
      await logMessage(supabase, phoneNumberId, from, response, messageId + '_out', 'outbound')
    }
  }
}

async function processMessage(supabase: any, from: string, body: string, phoneNumberId: string): Promise<string | null> {
  const lowerBody = body.toLowerCase().trim()
  
  // Get or create conversation state
  const state = await getConversationState(supabase, from)
  const newState = { ...state }
  let response: string | null = null

  // Check for specific intents
  if (lowerBody.includes('agendar') || lowerBody.includes('demo') || lowerBody.includes('prueba')) {
    response = getDemoSchedulingMessage()
    newState.stage = 'demo'
  } else if (lowerBody.includes('precio') || lowerBody.includes('cuanto cuesta') || lowerBody.includes('costo')) {
    response = getPricingMessage()
    newState.stage = 'interest'
  } else if (lowerBody.includes('launch') || lowerBody.includes('grow') || lowerBody.includes('scale')) {
    response = getPlanDetailMessage(lowerBody)
    newState.stage = 'closing'
  } else if (lowerBody.includes('comprar') || lowerBody.includes('empezar') || lowerBody.includes('contratar')) {
    response = getClosingMessage()
    newState.stage = 'closing'
  } else if (lowerBody.includes('ayuda') || lowerBody.includes('help')) {
    response = getHelpMessage()
  } else if (lowerBody.includes('producto') || lowerBody.includes('que tienen') || lowerBody.includes('servicio')) {
    response = getProductOverview()
    newState.stage = 'interest'
  } else if (lowerBody.includes('gracias') || lowerBody.includes('okay') || lowerBody.includes('ok')) {
    response = getThankYouMessage()
  } else {
    // Check for feature keywords
    const featureMatch = PRODUCT_FEATURES.find(f => lowerBody.includes(f.keyword))
    if (featureMatch) {
      response = `${featureMatch.feature}\n\n¿Te gustaría agendar una demo para verlo en acción?`
      newState.stage = 'demo'
    } else {
      // Default response based on stage
      response = getDefaultResponse(state.stage)
    }
  }

  // Update conversation state
  await updateConversationState(supabase, from, newState)
  
  return response
}

function getDemoSchedulingMessage(): string {
  return `¡Genial! 🎉 Me encanta el interés.

Para agendar tu demo personalizada necesito saber:

1️⃣ ¿En qué giro está tu negocio?
   (tienda de ropa, restaurant, ferretería, etc.)

2️⃣ ¿Cuántas sucursales manejas actualmente?

Con eso te preparo una demo a tu medida. 
¿Me los compartes?

Puedes также escribirme directamente cuando tengas tiempo. 
¡Estoy aquí para ayudarte! 💪`
}

function getPricingMessage(): string {
  return `💰 Nuestros planes:

━━━━━━━━━━━━━━━━━
🥇 LAUNCH - $997/mes
• 1 sucursal
• 1 usuario  
• 500 ventas/mes
• Inventario básico
━━━━━━━━━━━━━━━━━

⭐ GROW - $2,497/mes (más popular)
• 3 sucursales
• 5 usuarios
• 2,000 ventas/mes
• 🤖 Agente IA incluido
• Reportes avanzados
━━━━━━━━━━━━━━━━━

🏆 SCALE - $4,997/mes
• Sucursales ilimitadas
• Usuarios ilimitados
• 10,000 ventas/mes
• API + integraciones
━━━━━━━━━━━━━━━━━

¿Te late alguno en particular?
¿O quieres la demo gratuita para conocerlo primero? 😊`
}

function getPlanDetailMessage(plan: string): string {
  if (plan.includes('launch')) {
    return `¡El plan Launch es perfecto para empezar! 🚀

Con $997/mes tienes:
✅ Punto de Venta completo
✅ Inventario básico
✅ Reportes
✅ 1 sucursal, 1 usuario
✅ Funciona sin internet

Ideal paratiendas pequeñas o primer cambio a digital.

¿Empezamos? Te hago el contrato en 5 minutos. 💼`
  } else if (plan.includes('grow')) {
    return `¡Grow es nuestro plan más popular! ⭐

Por $2,497/mes obtienes TODO lo de Launch +:

✅ 3 sucursales
✅ 5 usuarios
✅ 2,000 ventas/mes
✅ 🤖 Agente IA que responde WhatsApp 24/7
✅ Reportes avanzados

La IA sola te recupera la inversión porque responde cotizaciones y hace seguimiento mientras tú cierras tu negocio.

¿Te ayudo a empezar?`
  } else {
    return `¡Scale es el plan completo para dominar! 🏆

Por $4,997/mes:

✅ Todo de Grow
✅ Sucursales ilimitadas
✅ Usuarios ilimitados
✅ 10,000 ventas/mes
✅ API para desarrolladores
✅ Soporte dedicado

Para negocios establecidos que necesitan escalar sin límites.

¿Hablamos para personalizarlo a tu medida?`
  }
}

function getClosingMessage(): string {
  return `¡Excelente decisión! 🎉

Para empezar necesito:

1️⃣ Nombre de tu negocio
2️⃣ Tu correo electrónico
3️⃣ ¿Qué plan te interesa?

Con eso te genero el contrato y puedes empezar HOY.

¿Te late el Launch ($997) o el Grow ($2,497)?`
}

function getHelpMessage(): string {
  return `¡Estoy aquí para ayudarte! 😊

Puedes preguntarme sobre:

🛒 **Productos** - ¿Qué incluye el sistema?
💰 **Precios** - Nuestros planes y precios
📅 **Demo** - Agendar una demostración gratuita
⚡ **Features** - Funciones específicas
📱 **App** - App móvil para tu negocio

¿En qué te puedo ayudar hoy?`
}

function getProductOverview(): string {
  return `¡Tenemos todo lo que necesitas para digitalizar tu negocio! 📱✨

Aquí va nuestro menú completo:

🖥️ **PUNTO DE VENTA**
• Venta en 3 taps
• Efectivo, tarjeta, transferencia
• Tickets por WhatsApp
• Funciona SIN INTERNET ⚡

📦 **INVENTARIO**
• Control automático de stock
• Alertas cuando algo está bajo
• Categorías y variants
• Lectura de códigos de barra

📊 **REPORTES**
• Ventas del día/semana/mes
• Productos más vendidos
• Ganancias por período
• Envío automático por WhatsApp

🤖 **AGENTE IA (Grow+)** ⭐
• Responde WhatsApp 24/7
• Cotizaciones automáticas
• Seguimiento a clientes

🏪 **MULTI-SUCURSAL**
• Controla todo desde un panel
• Empleados y horarios
• Reportes por ubicación

¿Te interesa algo específico?`
}

function getThankYouMessage(): string {
  return `¡De nada! 😊

Recuerda que estoy aquí cuando me necesites.

Si tienes más preguntas o quieres agendar tu demo, 
simplemente escríbeme.

¡Te deseo mucho éxito en tu negocio! 🚀`
}

function getDefaultResponse(stage: string): string {
  switch (stage) {
    case 'new':
      return `¡Hola! 👋 Soy el asistente de Reisbloc Store.

Te ayudo a digitalizar tu negocio con un sistema de punto de venta que funciona sin internet.

Antes de mostrarte todo, dime:

🏪 ¿En qué giro está tu negocio?
   (ropa, restaurant, abarrotes, ferretería, etc.)

Con eso te puedo dar información más específica. 🎯`
    
    case 'greeting':
      return `¡Qué bueno saber de ti! 😊

Para darte la mejor información, necesito saber:

1️⃣ ¿Tienes negocio propio?
2️⃣ ¿Ya usas algún sistema de ventas?
3️⃣ ¿Qué te gustaría mejorar?

Con esas回答 puedo ayudarte mejor. 💪`

    case 'qualifying':
      return `¡Perfecto! Vamos muy bien. 👍

Solo unas preguntitas más:

📍 ¿En qué zona está tu negocio?
🏪 ¿Cuántas sucursales manejas?
📅 ¿Hace cuánto tiempo tienes el negocio?

Esto me ayuda a darte soluciones que sí te funcionen.`

    case 'interest':
      return `¡Me encanta tu interés! 🔥

Te puedo ayudar de varias formas:

1️⃣ **Demo gratuita** - Te muestro en 5 minutos cómo funciona
2️⃣ **Plan detallado** - Te explico cada feature
3️⃣ **Empezar HOY** - Te hago el contrato y operas mañana

¿Cuál prefieres?`

    default:
      return `Entiendo. 😊

Para ayudarte mejor, dime qué necesitas:

💬 **¿Qué te gustaría saber?**
📅 **¿Quieres agendar una demo?**
💰 **¿Tienes dudas sobre precios?**

Estoy aquí para ayudarte a hacer crecer tu negocio. 🚀`
  }
}

async function getConversationState(supabase: any, waId: string): Promise<ConversationState> {
  const { data } = await supabase
    .from('whatsapp_contacts')
    .select('*')
    .eq('wa_id', waId)
    .single()
  
  if (data?.conversation_state) {
    return data.conversation_state
  }
  
  return { stage: 'new', messages: [] }
}

async function updateConversationState(supabase: any, waId: string, state: ConversationState) {
  await supabase
    .from('whatsapp_contacts')
    .update({
      conversation_state: state,
      last_contact: new Date().toISOString()
    })
    .eq('wa_id', waId)
}

async function sendMessage(to: string, body: string) {
  try {
    await fetch(`https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: { body },
      }),
    })
  } catch (error) {
    console.error('Error sending message:', error)
  }
}

async function logMessage(supabase: any, from: string, to: string, content: string, messageId: string, direction: 'inbound' | 'outbound') {
  try {
    await supabase.from('whatsapp_messages').insert({
      from_number: from,
      to_number: to,
      direction,
      message_type: 'text',
      content,
      whatsapp_message_id: messageId,
      wa_id: from,
      status: direction === 'outbound' ? 'sent' : 'delivered',
    })
  } catch (error) {
    console.error('Error logging message:', error)
  }
}

async function markAsRead(phoneNumberId: string, messageId: string) {
  try {
    await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      }),
    })
  } catch (error) {
    console.error('Error marking as read:', error)
  }
}
