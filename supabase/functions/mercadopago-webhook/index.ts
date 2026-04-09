import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "npm:@supabase/supabase-js@2.45.4"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    )

    const body = await req.json()

    if (body.type === 'payment' && body.id) {
      const paymentId = body.id.toString()
      console.log('📦 Procesando webhook de MercadoPago:', paymentId)

      const mpAccessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN")
      if (!mpAccessToken) {
        console.error('❌ MERCADOPAGO_ACCESS_TOKEN no configurado')
        return new Response(JSON.stringify({ error: "Configuración incompleta" }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          "Authorization": `Bearer ${mpAccessToken}`
        }
      })

      if (!mpResponse.ok) {
        console.error('❌ Error obteniendo detalles de pago de MP')
        return new Response(JSON.stringify({ error: "Error verificando pago" }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const payment = await mpResponse.json()
      console.log('📊 Estado del pago:', payment.status, payment.status_detail)

      if (payment.status === 'approved') {
        const externalRef = payment.external_reference
        if (!externalRef) {
          console.warn('⚠️ Payment sin external_reference')
          return new Response(JSON.stringify({ error: "No reference" }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        const [userId, plan] = externalRef.split('_')
        console.log(`🎯 Usuario: ${userId}, Plan: ${plan}`)

        const validPlans = ['starter', 'growth', 'scale']
        if (!validPlans.includes(plan)) {
          console.warn('⚠️ Plan inválido:', plan)
          return new Response(JSON.stringify({ error: "Invalid plan" }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        const { data: orgData } = await supabaseAdmin
          .from('organizations')
          .select('id')
          .eq('owner_id', userId)
          .single()

        if (!orgData) {
          console.error('❌ No se encontró organización para user:', userId)
          return new Response(JSON.stringify({ error: "Organization not found" }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        const periodEnd = new Date()
        periodEnd.setMonth(periodEnd.getMonth() + 1)

        await supabaseAdmin.from('subscriptions').upsert({
          user_id: userId,
          organization_id: orgData.id,
          plan: plan,
          status: 'active',
          preference_id: payment.preference_id,
          payment_id: paymentId.toString(),
          price_cents: payment.transaction_amount * 100,
          current_period_start: new Date().toISOString(),
          current_period_end: periodEnd.toISOString()
        }, {
          onConflict: 'user_id,organization_id'
        })

        await supabaseAdmin.from('organizations').update({
          plan: plan,
          plan_note: `MercadoPago: ${paymentId}`,
          plan_updated_at: new Date().toISOString()
        }).eq('id', orgData.id)

        console.log('✅ Suscripción activada para plan:', plan)
      }

      return new Response(JSON.stringify({
        success: true,
        payment_status: payment.status
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: "Invalid payload" }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error("❌ Webhook Error:", err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})