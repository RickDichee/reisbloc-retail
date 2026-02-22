import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'No authorization header' }), { status: 401, headers: corsHeaders });
        }

        const token = authHeader.replace('Bearer ', '');

        // Cliente para validar el token del usuario (con permisos del usuario)
        const supabaseAuth = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? ''
        );

        // Cliente con Service Role para saltarse RLS y poder leer roles / insertar invitaciones
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // 1. Get the current user
        const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);

        if (authError || !user) {
            console.error('Auth error:', authError);
            return new Response(JSON.stringify({
                error: 'Invalid user token',
                details: authError?.message || 'User not found',
                token_length: token ? token.length : 0
            }), { status: 401, headers: corsHeaders });
        }

        // 2. Verify if the user is an admin in their organization
        const { data: userData, error: userError } = await supabaseAdmin
            .from('users')
            .select('organization_id, role')
            .eq('id', user.id)
            .single();

        if (userError || !userData || userData.role !== 'admin') {
            return new Response(JSON.stringify({ error: 'Only admins can send invitations' }), { status: 403, headers: corsHeaders });
        }

        // 3. Extract invitation details from body
        const { email, role = 'mesero', expires_in_hours = 48 } = await req.json();

        if (!email) {
            return new Response(JSON.stringify({ error: 'Email is required' }), { status: 400, headers: corsHeaders });
        }

        // 4. Check if user already exists in the system (Mobility)
        const { data: existingUserId, error: rpcError } = await supabaseAdmin
            .rpc('get_user_id_by_email', { p_email: email });

        if (!rpcError && existingUserId) {
            // User already exists! Auto-transfer them to the new organization
            const { error: updateError } = await supabaseAdmin
                .from('users')
                .update({
                    organization_id: userData.organization_id,
                    role: role,
                    active: true
                })
                .eq('id', existingUserId);

            if (updateError) {
                console.error('Auto-transfer error:', updateError);
                return new Response(JSON.stringify({ error: 'Failed to transfer existing user' }), { status: 500, headers: corsHeaders });
            }

            console.log(`🔄 Auto-transferred existing user ${email} to org ${userData.organization_id}`);

            return new Response(JSON.stringify({
                success: true,
                message: 'El usuario ya estaba registrado en el sistema. Ha sido transferido exitosamente a tu sucursal.',
                dev_invite_link: null // No invlink needed
            }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // 5. Generate secure token for NEW users
        const rawToken = crypto.randomUUID();
        const tokenHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawToken))
            .then(buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join(''));

        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + expires_in_hours);

        // 6. Store invitation in DB
        const { data: invite, error: inviteError } = await supabaseAdmin
            .from('organization_invites')
            .insert({
                email,
                organization_id: userData.organization_id,
                invited_by: user.id,
                role,
                token_hash: tokenHash,
                status: 'pending',
                expires_at: expiresAt.toISOString()
            })
            .select()
            .single();

        if (inviteError) {
            console.error('Invite error:', inviteError);
            return new Response(JSON.stringify({ error: 'Failed to create invitation' }), { status: 500, headers: corsHeaders });
        }

        // 7. Generate invitation link
        const origin = req.headers.get('origin') || 'https://reisbloc.io';
        const inviteLink = `${origin}/accept-invite?token=${rawToken}`;

        // 8. TODO: Send Email
        console.log(`📩 Secret Invite Link for ${email}: ${inviteLink}`);

        return new Response(JSON.stringify({
            success: true,
            message: 'Invitation sent successfully',
            invite_id: invite.id,
            dev_invite_link: inviteLink
        }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } catch (err: any) {
        console.error('Unexpected error:', err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
    }
});
