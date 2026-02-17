import { useAppStore } from '@/store/appStore'
import { authLogin, authLogout } from '@/services/authService'
import logger from '@/utils/logger'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export function useAuth() {
  // Obtenemos el store completo con los nombres CORRECTOS
  const store = useAppStore()
  const user = store.currentUser // ✅ El store usa currentUser, no user
  const isAuthenticated = store.isAuthenticated

  // Estados locales para loading y error
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const loginWithPin = async (pin: string) => {
    setLoading(true)
    setError(null)

    try {
      const result = await authLogin(pin)
      if (result.success && result.user) {
        // Guardar usuario en el store
        store.setCurrentUser(result.user)
        store.setAuthenticated(true)

        // FIX CRÍTICO: Guardar el dispositivo en el store
        if (result.device) {
          store.setCurrentDevice(result.device)
          logger.info('auth', '📱 Dispositivo guardado en store desde useAuth', {
            deviceId: result.device.id,
            deviceName: result.device.deviceName,
            isApproved: result.device.isApproved
          })
        } else {
          logger.warn('auth', '⚠️ No se recibió dispositivo en el resultado del login')
        }

        // Devolver TODA la información incluyendo device y deviceStatus
        return {
          success: true,
          role: result.user.role,
          user: result.user,
          device: result.device,
          deviceStatus: result.deviceStatus
        }
      }

      setError(result.error || 'Error de autenticación')
      return { success: false, error: result.error }
    } catch (err: any) {
      const errorMsg = err?.message || 'Error inesperado'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      logger.info('auth', 'Iniciando proceso de logout...')

      // 1. Limpiar sesión en servidor y local storage
      await authLogout()

      // 2. Limpiar usuario y dispositivo en estado global
      store.setCurrentUser(null)
      store.setCurrentDevice(null)
      store.setAuthenticated(false)

      logger.info('auth', 'Estado de sesión limpiado correctamente. Redirigiendo...')
      navigate('/')
    } catch (error) {
      logger.error('auth', 'Error crítico en logout', error)
      // En caso de cualquier error, sacamos al usuario a la fuerza
      window.location.href = '/'
    }
  }

  return {
    user,
    isAuthenticated,
    loading,
    error,
    loginWithPin,
    login: loginWithPin, // Alias para compatibilidad con componentes que usan login()
    logout
  }
}
