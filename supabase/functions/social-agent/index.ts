import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "npm:@supabase/supabase-js@2.45.4"

const ALLOWED_ORIGINS = Deno.env.get('ALLOWED_ORIGINS')?.split(',') || [
  'https://reisbloc.store',
  'https://www.reisbloc.store',
  'http://localhost:5173',
  'http://localhost:3000'
]

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGINS.join(', '),
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const GEMINI_MODEL = "gemini-2.5-flash"

const MARKETING_TOPICS = [
  "control de inventario para PYMES",
  "digitalización de tiendas retail",
  "tips para mejorar ventas",
  "gestión de caja eficiente",
  "análisis de métricas de negocio",
  "automatización para retail",
  "tendencias enPoint of Sale",
  "eficiencia operativa en tiendas",
]

async function generatePost(geminiApiKey: string, topic: string, platform: string): Promise<string> {
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

  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiApiKey}`;
  
  const response = await fetch(geminiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
      generationConfig: {
        maxOutputTokens: 2000,
        temperature: 0.7,
      }
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Gemini API error: ${JSON.stringify(errorData)}`);
  }

  const data = await response.json();
  const generatedContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!generatedContent) {
    throw new Error("No content generated from AI");
  }

  return generatedContent;
}

function calculateScheduleDates(count: number, intervalDays: number, startDate: Date): Date[] {
  const dates: Date[] = [];
  for (let i = 0; i < count; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + (i * intervalDays));
    dates.push(date);
  }
  return dates;
}

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

    // 1. Validar usuario autenticado
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // 2. Validar que sea admin
    const { data: userData } = await supabaseClient
      .from('users')
      .select('role, is_primary_admin, organization_id')
      .eq('id', user.id)
      .single();

    const isAdmin = userData?.role === 'admin' || userData?.is_primary_admin === true;
    
    if (!isAdmin) {
      return new Response(JSON.stringify({ 
        error: "Forbidden", 
        message: "Solo administradores pueden usar el agente de marketing" 
      }), { 
        status: 403, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const organizationId = userData?.organization_id;

    // 3. Parse request
    const { 
      topic, 
      platform = "twitter",
      count = 1,
      schedule_days = 1,
      auto_schedule = false,
      start_date 
    } = await req.json().catch(() => ({}));

    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      return new Response(JSON.stringify({ 
        error: "GEMINI_API_KEY not configured" 
      }), { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const posts: any[] = [];
    const errors: string[] = [];

    // Calcular fechas de publicación si es auto_schedule
    const baseDate = start_date ? new Date(start_date) : new Date();
    const publishDates = auto_schedule ? calculateScheduleDates(count, schedule_days, baseDate) : [];

    // Generar posts
    if (topic) {
      // Modo: Tema específico
      const content = await generatePost(geminiApiKey, topic, platform);
      const scheduledFor = auto_schedule && publishDates[0] ? publishDates[0].toISOString() : null;
      
      const { data: postData, error } = await supabaseAdmin
        .from('marketing_posts')
        .insert({
          topic,
          content,
          platform,
          status: auto_schedule ? 'scheduled' : 'draft',
          scheduled_for: scheduledFor,
          ai_model_used: GEMINI_MODEL,
          organization_id: organizationId
        })
        .select()
        .single();

      if (error) throw error;
      posts.push(postData);
    } else {
      // Modo: Generación en lote con temas variados
      const topicsToGenerate = MARKETING_TOPICS.slice(0, count);
      
      for (let i = 0; i < topicsToGenerate.length; i++) {
        try {
          const currentTopic = topicsToGenerate[i];
          const content = await generatePost(geminiApiKey, currentTopic, platform);
          const scheduledFor = auto_schedule && publishDates[i] ? publishDates[i].toISOString() : null;
          
          const { data: postData, error } = await supabaseAdmin
            .from('marketing_posts')
            .insert({
              topic: currentTopic,
              content,
              platform,
              status: auto_schedule ? 'scheduled' : 'draft',
              scheduled_for: scheduledFor,
              ai_model_used: GEMINI_MODEL,
              organization_id: organizationId
            })
            .select()
            .single();

          if (error) throw error;
          posts.push(postData);
        } catch (err: any) {
          errors.push(`Error en post ${i + 1}: ${err.message}`);
        }
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      posts_generated: posts.length,
      posts,
      errors: errors.length > 0 ? errors : undefined,
      schedule: auto_schedule ? {
        start_date: baseDate.toISOString(),
        interval_days: schedule_days,
        dates: publishDates.map(d => d.toISOString())
      } : undefined
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (err: any) {
    console.error("Marketing Agent Error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
