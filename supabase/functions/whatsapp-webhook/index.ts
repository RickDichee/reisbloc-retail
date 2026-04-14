import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-hub-signature-256',
}

const VERIFY_TOKEN = Deno.env.get('WHATSAPP_VERIFY_TOKEN') ?? ''
const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') ?? ''
const WHATSAPP_ACCESS_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN') ?? ''

const DIFY_API_URL = Deno.env.get('DIFY_API_URL') ?? ''
const DIFY_API_KEY = Deno.env.get('DIFY_API_KEY') ?? ''
const DIFY_APP_ID = Deno.env.get('DIFY_APP_ID') || ''

const WELCOME_MESSAGE = `¡Hola! 👋 Soy el asistente virtual de Reisbloc Store.

Te ayudo con:
🛒 Catálogo de productos
💰 Precios y promociones
📦 Información de pedidos
🏪 Ubicación de tiendas

¿En qué puedo ayudarte hoy?`

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
        console.log('WhatsApp webhook verified successfully')
        return new Response(challenge, { status: 200, headers: corsHeaders })
      } else {
        return new Response('Forbidden', { status: 403, headers: corsHeaders })
      }
    }

    const payload = await req.json()
    console.log('WhatsApp received:', JSON.stringify(payload))

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
    console.error('WhatsApp error:', error)
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

    await markAsRead(phoneNumberId, messageId)

    await logMessage(supabase, from, phoneNumberId, body, messageId, 'inbound')

    let response: string

    console.log('DIFY_API_KEY:', DIFY_API_KEY ? 'set' : 'not set')
    console.log('DIFY_API_URL:', DIFY_API_URL)

    if (DIFY_API_KEY) {
      response = await getDifyResponse(from, body)
    } else if (body.toLowerCase().includes('hola') || body.toLowerCase().includes('buenos') || body.toLowerCase().includes('saludos')) {
      response = WELCOME_MESSAGE
      await saveContact(supabase, from, 'new_contact')
    } else {
      response = `Recibí tu mensaje: "${body}"

Un asesor te atenderá pronto. 😊

Mientras tanto, puedes visitar nuestra tienda en línea:
📱 www.reisbloc.store`
    }

    await sendMessage(from, response)
    await logMessage(supabase, phoneNumberId, from, response, messageId + '_out', 'outbound')
  }
}

async function getDifyResponse(userId: string, query: string): Promise<string> {
  try {
    const response = await fetch(`${DIFY_API_URL}/chat-messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DIFY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: {},
        query: query,
        response_mode: 'streaming',
        user: userId,
        conversation_id: '',
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Dify API error:', response.status, errorText)
      return `Gracias por tu mensaje. Un asesor te atenderá pronto. 😊`
    }

    let fullAnswer = ''
    const reader = response.body?.getReader()
    const decoder = new TextDecoder()

    if (reader) {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              if ((data.event === 'message' || data.event === 'agent_message') && data.answer) {
                fullAnswer += data.answer
              }
              if (data.event === 'message_end') {
                break
              }
            } catch (e) {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }
    }

    return fullAnswer || 'Gracias por tu mensaje. ¿Hay algo más en lo que pueda ayudarte?'
  } catch (error) {
    console.error('Dify connection error:', error)
    return `Gracias por tu mensaje. ¿Hay algo más en lo que pueda ayudarte? 😊`
  }
}

async function sendMessage(to: string, body: string) {
  if (!WHATSAPP_ACCESS_TOKEN) {
    console.log('Would send to WhatsApp:', body.substring(0, 50))
    return
  }

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

async function markAsRead(phoneNumberId: string, messageId: string) {
  if (!WHATSAPP_ACCESS_TOKEN) return

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

async function saveContact(supabase: any, waId: string, name?: string) {
  try {
    await supabase.from('whatsapp_contacts').upsert({
      wa_id: waId,
      name: name || 'Contact',
      last_contact: new Date().toISOString(),
      source: 'whatsapp_webhook',
    }, {
      onConflict: 'wa_id'
    })
  } catch (error) {
    console.error('Error saving contact:', error)
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
