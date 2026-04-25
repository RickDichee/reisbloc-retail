Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, Content-Type",
      },
    })
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      })
    }

    const { store_id, wholesale_product_id, wholesale_product_ids, margin = 1.3 } = await req.json()
    
    if (!store_id) {
      return new Response(JSON.stringify({ error: "Missing store_id" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Detect bulk mode
    const isBulk = Array.isArray(wholesale_product_ids) && wholesale_product_ids.length > 0
    const isSingle = wholesale_product_id && typeof wholesale_product_id === 'string'
    
    if (!isBulk && !isSingle) {
      return new Response(JSON.stringify({ error: "Missing wholesale_product_id or wholesale_product_ids" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2")
    const supabase = createClient(supabaseUrl, supabaseKey)

    const token = authHeader.replace("Bearer ", "")
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

    const { data: store, error: storeError } = await supabase.from("stores").select("owner_id").eq("id", store_id).single()
    if (storeError || !store || store.owner_id !== user.id) {
      return new Response(JSON.stringify({ error: "Not your store" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      })
    }

    let newItems = []

    if (isBulk) {
      // Bulk import - get all products first
      const { data: products, error: productsError } = await supabase
        .from("wholesale_catalog")
        .select("*")
        .in("id", wholesale_product_ids)

      if (productsError || !products) {
        return new Response(JSON.stringify({ error: "Products not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        })
      }

      // Insert all products
      const insertData = products.map(p => ({
        store_id,
        wholesale_product_id: p.id,
        name: p.product_name,
        cost_price: p.wholesale_price,
        sale_price: Number(p.wholesale_price) * margin,
        stock_quantity: 0,
        min_stock_level: p.min_order_quantity || 5,
      }))

      const { data: inserted, error: insertError } = await supabase
        .from("store_inventory")
        .insert(insertData)
        .select()

      if (insertError) {
        return new Response(JSON.stringify({ error: insertError.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        })
      }

      newItems = inserted || []
    } else {
      // Single product import
      const { data: wholesaleProduct, error: productError } = await supabase
        .from("wholesale_catalog")
        .select("*")
        .eq("id", wholesale_product_id)
        .single()

      if (productError || !wholesaleProduct) {
        return new Response(JSON.stringify({ error: "Product not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        })
      }

      const { data: newItem, error: insertError } = await supabase
        .from("store_inventory")
        .insert({
          store_id,
          wholesale_product_id,
          name: wholesaleProduct.product_name,
          cost_price: wholesaleProduct.wholesale_price,
          sale_price: Number(wholesaleProduct.wholesale_price) * margin,
          stock_quantity: 0,
          min_stock_level: wholesaleProduct.min_order_quantity || 5,
        })
        .select()
        .single()

      if (insertError) {
        return new Response(JSON.stringify({ error: insertError.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        })
      }

      newItems = [newItem].filter(Boolean)
    }

    return new Response(JSON.stringify({ 
      success: true, 
      count: newItems.length,
      items: newItems 
    }), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
})