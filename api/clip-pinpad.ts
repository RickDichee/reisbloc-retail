/**
 * Reisbloc POS - Clip PinPad Cloud Terminal Integration
 * Serverless handler para Vercel
 */

type ClipServerConfig = {
  apiKey: string
  apiSecret: string
  defaultSerial: string
  webhookUrl: string
}

// Emergency feature flag: preserve the endpoint implementation for the audited
// rollout, but never permit a charge while Clip is disabled platform-wide.
const CLIP_PAYMENTS_ENABLED = false

function loadClipServerConfig(): { config: ClipServerConfig | null; missing: string[] } {
  const required = ['CLIP_API_KEY', 'CLIP_API_SECRET', 'CLIP_PINPAD_SERIAL', 'CLIP_WEBHOOK_URL'] as const
  const missing = required.filter((key) => !process.env[key] || !(process.env[key] as string).trim())

  if (missing.length > 0) {
    return { config: null, missing }
  }

  return {
    config: {
      apiKey: process.env.CLIP_API_KEY as string,
      apiSecret: process.env.CLIP_API_SECRET as string,
      defaultSerial: process.env.CLIP_PINPAD_SERIAL as string,
      webhookUrl: process.env.CLIP_WEBHOOK_URL as string,
    },
    missing: [],
  }
}

export default async function handler(req: any, res: any) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, Pinpad-Wait-Response'
  )

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (!CLIP_PAYMENTS_ENABLED) {
    return res.status(503).json({ error: 'Los cobros por Clip están temporalmente deshabilitados.' })
  }

  const clipConfig = loadClipServerConfig()
  if (!clipConfig.config) {
    return res.status(503).json({
      error: `Clip API is disabled: missing required server environment variables (${clipConfig.missing.join(', ')})`
    })
  }

  const { apiKey, apiSecret, defaultSerial, webhookUrl } = clipConfig.config

  const authHeader = `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')}`

  try {
    const action = req.query.action || (req.body && req.body.action) || 'payment'

    // 1. Consultar estado de una transacción previa
    if (action === 'check_payment' || req.query.requestId) {
      const requestId = req.query.requestId || req.body?.requestId
      if (!requestId) {
        return res.status(400).json({ error: 'Missing requestId parameter' })
      }

      const response = await fetch(`https://api.payclip.io/f2f/pinpad/v1/payment?pinpadRequestId=${encodeURIComponent(requestId)}`, {
        headers: {
          'Authorization': authHeader,
          'Pinpad-Include-Detail': 'true',
          'Content-Type': 'application/json',
          'User-Agent': 'ReisblocPOS/1.0',
        },
      })
      const data = await response.json()
      return res.status(response.status).json(data)
    }

    // 2. Consultar estado de terminales
    if (action === 'devices_status') {
      const serial = req.query.serialNumber || req.body?.serialNumber || defaultSerial
      const endpoint = serial
        ? `https://api.payclip.io/f2f/pinpad/v1/devices/status?serialNumber=${encodeURIComponent(serial)}`
        : 'https://api.payclip.io/f2f/pinpad/v1/devices/status'

      const response = await fetch(endpoint, {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
          'User-Agent': 'ReisblocPOS/1.0',
        },
      })
      const data = await response.json()
      return res.status(response.status).json(data)
    }

    // 3. Crear intención de pago en la terminal
    if (req.method === 'POST') {
      const { amount, reference, serialNumber, tipAmount, waitResponse } = req.body || {}
      
      const payload = {
        amount: Number(amount || 10).toFixed(2),
        tip_amount: tipAmount ? Number(tipAmount).toFixed(2) : undefined,
        reference: reference || `REIS-${Date.now().toString().slice(-6)}`,
        serial_number_pos: serialNumber || defaultSerial,
        webhook_url: webhookUrl,
        preferences: {
          is_auto_return_enabled: true,
          is_retry_enabled: true,
          is_share_enabled: true,
          is_tip_enabled: false,
          is_msi_enabled: false,
          is_dcc_enabled: false,
          is_auto_print_receipt_enabled: true,
        },
      }

      const headers: Record<string, string> = {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'User-Agent': 'ReisblocPOS/1.0',
      }

      if (waitResponse) {
        headers['Pinpad-Wait-Response'] = 'true'
      }

      const response = await fetch('https://api.payclip.io/f2f/pinpad/v1/payment', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      })

      const data = await response.json()
      return res.status(response.status).json(data)
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal Server Error' })
  }
}
