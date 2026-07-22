import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '@/store/appStore'
import { BRANDING } from '@/config/branding'
import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/usePermissions'
import { useNotifications } from '@/hooks/useNotifications'
import NotificationCenter from '@/components/common/NotificationCenter'
import { changeLanguage } from '@/i18n'
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
  Gift,
  Store
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

  const { i18n } = useTranslation()

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
    { path: '/pos', label: 'Ventas', icon: ShoppingCart, roles: ['admin', 'manager', 'supervisor', 'cashier', 'employee'] },
    { path: '/inventory', label: 'Inventario', icon: Package, roles: ['admin', 'manager', 'supervisor'] },
    { path: '/reports', label: 'Reportes', icon: BarChart3, roles: ['admin', 'manager', 'supervisor'] },
    { path: '/clients', label: 'Clientes', icon: Users, roles: ['admin', 'manager', 'supervisor', 'cashier'] },
    { path: '/ecommerce', label: 'Tienda', icon: ShoppingBag, roles: ['admin', 'manager', 'supervisor'] },
    { path: '/purchases', label: 'Compras', icon: ShoppingBag, roles: ['admin', 'manager'] },
    { path: '/closing', label: 'Cierre', icon: DollarSign, roles: ['admin', 'manager'] },
    { path: '/marketing', label: 'Marketing', icon: Megaphone, roles: ['admin'] },
    { path: '/wholesale', label: 'Mayorista', icon: Package, roles: ['admin', 'manager'] },
    { path: '/wholesale-dashboard', label: 'Mayorista', icon: Store, roles: ['admin', 'manager', 'wholesaler'] },
    { path: '/agent', label: 'IA Agent', icon: Bot, roles: ['admin', 'manager', 'supervisor'] },
    { path: '/analytics', label: 'Analytics', icon: TrendingUp, roles: ['admin', 'manager'] },
    { path: '/invoicing', label: 'Facturas', icon: Receipt, roles: ['admin'] },
    { path: '/referral', label: 'Referidos', icon: Gift, roles: ['admin', 'manager'] },
    { path: '/admin', label: 'Admin', icon: Shield, roles: ['admin'] },
    { path: '/settings', label: 'Ajustes', icon: Settings, roles: ['admin'] },
  ]

  const visibleItems = navItems.filter(item => {
    const hasRole = item.roles.includes(currentUser?.role || '')
    if (!hasRole) return false
    const favNavbar = organizationSettings?.favorites?.navbar || ['/pos', '/inventory', '/reports']
    return favNavbar.includes(item.path)
  })

  return (
    <nav
      className="text-white shadow-lg fixed top-0 left-0 right-0 z-50 border-b transition-all duration-500"
      style={{
        background: 'var(--primary, #E62E6B)',
        borderBottomColor: 'var(--secondary, #FF7597)',
        borderBottomWidth: '2px'
      }}
    >
      <div className="max-w-7xl mx-auto px-2 sm:px-4">
        <div className="flex items-center justify-between min-h-[3.25rem] sm:min-h-[4rem] py-1 sm:py-0 gap-2">
          <div className="flex items-center gap-2 shrink-0">
            {currentUser?.avatar_url ? (
              <img src={currentUser.avatar_url} alt="Logo" className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl object-cover shadow-md ring-2 ring-white/40" />
            ) : (
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white text-[#E62E6B] rounded-xl flex items-center justify-center font-black text-lg sm:text-xl shadow-md ring-2 ring-white/40">
                {currentUser?.businessName?.[0] || BRANDING.appName?.[0] || 'M'}
              </div>
            )}
            <h1 className="font-black text-sm sm:text-lg tracking-tight hidden xs:block text-white drop-shadow-xs font-['Playfair_Display',serif]">
              {currentUser?.businessName || BRANDING.appName}
            </h1>
          </div>

          <div className="hidden lg:flex items-center gap-1.5 flex-wrap py-1 flex-1 justify-start">
            {visibleItems.map(item => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-extrabold transition-all whitespace-nowrap text-sm ${isActive
                    ? 'bg-white text-[#E62E6B] shadow-md scale-105 border border-white'
                    : 'text-white/90 hover:bg-white/20 hover:text-white'
                    }`}
                >
                  <Icon size={18} className={`sm:w-5 sm:h-5 ${isActive ? 'text-[#E62E6B]' : 'text-white'}`} />
                  <span className="hidden lg:inline">{item.label}</span>
                </Link>
              )
            })}
          </div>

          <div className="flex items-center gap-1 sm:gap-3 shrink-0">
            <Link
              to="/help"
              className="p-2.5 text-white/90 hover:text-white hover:bg-white/20 rounded-full transition-all duration-300 border border-transparent hover:border-white/30"
              title="Centro de Ayuda"
            >
              <LifeBuoy size={20} />
            </Link>

            {supportsFullscreen && (
              <button
                onClick={toggleFullScreen}
                className="p-2.5 text-white/90 hover:text-white hover:bg-white/20 rounded-full transition-all duration-300 border border-transparent hover:border-white/30"
                title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
              >
                {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
              </button>
            )}

            <button
              onClick={() => changeLanguage(i18n.language === 'es' ? 'en' : 'es')}
              className="px-3 py-1.5 text-xs font-black bg-white/20 hover:bg-white/30 border border-white/30 rounded-full transition-all text-white"
              title="Cambiar idioma"
            >
              {i18n.language === 'es' ? 'EN' : 'ES'}
            </button>

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
                className="flex items-center gap-2 p-1 pr-3 bg-white/20 hover:bg-white/30 rounded-full border border-white/30 backdrop-blur-sm transition-all duration-300 group-hover:border-white/60"
              >
                <div className="w-8 h-8 rounded-full bg-white text-[#E62E6B] flex items-center justify-center shadow-sm font-black">
                  <User size={16} className="text-[#E62E6B]" />
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-[10px] font-black uppercase tracking-widest text-white bg-black/20 px-1.5 py-0.5 rounded border border-white/20 leading-none mb-0.5 inline-block">
                    {currentRole}
                  </div>
                  <div className="text-xs font-bold text-white leading-none truncate max-w-[80px]">
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
