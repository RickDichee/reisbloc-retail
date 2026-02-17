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
import { supabase, forceAuthHeader } from '@/config/supabase'
import { generateAccessToken, clearAuthToken } from './jwtService'
import supabaseService from './supabaseService'
import deviceService from './deviceService'

import logger from '@/utils/logger'
import { User, Device } from '@/types/index'

interface LoginResult {
  success: boolean
  user?: User
  token?: string
  error?: string
  deviceStatus?: string
  device?: Device | null
}

export async function authLogin(pin: string): Promise<LoginResult> {
  try {
    logger.info('auth', '🔐 Iniciando autenticación segura (Edge Function)')
    
    // 1. OMITIMOS BÚSQUEDA DIRECTA (RLS Bloquea lectura a 'anon')
    // Delegamos toda la validación a la Edge Function que tiene Service Role.
    
    // Obtenemos el fingerprint único de este dispositivo
    const deviceId = deviceService.storeDeviceFingerprint()
    const deviceInfo = await deviceService.getDeviceInfo()

    // 2. Generar Token via Edge Function (Validación real de seguridad)
    // Enviamos userId vacío o null, la Edge Function buscará por PIN
    const tokenData = await generateAccessToken({
      userId: undefined, // FIX: Enviar undefined en lugar de '' para evitar errores de validación UUID
      pin: pin,
      deviceId: deviceId,
      deviceInfo: { ...deviceInfo, fingerprint: deviceId } // Enviamos info completa para que la Edge Function registre
    })

    // 🔍 DEBUG: Ver qué demonios está llegando realmente
    logger.info('auth', '🔍 TokenData recibido:', JSON.stringify(tokenData, null, 2))

    if (!tokenData.organizationId) {
      logger.warn('auth', '⚠️ Login exitoso pero no se recibió organizationId. Es posible que algunas funciones fallen.')
    }

    // FIX CRÍTICO: Establecer la sesión de Supabase INMEDIATAMENTE con el token recibido.
    // Esto es necesario para que las consultas subsiguientes (como buscar el dispositivo)
    // pasen las políticas RLS que requieren autenticación.
    if (tokenData.accessToken) {
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: tokenData.accessToken,
        refresh_token: tokenData.accessToken
      })
      if (sessionError) {
        logger.warn('auth', '⚠️ Error estableciendo sesión local (User mismatch). Forzando headers...', sessionError)
        // FIX: Si falla setSession (porque el usuario no está en auth.users), forzamos el header
        forceAuthHeader(tokenData.accessToken)
      } else logger.info('auth', '✅ Sesión local establecida correctamente')
    }

    // 3. Recuperar el dispositivo registrado para actualizar el estado local
    // Esto soluciona el problema de "device: null"
    // FIX: Usar el dispositivo devuelto por el servidor si existe (Zero-Latency)
    // IMPORTANTE: Mapear de snake_case (DB) a camelCase (App) usando el helper
    let currentDevice = null;
    
    if (tokenData.device) {
      logger.info('auth', '🔍 Mapeando device desde tokenData...')
      currentDevice = supabaseService.mapDeviceFromDB(tokenData.device);
      logger.info('auth', '✅ Dispositivo mapeado exitosamente', {
        deviceId: currentDevice?.id,
        deviceName: currentDevice?.deviceName,
        isApproved: currentDevice?.isApproved
      })
    } else {
      logger.warn('auth', '⚠️ tokenData.device es null/undefined')
    }
    
    if (!currentDevice) {
      try {
          logger.info('auth', 'Intentando recuperar device adicional por fallback...')
          // Intento 1: Búsqueda directa
          // FIX: Pasamos organizationId explícitamente para evitar race conditions con localStorage
          currentDevice = await supabaseService.getDeviceByFingerprint(deviceId, tokenData.organizationId)
          
          // Intento 2: Fallback robusto (buscar en todos los dispositivos del usuario)
          if (!currentDevice && tokenData.userId) {
              const userDevices = await supabaseService.getDevicesByUser(tokenData.userId)
              currentDevice = userDevices.find(d => d.fingerprint === deviceId) || null
              if (currentDevice) {
                  logger.info('auth', 'Dispositivo recuperado via fallback (lista de usuario)')
              }
          }
      } catch (e) {
          logger.warn('auth', 'No se pudo recuperar el dispositivo', e)
      }
    }

    const user: User = {
      id: tokenData.userId,
      username: tokenData.username,
      role: tokenData.userRole as any,
      pin: '',
      active: true,
      createdAt: new Date(),
      devices: currentDevice ? [currentDevice] : [], // ✅ Ahora sí guardamos el dispositivo
      organizationId: tokenData.organizationId,
    }

    logger.info('auth', '✅ Autenticación exitosa via Edge Function', { 
      username: user.username,
      deviceFound: !!currentDevice,
      deviceId: currentDevice?.id,
      isApproved: currentDevice?.isApproved
    })
    
    return { 
      success: true, 
      user, 
      token: tokenData.accessToken, 
      deviceStatus: tokenData.deviceStatus,
      device: currentDevice // 👈 Retorne el dispositivo (mapeado o recuperado por fallback)
    }
  } catch (error: any) {
    logger.error('auth', '❌ Error en login', { message: error.message, details: error })
    return { success: false, error: error.message }
  }
}

/**
 * Login tradicional con Email/Password (Para Admins/Dueños)
 * Registra y auto-aprueba el dispositivo si el login es exitoso.
 */
export async function loginWithEmail(email: string, password: string): Promise<LoginResult> {
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
        fingerprint: deviceId
      })
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
    logger.info('auth', '🗑️ Token local eliminado')
    
    // Intentar logout de Supabase, pero no bloquear si falla
    const { error } = await supabase.auth.signOut()
    if (error) logger.warn('auth', 'Supabase signOut warning', error)
    
    logger.info('auth', '✅ Logout exitoso')
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
