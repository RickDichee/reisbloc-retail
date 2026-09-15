import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/config/supabase'
import { ShieldCheck } from 'lucide-react'
import { useAppStore } from '@/store/appStore'

const LOADING_TIPS = [
  "Verificando identidad con Google...",
  "Preparando el punto de venta de Moda Miel...",
  "Cargando catálogo y clientes...",
  "Casi listo..."
]

export function AuthCallback() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tipIndex, setTipIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % LOADING_TIPS.length)
    }, 1500)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        setStatus('Intercambiando credenciales de acceso...')
        
        const searchParams = new URLSearchParams(window.location.search)
        const code = searchParams.get('code')
        const authError = searchParams.get('error_description') || searchParams.get('error')

        if (authError) {
          console.error('OAuth error en URL:', authError)
          throw new Error(authError)
        }

        let session = null

        // 1. Checar si ya hay sesión activa
        const { data: initialCheck } = await supabase.auth.getSession()
        if (initialCheck?.session?.user) {
          session = initialCheck.session
        }

        // 2. Si hay código PKCE y aún no hay sesión, intentar canjearlo
        if (!session && code) {
          try {
            const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
            if (!exchangeError && data?.session) {
              session = data.session
            }
          } catch (e) {
            console.warn('exchangeCodeForSession aviso:', e)
          }
        }

        // 3. Manejo de tokens en hash (#access_token=...&refresh_token=...)
        if (!session && window.location.hash) {
          const hashParams = new URLSearchParams(window.location.hash.substring(1))
          const accessToken = hashParams.get('access_token')
          const refreshToken = hashParams.get('refresh_token')
          if (accessToken && refreshToken) {
            const { data } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            })
            if (data?.session) {
              session = data.session
            }
          }
        }

        // 4. Polling seguro de hasta 4 segundos para esperar al cliente Supabase
        let attempts = 0
        while (!session?.user && attempts < 8) {
          await new Promise((r) => setTimeout(r, 500))
          const { data } = await supabase.auth.getSession()
          if (data?.session?.user) {
            session = data.session
            break
          }
          attempts++
        }

        if (!session?.user) {
          console.error('No se pudo establecer la sesión en AuthCallback')
          navigate('/login?error=auth_failed', { replace: true })
          return
        }

        const user = session.user
        setStatus('Cargando Moda Miel MX...')

        const mmOrgId = '1b498fa6-aca5-428c-9bdd-01e6fea30316'

        // Buscar en public.users por auth_uid, id o email
        let { data: existingUser } = await supabase
          .from('users')
          .select('*')
          .or(`id.eq.${user.id},auth_uid.eq.${user.id},email.eq.${user.email}`)
          .maybeSingle()

        if (existingUser) {
          if (!existingUser.auth_uid) {
            await supabase.from('users').update({ auth_uid: user.id }).eq('id', existingUser.id).catch(console.warn)
          }
        } else {
          // Crear usuario directamente en Moda Miel
          const { data: newUser } = await supabase.from('users').insert({
            id: user.id,
            auth_uid: user.id,
            name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Admin',
            email: user.email,
            role: 'admin',
            active: true,
            organization_id: mmOrgId,
            is_primary_admin: true
          }).select().single()
          existingUser = newUser
        }

        setStatus('¡Bienvenido a Moda Miel MX!')
        useAppStore.getState().setCurrentUser(existingUser || {
          id: user.id,
          name: user.user_metadata?.full_name || user.email,
          email: user.email,
          role: 'admin',
          organizationId: mmOrgId,
          active: true
        } as any)
        useAppStore.getState().setAuthenticated(true)

        // Limpiar URL y navegar directo al POS de Moda Miel
        window.location.href = '/pos'
        return

      } catch (err: any) {
        console.error('Auth callback error:', err)
        setError(err.message || 'Error al iniciar sesión')
        setTimeout(() => navigate('/login?error=auth_failed', { replace: true }), 3000)
      }
    }

    handleAuthCallback()
  }, [navigate])

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B0B0B] text-white p-4 font-['Outfit',sans-serif]">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-xl font-bold text-red-400 mb-2">Error de Autenticación</h2>
          <p className="text-gray-400 text-sm mb-4">{error}</p>
          <button
            onClick={() => navigate('/login')}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold"
          >
            Volver a intentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B0B0B] text-white p-4 font-['Outfit',sans-serif]">
      <div className="flex flex-col items-center gap-6 max-w-md text-center">
        <div className="relative">
          <div className="absolute inset-0 bg-pink-500 blur-xl opacity-30 rounded-full animate-pulse"></div>
          <ShieldCheck className="w-16 h-16 text-pink-400 animate-bounce relative z-10" />
        </div>

        <div className="space-y-3">
          <h2 className="text-2xl font-black text-white">Moda Miel MX</h2>
          <p className="text-gray-400 animate-pulse text-sm">
            {status || LOADING_TIPS[tipIndex]}
          </p>
        </div>
      </div>
    </div>
  )
}