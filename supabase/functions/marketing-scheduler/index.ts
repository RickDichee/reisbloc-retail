import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "npm:@supabase/supabase-js@2.45.4"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const now = new Date().toISOString();

    // Buscar posts programados que ya deben publicarse
    const { data: scheduledPosts, error: fetchError } = await supabaseAdmin
      .from('marketing_posts')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_for', now)
      .limit(10);

    if (fetchError) throw fetchError;

    if (!scheduledPosts || scheduledPosts.length === 0) {
      return new Response(JSON.stringify({ 
        success: true,
        message: "No posts scheduled for publishing",
        published: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Publicar cada post
    const publishedIds: string[] = [];
    for (const post of scheduledPosts) {
      const { error: updateError } = await supabaseAdmin
        .from('marketing_posts')
        .update({ 
          status: 'published',
          published_at: now
        })
        .eq('id', post.id);

      if (!updateError) {
        publishedIds.push(post.id);
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      published: publishedIds.length,
      published_ids: publishedIds
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (err: any) {
    console.error("Scheduler Error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
