import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "npm:@supabase/supabase-js@2.45.4"

const ALLOWED_ORIGINS = Deno.env.get('ALLOWED_ORIGINS')?.split(',') || [
  'https://reisbloc.store',
  'https://www.reisbloc.store',
  'http://localhost:5173',
  'http://localhost:3000'
]

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGINS.join(', '),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MP_API_URL = 'https://api.mercadopago.com'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')
    if (!accessToken) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN no configurado en Edge Functions')
    }

    // Verify auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing Authorization header')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { action, amount, description, orderId, email, paymentMethodId, paymentId } = await req.json()

    switch (action) {
      case 'create_preference': {
        if (!amount) throw new Error('El monto es requerido')

        const response = await fetch(`${MP_API_URL}/checkout/preferences`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            items: [{
              title: description || 'Venta Mostrador Reisbloc',
              quantity: 1,
              currency_id: 'MXN',
              unit_price: amount,
            }],
            external_reference: orderId || `pos_${Date.now()}`,
            payer: { email: email || 'customer@email.com' },
          }),
        })

        const data = await response.json()
        if (!response.ok) throw new Error(data.message || 'Error al crear preferencia')

        return new Response(JSON.stringify({
          id: data.id,
          init_point: data.init_point,
          sandbox_init_point: data.sandbox_init_point,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'get_payment_status': {
        if (!paymentId) throw new Error('paymentId es requerido')

        const response = await fetch(`${MP_API_URL}/v1/payments/${paymentId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })

        const data = await response.json()
        if (!response.ok) throw new Error(data.message || 'Error al obtener pago')

        return new Response(JSON.stringify({
          id: data.id,
          status: data.status,
          status_detail: data.status_detail,
          transaction_amount: data.transaction_amount,
          payment_method_id: data.payment_method_id,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'cancel_payment': {
        if (!paymentId) throw new Error('paymentId es requerido')

        const response = await fetch(`${MP_API_URL}/v1/payments/${paymentId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ status: 'cancelled' }),
        })

        return new Response(JSON.stringify({ success: response.ok }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      default:
        return new Response(JSON.stringify({
          error: 'Invalid action',
          validActions: ['create_preference', 'get_payment_status', 'cancel_payment']
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }

  } catch (err: any) {
    console.error('MercadoPago Proxy Error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
