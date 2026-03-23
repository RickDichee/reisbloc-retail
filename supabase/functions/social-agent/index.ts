import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
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
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // 1. Validar Admin Role (Basic security check)
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: userData } = await supabaseClient
      .from('users')
      .select('is_primary_admin')
      .eq('id', user.id)
      .single();

    if (!userData?.is_primary_admin) {
     return new Response(JSON.stringify({ error: "Forbidden: Admin only" }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 2. Parse request
    const { topic = "Tips de retail para PYMES", platform = "twitter" } = await req.json().catch(() => ({}));

    // 3. Setup Gemini (unified to save costs)
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      return new Response(JSON.stringify({ 
        error: "GEMINI_API_KEY not configured",
        message: "Contacta al administrador para configurar la API key de Gemini."
      }), { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const systemPrompt = `Eres el estratega de comunicación de 'Reisbloc Retail'. Tu visión es proyectar una marca que es tanto una herramienta de alta precisión como un movimiento de trascendencia colectiva para el retail. 
Propuesta de valor: "Tu negocio, sin límites." El talento excepcional adquiere su verdadero significado cuando se integra en una visión compartida.

Pilares estratégicos a usar:
- Democratización Tech: Poder Multinacional, Trato Local.
- Arquitectura de Trascendencia: Cada pieza ("bloc") cuenta para el éxito colectivo.
- Cultura de Integración: Bienvenidos los "Legos mentales" (ideas disruptivas).
- Excelencia Operativa: Elegancia en la ejecución que reduce el estrés.

Tu tono es intelectualmente estimulante, elegante y directo. Habla con autoridad tecnológica y empatía.
Formato objetivo: ${platform === 'twitter' ? 'Un Tweet punchy de menos de 280 caracteres' : 'Un post estructurado para LinkedIn de 150-200 palabras'}.
Cierra con un llamado a la acción hacia reisbloc.store. Usa emojis minimalistas (máximo 2).`;

    const userPrompt = `Genera un post sobre: ${topic}`;

    // 4. Call Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
          generationConfig: {
            maxOutputTokens: 500,
            temperature: 0.7,
          }
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini API Error:', errorData);
      throw new Error(`Gemini API error: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    const generatedContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedContent) {
      throw new Error("No content generated from AI");
    }

    // 5. Save to database
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: postData, error: insertError } = await supabaseAdmin
      .from('marketing_posts')
      .insert({
        topic,
        content: generatedContent,
        platform,
        status: 'draft',
        ai_model_used: 'gemini-2.0-flash'
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ data: postData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err: any) {
    console.error("Marketing Agent Error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
