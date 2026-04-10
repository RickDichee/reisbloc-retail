import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "npm:@supabase/supabase-js@2.45.4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MP_API_URL = 'https://api.mercadopago.com'

// Helper para obtener credenciales según ambiente
function getMercadoPagoCredentials() {
  const env = Deno.env.get("DENO_ENV") || Deno.env.get("VERCEL_ENV") || "production"
  const testToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN_TEST")
  const prodToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN")
  
  console.log('🧪 MP Env:', env)
  console.log('🧪 MP Test Token exists:', !!testToken)
  console.log('🧪 MP Prod Token exists:', !!prodToken)
  
  // Si estamos en desarrollo local o hay token test, usar sandbox
  if (env === "development" || testToken) {
    return {
      accessToken: testToken || prodToken,
      isSandbox: !!testToken
    }
  }
  
  return {
    accessToken: prodToken,
    isSandbox: false
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { accessToken, isSandbox } = getMercadoPagoCredentials()
    if (!accessToken) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN no configurado en Edge Functions')
    }

    console.log('🧪 MP Proxy - Modo Sandbox:', isSandbox)

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

        // F2: Idempotency key
        const idempotencyKey = `pos_${orderId || Date.now()}_${Math.random().toString(36).slice(2)}`

        const preferenceBody = {
          site_id: 'MLM', // Mercado Libre Mexico
          items: [{
            title: description?.substring(0, 100) || 'Venta Mostrador Reisbloc',
            quantity: 1,
            currency_id: 'MXN',
            unit_price: parseFloat(amount.toFixed(2)),
          }],
          external_reference: orderId || `pos_${Date.now()}`,
          payer: { 
            email: email || 'customer@email.com',
            name: 'Cliente Reisbloc'
          },
          payment_methods: {
            excluded_payment_types: [],
            installments: 1
          },
          back_urls: {
            success: `${req.headers.get('origin') || ''}/payment/success`,
            failure: `${req.headers.get('origin') || ''}/payment/failure`,
            pending: `${req.headers.get('origin') || ''}/payment/pending`
          },
          auto_return: 'approved'
        }

        const response = await fetch(`${MP_API_URL}/checkout/preferences`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'X-Idempotency-Key': idempotencyKey
          },
          body: JSON.stringify(preferenceBody),
        })

        const data = await response.json()
        if (!response.ok) throw new Error(data.message || 'Error al crear preferencia')

        return new Response(JSON.stringify({
          id: data.id,
          init_point: data.init_point,
          sandbox_init_point: data.sandbox_init_point,
          is_sandbox: isSandbox
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'get_payment_status': {
        if (!paymentId) throw new Error('paymentId es requerido')

        const response = await fetch(`${MP_API_URL}/v1/payments/${paymentId}`, {
          headers: { 
            Authorization: `Bearer ${accessToken}`,
            // Idempotency key para consultas
            'X-Idempotency-Key': `status_${paymentId}`
          },
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
