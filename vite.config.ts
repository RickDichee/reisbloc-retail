/**
 * Reisbloc POS - Sistema POS Profesional
 * Copyright (C) 2026 Reisbloc POS
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 */

import { defineConfig, type Plugin, type Connect } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

type ClipServerConfig = {
  apiKey: string
  apiSecret: string
  defaultSerial: string
  webhookUrl: string
}

// Keep the local proxy code for the future audited rollout, but fail closed
// until the payment integration is explicitly enabled platform-wide.
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

function clipPinpadDevPlugin(): Plugin {
  const clipConfig = loadClipServerConfig()

  const handler: Connect.NextHandleFunction = async (req, res, next) => {
    if (!req.url || !req.url.startsWith('/api/clip-pinpad')) {
      return next()
    }

    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST')
    res.setHeader(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, Pinpad-Wait-Response'
    )

    if (req.method === 'OPTIONS') {
      res.statusCode = 200
      res.end()
      return
    }

    if (!CLIP_PAYMENTS_ENABLED) {
      res.statusCode = 503
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'Los cobros por Clip están temporalmente deshabilitados.' }))
      return
    }

    if (!clipConfig.config) {
      res.statusCode = 503
      res.setHeader('Content-Type', 'application/json')
      res.end(
        JSON.stringify({
          error: `Clip proxy is disabled: missing required server environment variables (${clipConfig.missing.join(', ')})`,
        })
      )
      return
    }

    const { apiKey, apiSecret, defaultSerial, webhookUrl } = clipConfig.config
    const authHeader = `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')}`

    try {
      const parsedUrl = new URL(req.url, 'http://localhost')
      const action = parsedUrl.searchParams.get('action') || 'payment'

      // 1. Consultar estado de una transacción previa
      if (action === 'check_payment' || parsedUrl.searchParams.get('requestId')) {
        const requestId = parsedUrl.searchParams.get('requestId')
        if (!requestId) {
          res.statusCode = 400
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Missing requestId parameter' }))
          return
        }

        const response = await fetch(
          `https://api.payclip.io/f2f/pinpad/v1/payment?pinpadRequestId=${encodeURIComponent(requestId)}`,
          {
            headers: {
              Authorization: authHeader,
              'Pinpad-Include-Detail': 'true',
              'Content-Type': 'application/json',
              'User-Agent': 'ReisblocPOS/1.0',
            },
          }
        )
        const data = await response.json()
        res.statusCode = response.status
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(data))
        return
      }

      // 2. Consultar estado de terminales
      if (action === 'devices_status') {
        const serial = parsedUrl.searchParams.get('serialNumber') || defaultSerial
        const endpoint = serial
          ? `https://api.payclip.io/f2f/pinpad/v1/devices/status?serialNumber=${encodeURIComponent(serial)}`
          : 'https://api.payclip.io/f2f/pinpad/v1/devices/status'

        const response = await fetch(endpoint, {
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/json',
            'User-Agent': 'ReisblocPOS/1.0',
          },
        })
        const data = await response.json()
        res.statusCode = response.status
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(data))
        return
      }

      // 3. Crear intención de pago en la terminal
      if (req.method === 'POST') {
        const chunks: Buffer[] = []
        for await (const chunk of req) {
          chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
        }
        const rawBody = Buffer.concat(chunks).toString('utf-8')
        let bodyData: any = {}
        if (rawBody.trim()) {
          try {
            bodyData = JSON.parse(rawBody)
          } catch {
            bodyData = {}
          }
        }

        const { amount, reference, serialNumber, tipAmount, waitResponse } = bodyData

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
          Authorization: authHeader,
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
        res.statusCode = response.status
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(data))
        return
      }

      res.statusCode = 405
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'Method not allowed' }))
    } catch (err: any) {
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: err.message || 'Internal Server Error' }))
    }
  }

  return {
    name: 'clip-pinpad-dev-api',
    configureServer(server) {
      server.middlewares.use(handler)
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler)
    },
  }
}

const appBrand = (process.env.VITE_APP_BRAND || process.env.VITE_DEFAULT_ORG_SLUG || '').toLowerCase()
const isModaMiel = appBrand.includes('modamiel') || appBrand.includes('moda-miel')
const isJuguetes = appBrand.includes('juguetes') || appBrand.includes('sanjudas') || appBrand.includes('judastadeo')
const isLosChunches = appBrand.includes('chunches')

function tenantMetaHtmlPlugin(): Plugin {
  const meta = isJuguetes
    ? {
        title: 'Juguetes y Novedades San Judas Tadeo',
        shortTitle: 'San Judas Tadeo',
        description: '¡El juguete de tus sueños te espera! Surtido de temporada, juguetes y novedades · Tel/WhatsApp: (442) 600-3500.',
        canonical: 'https://sanjudastadeo.reisbloc.com/',
        ogImage: 'https://sanjudastadeo.reisbloc.com/images/juguetes-san-judas-logo.jpeg',
        favicon: '/images/juguetes-san-judas-logo.jpeg',
        faviconType: 'image/jpeg',
        themeColor: '#C8323E'
      }
    : isLosChunches
    ? {
        title: 'Los Chunches de Cons · Mercancía Americana e Importada',
        shortTitle: 'Los Chunches',
        description: 'TARGET · CVS · JCP · Mercancía Americana e Importada a precios de liquidación real · Tel/WhatsApp: (443) 124-4490.',
        canonical: 'https://loschunchesdecons.reisbloc.com/',
        ogImage: 'https://loschunchesdecons.reisbloc.com/images/los_chunches.jpeg',
        favicon: '/images/los_chunches.jpeg',
        faviconType: 'image/jpeg',
        themeColor: '#C83E74'
      }
    : isModaMiel
    ? {
        title: 'Moda Miel MX · Reisbloc Store',
        shortTitle: 'Moda Miel MX',
        description: 'Moda Miel MX: Catálogo mayorista y Punto de Venta (POS) todo por paquete · Pasillo 3 Local 230.',
        canonical: 'https://modamielmx.reisbloc.com/',
        ogImage: 'https://modamielmx.reisbloc.com/images/moda-miel-mx-logo.jpeg',
        favicon: '/images/moda-miel-mx-logo.jpeg',
        faviconType: 'image/jpeg',
        themeColor: '#D4386C'
      }
    : {
        title: 'Reisbloc Store · Sistema POS Retail',
        shortTitle: 'Reisbloc Store',
        description: 'Reisbloc Store: Sistema de Punto de Venta (POS), facturación y control de inventario para tiendas y retail.',
        canonical: 'https://store.reisbloc.com/',
        ogImage: 'https://store.reisbloc.com/images/logoNew.jpg',
        favicon: '/icon.svg',
        faviconType: 'image/svg+xml',
        themeColor: '#0B0B0B'
      }

  return {
    name: 'tenant-meta-html-plugin',
    transformIndexHtml(html) {
      return html
        .replace(/<title>.*?<\/title>/i, `<title>${meta.title}</title>`)
        .replace(/<meta name="theme-color" content=".*?" \/>/i, `<meta name="theme-color" content="${meta.themeColor}" />`)
        .replace(/<meta name="description" content=".*?" \/>/i, `<meta name="description" content="${meta.description}" />`)
        .replace(/<link rel="canonical" href=".*?" \/>/i, `<link rel="canonical" href="${meta.canonical}" />`)
        .replace(/<link rel="icon" type=".*?" href=".*?" \/>/i, `<link rel="icon" type="${meta.faviconType}" href="${meta.favicon}" />`)
        .replace(/<link rel="apple-touch-icon" href=".*?">/i, `<link rel="apple-touch-icon" href="${meta.favicon}">`)
        .replace(/<meta property="og:title" content=".*?" \/>/i, `<meta property="og:title" content="${meta.title}" />`)
        .replace(/<meta property="og:description" content=".*?" \/>/i, `<meta property="og:description" content="${meta.description}" />`)
        .replace(/<meta property="og:image" content=".*?" \/>/i, `<meta property="og:image" content="${meta.ogImage}" />\n    <meta property="og:url" content="${meta.canonical}" />\n    <meta name="twitter:card" content="summary_large_image" />\n    <meta name="twitter:title" content="${meta.title}" />\n    <meta name="twitter:description" content="${meta.description}" />\n    <meta name="twitter:image" content="${meta.ogImage}" />`)
        .replace(/<meta name="apple-mobile-web-app-title" content=".*?" \/>/i, `<meta name="apple-mobile-web-app-title" content="${meta.shortTitle}" />`)
    }
  }
}

export default defineConfig({
  plugins: [
    tenantMetaHtmlPlugin(),
    clipPinpadDevPlugin(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: false, // Evita Source map errors y caché residual en modo desarrollo
        type: 'module',
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        maximumFileSizeToCacheInBytes: 3000000,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'], // Cache fundamental shell assets
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\/object\/public\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'supabase-product-images-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif)(?:\?.*)?$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-images-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ],
        navigateFallback: '/index.html', // SPA fallback for offline routing
        navigateFallbackDenylist: [/^\/auth/, /^\/api/],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
      },
      manifest: {
        short_name: isModaMiel ? 'Moda Miel MX' : isJuguetes ? 'San Judas Tadeo' : isLosChunches ? 'Los Chunches' : 'Reisbloc',
        name: isModaMiel
          ? 'Reisbloc Store · Moda Miel MX'
          : isJuguetes
          ? 'Juguetes y Novedades San Judas Tadeo'
          : isLosChunches
          ? 'Los Chunches de Cons'
          : 'Reisbloc Retail Lab',
        description: isModaMiel 
          ? 'POS personalizado para Moda Miel MX, powered by Reisbloc.' 
          : isJuguetes
          ? '¡El juguete de tus sueños te espera! Juguetes y Novedades San Judas Tadeo.'
          : isLosChunches
          ? 'Mercancía Americana e Importada · Los Chunches de Cons.'
          : 'Sistema de Punto de Venta Profesional',
        theme_color: isJuguetes ? '#C8323E' : isLosChunches ? '#C83E74' : isModaMiel ? '#D4386C' : '#0B0B0B',
        background_color: '#FFFFFF',
        display: 'standalone',
        start_url: '.',
        icons: [
          {
            src: isModaMiel
              ? 'images/moda-miel-mx-logo.jpeg'
              : isJuguetes
              ? 'images/juguetes-san-judas-logo.jpeg'
              : isLosChunches
              ? 'images/los_chunches.jpeg'
              : 'icon.svg',
            type: (isModaMiel || isJuguetes || isLosChunches) ? 'image/jpeg' : 'image/svg+xml',
            sizes: '512x512',
            purpose: 'any maskable'
          },
          {
            src: isModaMiel
              ? 'images/moda-miel-mx-logo.jpeg'
              : isJuguetes
              ? 'images/juguetes-san-judas-logo.jpeg'
              : isLosChunches
              ? 'images/los_chunches.jpeg'
              : 'icon.svg',
            type: (isModaMiel || isJuguetes || isLosChunches) ? 'image/jpeg' : 'image/svg+xml',
            sizes: '192x192',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },
  server: {
    host: true, // Permite acceso desde red/servidor virtual (0.0.0.0)
    port: 5173,
  },
  build: {
    outDir: 'dist',
    modulePreload: false,
    sourcemap: process.env.NODE_ENV !== 'production',
    target: 'esnext',
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/react-router-dom/')) {
            return 'react-vendor'
          }
        },
      },
    },
  }
})
