import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
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
import AccountMonitor from '@/pages/AccountMonitor'
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
import OfflineIndicator from '@/components/common/OfflineIndicator'
// import OAuthConsent from '@/pages/OAuthConsent'; // Legacy archive

// 🎨 Contenedor Principal con Layout Condicional
function AppLayout() {
  const { pathname } = useLocation()

  // No mostrar NavBar en el Storefront Público (B2C) o Invitación
  const hideNavBar = pathname.startsWith('/p/') || pathname === '/auth/callback' || pathname === '/accept-invite'

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

        {/* 🛒 Operación del POS */}
        <Route path="/pos" element={<POS />} />
        <Route path="/serve" element={<OrdersToServe />} />
        <Route path="/tables" element={<AccountMonitor />} />

        {/* ⚙️ Administración */}
        <Route path="/admin" element={<Admin />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/purchases" element={<Purchases />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/closing" element={<Closing />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/ecommerce" element={<Ecommerce />} />
        <Route path="/help" element={<Help />} />

        {/* 🚫 Manejo de errores */}
        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </>
  )
}

export default function App() {
  const { setCurrentUser, setAuthenticated } = useAppStore()

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
            const { data, error: setSessionError } = await supabase.auth.setSession({
              access_token: tokenData.accessToken,
              refresh_token: tokenData.accessToken
            })
            if (!setSessionError) session = data.session
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
              } catch (orgError) {
                console.warn('⚠️ No se pudo cargar la configuración de la organización:', orgError)
              }
            }
          }
        }
      } catch (globalError) {
        console.error('❌ Error crítico en restoreSession:', globalError)
      }
    }

    restoreSession()
  }, [setCurrentUser, setAuthenticated])

  return (
    <Router>
      <OfflineIndicator />
      <AppLayout />
    </Router>
  )
}