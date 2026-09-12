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

function clipPinpadDevPlugin(): Plugin {
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

    const apiKey = process.env.CLIP_API_KEY || '29e7fea7-bcfb-42cf-a8f2-67a0dd521a3b'
    const apiSecret = process.env.CLIP_API_SECRET || 'e2be52d7-ef4a-4a80-9ba3-f07eee339176'
    const defaultSerial = process.env.CLIP_PINPAD_SERIAL || 'AA61B532642902383'
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
          webhook_url: process.env.CLIP_WEBHOOK_URL || 'https://jnyyaclrelqcqzjummwe.supabase.co/functions/v1/clip-webhook',
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

const isModaMiel = process.env.VITE_APP_BRAND === 'modamiel'

export default defineConfig({
  plugins: [
    clipPinpadDevPlugin(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: false, // Evita Source map errors y caché residual en modo desarrollo
        type: 'module',
      },
      workbox: {
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
        cleanupOutdatedCaches: true,
      },
      manifest: {
        short_name: isModaMiel ? 'Moda Miel MX' : 'Reisbloc',
        name: isModaMiel ? 'Reisbloc Store · Moda Miel MX' : 'Reisbloc Retail Lab',
        description: isModaMiel 
          ? 'POS personalizado para Moda Miel MX, powered by Reisbloc.' 
          : 'Sistema de Punto de Venta Profesional',
        theme_color: '#0B0B0B',
        background_color: '#0B0B0B',
        display: 'standalone',
        start_url: '.',
        icons: [
          {
            src: isModaMiel ? 'images/moda-miel-mx-logo.jpeg' : 'icon.svg',
            type: isModaMiel ? 'image/jpeg' : 'image/svg+xml',
            sizes: '512x512',
            purpose: 'any maskable'
          },
          {
            src: isModaMiel ? 'images/moda-miel-mx-logo.jpeg' : 'icon.svg',
            type: isModaMiel ? 'image/jpeg' : 'image/svg+xml',
            sizes: '192x192',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    host: true, // Permite acceso desde red/servidor virtual (0.0.0.0)
    port: 5173,
  },
  build: {
    outDir: 'dist',
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
