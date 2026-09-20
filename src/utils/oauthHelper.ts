/**
 * Reisbloc POS - OAuth Helper para Web y Móvil (Capacitor)
 * Maneja redirecciones y Deep Linking en Android e iOS sin caer en localhost.
 */

import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'
import { supabase } from '@/config/supabase'
import { logger } from '@/utils/logger'

export function getOAuthRedirectUrl(extraParams?: Record<string, string | null | undefined>): string {
  const isNative = Capacitor.isNativePlatform()
  
  // En Android nativo, NUNCA usar window.location.origin (se evaluaría a https://localhost).
  // Usamos el Custom Scheme nativo com.reisbloclabs.pos://auth/callback registrado en AndroidManifest.
  const baseUrl = isNative
    ? 'com.reisbloclabs.pos://auth/callback'
    : `${window.location.origin}/auth/callback`

  const url = new URL(baseUrl.replace(/^com\.reisbloclabs\.pos:\/\//, 'https://dummy.local/'))
  
  if (extraParams) {
    Object.entries(extraParams).forEach(([key, value]) => {
      if (value) {
        url.searchParams.set(key, value)
      }
    })
  }

  if (isNative) {
    const search = url.search ? url.search : ''
    return `com.reisbloclabs.pos://auth/callback${search}`
  }

  return url.origin === window.location.origin
    ? `${window.location.origin}${url.pathname}${url.search}`
    : `${baseUrl}${url.search}`
}

export async function initiateGoogleOAuth(extraParams?: Record<string, string | null | undefined>): Promise<void> {
  const isNative = Capacitor.isNativePlatform()
  const redirectTo = getOAuthRedirectUrl(extraParams)

  logger.info('auth', 'Iniciando flujo Google OAuth', { isNative, redirectTo })

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: isNative,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent'
      }
    }
  })

  if (error) {
    logger.error('auth', 'Error iniciando signInWithOAuth', error)
    throw error
  }

  if (isNative && data?.url) {
    logger.info('auth', 'Abriendo navegador seguro In-App con Browser.open', { url: data.url })
    await Browser.open({ url: data.url, windowName: '_self' })
  }
}
