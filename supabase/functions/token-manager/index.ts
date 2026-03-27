import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "npm:@supabase/supabase-js@2.45.4"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const TOKEN_COSTS: Record<string, number> = {
  ai_chat: 1,
  post_generation: 5,
  ai_insights: 3,
  report_pdf: 10,
  data_export: 2,
  multi_sync: 1,
  push_notification: 0.5,
  api_access: 20,
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

    const { action, feature, amount } = await req.json().catch(() => ({}))

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    )

    switch (action) {
      case 'check_balance': {
        const { data } = await supabaseAdmin.rpc('get_or_create_wallet', { user_uuid: user.id })
        return new Response(JSON.stringify({ balance: data?.balance ?? 0 }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'get_cost': {
        const cost = TOKEN_COSTS[feature] ?? null
        if (cost === null) {
          return new Response(JSON.stringify({ error: "Feature not found" }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
        return new Response(JSON.stringify({ feature, cost }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'deduct': {
        const cost = amount ?? TOKEN_COSTS[feature]
        if (!cost) {
          return new Response(JSON.stringify({ error: "Feature or amount required" }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        const { data, error } = await supabaseAdmin.rpc('deduct_tokens', {
          p_user_id: user.id,
          p_amount: cost,
          p_feature: feature,
          p_description: `Uso de ${feature}`
        })

        if (error) throw error

        const result = data?.[0]
        if (!result?.success) {
          return new Response(JSON.stringify({
            success: false,
            error: result?.error_message ?? 'Error desconocido',
            balance: result?.new_balance ?? 0
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        return new Response(JSON.stringify({
          success: true,
          newBalance: result.new_balance,
          tokensSpent: cost
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'get_transactions': {
        const { data, error } = await supabaseAdmin
          .from('token_transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50)

        if (error) throw error

        return new Response(JSON.stringify({ transactions: data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'get_packages': {
        const { data, error } = await supabaseAdmin
          .from('token_packages')
          .select('*')
          .eq('is_active', true)
          .order('price_mxn', { ascending: true })

        if (error) throw error

        return new Response(JSON.stringify({ packages: data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'add_bonus': {
        if (!amount || amount <= 0) {
          return new Response(JSON.stringify({ error: "Amount required" }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        const { data, error } = await supabaseAdmin.rpc('add_tokens', {
          p_user_id: user.id,
          p_amount: amount,
          p_type: 'bonus',
          p_feature: 'signup_bonus',
          p_description: 'Bono de bienvenida'
        })

        if (error) throw error

        const result = data?.[0]
        return new Response(JSON.stringify({
          success: result?.success ?? false,
          newBalance: result?.new_balance ?? 0,
          error: result?.error_message
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      default:
        return new Response(JSON.stringify({
          error: "Invalid action",
          validActions: ['check_balance', 'get_cost', 'deduct', 'get_transactions', 'get_packages', 'add_bonus']
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }

  } catch (err: any) {
    console.error("Token Manager Error:", err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
