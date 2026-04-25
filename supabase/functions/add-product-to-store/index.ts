import { serve } from "std/http/server.ts"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, Content-Type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { "Content-Type": "application/json" } })
    }

    const { store_id, wholesale_product_id } = await req.json()

    if (!store_id || !wholesale_product_id) {
      return new Response(JSON.stringify({ error: "Missing store_id or wholesale_product_id" }), { status: 400, headers: { "Content-Type": "application/json" } })
    }

    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), { status: 401, headers: { "Content-Type": "application/json" } })
    }

    const token = authHeader.replace("Bearer ", "")
    
    // Create supabase client
    const supabase = (await import("supabase/mod.ts")).createClient(supabaseUrl, supabaseKey)
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } })
    }

    const { data: store, error: storeError } = await supabase.from("stores").select("owner_id").eq("id", store_id).single()

    if (storeError || !store || store.owner_id !== user.id) {
      return new Response(JSON.stringify({ error: "Not your store" }), { status: 403, headers: { "Content-Type": "application/json" } })
    }

    const { data: wholesaleProduct, error: productError } = await supabase.from("wholesale_catalog").select("*").eq("id", wholesale_product_id).single()

    if (productError || !wholesaleProduct) {
      return new Response(JSON.stringify({ error: "Product not found" }), { status: 404, headers: { "Content-Type": "application/json" } })
    }

    const margin = 1.3 // 30%
    const { data: newItem, error: insertError } = await supabase.from("store_inventory").insert({
      store_id,
      wholesale_product_id,
      name: wholesaleProduct.product_name,
      cost_price: wholesaleProduct.wholesale_price,
      sale_price: wholesaleProduct.wholesale_price * margin,
      stock_quantity: 0,
      min_stock_level: wholesaleProduct.min_order_quantity || 5
    }).select().single()

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), { status: 500, headers: { "Content-Type": "application/json" } })
    }

    return new Response(JSON.stringify({ success: true, item: newItem }), { headers: { "Content-Type": "application/json" } })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
})