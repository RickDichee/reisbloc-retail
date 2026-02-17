import { createClient } from "npm:@supabase/supabase-js@2";

console.log('Function auth-signup-onboard starting');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-hook-secret',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.text();
    let payload;
    try {
      payload = JSON.parse(body);
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Verify secret (Strict validation)
    const hookSecret = Deno.env.get('AUTH_HOOK_SECRET');

    if (!hookSecret || hookSecret.length < 32) {
      console.error('CRITICAL: AUTH_HOOK_SECRET not properly configured or too weak');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const incomingSecret = req.headers.get('x-hook-secret');
    if (!incomingSecret || incomingSecret !== hookSecret) {
      console.warn('Unauthorized webhook attempt');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Extract user from payload (support both Auth Hook and Database Webhook structures)
    const user = payload.user || payload.record || payload.data?.user;
    if (!user || !user.id) {
      return new Response(JSON.stringify({ error: 'No user in payload' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Create Organization
    const orgName = `Org for ${user.email || user.id}`;

    // Check if org exists (idempotency)
    let orgId;
    const { data: existingOrg } = await supabase.from('organizations').select('id').eq('owner_user_id', user.id).maybeSingle();

    if (existingOrg) {
      orgId = existingOrg.id;
    } else {
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert([{ name: orgName, owner_user_id: user.id }])
        .select('id')
        .single();

      if (orgError) {
        console.error('Org create error', orgError);
        return new Response(JSON.stringify({ error: 'Failed to create organization' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      orgId = orgData.id;
    }

    // 2. Upsert User in public.users
    // FIX: Use upsert instead of update to ensure row creation if it doesn't exist
    const userPayload = {
      id: user.id, // PK matches Auth UID
      auth_uid: user.id, // Legacy field compatibility
      email: user.email,
      organization_id: orgId,
      onboarding_state: 'completed',
      role: 'admin', // First user is always admin
      active: true,
      name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Admin'
    };

    const { error: upsertError } = await supabase
      .from('users')
      .upsert(userPayload, { onConflict: 'id' });

    if (upsertError) {
      console.error('User upsert error', upsertError);
      return new Response(JSON.stringify({ error: 'Failed to upsert user' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 3. Seed Demo Products (only if new org)
    if (!existingOrg) {
      const demoProducts = [
        { name: 'Tacos al Pastor (Demo)', price: 25, category: 'Alimentos', organization_id: orgId, available: true },
        { name: 'Refresco Cola (Demo)', price: 20, category: 'Bebidas', organization_id: orgId, available: true },
      ];
      await supabase.from('products').insert(demoProducts);
    }

    return new Response(JSON.stringify({ ok: true, organization_id: orgId }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    console.error('Function error', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});