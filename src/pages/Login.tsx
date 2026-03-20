import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginWithEmail, logSuccessfulLogin, authLogout } from '@/services/authService'
import { supabase } from '@/config/supabase'
import { Mail, Lock, ArrowRight, Globe } from 'lucide-react'
import { useAppStore } from '@/store/appStore'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { isAuthenticated } = useAppStore()
  const navigate = useNavigate()

  useEffect(() => {
    const checkSession = async () => {
      // 1. Si Zustand dice que ya descargó el perfil y es auténtico, vamos a Admin
      if (isAuthenticated) {
        navigate('/admin')
        return
      }

      // 2. Si no es auténtico, revisamos la sesión "cruda" de Supabase
      const { data: { session } } = await supabase.auth.getSession()

      // 3. Si hay sesión cruda pero Zustand la rechazó (ej. usuario borrado de la tabla users),
      // es una sesión Zombie que causará un Loop Infinito. Debe ser destruida.
      if (session && !isAuthenticated) {
        if (window.location.search.includes('zombie=cleared')) {
          console.warn('⚠️ Falló la limpieza de la Sesión Zombie o fue abortada. Deteniendo loop por seguridad.')
          return
        }

        console.warn('⚠️ Sesión Zombie detectada. Eliminando sesión para romper loop infinito.')
        await authLogout() // Limpia localStorage y token

        // Forzamos un reinicio completo del cliente para limpiar cualquier estado
        // de react-router o Zustand que haya quedado en memoria.
        window.location.replace('/login?zombie=cleared')
      }
    }
    checkSession()
  }, [navigate, isAuthenticated])

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const result = await loginWithEmail(email, password)

    if (result.success) {
      if (result.user?.id) {
        // Ejecutar silenciosamente auditoría Enterprise
        logSuccessfulLogin().catch(console.error)
      }
      navigate('/admin') // Admins van al dashboard
    } else {
      setError(result.error || 'Error al iniciar sesión')
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    try {
      console.log('🌍 Iniciando Google Auth...')
      setError(null)
      setLoading(true)

      console.log('🧹 Limpiando tokens fantasma locales...')
      await authLogout()

      console.log('🚀 Ejecutando signInWithOAuth...')
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/auth/callback',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      })

      console.log('✅ Resultado auth:', { data, error })

      if (error) {
        console.error('❌ Error devuelto por Supabase:', error)
        throw error
      }

      // Si llegamos aqui y no redirigió...
      if (data?.url) {
        console.warn('⚠️ Supabase devolvió URL pero no redirigió automáticamente! Forzando redirección manual:', data.url)
        window.location.assign(data.url)
      }

    } catch (err: any) {
      console.error('❌ Error capturado en handleGoogleLogin:', err)
      setError(err?.message || JSON.stringify(err) || 'Error desconocido al iniciar OAuth')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0B0B0B] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Contenido */}
        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-white mb-2">
              Bienvenido
            </h1>
            <p className="text-gray-400">
              Acceso seguro al sistema
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-500/50 rounded-xl text-red-400 text-sm font-medium text-center">
              {error}
            </div>
          )}

          <div className="space-y-5">
            <form onSubmit={handleEmailLogin} className="space-y-5">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                <input
                  type="email"
                  required
                  placeholder="correo@negocio.com"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl py-4 pl-12 pr-4 text-white focus:border-blue-500 outline-none transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                <input
                  type="password"
                  required
                  placeholder="Contraseña"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl py-4 pl-12 pr-4 text-white focus:border-blue-500 outline-none transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <button
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 mt-4"
              >
                {loading ? 'Verificando...' : 'Entrar al Sistema'}
                {!loading && <ArrowRight size={20} />}
              </button>
            </form>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-gray-800"></div>
              <span className="flex-shrink-0 mx-4 text-gray-600 text-xs">O continúa con</span>
              <div className="flex-grow border-t border-gray-800"></div>
            </div>

            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full bg-white text-gray-900 hover:bg-gray-100 font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <Globe size={20} />
              Google
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}