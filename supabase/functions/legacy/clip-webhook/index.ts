import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * CLIP WEBHOOK (Postback)
 * Handles payment notifications from Clip Plus 2 and other terminals.
 * Logic: Match incoming payment to a pending retail sale.
 */
Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // 🛡️ Rate Limiting: Check excessive requests by IP
        const clientIp = req.headers.get('x-forwarded-for') || 'unknown';
        const { data: allowed, error: rpcError } = await supabase.rpc('check_rate_limit', {
            p_ip_address: clientIp,
            p_endpoint: 'clip-webhook',
            p_max_attempts: 60, // 60 requests
            p_window_seconds: 60, // per minute
            p_block_minutes: 15
        });

        if (rpcError) console.error('Rate Limit RPC Error:', rpcError);
        if (allowed === false) {
            console.warn(`⛔ IP Blocked due to rate limit: ${clientIp}`);
            return new Response(JSON.stringify({ error: 'Too Many Requests' }), { status: 429, headers: corsHeaders });
        }

        // Handle generic health check or Ping
        if (req.method === 'GET') {
            return new Response(JSON.stringify({ status: 'active', message: 'Clip Webhook is ready' }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        let body;
        try {
            body = await req.json();
        } catch (e) {
            console.log('⚠️ Received non-JSON or empty body');
            return new Response(JSON.stringify({ status: 'ok', note: 'Test received' }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        console.log('📦 Clip Webhook Received:', body);

        // Check if it's a Clip Test Notification
        if (body.test || !body.amount) {
            return new Response(JSON.stringify({ status: 'success', message: 'Test notification received' }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Required fields from Clip
        const {
            amount,
            status,
            transaction_id,
            merch_inv_id, // Custom Reference (RB-123)
            payment_date,
            last4
        } = body;

        if (status !== 'PAID') {
            return new Response(JSON.stringify({ status: 'ignored', reason: 'Not a PAID status' }), { status: 200, headers: corsHeaders });
        }

        const paidAmount = parseFloat(amount);
        let matchedSaleId = null;

        // 1. Match by Reference (merch_inv_id)
        if (merch_inv_id) {
            const { data: saleByRef } = await supabase
                .from('retail_sales')
                .select('id')
                .eq('id', merch_inv_id) // We'll try to use UUID directly or a serial number
                .maybeSingle();

            if (saleByRef) {
                matchedSaleId = saleByRef.id;
                console.log('✅ Matched by Reference ID:', matchedSaleId);
            }
        }

        // 2. Smart Match (Amount + Recent)
        if (!matchedSaleId) {
            // Find pending/partial sales created in the last 10 minutes with matching remaining balance
            const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

            const { data: recentSales } = await supabase
                .from('retail_sales')
                .select('id, total, paid_amount, organization_id')
                .in('status', ['pending', 'partially_paid'])
                .gte('created_at', tenMinutesAgo)
                .order('created_at', { ascending: false });

            if (recentSales && recentSales.length > 0) {
                // Look for a sale where (total - paid_amount) matches incoming amount exactly
                const exactMatch = recentSales.find(s => Math.abs(Number(s.total) - Number(s.paid_amount) - paidAmount) < 0.01);

                if (exactMatch) {
                    matchedSaleId = exactMatch.id;
                    console.log('🧠 Smart Match Success (Amount Match):', matchedSaleId);
                } else {
                    // Fallback: Just pick the most recent pending sale if there's only one
                    if (recentSales.length === 1) {
                        matchedSaleId = recentSales[0].id;
                        console.log('🧠 Smart Match Fallback (Only one pending):', matchedSaleId);
                    }
                }
            }
        }

        if (!matchedSaleId) {
            console.warn('❌ Could not match payment to any active sale');
            return new Response(JSON.stringify({ status: 'unmatched', amount: paidAmount }), { status: 200, headers: corsHeaders });
        }

        // 3. Mark the sale as paid
        const { data: saleInfo } = await supabase.from('retail_sales').select('organization_id, total, status').eq('id', matchedSaleId).single();

        const { error: paymentError } = await supabase
            .from('retail_sales')
            .update({
                status: 'paid',
                payment_method: 'clip',
                paid_amount: paidAmount,
                notes: `Clip TransID: ${transaction_id}`
            })
            .eq('id', matchedSaleId);

        if (paymentError) {
            console.error('❌ Error updating retail_sale:', paymentError);
            throw paymentError;
        }

        // 4. Audit Log
        await supabase.from('audit_logs').insert({
            organization_id: saleInfo.organization_id,
            action: 'PAYMENT_RECEIVED',
            entity_type: 'RETAIL_SALE',
            entity_id: matchedSaleId,
            new_value: {
                provider: 'CLIP',
                amount: paidAmount,
                transaction_id,
                card_last4: last4,
                match_type: merch_inv_id ? 'reference' : 'smart'
            }
        });

        // 5. Notify POS via Realtime Broadcast
        // (Supabase triggers on retail_sales status change will also work, but broadcast is faster)
        await supabase.channel(`sale-payments-${matchedSaleId}`).send({
            type: 'broadcast',
            event: 'clip_payment',
            payload: { saleId: matchedSaleId, amount: paidAmount, status: 'confirmed' }
        });

        return new Response(JSON.stringify({
            status: 'success',
            matchedSaleId,
            paidAmount
        }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } catch (err: any) {
        console.error('💥 Webhook Error:', err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
    }
});
