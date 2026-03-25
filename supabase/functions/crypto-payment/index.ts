import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "npm:@supabase/supabase-js@2.45.4"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const SOLANA_USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDj1v"

const TOKEN_PRICE_USDC = {
  500: 5.50,
  2000: 16.50,
  5000: 33.00,
  15000: 72.00,
  50000: 194.00,
}

function generatePaymentReference(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `RB${timestamp}${random}`.toUpperCase()
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

    const { data: { user } } = await createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    ).auth.getUser()

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { action, package_id, tokens, amount_mxn } = await req.json().catch(() => ({}))

    switch (action) {
      case 'create_solana_payment': {
        if (!tokens || !amount_mxn) {
          return new Response(JSON.stringify({ error: "tokens and amount_mxn required" }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        const reisblocWallet = Deno.env.get("REISBLOC_SOLANA_WALLET")
        if (!reisblocWallet) {
          return new Response(JSON.stringify({ error: "Payment system not configured" }), {
            status: 503,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        const priceUsdc = TOKEN_PRICE_USDC[tokens] ?? (amount_mxn / 20)
        const amountUsdc = Number(priceUsdc.toFixed(2))

        const paymentReference = generatePaymentReference()
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString()

        const { data: payment, error } = await supabaseAdmin
          .from('crypto_payments')
          .insert({
            user_id: user.id,
            amount_crypto: 0,
            amount_usdc: amountUsdc,
            amount_mxn: amount_mxn,
            tokens_to_credit: tokens,
            package_id: package_id || null,
            status: 'pending',
            payment_reference: paymentReference,
            wallet_address: reisblocWallet,
            expires_at: expiresAt,
          })
          .select()
          .single()

        if (error) throw error

        const solanaPayUrl = `solana:${reisblocWallet}?amount=${amountUsdc}&spl-token=${SOLANA_USDC_MINT}&label=Reisbloc&message=Tokens+${tokens}&reference=${paymentReference}`

        return new Response(JSON.stringify({
          success: true,
          payment: {
            id: payment.id,
            reference: paymentReference,
            amountUsdc,
            amountMxn: amount_mxn,
            tokens,
            expiresAt,
            walletAddress: reisblocWallet,
            solanaPayUrl,
            qrData: `solana:${reisblocWallet}?amount=${amountUsdc}&spl-token=${SOLANA_USDC_MINT}`,
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'create_spei_payment': {
        if (!tokens || !amount_mxn) {
          return new Response(JSON.stringify({ error: "tokens and amount_mxn required" }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        const speiReference = generatePaymentReference()
        const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()

        const { data: speiPayment, error } = await supabaseAdmin
          .from('spei_payments')
          .insert({
            user_id: user.id,
            amount_mxn: amount_mxn,
            tokens_to_credit: tokens,
            package_id: package_id || null,
            reference_code: speiReference,
            status: 'pending',
            expires_at: expiresAt,
          })
          .select()
          .single()

        if (error) throw error

        const speiConfig = {
          bank: Deno.env.get("SPEI_BANK") || "BBVA Bancomer",
          clabe: Deno.env.get("SPEI_CLABE") || "0123456789012345678901",
          accountName: Deno.env.get("SPEI_ACCOUNT_NAME") || "Reisbloc SA de CV",
        }

        return new Response(JSON.stringify({
          success: true,
          payment: {
            id: speiPayment.id,
            reference: speiReference,
            amountMxn: amount_mxn,
            tokens,
            expiresAt,
            bank: speiConfig.bank,
            clabe: speiConfig.clabe,
            accountName: speiConfig.accountName,
            concept: user.email,
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'get_payment_status': {
        const { payment_id, reference } = await req.json().catch(() => ({}))

        let payment = null

        if (payment_id) {
          const { data } = await supabaseAdmin
            .from('crypto_payments')
            .select('*')
            .eq('id', payment_id)
            .eq('user_id', user.id)
            .single()
          payment = data
        } else if (reference) {
          const { data } = await supabaseAdmin
            .from('crypto_payments')
            .select('*')
            .eq('payment_reference', reference)
            .eq('user_id', user.id)
            .single()
          payment = data

          if (!data) {
            const { data: speiData } = await supabaseAdmin
              .from('spei_payments')
              .select('*')
              .eq('reference_code', reference)
              .eq('user_id', user.id)
              .single()
            payment = speiData ? { ...speiData, type: 'spei' } : null
          }
        }

        if (!payment) {
          return new Response(JSON.stringify({ error: "Payment not found" }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        return new Response(JSON.stringify({
          status: payment.status,
          type: payment.type || 'crypto',
          tokensToCredit: payment.tokens_to_credit,
          createdAt: payment.created_at,
          completedAt: payment.completed_at,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'get_payment_history': {
        const [cryptoPayments, speiPayments] = await Promise.all([
          supabaseAdmin.from('crypto_payments').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
          supabaseAdmin.from('spei_payments').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
        ])

        const payments = [
          ...(cryptoPayments.data || []).map(p => ({ ...p, type: 'crypto' })),
          ...(speiPayments.data || []).map(p => ({ ...p, type: 'spei' })),
        ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

        return new Response(JSON.stringify({ payments }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      default:
        return new Response(JSON.stringify({
          error: "Invalid action",
          validActions: ['create_solana_payment', 'create_spei_payment', 'get_payment_status', 'get_payment_history']
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }

  } catch (err) {
    console.error("Crypto Payment Error:", err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
