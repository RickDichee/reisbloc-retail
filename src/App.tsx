import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import NavBar from '@/components/layout/NavBar'
import { supabase } from '@/config/supabase'
import { useAppStore } from '@/store/appStore'
import supabaseService from '@/services/supabaseService'
import { getStoredToken } from '@/services/jwtService'
import LandingPage from '@/pages/LandingPage'
import Register from '@/pages/Register'
import Login from '@/pages/Login'
import POS from '@/pages/POS'
import Admin from '@/pages/Admin'
import Inventory from '@/pages/Inventory'
import OrdersToServe from '@/pages/OrdersToServe'
import Closing from '@/pages/Closing'
import Clients from '@/pages/Clients'
import Settings from '@/pages/Settings'
import Reports from '@/pages/Reports'
import Purchases from '@/pages/Purchases'
import NotFound from '@/pages/NotFound'
import { AuthCallback } from '@/pages/AuthCallback'
import AcceptInvite from '@/pages/AcceptInvite'
import StoreFront from '@/pages/StoreFront'
import Ecommerce from '@/pages/Ecommerce'
import Help from '@/pages/Help'
import Marketing from '@/pages/Marketing'
import Agent from '@/pages/Agent'
import Analytics from '@/pages/Analytics'
import Dashboard from '@/pages/Dashboard'
import Kitchen from '@/pages/Kitchen'
import Bar from '@/pages/Bar'
import OfflineIndicator from '@/components/common/OfflineIndicator'
import PrivacyPolicy from '@/pages/PrivacyPolicy'
import TermsOfService from '@/pages/TermsOfService'
import Pricing from '@/pages/Pricing'
import Branches from '@/pages/Branches'
import Schedules from '@/pages/Schedules'
import Onboarding from '@/pages/Onboarding'
import Invoicing from '@/pages/Invoicing'
import Referral from '@/pages/Referral'
// import OAuthConsent from '@/pages/OAuthConsent'; // Legacy archive

// 🎨 Contenedor Principal con Layout Condicional
function AppLayout() {
  const { pathname } = useLocation()
  const { accessibility } = useAppStore()

  // Ocultar NavBar solo en: público, invitaciones, legales
  const isPublicPage = pathname.startsWith('/p/') || pathname === '/auth/callback' || pathname === '/accept-invite' || pathname === '/privacy' || pathname === '/terms'
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
      <Routes>
        {/* 🌐 Rutas Públicas */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/p/:slug" element={<StoreFront />} />
        <Route path="/accept-invite" element={<AcceptInvite />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/upgrade" element={<Pricing />} />
        <Route path="/onboarding" element={<Onboarding />} />

        {/* 🛒 Operación del POS */}
        <Route path="/pos" element={<POS />} />
        <Route path="/serve" element={<OrdersToServe />} />
        <Route path="/kitchen" element={<Kitchen />} />
        <Route path="/bar" element={<Bar />} />

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
        <Route path="/agent" element={<Agent />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/invoicing" element={<Invoicing />} />
        <Route path="/referral" element={<Referral />} />

        {/* 🚫 Manejo de errores */}
        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </>
  )
}

export default function App() {
  const { setCurrentUser, setAuthenticated, isInitializing, setInitializing } = useAppStore()

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
              const { forceAuthHeader } = await import('@/config/supabase')
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
    <Router>
      <OfflineIndicator />
      <AppLayout />
    </Router>
  )
}