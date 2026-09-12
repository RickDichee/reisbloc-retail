/**
 * Reisbloc POS - Sistema POS Profesional
 * ⚠️ CLIENTE: CEVICHERIA MEXA (Producción)
 * 
 * NOTA IMPORTANTE: Este archivo pertenece a una instancia Single-Tenant.
 * NO SOBREESCRIBIR con lógica del SaaS Multi-Tenant sin revisión manual.
 * 
 * Copyright (C) 2026 Reisbloc POS
 */

// Servicio de autenticación solo Supabase
import { supabase } from '@/config/supabase'
import { clearAuthToken, getStoredToken } from './jwtService'
import supabaseService from './supabaseService'
import deviceService from './deviceService'
import { useAppStore } from '@/store/appStore'
import { offlineStorage } from './offlineStorage'
import { resetTenantTheme } from '@/hooks/useTenantTheme'

import logger from '@/utils/logger'
import { User } from '@/types/index'


/**
 * Login tradicional con Email/Password (Para Admins/Dueños)
 * Registra y auto-aprueba el dispositivo si el login es exitoso.
 */
export async function loginWithEmail(email: string, password: string): Promise<any> {
  try {
    logger.info('auth', '📧 Iniciando login por email...')

    // 1. Autenticación con Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) throw error
    if (!data.user) throw new Error('No se recibieron datos de usuario')

    // 2. Registrar dispositivo automáticamente (Post-Login)
    // Como ya tiene sesión válida, RLS permitirá insertar su propio dispositivo
    try {
      const deviceId = deviceService.storeDeviceFingerprint()
      const deviceInfo = await deviceService.getDeviceInfo()

      // Registramos el dispositivo. El trigger 'auto_approve_admin_device' 
      // se encargará de aprobarlo si el usuario es admin.
      await supabaseService.registerDevice({
        ...deviceInfo,
        userId: data.user.id,
        fingerprint: deviceId,
        macAddress: '' // Safe default for required field
      } as any)
      logger.info('auth', '✅ Dispositivo registrado post-login email')
    } catch (devError) {
      logger.warn('auth', '⚠️ Error registrando dispositivo (no crítico)', devError)
    }

    return { success: true, user: data.user as any }
  } catch (error: any) {
    logger.error('auth', '❌ Error en login por email', error)
    return { success: false, error: error.message }
  }
}

/**
 * Login con Google OAuth
 * Redirige al proveedor de identidad. El manejo de sesión se hace al volver.
 */
export async function loginWithGoogle(): Promise<{ error?: string }> {
  try {
    const redirectTo = `${window.location.origin}/admin`
    logger.info('auth', '🌍 Iniciando login con Google...', {
      redirectTo,
      origin: window.location.origin
    })

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })

    if (error) {
      logger.error('auth', '❌ Error inicializando OAuth', error)
      throw error
    }

    logger.info('auth', '✅ Redirección OAuth iniciada', data)
    return {}
  } catch (error: any) {
    logger.error('auth', '❌ Error en login con Google', error)
    return { error: error.message }
  }
}

/**
 * Alias semántico para el registro.
 * En OAuth (Google), el flujo de "Login" crea el usuario si no existe.
 */
export const registerWithGoogle = loginWithGoogle

export async function authLogout(): Promise<void> {
  try {
    clearAuthToken() // Limpiar token local

    // 1. Purgar caché offline IndexedDB
    try {
      await offlineStorage.clearAllData()
      logger.info('auth', '🗑️ Caché offline de IndexedDB purgada')
    } catch (dbErr) {
      logger.warn('auth', 'Error limpiando IndexedDB en logout', dbErr)
    }

    // 2. Resetear store global en memoria y persistencia
    try {
      useAppStore.getState().logout()
      logger.info('auth', '🗑️ Estado global useAppStore reseteado a initialState')
    } catch (storeErr) {
      logger.warn('auth', 'Error reseteando store en logout', storeErr)
    }

    // 3. Restaurar tema por defecto en DOM y eliminar cualquier clase de marca residual
    try {
      resetTenantTheme()
      logger.info('auth', '🎨 Tema visual reseteado a DEFAULT_THEME en DOM')
    } catch (themeErr) {
      logger.warn('auth', 'Error reseteando tema en logout', themeErr)
    }

    // 4. BARRIDO TOTAL: Destruir todas las sesiones, tokens, catálogos y órdenes en LocalStorage
    if (typeof localStorage !== 'undefined') {
      const keysToRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (!key) continue
        if (
          key.startsWith('sb-') ||
          key.includes('supabase') ||
          key.startsWith('local_pending_orders') ||
          key.startsWith('cached_crm_clients') ||
          key === 'app-store' ||
          key === 'current_org_id' ||
          key === 'reisbloc_auth_token' ||
          key === 'current_branch_id' ||
          key === 'device_fingerprint'
        ) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k))
      logger.info('auth', `🗑️ ${keysToRemove.length} llaves de almacenamiento local eliminadas manualmente`)
    }

    logger.info('auth', '🗑️ Token local eliminado')

    // 5. Intentar logout de Supabase, pero no bloquear si falla
    supabase.auth.signOut().catch(err => {
      logger.warn('auth', 'Supabase signOut warning (Ignorado por barrido local)', err)
    })

    logger.info('auth', '✅ Logout local exitoso')
  } catch (error: any) {
    logger.error('auth', 'Error en logout', error)
  }
}

/**
 * ⏳ POLLING (ESPERA ACTIVA)
 * Esta función pregunta repetidamente a la base de datos si el usuario ya tiene 'organization_id'.
 * Es necesaria porque la Edge Function tarda unos segundos en crear la Org después del registro.
 * 
 * @param userId El ID del usuario autenticado
 * @param attempts Número de intentos (default 10)
 * @param interval Tiempo de espera entre intentos en ms (default 1000ms = 1s)
 */
export async function pollForOrganization(userId: string, attempts = 10, interval = 1000): Promise<string | null> {
  for (let i = 0; i < attempts; i++) {
    const { data } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', userId)
      .maybeSingle()

    if (data?.organization_id) {
      return data.organization_id // 🍕 ¡La pizza llegó!
    }
    // 😴 Backoff: Esperar un segundo antes de volver a preguntar
    await new Promise(resolve => setTimeout(resolve, interval))
  }
  return null // ❌ Se acabó el tiempo
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user) return null
    return null // useAuth maneja el estado
  } catch (error) {
    logger.error('auth', 'Error getting user', error)
  }
  return null
}

export async function logSuccessfulLogin(orgIdOverride?: string): Promise<void> {
  try {
    const { currentDevice, currentUser } = useAppStore.getState()
    const token = getStoredToken()
    const organizationId = orgIdOverride || currentUser?.organizationId || token?.organizationId || null

    // Llamada centralizada a Edge Function para registro de logs y geolocalización segura por el backend.
    const { data, error } = await supabase.functions.invoke('log-auth-event', {
      body: {
        deviceId: currentDevice?.id || null,
        organizationId,
        sessionType: 'External'
      }
    })

    if (error) {
      logger.warn('auth', '⚠️ Aviso al auditar el login vía Edge Function:', error.message || error)
      return
    }

    logger.info('auth', `📍 Login auditado centralizado. Detalles:`, data)
  } catch (error: any) {
    logger.warn('auth', '⚠️ Aviso al auditar el login vía Edge Function:', error?.message || error)
  }
}
