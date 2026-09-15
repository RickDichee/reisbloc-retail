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

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/globals.css'
import './i18n'

// 🛡️ Auto-recuperación de chunks de Vite al desplegar nueva versión
window.addEventListener('vite:preloadError', () => {
  console.warn('🔄 Nueva versión detectada (chunk antiguo no encontrado). Recargando automáticamente...')
  window.location.reload()
})

// En apps nativas compiladas con Capacitor (Android / iOS), los Service Workers causan bucles de recarga
// y bloquean la carga de assets locales empaquetados en el APK.
const isCapacitor = typeof (window as any).Capacitor !== 'undefined' || !!(window as any).Capacitor?.isNativePlatform?.()

if (isCapacitor) {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister()
      }
    })
  }
} else if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    // Verificar si ya teníamos un controlador previo antes de instalar
    let hadController = !!navigator.serviceWorker.controller

    navigator.serviceWorker.register('/sw.js').then((registration) => {
      console.log('✅ Service Worker registrado exitosamente')

      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' })
      }
      
      // Escuchar actualizaciones
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('🔄 Nueva versión disponible, activando...')
              newWorker.postMessage({ type: 'SKIP_WAITING' })
              window.dispatchEvent(new Event('sw-update-available'))
            }
          })
        }
      })
    }).catch((error) => {
      console.warn('⚠️ Error registrando Service Worker:', error)
    })

    let refreshing = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // 🛡️ REGLA CRÍTICA:
      // 1. Si NO había controlador previo, es la primera instalación: jamás reiniciar abruptamente al usuario.
      // 2. Si estamos en proceso de callback de OAuth o en el POS activo, no interrumpir la sesión.
      if (!hadController) {
        hadController = true
        return
      }

      const pathname = window.location.pathname
      if (pathname.startsWith('/auth/callback') || pathname.startsWith('/pos')) {
        console.log('🔄 SW actualizado en segundo plano, no se reinicia para no interrumpir operación activa.')
        return
      }

      if (!refreshing) {
        refreshing = true
        window.location.reload()
      }
    })
  })
}



import ErrorBoundary from './components/common/ErrorBoundary'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
