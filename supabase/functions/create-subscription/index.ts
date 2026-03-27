import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "npm:@supabase/supabase-js@2.45.4"

const MERCADOPAGO_API = "https://api.mercadopago.com"
const MERCADOPAGO_SITE_ID = "MLM"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const PLAN_CONFIG = {
  starter: {
    name: "Reisbloc Launch",
    price: 149,
    frequency: "monthly",
    external_reference: "plan_launch"
  },
  growth: {
    name: "Reisbloc Growth",
    price: 399,
    frequency: "monthly",
    external_reference: "plan_growth"
  },
  scale: {
    name: "Reisbloc Scale",
    price: 799,
    frequency: "monthly",
    external_reference: "plan_scale"
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    )

    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { plan, price, userId, email } = await req.json()

    if (!plan || !PLAN_CONFIG[plan as keyof typeof PLAN_CONFIG]) {
      return new Response(JSON.stringify({ error: "Plan inválido" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const planConfig = PLAN_CONFIG[plan as keyof typeof PLAN_CONFIG]
    const accessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN")
    
    if (!accessToken) {
      console.error("MERCADOPAGO_ACCESS_TOKEN no está configurado")
      return new Response(JSON.stringify({ 
        error: "Configuración de pago incompleta",
        message: "Contacta a soporte para activar los pagos"
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const preferenceData = {
      items: [
        {
          id: `reisbloc_${plan}`,
          title: planConfig.name,
          description: `Suscripción mensual a ${planConfig.name}`,
          quantity: 1,
          currency_id: "MXN",
          unit_price: planConfig.price
        }
      ],
      payer: {
        email: email || user.email
      },
      back_urls: {
        success: `${Deno.env.get("VITE_APP_URL") || "https://reisbloc.store"}/settings?subscription=success`,
        failure: `${Deno.env.get("VITE_APP_URL") || "https://reisbloc.store"}/settings?subscription=failed`,
        pending: `${Deno.env.get("VITE_APP_URL") || "https://reisbloc.store"}/settings?subscription=pending`
      },
      external_reference: `${user.id}_${plan}`,
      notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/payment-webhook`,
      auto_return: "approved"
    }

    console.log("Creando preferencia de pago:", JSON.stringify(preferenceData, null, 2))

    const mpResponse = await fetch(`${MERCADOPAGO_API}/checkout/preferences`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`
      },
      body: JSON.stringify(preferenceData)
    })

    const mpData = await mpResponse.json()

    if (!mpResponse.ok) {
      console.error("Error de MercadoPago:", mpData)
      return new Response(JSON.stringify({ 
        error: "Error al crear la preferencia de pago",
        details: mpData
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log("Preferencia creada:", mpData.id)

    return new Response(JSON.stringify({
      init_point: mpData.init_point,
      sandbox_init_point: mpData.sandbox_init_point,
      preference_id: mpData.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error("Error en create-subscription:", err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
