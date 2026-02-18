import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
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
import Kitchen from '@/pages/Kitchen'
import Bar from '@/pages/Bar'
import TableMonitor from '@/pages/TableMonitor'
import OrdersToServe from '@/pages/OrdersToServe'
import Closing from '@/pages/Closing'
import Clients from '@/pages/Clients'
import Reports from '@/pages/Reports'
import NotFound from '@/pages/NotFound'
import { AuthCallback } from '@/pages/AuthCallback'
import KitchenDashboard from '@/pages/KitchenDashboard'
// import OAuthConsent from '@/pages/OAuthConsent'; // Legacy archive


export default function App() {
  const { setCurrentUser, setAuthenticated } = useAppStore()

  useEffect(() => {
    // 🔄 Recuperación de Sesión: Si el usuario recarga o viene de OAuth
    const restoreSession = async () => {
      try {
        let { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) {
          console.error('❌ Error obteniendo sesión de Supabase:', sessionError)
        }

        // Si no hay sesión activa en Supabase, intentar recuperar desde localStorage (Legacy fallback)
        if (!session) {
          const tokenData = getStoredToken()
          if (tokenData && tokenData.accessToken) {
            console.log('🔄 Intentando restaurar sesión desde token local...')
            const { data, error: setSessionError } = await supabase.auth.setSession({
              access_token: tokenData.accessToken,
              refresh_token: tokenData.accessToken
            })

            if (setSessionError) {
              console.warn('⚠️ No se pudo restaurar sesión desde token local:', setSessionError)
            } else {
              session = data.session
            }
          }
        }

        if (session?.user) {
          console.log('🔄 Restaurando datos de perfil para:', session.user.email)
          try {
            const user = await supabaseService.getUserById(session.user.id)
            if (user) {
              setCurrentUser(user)
              setAuthenticated(true)

              // 💉 Inyectar token legacy para compatibilidad con servicios antiguos
              if (user.organizationId) {
                const legacyToken = {
                  accessToken: session.access_token,
                  userId: user.id,
                  userRole: user.role,
                  username: user.username,
                  organizationId: user.organizationId,
                  expiresAt: (session.expires_at || 0) * 1000
                }
                localStorage.setItem('reisbloc_auth_token', JSON.stringify(legacyToken))
              }
            } else {
              console.warn('⚠️ Sesión activa pero no se encontró perfil de usuario en la DB')
            }
          } catch (error) {
            console.error('❌ Error restaurando perfil de usuario:', error)
          }
        }
      } catch (globalError) {
        console.error('❌ Error crítico en restoreSession:', globalError)
      }
    }

    restoreSession()
  }, [])

  return (
    <Router>
      <NavBar />
      <Routes>
        {/* 🌐 Rutas Públicas: Aquí es donde empieza la magia SaaS */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* 🛒 Operación del POS (Protegidas por lógica de sesión en cada componente) */}
        <Route path="/pos" element={<POS />} />
        <Route path="/kitchen" element={<Kitchen />} />
        <Route path="/bar" element={<Bar />} />
        <Route path="/kitchen-dashboard" element={<KitchenDashboard />} />
        <Route path="/serve" element={<OrdersToServe />} />
        <Route path="/tables" element={<TableMonitor />} />

        {/* ⚙️ Administración y Backoffice */}
        <Route path="/admin" element={<Admin />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/closing" element={<Closing />} />
        <Route path="/clients" element={<Clients />} />
        {/* <Route path="/oauth-consent" element={<OAuthConsent />} /> */}

        {/* 🚫 Manejo de errores */}
        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </Router>
  )
}