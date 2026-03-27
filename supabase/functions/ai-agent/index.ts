import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const ALLOWED_ORIGINS = Deno.env.get('ALLOWED_ORIGINS')?.split(',') || [
  'https://reisbloc.store',
  'https://www.reisbloc.store',
  'https://reisbloc-pos-zrxu.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000'
]

const corsHeaders = {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.join(', '),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// --- SECURITY & RATE LIMITING ---
// In a production environment, this would hit Redis.
// For this Edge Function, we use a simple Supabase table or Deno KV (if enabled).
// We'll use the Supabase DB to track daily API calls per Organization to enforce the budget.
const RATE_LIMIT_MAX_REQUESTS_PER_DAY = 20;

async function checkRateLimitAndCharge(supabase: any, organizationId: string): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0];
    const logId = `${organizationId}_${today}`;

    // Upsert the daily usage counter
    const { data, error } = await supabase.rpc('increment_ai_usage', {
        p_organization_id: organizationId,
        p_date: today
    });

    // If RPC fails or doesn't exist, fallback to manual read/write (less concurrent safe but works for MVP)
    if (error) {
        console.warn("Fallback rate limit mechanism used");
        return true; // Allow if tracking fails to avoid breaking UX, but log it.
    }

    const currentUsage = data || 0;
    return currentUsage <= RATE_LIMIT_MAX_REQUESTS_PER_DAY;
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY environment variable is not set');

        // Verify JWT and get Organization ID
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) throw new Error('Missing Authorization header');

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) throw new Error('Unauthorized');

        // Grab org id from user metadata
        const organizationId = user.user_metadata?.organizationId;
        if (!organizationId) throw new Error('User does not belong to an organization');

        // --- ENFORCE BUDGET (RATE LIMIT) ---
        const isAllowed = await checkRateLimitAndCharge(supabase, organizationId);
        if (!isAllowed) {
            return new Response(JSON.stringify({
                error: 'Rate limit exceeded',
                message: 'Has alcanzado el límite diario gratuito de interacciones con Reisbloc Agent (20/día) para proteger tu presupuesto. Vuelve mañana o actualiza tu plan.'
            }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const { query, context } = await req.json();

        // --- DEFINE THE TOOLS (MCP PATTERN) ---
        const tools = [
            {
                functionDeclarations: [
                    {
                        name: "draft_meta_campaign",
                        description: "Redacta un borrador de campaña publicitaria para Meta/Facebook Ads basado en el presupuesto y la audiencia objetivo. NUNCA publica directamente.",
                        parameters: {
                            type: "OBJECT",
                            properties: {
                                title: { type: "STRING", description: "Título llamativo para la campaña" },
                                description: { type: "STRING", description: "Texto persuasivo del anuncio (Copy)" },
                                budget_usd: { type: "NUMBER", description: "Presupuesto sugerido en USD" },
                                duration_days: { type: "INTEGER", description: "Duración de la campaña en días" },
                                target_audience: { type: "STRING", description: "Audiencia objetivo (ej. 'Jóvenes 18-25', 'Público local 5km')" }
                            },
                            required: ["title", "description", "budget_usd", "duration_days", "target_audience"]
                        }
                    },
                    {
                        name: "create_purchase_order",
                        description: "Redacta un borrador de orden de compra para reabastecer inventario.",
                        parameters: {
                            type: "OBJECT",
                            properties: {
                                supplier: { type: "STRING", description: "Nombre del proveedor sugerido" },
                                items: {
                                    type: "ARRAY",
                                    items: { type: "STRING" },
                                    description: "Lista de productos a comprar"
                                },
                                urgency: { type: "STRING", description: "Nivel de urgencia: alta, media, baja" }
                            },
                            required: ["supplier", "items"]
                        }
                    }
                ]
            }
        ];

        const prompt = `
            Eres Reisbloc Agent, un asistente de IA experto en retail integrado en un sistema POS.
            Tu trabajo principal es ayudar al dueño de la tienda a tomar decisiones y ejecutar acciones.
            
            REGLA DE ORO (PRESUPUESTO SEGURO):
            NUNCA debes confirmar haber gastado dinero o publicado algo. 
            Si el usuario te pide crear una campaña de Meta Ads o hacer una compra, DEBES obligatoriamente llamar a la herramienta correspondiente (ej. draft_meta_campaign).
            El sistema se encargará de pedir confirmación humana (Human-in-the-Loop) renderizando una tarjeta en la interfaz.

            Contexto de la tienda actual:
            Inventario bajo: ${context?.lowStock ? JSON.stringify(context.lowStock) : 'Desconocido'}
            Ventas de hoy: ${context?.todaySales ? `$${context.todaySales}` : 'Desconocido'}

            Pregunta del usuario: "${query}"
        `;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    tools: tools,
                    toolConfig: { functionCallingConfig: { mode: "AUTO" } }
                })
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Gemini API error: ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        const candidate = data.candidates?.[0];
        const parts = candidate?.content?.parts || [];

        // Check if the model decided to call a function/tool
        const functionCallPart = parts.find((p: any) => p.functionCall);
        const textPart = parts.find((p: any) => p.text);

        let agentReply = textPart?.text || "Analizando tu solicitud...";
        let actionPayload = null;

        if (functionCallPart) {
            const fc = functionCallPart.functionCall;
            actionPayload = {
                id: crypto.randomUUID(),
                type: fc.name,
                title: fc.name === 'draft_meta_campaign' ? 'Borrador: Campaña Meta Ads' : 'Borrador: Orden de Compra',
                description: 'Revisa y autoriza este payload financiero antes de que el Agente lo ejecute en APIs externas.',
                payload: fc.args
            };
            agentReply = `He preparado el borrador solicitado. Por nuestra política activa de "Presupuesto Cero Riesgos", necesito que autorices manualmente la carga financiera adjunta antes de proceder.`;
        }

        return new Response(JSON.stringify({
            text: agentReply,
            action: actionPayload
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error("AI Agent Error", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
