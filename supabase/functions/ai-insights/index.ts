import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        if (!GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY environment variable is not set');
        }

        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: corsHeaders });
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            global: { headers: { Authorization: authHeader } }
        });

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return new Response(JSON.stringify({ error: 'Usuario no autenticado' }), { status: 401, headers: corsHeaders });
        }

        const { data: profile } = await supabase
            .from('users')
            .select('organization_id, organizations(plan)')
            .eq('id', user.id)
            .single();

        const orgPlan = (profile?.organizations as any)?.plan || 'free';
        if (orgPlan === 'free') {
            return new Response(
                JSON.stringify({ error: 'Las herramientas de Inteligencia Artificial están reservadas para planes Pro y Enterprise. Actualiza tu suscripción para acceder.' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const { metrics, topProducts } = await req.json();

        const prompt = `
            Eres un experto consultor de negocios, marketing y desarrollo de software con un enfoque único en el uso sustentable y la adaptación de tecnologías a sectores sociales vulnerables, con escasez de recursos físicos, económicos o educativos. 
            
            Tu misión es ayudar a capitalizar el programa "Reisbloc POS", que cuenta con 4 versiones estratégicas:
            1. **Enterprise**: Hardware de nueva generación, conectividad y recursos avanzados para negocios consolidados.
            2. **PyME (SMB)**: Para negocios con recursos variables pero capacidad para hardware de los últimos 5-8 años.
            3. **General**: Para el ciudadano promedio en México con poder adquisitivo estándar.
            4. **Local/Reciclado**: Tu enfoque principal. Uso de dispositivos obsoletos (celulares/tablets viejas) para micro-negocios como tiendas de abarrotes, ferreterías, sastrerías, etc., donde la brecha técnica es alta.

            Analiza las siguientes métricas de ventas y productos de Reisbloc POS y proporciona 3 sugerencias estratégicas ALTAMENTE ACCIONABLES y LOCALES para aumentar ventas o mejorar la eficiencia, considerando especialmente cómo estas sugerencias encajan en los niveles de hardware/recursos mencionados.
            
            Métricas de Ventas:
            - Total Ventas: $${metrics?.totalSales?.toFixed(2) || 0}
            - Transacciones: ${metrics?.transactionCount || 0}
            - Ticket Promedio: $${metrics?.averageTicket?.toFixed(2) || 0}
            - Propinas Totales: $${metrics?.totalTips?.toFixed(2) || 0}
            
            Top 5 Productos:
            ${topProducts.map((p: any) => `- ${p.name}: ${p.qty} unidades sold, Total: $${p.total?.toFixed(2)}`).join('\n')}
            
            Instrucciones:
            1. Devuelve la respuesta estrictamente en formato JSON (un arreglo de objetos).
            2. Cada objeto debe tener: "title", "description", "action" (una tarea específica) y "type" ("success", "warning" o "info").
            3. El lenguaje debe ser empoderador, profesional y adaptado al contexto socio-económico mexicano.
            4. Enfócate en la sustentabilidad y en cómo el software da valor incluso en hardware antiguo.
            
            Responde SOLO con el JSON.
    `;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Gemini API error: ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            throw new Error('No content returned from AI');
        }

        // Limpiar el texto de bloques de código markdown si están presentes
        const cleanJson = text.replace(/```json|```/g, '').trim();
        const insights = JSON.parse(cleanJson);

        return new Response(JSON.stringify({ insights }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
