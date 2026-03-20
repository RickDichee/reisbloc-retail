import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.35.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
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
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const { deviceId, sessionType = 'External' } = body;

    // Attempt to get IP address from request headers
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "Desconocida";
    let location = "Desconocida";

    // Attempt to get geolocation
    if (ipAddress !== "Desconocida" && ipAddress !== "127.0.0.1") {
      try {
        const geoRes = await fetch(`https://get.geojs.io/v1/ip/geo/${ipAddress}.json`);
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          location = `${geoData.city || 'Ciudad Desconocida'}, ${geoData.country || 'País Desconocido'}`;
        }
      } catch (e) {
        console.error("GeoIP Error:", e);
      }
    }

    // Insert into audit_logs
    const { data, error } = await supabaseClient
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'login',
        entity_type: 'auth',
        entity_id: user.id,
        ip_address: ipAddress,
        location,
        device_id: deviceId || null,
        session_type: sessionType,
        details: `Inicio de sesión exitoso desde ${location} (IP: ${ipAddress})`
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, log: data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
