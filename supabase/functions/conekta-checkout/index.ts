import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const ALLOWED_ORIGINS = Deno.env.get('ALLOWED_ORIGINS')?.split(',') || [
  'https://reisbloc.store',
  'https://www.reisbloc.store',
  'http://localhost:5173',
  'http://localhost:3000'
]

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGINS.join(', '),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { amount, currency = "MXN", description = "Venta Mostrador Reisbloc", customerName = "Cliente", orderId = `pos_${Date.now()}` } = await req.json()

    if (!amount) {
      throw new Error('El monto es requerido (amount).')
    }

    // La API key de Conekta DEBE estar configurada en las variables de entorno del proyecto
    const CONEKTA_API_KEY = Deno.env.get('CONEKTA_PRIVATE_KEY')
    
    if (!CONEKTA_API_KEY) {
      throw new Error('CONEKTA_PRIVATE_KEY no está configurada. Configura la variable de entorno en el dashboard de Supabase.')
    }
    
    // Conekta requiere Basic Auth con la Private Key como username y vacío como password
    const encodeAuth = btoa(`${CONEKTA_API_KEY}:`)

    const payload = {
      currency,
      customer_info: {
        name: customerName,
        email: "cajero@reisbloc.store",
        phone: "+525500000000"
      },
      line_items: [
        {
          name: description,
          unit_price: Math.round(amount * 100), // Conekta requiere centavos
          quantity: 1
        }
      ],
      checkout: {
        allowed_payment_methods: ["card"], // Efectivo y SPEI pueden tardar horas en notificar, restringimos a Card/ApplePay para POS
        type: "Integration",
        name: `Orden ${orderId}`,
        needs_shipping_contact: false,
        monthly_installments_enabled: false
      }
    }

    const response = await fetch('https://api.conekta.io/orders', {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.conekta-v2.1.0+json',
        'Content-Type': 'application/json',
        'Authorization': `Basic ${encodeAuth}`
      },
      body: JSON.stringify(payload)
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Conekta API Error:', data);
      throw new Error(data.details?.[0]?.message || 'Error al procesar pago en Conekta')
    }

    // Conekta devuelve checkout.id — la URL pública se construye con ese ID
    const checkoutId = data.checkout?.id
    if (!checkoutId) {
      console.error('Conekta response missing checkout.id:', JSON.stringify(data))
      throw new Error('Conekta no retornó un checkout ID válido')
    }

    // URL pública del checkout de Conekta (funciona con Apple Pay, OXXO y Tarjeta)
    const checkoutUrl = `https://pay.conekta.com/checkout/${checkoutId}`

    return new Response(
      JSON.stringify({
        success: true,
        transactionId: data.id,
        checkoutId: checkoutId,
        checkoutUrl: checkoutUrl
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Error in conekta-checkout function:', error.message)
    // Devolvemos STATUS 200 para que supabase-js no intercepte el body como un simple "non-2xx response"
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
