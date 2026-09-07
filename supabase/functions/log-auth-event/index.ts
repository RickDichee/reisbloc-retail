import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? supabaseAnonKey;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { deviceId, sessionType = 'External', organizationId } = body;

    // IP address from request headers
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "Desconocida";
    let location = "Desconocida";

    // Geolocalización opcional
    if (ipAddress !== "Desconocida" && ipAddress !== "127.0.0.1" && !ipAddress.startsWith("192.168.") && !ipAddress.startsWith("10.")) {
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

    // Cliente administrativo para garantizar auditoría multi-tenant
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    let resolvedOrgId = organizationId;
    if (!resolvedOrgId) {
      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .maybeSingle();
      resolvedOrgId = userData?.organization_id || null;
    }

    const logDetails = `Inicio de sesión exitoso desde ${location} (IP: ${ipAddress})`;

    // Inserción en audit_logs respetando el esquema exacto de PostgreSQL
    const { data, error } = await supabaseAdmin
      .from('audit_logs')
      .insert({
        user_id: user.id,
        organization_id: resolvedOrgId,
        action: 'login',
        table_name: 'auth',
        record_id: user.id,
        entity_type: 'auth',
        entity_id: user.id,
        ip_address: ipAddress,
        location,
        device_id: deviceId || null,
        session_type: sessionType,
        changes: { details: logDetails },
        new_value: { sessionType, deviceId, location, ipAddress, email: user.email }
      })
      .select()
      .single();

    if (error) {
      console.error("Error inserting into audit_logs:", error);
      throw error;
    }

    return new Response(
      JSON.stringify({ success: true, log: data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("Unhandled error in log-auth-event:", error);
    return new Response(JSON.stringify({ error: error?.message || 'Error en auditoría' }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

