import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-hub-signature-256',
}

const VERIFY_TOKEN = Deno.env.get('WHATSAPP_VERIFY_TOKEN') || 'reisbloc_whatsapp_verify'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const mode = url.searchParams.get('hub.mode')
    const token = url.searchParams.get('hub.verify_token')
    const challenge = url.searchParams.get('hub.challenge')

    // Verify webhook setup
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('WhatsApp webhook verified successfully')
      return new Response(challenge, { status: 200 })
    }

    // Handle webhook callbacks
    const payload = await req.json()
    console.log('WhatsApp webhook received:', JSON.stringify(payload))

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Process webhook entries
    for (const entry of payload.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field === 'messages') {
          await handleMessages(supabase, change.value)
        }
      }
    }

    return new Response('ok', { status: 200 })
  } catch (error) {
    console.error('WhatsApp webhook error:', error)
    return new Response('error', { status: 500 })
  }
})

async function handleMessages(supabase: any, value: any) {
  const phoneNumberId = value.metadata?.phone_number_id
  const messages = value.messages || []

  for (const message of messages) {
    const from = message.from
    const messageId = message.id
    const timestamp = message.timestamp

    // Log inbound message
    await supabase.from('whatsapp_messages').insert({
      from_number: from,
      to_number: phoneNumberId,
      direction: 'inbound',
      message_type: message.type,
      content: message.text?.body || JSON.stringify(message),
      whatsapp_message_id: messageId,
      wa_id: from,
      status: 'delivered',
      delivered_at: new Date().toISOString(),
      raw_payload: message,
    })

    // Find or create contact
    await ensureContact(supabase, from, value.contacts?.[0])

    // Process message based on type
    if (message.text?.body) {
      await processTextMessage(supabase, from, message.text.body, messageId)
    }

    // Mark as read
    await markAsRead(supabase, phoneNumberId, messageId)
  }
}

async function ensureContact(supabase: any, waId: string, contact: any) {
  const phoneNumber = waId
  
  // Try to find existing contact
  const { data: existing } = await supabase
    .from('whatsapp_contacts')
    .select('id')
    .eq('wa_id', waId)
    .single()

  if (!existing) {
    await supabase.from('whatsapp_contacts').insert({
      wa_id: waId,
      phone_number: phoneNumber,
      display_name: contact?.profile?.name || `Cliente ${phoneNumber.slice(-4)}`,
      profile_name: contact?.profile?.name,
    })
  }
}

async function processTextMessage(supabase: any, from: string, body: string, messageId: string) {
  const lowerBody = body.toLowerCase().trim()
  
  // Auto-reply logic based on keywords
  let response = ''
  
  if (lowerBody.includes('hola') || lowerBody.includes('buenos') || lowerBody.includes('saludos')) {
    response = '¡Hola! 👋 Gracias por escribir a Reisbloc Store. ¿En qué puedo ayudarte hoy?'
  } else if (lowerBody.includes('precio') || lowerBody.includes('costo') || lowerBody.includes('cuanto')) {
    response = 'Para darte información de precios, necesito saber qué producto te interesa. ¿Podrías darme más detalles?'
  } else if (lowerBody.includes('catalogo') || lowerBody.includes('catálogo') || lowerBody.includes('productos')) {
    response = 'Puedes ver nuestros productos directamente en nuestra tienda: https://app.reisbloc.com/pos'
  } else if (lowerBody.includes('ayuda')) {
    response = 'Claro, estoy aquí para ayudarte. ¿Tienes alguna pregunta específica sobre nuestros productos o servicios?'
  } else {
    response = 'Gracias por tu mensaje. Un asesor se pondrá en contacto contigo pronto para atenderte. 😊'
  }

  // Send auto-reply
  const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')!
  const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN')!

  try {
    await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: from,
        type: 'text',
        text: { body: response },
      }),
    })

    // Log outbound message
    await supabase.from('whatsapp_messages').insert({
      from_number: phoneNumberId,
      to_number: from,
      direction: 'outbound',
      message_type: 'text',
      content: response,
      wa_id: from,
      status: 'sent',
    })
  } catch (error) {
    console.error('Error sending auto-reply:', error)
  }
}

async function markAsRead(supabase: any, phoneNumberId: string, messageId: string) {
  const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN')!

  try {
    await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
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
