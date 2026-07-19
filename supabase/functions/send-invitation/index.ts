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

        // 8. Send Email via SMTP
        const smtpHost = Deno.env.get('SMTP_HOST');
        const smtpPort = Deno.env.get('SMTP_PORT');
        const smtpUser = Deno.env.get('SMTP_USER');
        const smtpPassword = Deno.env.get('SMTP_PASSWORD');
        const smtpFrom = Deno.env.get('SMTP_FROM') || smtpUser;

        let emailSent = false;
        let emailError = null;

        if (smtpHost && smtpPort && smtpUser && smtpPassword) {
            try {
                // Dynamic import of SMTP client to avoid loading issues in local development
                const { SMTPClient } = await import("https://deno.land/x/smtp@v0.7.0/mod.ts");

                const client = new SMTPClient({
                    connection: {
                        hostname: smtpHost,
                        port: parseInt(smtpPort),
                        tls: true,
                        auth: {
                            username: smtpUser,
                            password: smtpPassword,
                        },
                    },
                });

                // Get organization name
                const { data: orgData } = await supabaseAdmin
                    .from('organizations')
                    .select('name')
                    .eq('id', userData.organization_id)
                    .single();

                const orgName = orgData?.name || 'Reisbloc POS';

                await client.send({
                    from: smtpFrom || 'noreply@reisbloc.io',
                    to: email,
                    subject: `Invitación de ${orgName} para unirte a su Staff`,
                    content: `Hola,\n\nHas sido invitado a unirte al staff de ${orgName}.\n\nPara activar tu cuenta, haz clic en el siguiente enlace:\n${inviteLink}\n\nEste enlace expira en 48 horas.`,
                    html: `
                        <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px;">
                            <h2 style="color: #4f46e5; text-align: center; text-transform: uppercase;">Invitación de Staff</h2>
                            <p>Hola,</p>
                            <p>Has sido invitado a unirte al staff de la organización <strong>${orgName}</strong> con el rol de <strong>${role === 'employee' ? 'Empleado' : role}</strong>.</p>
                            <p>Para activar tu cuenta y comenzar a trabajar, haz clic en el siguiente botón:</p>
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="${inviteLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Activar Mi Cuenta</a>
                            </div>
                            <p style="font-size: 12px; color: #666; text-align: center;">Este enlace es único y expirará en 48 horas.</p>
                            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                            <p style="font-size: 10px; color: #999; text-align: center;">Reisbloc POS - Plataforma de Ventas e Inventarios.</p>
                        </div>
                    `
                });

                emailSent = true;
                console.log(`✉️ Email successfully sent to ${email}`);
            } catch (err: any) {
                console.error('SMTP Error:', err);
                emailError = err.message;
            }
        } else {
            console.warn('⚠️ SMTP Configuration variables missing in environment');
            emailError = 'SMTP configuration missing';
        }

        return new Response(JSON.stringify({
            success: true,
            message: emailSent ? 'Invitación enviada por correo exitosamente' : 'Invitación registrada en el sistema',
            invite_id: invite.id,
            dev_invite_link: emailSent ? null : inviteLink
        }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } catch (err: any) {
        console.error('Unexpected error:', err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
    }
});
