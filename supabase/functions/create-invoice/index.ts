import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const FACTURAPI_API_KEY = Deno.env.get('FACTURAPI_API_KEY')!

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization' }), { status: 401, headers: corsHeaders })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }

    const { data: profile } = await supabase
      .from('users')
      .select('organization_id, organizations(plan)')
      .eq('id', user.id)
      .single()

    const orgPlan = (profile?.organizations as any)?.plan || 'free'
    if (orgPlan === 'free') {
      return new Response(
        JSON.stringify({ error: 'La facturación CFDI no está disponible en el plan Gratuito. Actualiza tu suscripción a Pro o Enterprise.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    
    const { customer, items, use, paymentForm, paymentMethod, observations } = body

    if (!customer || !items || items.length === 0) {
      return new Response(JSON.stringify({ error: 'Missing customer or items' }), { status: 400, headers: corsHeaders })
    }

    // Build Facturapi payload
    const invoicePayload = {
      customer: {
        legal_name: customer.legalName,
        tax_id: customer.taxId,
        email: customer.email,
        fiscal_regime: customer.fiscalRegime || '601',
        tax_system: customer.taxSystem || '601',
      },
      items: items.map((item: any) => ({
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        product: {
          description: item.description,
          unit_code: 'PZA',
          taxes: item.taxRate > 0 ? [{
            type: 'IVA',
            rate: item.taxRate / 100,
          }] : [],
        },
      })),
      use: use || 'G01',
      payment_form: paymentForm || '03',
      payment_method: paymentMethod || 'PUE',
      observations: observations || `Venta desde Reisbloc Store`,
      series: 'RBL',
      external_id: `ticket-${user.id}-${Date.now()}`,
    }

    // Create invoice in Facturapi
    const response = await fetch('https://www.facturapi.io/v2/invoices', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FACTURAPI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invoicePayload),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Facturapi error:', error)
      return new Response(JSON.stringify({ error: error.message || 'Facturapi error' }), { status: 400, headers: corsHeaders })
    }

    const result = await response.json()

    // Get user profile for organization_id
    const { data: profile } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    // Log invoice in database
    const { data: invoice, error: dbError } = await supabase
      .from('invoices')
      .insert({
        facturapi_id: result.id,
        user_id: user.id,
        organization_id: profile?.organization_id,
        folio_number: result.folio_number,
        series: result.series,
        status: result.status,
        uuid: result.uuid,
        customer_rfc: customer.taxId,
        customer_name: customer.legalName,
        customer_email: customer.email,
        subtotal: result.subtotal,
        tax_amount: result.total_tax,
        total: result.total,
        pdf_url: result.pdf_url,
        xml_url: result.xml_url,
        data: result,
      })
      .select()
      .single()

    if (dbError) {
      console.error('DB error:', dbError)
    }

    return new Response(JSON.stringify({
      success: true,
      invoice: {
        id: result.id,
        status: result.status,
        folioNumber: result.folio_number,
        series: result.series,
        uuid: result.uuid,
        total: result.total,
        pdfUrl: result.pdf_url,
        xmlUrl: result.xml_url,
        createdAt: result.created_at,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
