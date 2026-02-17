import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/usePermissions'
import { useNotifications } from '@/hooks/useNotifications'
import NotificationCenter from '@/components/common/NotificationCenter'
import {
  ShoppingCart,
  BarChart3,
  ShieldCheck,
  LogOut,
  User,
  Eye,
  DollarSign,
  Package,
  Maximize,
  Minimize,
  ShoppingBag,
  LifeBuoy,
  Users
} from 'lucide-react'

export default function NavBar() {
  const location = useLocation()
  const { currentUser } = useAppStore()
  const { logout } = useAuth()
  const { isReadOnly, currentRole } = usePermissions()
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [supportsFullscreen, setSupportsFullscreen] = useState(true)
  
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead
  } = useNotifications(currentUser?.id || null)

  // Verificar soporte al montar el componente
  useEffect(() => {
    setSupportsFullscreen(!!document.documentElement.requestFullscreen)
  }, [])

  // Lógica de Pantalla Completa (Ideal para tablets y TVs de cocina)
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((e) => {
        console.error(`Error al activar pantalla completa: ${e.message}`)
      })
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
    }
  }

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => document.removeEventListener('fullscreenchange', handleFsChange)
  }, [])

  // El return condicional debe ir DESPUÉS de todos los hooks
  if (location.pathname === '/login' || !currentUser) {
    return null
  }

  const handleLogout = async () => {
    if (confirm('¿Seguro que deseas cerrar sesión?')) {
      await logout()
    }
  }

  const navItems = [
    { path: '/pos', label: 'Ventas', icon: ShoppingCart, roles: ['admin', 'manager', 'capitan', 'bar', 'mesero', 'cocina', 'supervisor'] },
    { path: '/inventory', label: 'Inventario', icon: Package, roles: ['admin', 'manager'] },
    { path: '/reports', label: 'Reportes', icon: BarChart3, roles: ['admin', 'manager', 'supervisor'] },
    { path: '/clients', label: 'Clientes', icon: Users, roles: ['admin', 'manager', 'capitan'] },
    { path: '/purchases', label: 'Compras', icon: ShoppingBag, roles: ['admin', 'manager'] },
    { path: '/closing', label: 'Caja', icon: DollarSign, roles: ['admin', 'manager'] },
    { path: '/admin', label: 'Seguridad', icon: ShieldCheck, roles: ['admin', 'manager', 'supervisor'] },
  ]

  const visibleItems = navItems.filter(item => 
    item.roles.includes(currentUser?.role || '')
  )

  return (
    <nav
      className="text-white shadow-md sticky top-0 z-50 border-b transition-all duration-500"
      style={{ 
        background: '#1E293B', 
        borderBottomColor: 'var(--brand-primary, #10B981)',
        borderBottomWidth: '3px'
      }}
    >
      <div className="max-w-7xl mx-auto px-2 sm:px-4">
        <div className="flex items-center justify-between min-h-[3rem] sm:min-h-[4rem] py-1 sm:py-0 gap-2">
          {/* Logo / Brand - Marca Blanca y Premium */}
          <div className="flex items-center gap-2 shrink-0">
            {currentUser?.avatar_url ? (
              <img src={currentUser.avatar_url} alt="Logo" className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl object-cover shadow-lg ring-1 ring-white/20" />
            ) : (
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-rb-action rounded-xl flex items-center justify-center font-black text-lg sm:text-xl shadow-lg shadow-emerald-500/20 ring-1 ring-white/20 text-white">
                {currentUser?.businessName?.[0] || 'R'}
              </div>
            )}
            <h1 className="font-black text-sm sm:text-lg tracking-tighter hidden xs:block bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-gray-400">
              {currentUser?.businessName || 'CEVICHERIA MEXA'}
            </h1>
          </div>

          {/* Navigation Links - UX Fluida */}
          <div className="flex items-center gap-1 flex-wrap py-1 flex-1 justify-center sm:justify-start">
            {visibleItems.map(item => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-[0_0_15px_rgba(255,255,255,0.3)] scale-105'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon size={18} className="sm:w-5 sm:h-5" />
                  <span className="hidden lg:inline text-sm">{item.label}</span>
                </Link>
              )
            })}
          </div>

          {/* User Info & Notifications */}
          <div className="flex items-center gap-1 sm:gap-3 shrink-0">
            {/* Botón de Ayuda - Nueva ubicación estratégica */}
            <Link
              to="/support"
              className="p-2 text-gray-400 hover:text-emerald-400 hover:bg-white/5 rounded-lg transition-all"
              title="Centro de Ayuda"
            >
              <LifeBuoy size={20} />
            </Link>

            {/* Fullscreen Toggle - El toque pro */}
            {supportsFullscreen && (
              <button
                onClick={toggleFullScreen}
                className="flex p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
              >
                {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
              </button>
            )}

            <div className="relative z-50">
              <NotificationCenter 
                notifications={notifications}
                unreadCount={unreadCount}
                onMarkAsRead={markAsRead}
                onMarkAllAsRead={markAllAsRead}
              />
            </div>

            {/* User Badge - Compacto en móvil */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-xl border border-white/10 backdrop-blur-sm">
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-gray-700 to-gray-600 flex items-center justify-center">
                <User size={14} className="text-gray-300" />
              </div>
              <div className="text-xs">
                <div className="font-bold truncate max-w-[80px] text-gray-100">{currentUser?.username}</div>
                <div className="text-[10px] text-gray-400 capitalize flex items-center gap-1">
                  {isReadOnly && <Eye size={10} />}
                  {currentRole}
                </div>
              </div>
            </div>

            {/* Logout Button - Icono solo en móvil */}
            <button
              onClick={handleLogout}
              className="p-2 sm:px-4 sm:py-2 bg-red-500/10 hover:bg-red-600 text-red-500 hover:text-white rounded-xl transition-all border border-red-500/20 hover:border-red-600 shadow-lg hover:shadow-red-600/20"
              title="Cerrar Sesión"
            >
              <LogOut size={18} />
              <span className="hidden md:inline ml-2 font-bold">Salir</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
