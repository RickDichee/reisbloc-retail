import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "npm:@supabase/supabase-js@2.45.4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Falta header Authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const token = Deno.env.get('WHATSAPP_ACCESS_TOKEN')
    const phoneId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')

    if (!token || !phoneId) {
      return new Response(JSON.stringify({ error: 'WhatsApp API no configurada en el servidor' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { action, to, type, content } = await req.json()

    if (action === 'send_message') {
      const cleanPhone = (to || '').replace(/\D/g, '')
      const payload = {
        messaging_product: 'whatsapp',
        to: cleanPhone,
        type: type || 'text',
        ...(type === 'text' && { text: content }),
        ...(type === 'template' && { template: content }),
        ...(type === 'image' && { image: content }),
        ...(type === 'document' && { document: content }),
        ...(type === 'location' && { location: content }),
      }

      const res = await fetch(`${WHATSAPP_API_URL}/${phoneId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const result = await res.json()
      if (!res.ok) {
        throw new Error(result.error?.message || 'Error al enviar mensaje por WhatsApp')
      }

      return new Response(JSON.stringify({ messageId: result.messages?.[0]?.id || 'ok' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: 'Acción no válida' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err: any) {
    console.error('WhatsApp Proxy Error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
