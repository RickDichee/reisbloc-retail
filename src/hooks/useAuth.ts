import { useAppStore } from '@/store/appStore'
import { authLogout } from '@/services/authService'
import logger from '@/utils/logger'
import { useNavigate } from 'react-router-dom'

export function useAuth() {
  // Obtenemos el store completo con los nombres CORRECTOS
  const store = useAppStore()
  const user = store.currentUser // ✅ El store usa currentUser, no user
  const isAuthenticated = store.isAuthenticated

  // Estados locales para loading y error
  const navigate = useNavigate()


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
    logout
  }
}
