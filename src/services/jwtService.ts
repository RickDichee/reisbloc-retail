import logger from '@/utils/logger'

interface TokenResponse {
  accessToken: string
  userId: string
  userRole: string
  username: string
  organizationId?: string
  deviceStatus?: string
  device?: any
  expiresAt?: number
  expiresIn?: number
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
