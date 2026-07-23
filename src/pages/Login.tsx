import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/config/supabase'
import { BRANDING } from '@/config/branding'
import { ArrowRight } from 'lucide-react'
import { useAppStore } from '@/store/appStore'

export default function Login() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { isAuthenticated, isInitializing } = useAppStore()
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const errParam = params.get('error')
    if (errParam === 'unauthorized_collaborator') {
      setError('⚠️ Acceso restringido: Únicamente los colaboradores autorizados por Moda Miel MX pueden ingresar. Solicita una invitación a tu Administrador.')
    }
  }, [])

  useEffect(() => {
    const checkSession = async () => {
      if (isInitializing) return

      if (isAuthenticated) {
        navigate('/admin')
        return
      }
    }
    checkSession()
  }, [navigate, isAuthenticated, isInitializing])

  const handleGoogleLogin = async () => {
    try {
      setError(null)
      setLoading(true)

      await supabase.auth.signOut()

      const params = new URLSearchParams(window.location.search)
      const brandParam = params.get('brand')
      const redirectUrl = window.location.origin + '/auth/callback' + (brandParam ? `?brand=${brandParam}` : '')

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl
        }
      })

      if (error) throw error
    } catch (err: any) {
      setError(err?.message || 'Error al iniciar con Google')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0B0B0B] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-pink-500/15 mb-4 overflow-hidden border border-pink-400/30">
            <img src={BRANDING.logoUrl} alt={BRANDING.whiteLabelName} className="w-full h-full object-cover" />
          </div>
          <h1 className="text-4xl font-black text-white mb-2">{BRANDING.appName}</h1>
          <p className="text-gray-400 text-lg">{BRANDING.loginSubtitle}</p>
          <div className="text-xs text-pink-400 mt-2 uppercase tracking-widest font-bold">{BRANDING.whiteLabelName}</div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-500/50 rounded-2xl text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-2xl">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white hover:bg-gray-100 text-gray-900 font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.08l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {loading ? 'Conectando...' : 'Continuar con Google'}
            {!loading && <ArrowRight size={20} />}
          </button>
        </div>

        <p className="mt-8 text-center text-gray-500 text-sm">
          ¿No tienes cuenta?{' '}
          <button onClick={() => navigate('/register')} className="text-emerald-400 hover:underline">
            Regístrate gratis
          </button>
        </p>
      </div>
    </div>
  )
}