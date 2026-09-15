import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/config/supabase'
import { logSuccessfulLogin } from '@/services/authService'
import { ShieldCheck } from 'lucide-react'
import { checkIsModaMiel } from '@/config/branding'
import supabaseService from '@/services/supabaseService'
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
        
        // 1. Manejo explícito de PKCE (Exchange authorization code for session)
        const searchParams = new URLSearchParams(window.location.search)
        const code = searchParams.get('code')
        const authError = searchParams.get('error_description') || searchParams.get('error')

        if (authError) {
          console.error('OAuth error en URL:', authError)
          throw new Error(authError)
        }

        let session = null

        if (code) {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
          if (!exchangeError && data?.session) {
            session = data.session
          } else if (exchangeError) {
            console.warn('exchangeCodeForSession aviso:', exchangeError.message)
          }
        }

        // 2. Manejo de tokens en hash (#access_token=...&refresh_token=...)
        if (!session && window.location.hash) {
          const hashParams = new URLSearchParams(window.location.hash.substring(1))
          const accessToken = hashParams.get('access_token')
          const refreshToken = hashParams.get('refresh_token')
          if (accessToken && refreshToken) {
            const { data, error: setSessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            })
            if (!setSessionError && data?.session) {
              session = data.session
            }
          }
        }

        // 3. Fallback directo a getSession()
        if (!session) {
          const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession()
          if (!sessionError && currentSession?.user) {
            session = currentSession
          }
        }

        // 4. Esperar brevemente a onAuthStateChange si el token aún se está guardando
        if (!session) {
          session = await new Promise((resolve) => {
            const timer = setTimeout(() => resolve(null), 2500)
            const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
              if (newSession?.user) {
                clearTimeout(timer)
                subscription.unsubscribe()
                resolve(newSession)
              }
            })
          })
        }

        if (!session?.user) {
          console.error('No se pudo establecer la sesión en AuthCallback')
          navigate('/login?error=auth_failed', { replace: true })
          return
        }

        const user = session.user
        setStatus('Verificando acceso a Moda Miel MX...')

        const hostname = (window.location.hostname || '').toLowerCase()
        const isActualMMDomain = hostname.includes('modamiel') || hostname.includes('moda-miel')

        // Buscar en public.users por id o por email
        let { data: existingUser } = await supabase
          .from('users')
          .select('id, organization_id, role, email')
          .eq('id', user.id)
          .maybeSingle()

        if (!existingUser && user.email) {
          const { data: byEmail } = await supabase
            .from('users')
            .select('id, organization_id, role, email')
            .eq('email', user.email)
            .maybeSingle()
          if (byEmail) {
            existingUser = byEmail
          }
        }

        // Obtener organización Moda Miel
        const mmOrg = await supabaseService.getOrganizationBySlug('modamiel')
        const mmOrgId = mmOrg?.id || '1b498fa6-aca5-428c-9bdd-01e6fea30316'

        // 🌸 PRIORIDAD MÁXIMA MODA MIEL:
        // Si el usuario entra por el dominio de Moda Miel o tiene cuenta autorizada
        if (isActualMMDomain) {
          const isSuperAdmin = 
            user.email === 'luis.lop9199@gmail.com' || 
            user.email === 'rick.playacar@gmail.com' ||
            user.email === 'lu.velazquezz@gmail.com' ||
            user.email === 'modamielmx@gmail.com' ||
            user.email === 'colab1modamielmx@gmail.com' ||
            user.email === 'colab2modamielmx@gmail.com' ||
            user.email === 'airproject360@gmail.com' ||
            existingUser?.role === 'superadmin' ||
            existingUser?.role === 'owner' ||
            existingUser?.role === 'admin' ||
            existingUser?.organization_id === mmOrgId

          if (!existingUser) {
            // Crear o vincular usuario directamente a Moda Miel MX
            await supabase.from('users').insert({
              id: user.id,
              name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Colaborador Moda Miel',
              email: user.email,
              role: isSuperAdmin ? 'admin' : 'employee',
              active: true,
              organization_id: mmOrgId,
              is_primary_admin: isSuperAdmin
            })
          } else if (existingUser.organization_id !== mmOrgId) {
            // Asegurar que quede vinculado a Moda Miel
            await supabase.from('users').update({ organization_id: mmOrgId }).eq('id', existingUser.id)
          }

          setStatus('¡Bienvenido a Moda Miel MX!')
          await logSuccessfulLogin(mmOrgId).catch(console.error)

          const fullUser = await supabaseService.getUserById(user.id) || existingUser
          if (fullUser) {
            useAppStore.getState().setCurrentUser(fullUser as any)
            useAppStore.getState().setAuthenticated(true)
          }

          // Ir directo al POS de Moda Miel
          navigate('/pos', { replace: true })
          return
        }

        // Flujo estándar para Reisbloc Store (no Moda Miel)
        if (existingUser?.organization_id) {
          setStatus('¡Organización encontrada!')
          await logSuccessfulLogin(existingUser.organization_id).catch(console.error)
          
          const fullUser = await supabaseService.getUserById(user.id)
          if (fullUser) {
            useAppStore.getState().setCurrentUser(fullUser)
            useAppStore.getState().setAuthenticated(true)
          }

          const adminRoles = ['admin', 'owner', 'superadmin', 'manager']
          const destination = (fullUser && !adminRoles.includes(fullUser.role)) ? '/pos' : '/admin'
          navigate(destination, { replace: true })
          return
        }

        // Si es una cuenta nueva fuera de Moda Miel, crear org
        setStatus('Configurando tu espacio...')
        const orgName = user.user_metadata?.full_name 
          ? `Negocio de ${user.user_metadata.full_name}` 
          : 'Mi Negocio'

        const { data: newOrg } = await supabase
          .from('organizations')
          .insert({ name: orgName, plan: 'free', active: true })
          .select('id')
          .single()

        const assignedOrgId = newOrg?.id || mmOrgId

        await supabase.from('users').insert({
          id: user.id,
          name: user.user_metadata?.full_name || user.email,
          email: user.email,
          role: 'admin',
          active: true,
          organization_id: assignedOrgId,
          is_primary_admin: true,
          is_primary_user: true
        })

        const fullUser = await supabaseService.getUserById(user.id)
        if (fullUser) {
          useAppStore.getState().setCurrentUser(fullUser)
          useAppStore.getState().setAuthenticated(true)
        }
        navigate('/pos', { replace: true })

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
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B0B0B] text-white p-4">
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