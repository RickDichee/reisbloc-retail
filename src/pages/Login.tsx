import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/config/supabase'
import { BRANDING } from '@/config/branding'
import { ArrowRight } from 'lucide-react'
import { useAppStore } from '@/store/appStore'

export default function Login() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<number | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { isAuthenticated, currentUser, isInitializing } = useAppStore()
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const errParam = params.get('error')
    if (errParam === 'unauthorized_collaborator') {
      setError('⚠️ Acceso restringido: Únicamente los colaboradores autorizados pueden ingresar. Solicita una invitación a tu Administrador.')
    } else if (errParam === 'auth_failed') {
      setError('⚠️ No se pudo completar el inicio de sesión. Por favor intenta de nuevo.')
    }
  }, [])

  useEffect(() => {
    if (isInitializing) return

    if (isAuthenticated && currentUser) {
      const adminRoles = ['admin', 'owner', 'superadmin', 'manager']
      if (adminRoles.includes(currentUser.role)) {
        navigate('/admin', { replace: true })
      } else {
        navigate('/pos', { replace: true })
      }
    }
  }, [navigate, isAuthenticated, currentUser, isInitializing])

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setError(null)
      setLoading(true)
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      })
      if (error) {
        setStatus(error.status)
        throw error
      }
      setStatus(null)
    } catch (err: any) {
      setStatus(err?.status)
      setError(err?.message || 'Error al iniciar sesión')
      setLoading(false)
    }
  }

  const statusToMessage = () => {
    if (status === 400) return '📧 Email o contraseña incorrectos. Intenta de nuevo.'
    if (status === 422) return '⚠️ Datos incompletos o sesión pendiente de confirmar.'
    return null
  }

  const handleGoogleLogin = async () => {
    try {
      setError(null)
      setLoading(true)

      const params = new URLSearchParams(window.location.search)
      const brandParam = params.get('brand')
      const errParam = params.get('error')
      // Evitar re-enviar brand en el callback si vino de un error de aislamiento previo
      const shouldPassBrand = brandParam && !errParam
      const redirectUrl = window.location.origin + '/auth/callback' + (shouldPassBrand ? `?brand=${brandParam}` : '')

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
    <div className="min-h-screen bg-[#070A11] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-xl mb-4 overflow-hidden border shadow-xl ${
            BRANDING.isModaMiel 
              ? 'bg-pink-500/10 border-pink-500/30' 
              : BRANDING.isLosChunches
              ? 'bg-rose-500/10 border-rose-500/30 shadow-rose-500/10'
              : 'bg-slate-900 border-amber-500/30 shadow-amber-500/5'
          }`}>
            <img src={BRANDING.logoUrl} alt={BRANDING.whiteLabelName} className="w-full h-full object-cover" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-2 tracking-tight">{BRANDING.appName}</h1>
          <p className="text-slate-400 text-sm sm:text-base font-medium">{BRANDING.loginSubtitle}</p>
          <div className={`text-xs mt-2 uppercase tracking-widest font-bold font-mono ${
            BRANDING.isModaMiel ? 'text-pink-400' : BRANDING.isLosChunches ? 'text-rose-400' : 'text-amber-400'
          }`}>
            {BRANDING.whiteLabelName}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-950/40 border border-red-500/50 rounded-xl text-red-300 text-sm text-center">
            {statusToMessage() || error}
          </div>
        )}

        <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-6 sm:p-8 shadow-2xl space-y-4">
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="login-email" className="text-xs font-bold text-slate-400 uppercase tracking-wide">Email</label>
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                disabled={loading}
                className="w-full bg-[#070A11] border border-slate-700 focus:border-rose-500/60 rounded-lg py-3 px-4 text-white placeholder:text-slate-600 outline-none transition-colors disabled:opacity-50"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="login-password" className="text-xs font-bold text-slate-400 uppercase tracking-wide">Contraseña</label>
              <input
                id="login-password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                className="w-full bg-[#070A11] border border-slate-700 focus:border-rose-500/60 rounded-lg py-3 px-4 text-white placeholder:text-slate-600 outline-none transition-colors disabled:opacity-50"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className={`w-full font-bold py-3.5 px-6 rounded-lg flex items-center justify-center gap-3 transition-all disabled:opacity-50 active:scale-[0.99] ${
                BRANDING.isLosChunches
                  ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-lg shadow-rose-500/20'
                  : BRANDING.isModaMiel
                  ? 'bg-pink-500 hover:bg-pink-400 text-white shadow-lg shadow-pink-500/20'
                  : 'bg-amber-500 hover:bg-amber-400 text-[#070A11] shadow-lg shadow-amber-500/20'
              }`}
            >
              {loading ? 'Entrando...' : 'Entrar'}
              <ArrowRight size={18} />
            </button>
          </form>

          <div className="flex items-center gap-3 py-1">
            <div className="flex-1 h-px bg-slate-800" />
            <span className="text-slate-600 text-xs font-medium uppercase tracking-widest">o con Google</span>
            <div className="flex-1 h-px bg-slate-800" />
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white hover:bg-slate-100 text-slate-900 font-bold py-3.5 px-6 rounded-lg flex items-center justify-center gap-3 transition-all disabled:opacity-50 shadow-sm active:scale-[0.99]"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.08l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span className="text-sm sm:text-base">{loading ? 'Conectando con Google...' : 'Continuar con Google'}</span>
            {!loading && <ArrowRight size={18} />}
          </button>
        </div>

        <p className="mt-8 text-center text-slate-500 text-sm">
          ¿No tienes cuenta?{' '}
          <button onClick={() => navigate('/register')} className="text-teal-400 hover:text-teal-300 font-bold hover:underline">
            Regístrate gratis
          </button>
        </p>
      </div>
    </div>
  )
}
