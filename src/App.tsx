import { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import NavBar from '@/components/layout/NavBar'
import { supabase, forceAuthHeader } from '@/config/supabase'
import { BRANDING, checkIsModaMiel } from '@/config/branding'
import { useAppStore } from '@/store/appStore'
import supabaseService from '@/services/supabaseService'
import { getStoredToken } from '@/services/jwtService'
import OfflineIndicator from '@/components/common/OfflineIndicator'
import { useTenantTheme } from '@/hooks/useTenantTheme'

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
  const { accessibility, currentUser, isAuthenticated, logout } = useAppStore()
  const { isModaMiel } = useTenantTheme() // 🎨 Inyección dinámica de tema y tipografía multi-tenant

  // 🛡️ SEGURIDAD EN TIEMPO DE EJECUCIÓN MULTI-TENANT:
  // Si la sesión activa pertenece a otra empresa (Org B) y el usuario intenta navegar en el dominio de Moda Miel MX,
  // se cierra la sesión inmediatamente y se le redirige al login con la advertencia correspondiente.
  useEffect(() => {
    const enforceTenantIsolation = async () => {
      if (!isAuthenticated || !currentUser) return

      const isDomainMM = checkIsModaMiel(
        window.location.hostname,
        window.location.search,
        window.location.hash
      )

      if (isDomainMM) {
        const mmOrg = await supabaseService.getOrganizationBySlug('modamiel')
        const mmOrgId = mmOrg?.id

        const isUserMM = 
          (mmOrgId && currentUser.organizationId === mmOrgId) ||
          checkIsModaMiel('', '', '', currentUser.organizationId) ||
          checkIsModaMiel('', '', '', (currentUser as any).businessName)

        if (!isUserMM) {
          console.warn('⛔ [Tenant Isolation] Usuario de otra empresa detectado en el subdominio de Moda Miel MX. Denegando acceso.')
          await supabase.auth.signOut()
          localStorage.removeItem('reisbloc_auth_token')
          logout()
          window.location.href = '/login?brand=modamiel&error=unauthorized_collaborator'
        }
      }
    }

    enforceTenantIsolation()
  }, [pathname, isAuthenticated, currentUser, logout])

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

  return (
    <>
      {!hideNavBar && <NavBar />}
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* 🌐 Rutas Públicas */}
          <Route path="/" element={isModaMiel ? <ModaMielBrandPage /> : <LandingPage />} />
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
    const restoreSession = async () => {
      try {
        const { data: { session: supabaseSession }, error: sessionError } = await supabase.auth.getSession()
        let session = supabaseSession

        if (sessionError) {
          console.error('❌ Error obteniendo sesión de Supabase:', sessionError)
        }

        if (!session) {
          const tokenData = getStoredToken()
          if (tokenData && tokenData.accessToken) {
            // Restaurar sesión sin refresh_token (no disponible en JWT local).
            // Usar solo access_token para autenticar requests inmediatos.
            // El refresh se manejará cuando Supabase lo necesite vía su propio flujo.
            const { data, error: setSessionError } = await supabase.auth.setSession({
              access_token: tokenData.accessToken,
              refresh_token: tokenData.accessToken
            })
            if (setSessionError) {
              // Si falla setSession, forzar header manualmente
              forceAuthHeader(tokenData.accessToken)
            } else {
              session = data.session
            }
          }
        }

        if (session?.user) {
          const user = await supabaseService.getUserById(session.user.id)
          if (user) {
            setCurrentUser(user)
            setAuthenticated(true)
            if (user.organizationId) {
              localStorage.setItem('reisbloc_auth_token', JSON.stringify({
                accessToken: session.access_token,
                userId: user.id,
                organizationId: user.organizationId,
                expiresAt: (session.expires_at || 0) * 1000
              }))

              // 🛡️ Pre-cargar configuración de la organización para el Layout
              try {
                const org = await supabaseService.getOrganizationById(user.organizationId)
                if (org?.settings) {
                  useAppStore.getState().setOrganizationSettings(org.settings)
                }
                // Cargar plan y plan_note al store global
                if (org?.plan) {
                  useAppStore.getState().setOrgPlan(org.plan, org.plan_note ?? null)
                }
              } catch (orgError) {
                console.warn('⚠️ No se pudo cargar la configuración de la organización:', orgError)
              }
            }
          }
        }
      } catch (globalError) {
        console.error('❌ Error crítico en restoreSession:', globalError)
      } finally {
        setInitializing(false)
      }
    }

    restoreSession()
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