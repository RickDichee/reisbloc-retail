import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/usePermissions'
import { useNotifications } from '@/hooks/useNotifications'
import NotificationCenter from '@/components/common/NotificationCenter'
import {
  ShoppingCart,
  BarChart3,
  Shield,
  Settings,
  LogOut,
  User,
  DollarSign,
  Package,
  Maximize,
  Minimize,
  ShoppingBag,
  LifeBuoy,
  Users,
  Megaphone,
  Bot,
  TrendingUp,
  Receipt,
  Gift
} from 'lucide-react'

export default function NavBar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { currentUser, organizationSettings } = useAppStore()
  const { logout } = useAuth()
  const { currentRole } = usePermissions()
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [supportsFullscreen, setSupportsFullscreen] = useState(true)

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead
  } = useNotifications(currentUser?.id || null)

  useEffect(() => {
    setSupportsFullscreen(!!document.documentElement.requestFullscreen)
  }, [])

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

  if (location.pathname === '/login' || !currentUser) {
    return null
  }

  const handleLogout = async () => {
    if (confirm('¿Seguro que deseas cerrar sesión?')) {
      await logout()
    }
  }

  const navItems = [
    { path: '/pos', label: 'Ventas', icon: ShoppingCart, roles: ['admin', 'supervisor', 'staff'] },
    { path: '/ecommerce', label: 'E-commerce', icon: ShoppingBag, roles: ['admin', 'supervisor'] },
    { path: '/inventory', label: 'Inventario', icon: Package, roles: ['admin', 'supervisor'] },
    { path: '/reports', label: 'Reportes', icon: BarChart3, roles: ['admin', 'supervisor'] },
    { path: '/clients', label: 'Clientes', icon: Users, roles: ['admin', 'supervisor', 'staff'] },
    { path: '/purchases', label: 'Compras', icon: ShoppingBag, roles: ['admin', 'supervisor'] },
    { path: '/closing', label: 'Cierre', icon: DollarSign, roles: ['admin', 'supervisor'] },
    { path: '/marketing', label: 'Marketing', icon: Megaphone, roles: ['admin'] },
    { path: '/agent', label: 'IA Agent', icon: Bot, roles: ['admin', 'supervisor'] },
    { path: '/analytics', label: 'Analytics', icon: TrendingUp, roles: ['admin'] },
    { path: '/invoicing', label: 'Facturas', icon: Receipt, roles: ['admin'] },
    { path: '/referral', label: 'Referidos', icon: Gift, roles: ['admin', 'supervisor'] },
    { path: '/admin', label: 'Admin', icon: Shield, roles: ['admin', 'supervisor'] },
    { path: '/settings', label: 'Ajustes', icon: Settings, roles: ['admin'] },
  ]

  const visibleItems = navItems.filter(item => {
    const hasRole = item.roles.includes(currentUser?.role || '')

    // Fix: If no favorites are configured (or settings are null), show ALL authorized items.
    // Only filter by favorites if the user has explicitly set them.
    const favorites = organizationSettings?.favorites?.navbar
    const hasFavoritesConfigured = Array.isArray(favorites) && favorites.length > 0

    if (hasFavoritesConfigured) {
      return hasRole && (favorites.includes(item.path) || location.pathname === item.path)
    }

    return hasRole
  })

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

          <div className="flex items-center gap-1 flex-wrap py-1 flex-1 justify-center sm:justify-start">
            {visibleItems.map(item => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap ${isActive
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

          <div className="flex items-center gap-1 sm:gap-3 shrink-0">
            <Link
              to="/help"
              className="p-2.5 text-gray-400 hover:text-emerald-400 hover:bg-white/10 rounded-full transition-all duration-300 border border-transparent hover:border-emerald-500/30 hover:shadow-[0_0_15px_rgba(16,185,129,0.1)]"
              title="Centro de Ayuda"
            >
              <LifeBuoy size={22} />
            </Link>

            {supportsFullscreen && (
              <button
                onClick={toggleFullScreen}
                className="p-2.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-all duration-300 border border-transparent hover:border-white/10"
                title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
              >
                {isFullscreen ? <Minimize size={22} /> : <Maximize size={22} />}
              </button>
            )}

            <div className="relative">
              <NotificationCenter
                notifications={notifications}
                unreadCount={unreadCount}
                onMarkAsRead={markAsRead}
                onMarkAllAsRead={markAllAsRead}
              />
            </div>

            {/* User Profile Menu */}
            <div className="relative group">
              <button
                onClick={() => navigate('/settings')}
                className="flex items-center gap-2 p-1 pr-3 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 backdrop-blur-sm transition-all duration-300 group-hover:border-emerald-500/30"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <User size={16} className="text-white" />
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-[10px] font-black uppercase tracking-widest text-emerald-400 leading-none mb-0.5">
                    {currentRole}
                  </div>
                  <div className="text-xs font-bold text-gray-100 leading-none truncate max-w-[80px]">
                    {currentUser?.username}
                  </div>
                </div>
              </button>

              {/* Dropdown Menu (Hover based for quick access) */}
              <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 translate-y-2 group-hover:translate-y-0 z-[60] overflow-hidden">
                <div className="p-2 space-y-1">
                  <Link to="/settings" className="flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 rounded-xl transition-colors">
                    <Settings size={16} className="text-gray-500" />
                    <span>Configuración</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                  >
                    <LogOut size={16} />
                    <span>Cerrar Sesión</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
