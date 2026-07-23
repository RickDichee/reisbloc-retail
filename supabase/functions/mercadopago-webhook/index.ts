import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "npm:@supabase/supabase-js@2.45.4"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-signature, x-timestamp",
}

// Helper para validar firma HMAC de MercadoPago
async function validateWebhookSignature(req: Request, webhookSecret: string, dataId: string): Promise<boolean> {
  const xSignature = req.headers.get('x-signature')
  const xRequestId = req.headers.get('x-request-id')
  
  if (!xSignature || !webhookSecret) {
    console.log('⚠️ Falta firma x-signature o webhook secret')
    return false
  }

  const sigParts = Object.fromEntries(
    xSignature.split(',').map(part => {
      const [k, v] = part.split('=').map(s => s.trim())
      return [k, v]
    })
  )

  const ts = sigParts['ts']
  const v1 = sigParts['v1']

  if (!ts || !v1) {
    console.log('⚠️ Header x-signature incompleto (falta ts o v1)')
    return false
  }

  // Plantilla de manifest de MercadoPago:
  // id:[data.id_url];request-id:[x-request-id_header];ts:[ts_header];
  const manifest = `id:${dataId};request-id:${xRequestId || ''};ts:${ts};`

  try {
    const encoder = new TextEncoder()
    const keyData = encoder.encode(webhookSecret)
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )

    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(manifest)
    )

    const hashHex = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    return hashHex === v1
  } catch (err: any) {
    console.error('Error calculando HMAC:', err.message)
    return false
  }
}

// Helper para checar si payment ya fue procesado (idempotencia)
async function isPaymentProcessed(supabaseAdmin: any, paymentId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('subscriptions')
    .select('id')
    .eq('payment_id', paymentId)
    .single()
  
  return !!data
}

// Helper para guardar log del webhook
async function logWebhookEvent(supabaseAdmin: any, event: any) {
  try {
    await supabaseAdmin.from('webhook_logs').insert({
      provider: 'mercadopago',
      event_type: event.type,
      event_id: event.id?.toString(),
      status: 'received',
      payload: event,
      processed_at: new Date().toISOString()
    }).throwOnError()
  } catch (e) {
    console.log('No se pudo guardar log:', e.message)
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const webhookToken = Deno.env.get("MERCADOPAGO_WEBHOOK_TOKEN") || ""

    // Leer body como texto primero
    const rawBody = await req.text()
    const body = JSON.parse(rawBody || '{}')
    const dataId = (body.data?.id || body.id || '').toString()

    // F1: Validar firma del webhook en producción
    const isDevelopment = Deno.env.get("DENO_ENV") === "development" || !webhookToken
    if (!isDevelopment && !(await validateWebhookSignature(req, webhookToken, dataId))) {
      console.error('❌ Firma de webhook inválida')
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    )

    // Log del evento recibido
    await logWebhookEvent(supabaseAdmin, body)

    if (body.type === 'payment' && body.id) {
      const paymentId = body.id.toString()
      console.log('📦 Procesando webhook de MercadoPago:', paymentId)

      // F2: Idempotencia - verificar si ya procesamos este pago
      const alreadyProcessed = await isPaymentProcessed(supabaseAdmin, paymentId)
      if (alreadyProcessed) {
        console.log('⏭️ Payment ya procesado anteriormente:', paymentId)
        return new Response(JSON.stringify({ 
          success: true, 
          status: 'already_processed',
          payment_id: paymentId 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

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

      // F3: Manejo completo de estados de pago
      switch (payment.status) {
        case 'approved':
          console.log('✅ Payment aprobado - activando suscripción')
          
          const periodEnd = new Date()
          periodEnd.setMonth(periodEnd.getMonth() + 1)

          await supabaseAdmin.from('subscriptions').upsert({
            user_id: userId,
            organization_id: orgData.id,
            plan: plan,
            status: 'active',
            preference_id: payment.preference_id,
            payment_id: paymentId.toString(),
            price_cents: Math.round(payment.transaction_amount * 100),
            current_period_start: new Date().toISOString(),
            current_period_end: periodEnd.toISOString()
          }, {
            onConflict: 'user_id,organization_id'
          })

          await supabaseAdmin.from('organizations').update({
            plan: plan,
            plan_note: `MercadoPago: ${paymentId} (aprobado)`,
            plan_updated_at: new Date().toISOString()
          }).eq('id', orgData.id)

          console.log('✅ Suscripción activada para plan:', plan)
          break

        case 'pending':
          console.log('⏳ Payment pendiente')
          
          await supabaseAdmin.from('subscriptions').upsert({
            user_id: userId,
            organization_id: orgData.id,
            plan: plan,
            status: 'pending',
            preference_id: payment.preference_id,
            payment_id: paymentId.toString(),
            price_cents: Math.round(payment.transaction_amount * 100),
            current_period_start: new Date().toISOString()
          }, {
            onConflict: 'user_id,organization_id'
          })
          break

        case 'rejected':
          console.log('❌ Payment rechazado')
          
          await supabaseAdmin.from('subscriptions').upsert({
            user_id: userId,
            organization_id: orgData.id,
            plan: plan,
            status: 'rejected',
            preference_id: payment.preference_id,
            payment_id: paymentId.toString(),
            price_cents: Math.round(payment.transaction_amount * 100),
            metadata: { 
              rejection_reason: payment.status_detail,
              gateway_response: payment
            }
          }, {
            onConflict: 'user_id,organization_id'
          })
          break

        case 'in_process':
          console.log('🔄 Payment en proceso de verificación')
          // No hacer nada, esperar a que MP notifique cambio de estado
          break

        case 'cancelled':
          console.log('🚫 Payment cancelado por usuario')
          await supabaseAdmin.from('subscriptions').update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString()
          }).eq('payment_id', paymentId)
          break

        case 'refunded':
          console.log('💸 Payment reembolsado')
          await supabaseAdmin.from('subscriptions').update({
            status: 'cancelled',
            plan_note: `Reembolsado: ${paymentId}`
          }).eq('payment_id', paymentId)
          
          await supabaseAdmin.from('organizations').update({
            plan: 'free',
            plan_note: `Suscripción reembolsada: ${paymentId}`,
            plan_updated_at: new Date().toISOString()
          }).eq('id', orgData.id)
          break

        default:
          console.log('⚠️ Estado desconocido:', payment.status)
      }

      return new Response(JSON.stringify({
        success: true,
        payment_status: payment.status,
        payment_id: paymentId
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Manejar otros tipos de eventos
    if (body.type === 'subscription_premium') {
      console.log('📦 Evento de suscripción premium:', body)
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