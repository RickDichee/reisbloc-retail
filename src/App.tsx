import { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { App as CapApp } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import { Loader2 } from 'lucide-react'
import NavBar from '@/components/layout/NavBar'
import { supabase, forceAuthHeader } from '@/config/supabase'
import { BRANDING, checkIsModaMiel } from '@/config/branding'
import { useAppStore } from '@/store/appStore'
import supabaseService from '@/services/supabaseService'
import { getStoredToken } from '@/services/jwtService'
import OfflineIndicator from '@/components/common/OfflineIndicator'
import { useTenantTheme, resetTenantTheme } from '@/hooks/useTenantTheme'

// 🚀 Code Splitting: Carga diferida de páginas para optimización de bundle
const LandingPage = lazy(() => import('@/pages/LandingPage'))
const Register = lazy(() => import('@/pages/Register'))
const Login = lazy(() => import('@/pages/Login'))
const POS = lazy(() => import('@/pages/POS'))
const Admin = lazy(() => import('@/pages/Admin'))
const Inventory = lazy(() => import('@/pages/Inventory'))
const Closing = lazy(() => import('@/pages/Closing'))
const Clients = lazy(() => import('@/pages/Clients'))
const Settings = lazy(() => import('@/pages/Settings'))
const Reports = lazy(() => import('@/pages/Reports'))
const Purchases = lazy(() => import('@/pages/Purchases'))
const NotFound = lazy(() => import('@/pages/NotFound'))
const AuthCallback = lazy(() => import('@/pages/AuthCallback').then(m => ({ default: m.AuthCallback })))
const Payment = lazy(() => import('@/pages/Payment'))
const AcceptInvite = lazy(() => import('@/pages/AcceptInvite'))
const StoreFront = lazy(() => import('@/pages/StoreFront'))
const Ecommerce = lazy(() => import('@/pages/Ecommerce'))
const Help = lazy(() => import('@/pages/Help'))
const Marketing = lazy(() => import('@/pages/Marketing'))
const Agent = lazy(() => import('@/pages/Agent'))
const Analytics = lazy(() => import('@/pages/Analytics'))
const PrivacyPolicy = lazy(() => import('@/pages/PrivacyPolicy'))
const TermsOfService = lazy(() => import('@/pages/TermsOfService'))
const ModaMielBrandPage = lazy(() => import('@/pages/ModaMielBrandPage'))
const Pricing = lazy(() => import('@/pages/Pricing'))
const Branches = lazy(() => import('@/pages/Branches'))
const Schedules = lazy(() => import('@/pages/Schedules'))
const Onboarding = lazy(() => import('@/pages/Onboarding'))
const Invoicing = lazy(() => import('@/pages/Invoicing'))
const Referral = lazy(() => import('@/pages/Referral'))
const WholesaleCatalog = lazy(() => import('@/pages/WholesaleCatalog'))
const WholesaleDashboard = lazy(() => import('@/pages/WholesaleDashboard'))

function PageLoader() {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-8">
      <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
      <p className="text-slate-400 font-mono text-xs tracking-wider uppercase">Cargando...</p>
    </div>
  )
}

// 🎨 Contenedor Principal con Layout Condicional
function AppLayout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { accessibility, currentUser, isAuthenticated, logout } = useAppStore()
  const { isModaMiel } = useTenantTheme() // 🎨 Inyección dinámica de tema y tipografía multi-tenant

  // 🔗 Escuchar Deep Links en Capacitor para OAuth Callback
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    const listenerPromise = CapApp.addListener('appUrlOpen', async (data) => {
      try {
        await Browser.close()
      } catch {}

      if (!data?.url) return

      try {
        const rawUrl = data.url
        // URL puede ser: com.reisbloclabs.pos://auth/callback#access_token=... o https://store.reisbloc.com/auth/callback#...
        if (rawUrl.includes('access_token')) {
          const hashIndex = rawUrl.indexOf('#')
          if (hashIndex !== -1) {
            const hashString = rawUrl.substring(hashIndex + 1)
            const params = new URLSearchParams(hashString)
            let accessToken = params.get('access_token')
            const refreshToken = params.get('refresh_token')
            if (accessToken) {
              accessToken = accessToken.trim()
              if (accessToken.startsWith('.')) {
                accessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' + accessToken
              }
              await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken || ''
              })
            }
          }
        } else if (rawUrl.includes('code=')) {
          const queryIndex = rawUrl.indexOf('?')
          if (queryIndex !== -1) {
            const queryString = rawUrl.substring(queryIndex + 1).split('#')[0]
            const params = new URLSearchParams(queryString)
            const code = params.get('code')
            if (code) {
              await supabase.auth.exchangeCodeForSession(code)
            }
          }
        }

        // Navegar a /auth/callback para que ejecute la sincronización de organización y perfiles
        navigate('/auth/callback', { replace: true })
      } catch (deepLinkErr) {
        console.error('Error procesando deep link en appUrlOpen:', deepLinkErr)
        navigate('/auth/callback', { replace: true })
      }
    })

    return () => {
      listenerPromise.then(handle => handle.remove()).catch(() => {})
    }
  }, [navigate])

  // Ocultar NavBar en landing, login, registro, invitaciones, legales y portada de tienda
  const isPublicPage = 
    pathname === '/' || 
    pathname === '/login' || 
    pathname === '/register' || 
    pathname === '/auth/callback' || 
    pathname === '/accept-invite' || 
    pathname === '/privacy' || 
    pathname === '/terms' || 
    pathname === '/modamielmx' || 
    pathname === '/modamielmxn' || 
    pathname.startsWith('/p/')
  const hideNavBar = isPublicPage


  // Aplicar clases de accesibilidad al body
  useEffect(() => {
    const root = document.documentElement
    if (accessibility.largeText) {
      root.classList.add('accessibility-large-text')
    } else {
      root.classList.remove('accessibility-large-text')
    }
    if (accessibility.highContrast) {
      root.classList.add('high-contrast')
    } else {
      root.classList.remove('high-contrast')
    }
  }, [accessibility.largeText, accessibility.highContrast])

  const isCapacitor = typeof (window as any).Capacitor !== 'undefined' || !!(window as any).Capacitor?.isNativePlatform?.()
  const adminRoles = ['admin', 'owner', 'superadmin', 'manager']
  const homeTarget = currentUser ? (adminRoles.includes(currentUser.role) ? '/admin' : '/pos') : '/login'

  return (
    <>
      {!hideNavBar && <NavBar />}
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* 🌐 Rutas Públicas */}
          <Route 
            path="/" 
            element={
              isCapacitor ? (
                <Navigate to={homeTarget} replace />
              ) : isModaMiel ? (
                <ModaMielBrandPage />
              ) : (
                <LandingPage />
              )
            } 
          />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/p/:slug" element={<StoreFront />} />
          <Route path="/accept-invite" element={<AcceptInvite />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/modamielmx" element={<ModaMielBrandPage />} />
          <Route path="/modamielmxn" element={<ModaMielBrandPage />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/payment" element={<Payment />} />
          <Route path="/upgrade" element={<Pricing />} />
          <Route path="/onboarding" element={<Onboarding />} />

          {/* 🛒 Operación del POS Retail */}
          <Route path="/pos" element={<POS />} />

          {/* ⚙️ Administración */}
          <Route path="/admin" element={<Admin />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/branches" element={<Branches />} />
          <Route path="/schedules" element={<Schedules />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/purchases" element={<Purchases />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/closing" element={<Closing />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/ecommerce" element={<Ecommerce />} />
          <Route path="/help" element={<Help />} />

          {/* 🤖 IA & Marketing */}
          <Route path="/marketing" element={<Marketing />} />
          <Route path="/wholesale" element={<WholesaleCatalog />} />
          <Route path="/wholesale-dashboard" element={<WholesaleDashboard />} />
          <Route path="/agent" element={<Agent />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/invoicing" element={<Invoicing />} />
          <Route path="/referral" element={<Referral />} />

          {/* 🚫 Manejo de errores */}
          <Route path="/404" element={<NotFound />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </Suspense>
    </>
  )
}

export default function App() {
  const { setCurrentUser, setAuthenticated, isInitializing, setInitializing } = useAppStore()

  useEffect(() => {
    // Actualizar título y favicon de forma dinámica según la marca/dominio activo
    document.title = BRANDING.appWithBrand

    const favicon = document.querySelector("link[rel*='icon']") as HTMLLinkElement
    if (favicon) {
      favicon.href = BRANDING.logoUrl
      favicon.type = BRANDING.logoUrl.endsWith('.svg') ? 'image/svg+xml' : 'image/jpeg'
    }

    const appleIcon = document.querySelector("link[rel*='apple-touch-icon']") as HTMLLinkElement
    if (appleIcon) {
      appleIcon.href = BRANDING.logoUrl
    }
  }, [])

  useEffect(() => {
    // 🛡️ Si el navegador llega con tokens de OAuth en cualquier ruta (ej. / o /#access_token=... o /?code=...),
    // redirigir de inmediato a /auth/callback para procesar la sesión y navegar al POS/Admin.
    if (typeof window !== 'undefined') {
      const isCallbackRoute = window.location.pathname.startsWith('/auth/callback')
      if (!isCallbackRoute) {
        if (window.location.hash && window.location.hash.includes('access_token')) {
          window.location.replace('/auth/callback' + window.location.search + window.location.hash)
          return
        }
        if (window.location.search && window.location.search.includes('code=')) {
          window.location.replace('/auth/callback' + window.location.search + window.location.hash)
          return
        }
      }
    }

    const restoreSession = async () => {
      // 🛡️ Si estamos en /auth/callback, dejar que AuthCallback maneje el handshake sin interferencia
      if (typeof window !== 'undefined' && window.location.pathname.startsWith('/auth/callback')) {
        setInitializing(false)
        return
      }

      const runRestore = async () => {
        try {
          const { data: { session: supabaseSession }, error: sessionError } = await supabase.auth.getSession()
          let session = supabaseSession

          if (sessionError) {
            console.error('❌ Error obteniendo sesión de Supabase:', sessionError)
          }

          if (!session) {
            const tokenData = getStoredToken()
            if (tokenData && tokenData.accessToken) {
              if (tokenData.refreshToken) {
                try {
                  const { data, error: setSessionError } = await supabase.auth.setSession({
                    access_token: tokenData.accessToken,
                    refresh_token: tokenData.refreshToken
                  })
                  if (!setSessionError && data?.session) {
                    session = data.session
                  }
                } catch (err) {
                  console.warn('Error restaurando sesión con refreshToken:', err)
                }
              }
              if (!session) {
                forceAuthHeader(tokenData.accessToken)
              }
            }
          }

          if (session?.user) {
            let user = await supabaseService.getUserById(session.user.id)

            // Fallback 1: Buscar por email si no se encontró por ID
            if (!user && session.user.email) {
              try {
                const { data: userByEmail } = await supabase
                  .from('users')
                  .select('*')
                  .ilike('email', session.user.email)
                  .maybeSingle()

                if (userByEmail) {
                  // Sincronizar auth_uid para futuros accesos directos
                  await supabase.from('users').update({ auth_uid: session.user.id }).eq('id', userByEmail.id).catch(console.error)
                  user = {
                    ...userByEmail,
                    username: userByEmail.name,
                    organizationId: userByEmail.organization_id
                  } as any
                }
              } catch (lookupErr) {
                console.warn('Error buscando usuario por email en restoreSession:', lookupErr)
              }
            }

            // Fallback 2: Sincronización atómica backend con handle_auth_callback_sync
            if (!user) {
              try {
                const isMM = checkIsModaMiel(window.location.hostname, window.location.search, window.location.hash)
                const { data: rpcData } = await supabase.rpc('handle_auth_callback_sync', {
                  p_auth_uid: session.user.id,
                  p_email: (session.user.email || '').toLowerCase().trim(),
                  p_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Usuario',
                  p_hostname: isMM ? 'modamiel' : window.location.hostname
                })
                if (rpcData?.success && rpcData?.user) {
                  user = {
                    ...rpcData.user,
                    username: rpcData.user.name,
                    organizationId: rpcData.user.organization_id || rpcData.user.organizationId,
                    pin: '',
                    active: rpcData.user.active ?? true,
                    createdAt: new Date()
                  } as any
                }
              } catch (rpcErr) {
                console.warn('Error en fallback handle_auth_callback_sync en restoreSession:', rpcErr)
              }
            }

            if (user) {
              setCurrentUser(user)
              setAuthenticated(true)
              if (user.organizationId) {
                localStorage.setItem('reisbloc_auth_token', JSON.stringify({
                  accessToken: session.access_token,
                  refreshToken: session.refresh_token || undefined,
                  userId: user.id,
                  organizationId: user.organizationId,
                  expiresAt: (session.expires_at || 0) * 1000
                }))
                localStorage.setItem('current_org_id', user.organizationId)

                // 🛡️ Pre-cargar configuración de la organización para el Layout
                try {
                  const org = await supabaseService.getOrganizationById(user.organizationId)
                  if (org && org.id === user.organizationId) {
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
                  // Cargar plan y plan_note al store global
                  if (org?.plan) {
                    useAppStore.getState().setOrgPlan(org.plan, org.settings?.plan_note ?? null)
                  }
                } catch (orgError) {
                  console.warn('⚠️ No se pudo cargar la configuración de la organización:', orgError)
                }
              }
            } else {
              // Resiliencia: si ya teníamos un usuario en el store que coincide, conservarlo
              const persistedUser = useAppStore.getState().currentUser
              if (persistedUser && (persistedUser.email === session.user.email || persistedUser.id === session.user.id)) {
                setAuthenticated(true)
              } else {
                // Usuario sin registro en public.users
                useAppStore.getState().logout()
                resetTenantTheme()
              }
            }
          } else {
            // Si no hay sesión activa en Supabase pero tenemos un usuario persistido localmente y token válido (offline mode)
            const tokenData = getStoredToken()
            const currentStoreUser = useAppStore.getState().currentUser
            if (currentStoreUser && tokenData && (!tokenData.expiresAt || tokenData.expiresAt > Date.now())) {
              setAuthenticated(true)
            } else {
              // 🛡️ AISLAMIENTO: Sin sesión activa ni token válido -> purgar
              useAppStore.getState().logout()
              resetTenantTheme()
            }
          }
        } catch (globalError) {
          console.error('❌ Error crítico en restoreSession:', globalError)
        }
      }

      const timeoutPromise = new Promise<void>((resolve) => setTimeout(resolve, 3500))
      try {
        await Promise.race([runRestore(), timeoutPromise])
      } finally {
        setInitializing(false)
      }
    }

    restoreSession()

    // 🛡️ Sincronización reactiva del estado de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        useAppStore.getState().logout()
        resetTenantTheme()
      } else if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
        const currentStoredUser = useAppStore.getState().currentUser
        if (!currentStoredUser || currentStoredUser.id !== session.user.id) {
          await restoreSession()
        }
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [setCurrentUser, setAuthenticated, setInitializing])

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
        <p className="text-white font-mono text-sm tracking-widest uppercase">Inicializando Sesión...</p>
      </div>
    )
  }

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <OfflineIndicator />
      <AppLayout />
    </Router>
  )
}