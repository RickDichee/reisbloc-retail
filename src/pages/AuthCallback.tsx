import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/config/supabase'
import { logSuccessfulLogin } from '@/services/authService'
import { ShieldCheck, AlertCircle } from 'lucide-react'
import { checkIsModaMiel } from '@/config/branding'
import supabaseService from '@/services/supabaseService'
import { useAppStore } from '@/store/appStore'
import { User } from '@/types'

const LOADING_TIPS = [
  "Verificando identidad con Google...",
  "Preparando tu organización y permisos...",
  "Sincronizando punto de venta...",
  "Casi listo...",
]

export function AuthCallback() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tipIndex, setTipIndex] = useState(0)
  const executedRef = useRef(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % LOADING_TIPS.length)
    }, 1500)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (executedRef.current) return
    executedRef.current = true

    const handleAuthCallback = async () => {
      try {
        setStatus('Validando respuesta de autenticación...')

        // 0. Detectar posibles errores devueltos por el proveedor de OAuth (Google/Supabase)
        const searchParams = new URLSearchParams(window.location.search)
        const hashClean = window.location.hash.replace(/^#/, '')
        const hashParams = new URLSearchParams(hashClean)

        const oauthError = 
          searchParams.get('error_description') || 
          searchParams.get('error') || 
          hashParams.get('error_description') || 
          hashParams.get('error')

        if (oauthError) {
          console.error('❌ Error devuelto en callback OAuth:', oauthError)
          setError(`Error de autenticación: ${oauthError}`)
          setTimeout(() => navigate('/login?error=auth_failed', { replace: true }), 3500)
          return
        }

        let session: any = null

        // 1. Consultar getSession() primero (Supabase con detectSessionInUrl puede haber procesado el código automáticamente)
        try {
          const { data: sessionData, error: sessionErr } = await supabase.auth.getSession()
          if (!sessionErr && sessionData?.session?.user) {
            session = sessionData.session
          }
        } catch (sessEx) {
          console.warn('Aviso en getSession inicial:', sessEx)
        }

        // 2. Extraer tokens si vienen en el hash (#access_token=...&refresh_token=...)
        if (!session && window.location.hash.includes('access_token')) {
          try {
            let accessToken = hashParams.get('access_token')
            const refreshToken = hashParams.get('refresh_token')
            if (accessToken) {
              accessToken = accessToken.trim()
              if (accessToken.startsWith('.')) {
                accessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' + accessToken
              }
              const { data, error: setErr } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken || ''
              })
              if (!setErr && data?.session) {
                session = data.session
              }
            }
          } catch (hashErr) {
            console.warn('Error estableciendo sesión desde hash:', hashErr)
          }
        }

        // 3. Intercambiar código PKCE (?code=...) si aún no hay sesión
        if (!session && searchParams.get('code')) {
          const code = searchParams.get('code')!
          try {
            const { data, error: codeErr } = await supabase.auth.exchangeCodeForSession(code)
            if (!codeErr && data?.session) {
              session = data.session
            } else {
              // Si exchangeCodeForSession falló porque el listener detectSessionInUrl lo consumió concurrentemente
              const { data: retryData } = await supabase.auth.getSession()
              if (retryData?.session?.user) {
                session = retryData.session
              }
            }
          } catch (codeErr) {
            console.warn('Error en exchangeCodeForSession:', codeErr)
            const { data: retryData } = await supabase.auth.getSession()
            if (retryData?.session?.user) {
              session = retryData.session
            }
          }
        }

        // 4. Fallback reactivo con onAuthStateChange (espera hasta 3.5 segundos)
        if (!session) {
          session = await new Promise<any>((resolve) => {
            const timer = setTimeout(() => {
              subscription?.unsubscribe()
              resolve(null)
            }, 3500)
            const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
              if (newSession?.user) {
                clearTimeout(timer)
                subscription?.unsubscribe()
                resolve(newSession)
              }
            })
          })
        }

        if (!session?.user) {
          console.error('❌ Error en callback: No se detectó ninguna sesión activa')
          setError('No se pudo establecer la sesión con el servidor. Redirigiendo...')
          setTimeout(() => navigate('/login?error=auth_failed', { replace: true }), 2500)
          return
        }

        const user = session.user
        setStatus('Sincronizando cuenta y permisos...')

        if (session.access_token) {
          window.localStorage.setItem('sb-access-token', session.access_token)
        }

        const userEmail = (user.email || '').toLowerCase().trim()
        const userName = user.user_metadata?.full_name || user.user_metadata?.name || userEmail.split('@')[0] || 'Usuario'
        const isMM = checkIsModaMiel(window.location.hostname, window.location.search, window.location.hash)
        const hostnameToPass = isMM ? 'modamiel' : window.location.hostname

        // 5. Sincronización atómica backend con handle_auth_callback_sync (RPC SECURITY DEFINER)
        let syncedUser: any = null
        let syncedOrg: any = null

        try {
          const { data: rpcData, error: rpcError } = await supabase.rpc('handle_auth_callback_sync', {
            p_auth_uid: user.id,
            p_email: userEmail,
            p_name: userName,
            p_hostname: hostnameToPass
          })

          if (rpcError) {
            console.warn('⚠️ Advertencia en handle_auth_callback_sync RPC:', rpcError)
          } else if (rpcData?.success) {
            syncedUser = rpcData.user
            syncedOrg = rpcData.organization
          }
        } catch (rpcEx) {
          console.warn('⚠️ Excepción llamando handle_auth_callback_sync:', rpcEx)
        }

        // 6. Resiliencia y Fallback: Si el RPC fallara por conectividad, buscar directamente en BD
        if (!syncedUser) {
          console.log('🔄 Ejecutando fallback de sincronización directa...')
          let { data: existingUser } = await supabase
            .from('users')
            .select('id, organization_id, role, email, auth_uid, name')
            .or(`id.eq.${user.id},auth_uid.eq.${user.id},email.ilike.${userEmail}`)
            .maybeSingle()

          const mmDefaultOrgId = '1b498fa6-aca5-428c-9bdd-01e6fea30316'
          const isLu = userEmail.includes('lu.velazquez') || userEmail.includes('lu.velazquezz')
          const isRick = userEmail === 'rick.playacar@gmail.com' || userEmail === 'airproject360@gmail.com'

          if (isMM || isLu || isRick) {
            const roleToAssign = (isLu || isRick) ? 'admin' : 'cashier'
            if (!existingUser) {
              const { data: newUser } = await supabase
                .from('users')
                .upsert({
                  id: user.id,
                  auth_uid: user.id,
                  email: userEmail,
                  name: userName,
                  role: roleToAssign,
                  organization_id: mmDefaultOrgId,
                  active: true,
                  is_primary_admin: (isLu || isRick),
                  is_primary_user: (isLu || isRick)
                }, { onConflict: 'id' })
                .select('id, organization_id, role, email, auth_uid, name')
                .maybeSingle()
              
              existingUser = newUser || {
                id: user.id,
                auth_uid: user.id,
                email: userEmail,
                name: userName,
                role: roleToAssign,
                organization_id: mmDefaultOrgId,
                active: true
              }
            }
          }

          if (existingUser) {
            syncedUser = {
              id: existingUser.id,
              name: existingUser.name,
              username: existingUser.name,
              email: existingUser.email,
              role: existingUser.role,
              organizationId: existingUser.organization_id,
              organization_id: existingUser.organization_id,
              active: true
            }
            try {
              const org = await supabaseService.getOrganizationById(existingUser.organization_id)
              if (org) syncedOrg = org
            } catch (e) {
              console.warn('Error obteniendo organización en fallback:', e)
            }
          }
        }

        if (!syncedUser) {
          throw new Error('No se pudo vincular ni crear el perfil de usuario.')
        }

        const orgId = syncedUser.organization_id || syncedUser.organizationId
        const finalUser: User = {
          id: syncedUser.id,
          username: syncedUser.username || syncedUser.name || userName,
          name: syncedUser.name || userName,
          email: syncedUser.email || userEmail,
          role: (syncedUser.role || 'cashier') as any,
          organizationId: orgId,
          pin: '',
          active: syncedUser.active ?? true,
          createdAt: new Date()
        }

        // 7. Persistir en Zustand y LocalStorage
        useAppStore.getState().setCurrentUser(finalUser)
        useAppStore.getState().setAuthenticated(true)

        localStorage.setItem('reisbloc_auth_token', JSON.stringify({
          accessToken: session.access_token,
          refreshToken: session.refresh_token || undefined,
          userId: finalUser.id,
          organizationId: orgId,
          expiresAt: (session.expires_at || 0) * 1000
        }))

        if (orgId) {
          localStorage.setItem('current_org_id', orgId)
          await logSuccessfulLogin(orgId).catch(console.error)
        }

        if (syncedOrg) {
          const mergedSettings = {
            ...(syncedOrg.settings || {}),
            id: syncedOrg.id,
            name: syncedOrg.name,
            businessName: syncedOrg.settings?.businessName || syncedOrg.name,
            slug: syncedOrg.slug,
            logoUrl: syncedOrg.logo_url
          }
          useAppStore.getState().setOrganizationSettings(mergedSettings)
          if (syncedOrg.plan) {
            useAppStore.getState().setOrgPlan(syncedOrg.plan, syncedOrg.settings?.plan_note ?? null)
          }
        }

        setStatus('¡Sesión autorizada! Redirigiendo...')
        const adminRoles = ['admin', 'owner', 'superadmin', 'manager', 'capitan', 'supervisor']
        const destination = adminRoles.includes((finalUser.role || '').toLowerCase()) ? '/admin' : '/pos'
        navigate(destination, { replace: true })

      } catch (err: any) {
        console.error('❌ Auth callback error:', err)
        setError(err.message || 'Error al iniciar sesión')
        setTimeout(() => navigate('/login?error=auth_failed', { replace: true }), 3000)
      }
    }

    handleAuthCallback()
  }, [navigate])

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B0B0B] text-white p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4 border border-red-500/30">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-red-400 mb-2">Error de Autenticación</h2>
          <p className="text-gray-400 text-sm mb-4">{error}</p>
          <p className="text-xs text-gray-500 font-mono">Redirigiendo a la pantalla de acceso...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B0B0B] text-white p-4">
      <div className="flex flex-col items-center gap-6 max-w-md text-center">
        <div className="relative">
          <div className="absolute inset-0 bg-emerald-500 blur-xl opacity-20 rounded-full animate-pulse"></div>
          <ShieldCheck className="w-16 h-16 text-emerald-400 animate-bounce relative z-10" />
        </div>

        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-white">¡Bienvenido a Reisbloc!</h2>
          <p className="text-gray-400 animate-pulse font-mono text-sm">
            {status || LOADING_TIPS[tipIndex]}
          </p>
        </div>
      </div>
    </div>
  )
}