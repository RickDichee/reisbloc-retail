import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/config/supabase'
import { logSuccessfulLogin } from '@/services/authService'
import { ShieldCheck } from 'lucide-react'
import { checkIsModaMiel } from '@/config/branding'
import supabaseService from '@/services/supabaseService'
import { useAppStore } from '@/store/appStore'

const LOADING_TIPS = [
  "Verificando identidad...",
  "Preparando tu cuenta...",
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
        setStatus('Iniciando sesión...')

        let session: any = null

        // 1. Extraer tokens si vienen en el hash del URL (#access_token=...&refresh_token=...)
        if (window.location.hash && window.location.hash.includes('access_token')) {
          try {
            const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
            const accessToken = hashParams.get('access_token')
            const refreshToken = hashParams.get('refresh_token')
            if (accessToken) {
              const { data, error: setErr } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken || ''
              })
              if (!setErr && data?.session) {
                session = data.session
              }
            }
          } catch (hashErr) {
            console.warn('Error parsing hash tokens:', hashErr)
          }
        }

        // 2. Extraer código si viene en el search (?code=...)
        if (!session && window.location.search && window.location.search.includes('code=')) {
          try {
            const searchParams = new URLSearchParams(window.location.search)
            const code = searchParams.get('code')
            if (code) {
              const { data, error: codeErr } = await supabase.auth.exchangeCodeForSession(code)
              if (!codeErr && data?.session) {
                session = data.session
              }
            }
          } catch (codeErr) {
            console.warn('Error exchanging code:', codeErr)
          }
        }

        // 3. Consultar sesión actual en Supabase
        if (!session) {
          const { data, error: sessionError } = await supabase.auth.getSession()
          if (!sessionError && data?.session?.user) {
            session = data.session
          }
        }

        // 4. Fallback reactivo con onAuthStateChange (espera máx 3 segundos)
        if (!session) {
          session = await new Promise<any>((resolve) => {
            const timer = setTimeout(() => {
              subscription?.unsubscribe()
              resolve(null)
            }, 3000)
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
          console.error('Error en callback: No se detectó ninguna sesión activa')
          navigate('/login?error=auth_failed', { replace: true })
          return
        }

        const user = session.user
        setStatus('Verificando organización y permisos...')

        if (session.access_token) {
          window.localStorage.setItem('sb-access-token', session.access_token)
        }

        // Buscar al colaborador por id, auth_uid o email
        let { data: existingUser, error: userQueryError } = await supabase
          .from('users')
          .select('id, organization_id, role, email, auth_uid, name')
          .or(`id.eq.${user.id},auth_uid.eq.${user.id},email.ilike.${user.email}`)
          .maybeSingle()

        if (userQueryError) {
          console.warn('Advertencia consultando tabla users:', userQueryError)
        }

        const userEmail = (user.email || '').toLowerCase().trim()
        const isLu = userEmail.includes('lu.velazquez') || userEmail.includes('lu.velazquezz')
        const isRick = userEmail === 'rick.playacar@gmail.com' || userEmail === 'airproject360@gmail.com'
        const hostname = (window.location.hostname || '').toLowerCase()
        const isActualMMDomain = hostname.includes('modamiel') || hostname.includes('moda-miel') || checkIsModaMiel()
        const mmDefaultOrgId = '1b498fa6-aca5-428c-9bdd-01e6fea30316'

        // 🛡️ Si el usuario pertenece a Moda Miel MX (Lu, Rick o ingresó por dominio Moda Miel)
        if (isActualMMDomain || isLu || isRick) {
          if (!existingUser) {
            console.log('✨ Vinculando perfil de Moda Miel MX para:', user.email)
            const roleToAssign = (isLu || isRick) ? 'admin' : 'cashier'
            const { data: newUser, error: createErr } = await supabase
              .from('users')
              .upsert({
                id: user.id,
                auth_uid: user.id,
                email: user.email,
                name: user.user_metadata?.full_name || (isLu ? 'Lu Velázquez' : (user.email?.split('@')[0] || 'Usuario')),
                role: roleToAssign,
                organization_id: mmDefaultOrgId,
                active: true,
                is_primary_admin: (isLu || isRick),
                is_primary_user: (isLu || isRick)
              }, { onConflict: 'id' })
              .select('id, organization_id, role, email, auth_uid, name')
              .maybeSingle()

            if (newUser) {
              existingUser = newUser
            } else {
              if (createErr) console.warn('Advertencia creando perfil inicial:', createErr)
              existingUser = {
                id: user.id,
                auth_uid: user.id,
                email: user.email,
                name: user.user_metadata?.full_name || (isLu ? 'Lu Velázquez' : 'Usuario'),
                role: roleToAssign,
                organization_id: mmDefaultOrgId,
                active: true
              } as any
            }
          } else if (isLu || isRick) {
            // Asegurar que Lu y Rick tengan rol admin y organización Moda Miel asignada
            if (existingUser.organization_id !== mmDefaultOrgId || existingUser.role !== 'admin') {
              existingUser.organization_id = mmDefaultOrgId
              existingUser.role = 'admin'
              await supabase
                .from('users')
                .update({ organization_id: mmDefaultOrgId, role: 'admin', auth_uid: user.id, email: user.email })
                .eq('id', existingUser.id)
                .catch(console.error)
            }
          }
        }

        // Si el usuario ya existe en la base de datos
        if (existingUser?.organization_id) {
          // Enlazar auth_uid si no está asignado o es diferente
          if (existingUser.auth_uid !== user.id) {
            await supabase
              .from('users')
              .update({ auth_uid: user.id })
              .eq('id', existingUser.id)
              .catch(console.error)
          }

          setStatus('¡Organización encontrada!')
          await logSuccessfulLogin(existingUser.organization_id).catch(console.error)

          // Cargar datos completos del usuario
          const fullUser = await supabaseService.getUserById(existingUser.id) || await supabaseService.getUserById(user.id)
          const finalUser: any = fullUser || {
            id: existingUser.id,
            username: existingUser.name || user.email?.split('@')[0] || 'Usuario',
            name: existingUser.name || user.email?.split('@')[0] || 'Usuario',
            email: existingUser.email || user.email,
            role: existingUser.role || 'admin',
            organizationId: existingUser.organization_id,
            active: true,
            createdAt: new Date().toISOString()
          }
          useAppStore.getState().setCurrentUser(finalUser)
          useAppStore.getState().setAuthenticated(true)

          // Guardar tokens de autenticación para servicios y persistencia
          localStorage.setItem('reisbloc_auth_token', JSON.stringify({
            accessToken: session.access_token,
            refreshToken: session.refresh_token || undefined,
            userId: existingUser.id,
            organizationId: existingUser.organization_id,
            expiresAt: (session.expires_at || 0) * 1000
          }))
          localStorage.setItem('current_org_id', existingUser.organization_id)

          // Pre-cargar configuración de organización
          try {
            const org = await supabaseService.getOrganizationById(existingUser.organization_id)
            if (org) {
              const mergedSettings = {
                ...(org.settings || {}),
                id: org.id,
                name: org.name,
                businessName: org.settings?.businessName || org.name,
                slug: org.slug,
                logoUrl: org.logo_url
              }
              useAppStore.getState().setOrganizationSettings(mergedSettings)
            }
          } catch (e) {
            console.warn('No se pudieron cargar settings de la org:', e)
          }

          const adminRoles = ['admin', 'owner', 'superadmin', 'manager']
          const destination = (fullUser && !adminRoles.includes(fullUser.role)) ? '/pos' : '/admin'
          navigate(destination, { replace: true })
          return
        }

        // Si NO existe usuario y NO estamos en dominio de Moda Miel (registro de nuevo tenant SaaS)
        setStatus('Creando organización...')
        
        const orgName = user.user_metadata?.full_name 
          ? `Negocio de ${user.user_metadata.full_name}` 
          : 'Mi Negocio'

        const { data: newOrg, error: orgError } = await supabase
          .from('organizations')
          .insert({
            name: orgName,
            plan: 'free',
            active: true
          })
          .select('id')
          .single()

        const orgIdToUse = newOrg?.id
        if (orgError || !orgIdToUse) {
          console.error('Error creando org:', orgError)
          const { data: existingOrg } = await supabase
            .from('organizations')
            .select('id')
            .limit(1)
            .single()
          
          if (existingOrg) {
            await supabase.from('users').insert({
              id: user.id,
              name: user.user_metadata?.full_name || user.email,
              role: 'admin',
              active: true,
              organization_id: existingOrg.id,
              is_primary_admin: true,
              is_primary_user: true,
              auth_uid: user.id
            })
            const fullUser = await supabaseService.getUserById(user.id)
            if (fullUser) {
              useAppStore.getState().setCurrentUser(fullUser)
              useAppStore.getState().setAuthenticated(true)
            }
            navigate('/admin', { replace: true })
            return
          }
        }

        if (orgIdToUse) {
          await supabase.from('users').insert({
            id: user.id,
            name: user.user_metadata?.full_name || user.email,
            role: 'admin',
            active: true,
            organization_id: orgIdToUse,
            is_primary_admin: true,
            is_primary_user: true,
            auth_uid: user.id
          })
        }

        setStatus('¡Listo!')
        if (orgIdToUse) {
          await logSuccessfulLogin(orgIdToUse).catch(console.error)
        }
        const fullUser = await supabaseService.getUserById(user.id)
        if (fullUser) {
          useAppStore.getState().setCurrentUser(fullUser)
          useAppStore.getState().setAuthenticated(true)
        }
        navigate('/admin', { replace: true })

      } catch (err: any) {
        console.error('Auth callback error:', err)
        setError(err.message || 'Error al iniciar sesión')
        setTimeout(() => navigate('/login?error=auth_failed', { replace: true }), 2500)
      }
    }

    handleAuthCallback()
  }, [navigate])

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B0B0B] text-white p-4">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-xl font-bold text-red-400 mb-2">Error de Autenticación</h2>
          <p className="text-gray-400">{error}</p>
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
          <h2 className="text-2xl font-bold text-white">¡Bienvenido!</h2>
          <p className="text-gray-400 animate-pulse font-mono text-sm">
            {status || LOADING_TIPS[tipIndex]}
          </p>
        </div>
      </div>
    </div>
  )
}