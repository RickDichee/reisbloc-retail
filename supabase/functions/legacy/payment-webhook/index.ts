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

    if (body.type === 'payment' && body.tx_signature) {
      const txSignature = body.tx_signature
      const reference = body.reference
      const amount = body.amount || body.amount_crypto

      if (!reference) {
        return new Response(JSON.stringify({ error: "Missing reference" }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const { data: payment } = await supabaseAdmin
        .from('crypto_payments')
        .select('*')
        .eq('payment_reference', reference)
        .single()

      if (!payment) {
        return new Response(JSON.stringify({ error: "Payment not found" }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      if (payment.status !== 'pending') {
        return new Response(JSON.stringify({ 
          status: payment.status,
          message: "Payment already processed"
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      await supabaseAdmin.rpc('verify_crypto_payment', {
        p_payment_id: payment.id
      })

      return new Response(JSON.stringify({
        success: true,
        status: 'completed',
        tokens_credited: payment.tokens_to_credit
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: "Invalid webhook payload" }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error("Webhook Error:", err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
