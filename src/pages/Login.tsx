import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/config/supabase'
import { BRANDING, isSanJudasUserEmail, JUGUETES_THEME } from '@/config/branding'
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
      let brandParam = params.get('brand')
      const errParam = params.get('error')

      // 🛡️ HARDENING: Preservar marca San Judas si el email typed es de su equipo o si se detecta en origen
      if (!brandParam) {
        if (isSanJudasUserEmail(email)) {
          brandParam = 'sanjudastadeo'
        } else if (typeof document !== 'undefined' && document.referrer && (document.referrer.includes('sanjudastadeo') || document.referrer.includes('juguetes'))) {
          brandParam = 'sanjudastadeo'
        }
      }

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

  // 🎨 Variante visual dirigida por el tema del tenant (cero hardcodeo por cliente)
  const isTypedSanJudas = isSanJudasUserEmail(email)
  const isJGTenant = BRANDING.isJuguetes || isTypedSanJudas
  const activeBrandName = isJGTenant ? 'Juguetes y Novedades San Judas Tadeo' : BRANDING.appName
  const activeWhiteLabel = isJGTenant ? 'Juguetes San Judas' : BRANDING.whiteLabelName
  const activeLogo = isJGTenant ? '/images/juguetes-san-judas-logo.jpeg' : BRANDING.logoUrl
  const activeSubtitle = isJGTenant ? '¡Bienvenido al POS de Juguetes San Judas Tadeo!' : BRANDING.loginSubtitle
  const theme = isJGTenant ? JUGUETES_THEME : BRANDING.theme
  const isFestive = Boolean(theme.loadingBg)

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 bg-[#070A11]"
      style={theme.loadingBg ? { backgroundImage: theme.loadingBg } : undefined}
    >
      {/* Decoración navideña para tenants festivos */}
      {isFestive && (
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-4 left-4 text-4xl opacity-30 rotate-[-15deg]">🎄</div>
          <div className="absolute top-8 right-6 text-3xl opacity-25 rotate-[10deg]">⭐</div>
          <div className="absolute bottom-20 left-8 text-3xl opacity-25">🎁</div>
          <div className="absolute bottom-16 right-4 text-4xl opacity-20 rotate-[5deg]">🧸</div>
          <div className="absolute top-1/3 left-2 text-2xl opacity-20">❄️</div>
          <div className="absolute top-1/4 right-2 text-2xl opacity-20">❄️</div>
        </div>
      )}
      <div className="w-full max-w-md relative">
        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center w-24 h-24 rounded-2xl mb-4 overflow-hidden border shadow-2xl ${
            isFestive
              ? 'bg-white/20 border-[var(--on-primary-soft)]/60 ring-2 ring-[var(--on-primary-soft)]/30'
              : 'bg-slate-900 border-amber-500/30 shadow-amber-500/5'
          }`}>
            <img src={activeLogo} alt={activeWhiteLabel} className="w-full h-full object-cover" />
          </div>
          <h1 className={`text-3xl sm:text-4xl font-black mb-2 tracking-tight text-white ${
            isFestive ? 'drop-shadow-lg' : ''
          }`} style={isFestive ? { fontFamily: 'var(--font-serif)' } : {}}>
            {activeBrandName}
          </h1>
          <p className={`text-sm sm:text-base font-medium ${
            isFestive ? 'text-[var(--on-primary-soft)]' : 'text-slate-400'
          }`}>{activeSubtitle}</p>
          <div className={`text-xs mt-2 uppercase tracking-widest font-bold font-mono ${
            isFestive ? 'text-[var(--on-primary-soft)]' : 'text-amber-400'
          }`}>
            {activeWhiteLabel}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-950/40 border border-red-500/50 rounded-xl text-red-300 text-sm text-center">
            {statusToMessage() || error}
          </div>
        )}

        <div className={`rounded-xl p-6 sm:p-8 shadow-2xl space-y-4 ${
          isFestive
            ? 'bg-white/10 backdrop-blur-sm border border-white/20'
            : 'bg-[#0F172A] border border-slate-800'
        }`}>
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="login-email" className={`text-xs font-bold uppercase tracking-wide ${isFestive ? 'text-[var(--on-primary-soft)]' : 'text-slate-400'}`}>Email</label>
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                disabled={loading}
                className={`w-full rounded-lg py-3 px-4 outline-none transition-colors disabled:opacity-50 ${
                  isFestive
                    ? 'bg-white/20 border border-white/30 focus:border-[var(--on-primary-soft)] text-white placeholder:text-white/50'
                    : 'bg-[#070A11] border border-slate-700 focus:border-[var(--primary)] text-white placeholder:text-slate-600'
                }`}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="login-password" className={`text-xs font-bold uppercase tracking-wide ${isFestive ? 'text-[var(--on-primary-soft)]' : 'text-slate-400'}`}>Contraseña</label>
              <input
                id="login-password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                className={`w-full rounded-lg py-3 px-4 outline-none transition-colors disabled:opacity-50 ${
                  isFestive
                    ? 'bg-white/20 border border-white/30 focus:border-[var(--on-primary-soft)] text-white placeholder:text-white/50'
                    : 'bg-[#070A11] border border-slate-700 focus:border-[var(--primary)] text-white placeholder:text-slate-600'
                }`}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className={`w-full font-bold py-3.5 px-6 rounded-lg flex items-center justify-center gap-3 transition-all disabled:opacity-50 active:scale-[0.99] bg-[var(--login-primary)] hover:bg-[var(--login-primary-hover)] ${
                theme.id === 'default' ? 'text-[#070A11]' : 'text-white'
              } shadow-lg`}
            >
              {loading ? 'Entrando...' : 'Entrar'}
              <ArrowRight size={18} />
            </button>
          </form>

          <div className="flex items-center gap-3 py-1">
            <div className={`flex-1 h-px ${isFestive ? 'bg-white/20' : 'bg-slate-800'}`} />
            <span className={`text-xs font-medium uppercase tracking-widest ${isFestive ? 'text-white/50' : 'text-slate-600'}`}>o con Google</span>
            <div className={`flex-1 h-px ${isFestive ? 'bg-white/20' : 'bg-slate-800'}`} />
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
