import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-facturapi-signature',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const signature = req.headers.get('x-facturapi-signature')
    const webhookSecret = Deno.env.get('FACTURAPI_WEBHOOK_SECRET')
    
    // Verify webhook signature (optional but recommended)
    if (webhookSecret && signature) {
      const body = await req.text()
      const expectedSignature = await generateSignature(body, webhookSecret)
      
      if (signature !== expectedSignature) {
        console.error('Invalid webhook signature')
        return new Response('Unauthorized', { status: 401 })
      }
    }

    const payload = await req.json()
    console.log('Facturapi webhook received:', JSON.stringify(payload))

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Handle different event types
    switch (payload.event) {
      case 'invoice.validated':
        await handleInvoiceValidated(supabase, payload.data)
        break
        
      case 'invoice.canceled':
        await handleInvoiceCanceled(supabase, payload.data)
        break
        
      case 'invoice.pending':
        await handleInvoicePending(supabase, payload.data)
        break
        
      default:
        console.log('Unhandled event type:', payload.event)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function handleInvoiceValidated(supabase: any, data: any) {
  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, organization_id, sale_id')
    .eq('facturapi_id', data.id)
    .single()

  if (invoice) {
    await supabase
      .from('invoices')
      .update({
        status: 'validated',
        validated_at: new Date().toISOString(),
        uuid: data.uuid,
        pdf_url: data.pdf_url,
        xml_url: data.xml_url,
        folio_number: data.folio_number,
        series: data.series,
        total: data.total,
        subtotal: data.subtotal,
        tax_amount: data.total_tax,
      })
      .eq('facturapi_id', data.id)

    // Update sale if linked
    if (invoice.sale_id) {
      await supabase
        .from('sales')
        .update({ invoiced: true, invoice_id: invoice.id })
        .eq('id', invoice.sale_id)
    }

    console.log(`Invoice ${data.id} validated with UUID: ${data.uuid}`)
  }
}

async function handleInvoiceCanceled(supabase: any, data: any) {
  await supabase
    .from('invoices')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
    })
    .eq('facturapi_id', data.id)

  console.log(`Invoice ${data.id} canceled`)
}

async function handleInvoicePending(supabase: any, data: any) {
  const { data: invoice } = await supabase
    .from('invoices')
    .select('id')
    .eq('facturapi_id', data.id)
    .single()

  if (invoice) {
    await supabase
      .from('invoices')
      .update({ status: 'pending' })
      .eq('facturapi_id', data.id)
  }
}

async function generateSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(payload)
  )
  
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}
