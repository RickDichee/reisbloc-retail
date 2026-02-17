import { supabase } from '@/config/supabase'
import logger from '@/utils/logger'

interface LoginPayload {
  userId?: string
  pin: string
  deviceId: string
  deviceInfo?: any // Agregamos campo para pasar info del dispositivo
}

interface TokenResponse {
  accessToken: string
  userId: string
  userRole: string
  username: string
  organizationId?: string
  deviceStatus?: string // Nuevo campo
  device?: any // ✅ El dispositivo completo
  expiresAt?: number
  expiresIn?: number
}

/**
 * Generar JWT personalizado después de validar PIN
 * Se apoya en la Edge Function `generate-access-token` (firma con JWT_SECRET)
 */
export async function generateAccessToken(payload: LoginPayload): Promise<TokenResponse> {
  try {
      // Llamar a la Edge Function para validar PIN y obtener JWT firmado
    const { data, error } = await supabase.functions.invoke('generate-access-token', {
      body: {
        userId: payload.userId, // Puede ser undefined, la Edge Function usa el PIN
        role: 'anon', // La función determinará el rol real desde la DB
        deviceId: payload.deviceId || 'unknown',
        pin: payload.pin, // Enviamos PIN para validación segura en servidor
        deviceInfo: payload.deviceInfo // Pasamos la info para registro automático
      }
    })

    // FIX: La Edge Function devuelve 'access_token' (snake_case), no 'accessToken'
    if (error || !data || !data.access_token) {
      logger.error('auth', 'Error generating token', { error, data })
      throw new Error('No se pudo generar token de acceso')
    }

    // 3) Guardar token en localStorage
    // La Edge Function devuelve 'expires_in'
    const expiresInSeconds = data.expires_in || (24 * 60 * 60);
    const expiresAt = Date.now() + (expiresInSeconds * 1000)

    const tokenData: TokenResponse = {
      accessToken: data.access_token,
      userId: data.user?.id || payload.userId || '', // Usar ID real devuelto por la función
      userRole: data.user?.role || 'authenticated', 
      username: data.user?.name || 'User',
      organizationId: data.user?.org_id, // Capturamos el ID de la organización
      deviceStatus: data.deviceStatus, // Capturamos el estado del dispositivo
      device: data.device, // ✅ Guardamos el dispositivo que nos dio el server
      expiresIn: expiresInSeconds,
      expiresAt
    }

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('reisbloc_auth_token', JSON.stringify(tokenData))
    }

    logger.info('auth', 'Token generado exitosamente', { userId: tokenData.userId, role: tokenData.userRole })
    return tokenData
  } catch (error) {
    logger.error('auth', 'Error en generateAccessToken', error)
    throw error
  }
}

/**
 * Obtener token actual del localStorage
 */
export function getStoredToken(): TokenResponse | null {
  try {
    if (typeof localStorage === 'undefined') return null
    
    const stored = localStorage.getItem('reisbloc_auth_token')
    if (!stored) return null

    const token = JSON.parse(stored)
    
    // Verificar que no esté expirado
    if (token.expiresAt && token.expiresAt < Date.now()) {
      localStorage.removeItem('reisbloc_auth_token')
      return null
    }

    return token
  } catch (error) {
    logger.error('auth', 'Error leyendo token almacenado', error)
    return null
  }
}

/**
 * Limpiar token al logout
 */
export function clearAuthToken(): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('reisbloc_auth_token')
  }
}

/**
 * Verificar si el token es válido y está en la sesión
 */
export function isTokenValid(): boolean {
  const token = getStoredToken()
  return !!(token && token.accessToken && token.expiresAt > Date.now())
}
