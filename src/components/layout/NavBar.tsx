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
  Store,
  Menu,
  X,
  ChevronRight,
  Sparkles,
  Building2
} from 'lucide-react'
import OrganizationSwitcherModal from './OrganizationSwitcherModal'

export default function NavBar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { currentUser, organizationSettings } = useAppStore()
  const { logout } = useAuth()
  const { currentRole } = usePermissions()
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [supportsFullscreen, setSupportsFullscreen] = useState(true)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [showOrgSwitcher, setShowOrgSwitcher] = useState(false)

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

  // Cerrar menú móvil al cambiar de ruta
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [location.pathname])

  if (location.pathname === '/login' || !currentUser) {
    return null
  }

  const handleLogout = async () => {
    if (confirm('¿Seguro que deseas cerrar sesión?')) {
      await logout()
    }
  }

  const allNavCategories = [
    {
      title: 'Operación Diaria',
      items: [
        { path: '/pos', label: 'Punto de Venta', desc: 'Caja rápida y tickets', icon: ShoppingCart, color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', roles: ['admin', 'manager', 'supervisor', 'cashier', 'employee'] },
        { path: '/closing', label: 'Cierre de Caja', desc: 'Corte y arqueo de turno', icon: DollarSign, color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', roles: ['admin', 'manager', 'supervisor', 'cashier'] },
        { path: '/ecommerce', label: 'Tienda en Línea', desc: 'Catálogo y pedidos web', icon: ShoppingBag, color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20', roles: ['admin', 'manager', 'supervisor'] },
      ]
    },
    {
      title: 'Inventario y Catálogo',
      items: [
        { path: '/inventory', label: 'Inventario', desc: 'Existencias y stock', icon: Package, color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', roles: ['admin', 'manager', 'supervisor', 'cashier'] },
        { path: '/purchases', label: 'Compras', desc: 'Entradas y proveedores', icon: ShoppingBag, color: 'bg-orange-500/10 text-orange-400 border-orange-500/20', roles: ['admin', 'manager'] },
        { path: '/wholesale', label: 'Catálogo Mayorista', desc: 'Precios por bulto y volumen', icon: Package, color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20', roles: ['admin', 'manager'] },
        { path: '/wholesale-dashboard', label: 'Portal B2B', desc: 'Pedidos de clientes mayoristas', icon: Store, color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20', roles: ['admin', 'manager', 'wholesaler'] },
      ]
    },
    {
      title: 'Gestión Comercial',
      items: [
        { path: '/clients', label: 'Clientes & Créditos', desc: 'Historial y apartados', icon: Users, color: 'bg-purple-500/10 text-purple-400 border-purple-500/20', roles: ['admin', 'manager', 'supervisor', 'cashier'] },
        { path: '/reports', label: 'Reportes Financieros', desc: 'Ventas y balance diario', icon: BarChart3, color: 'bg-teal-500/10 text-teal-400 border-teal-500/20', roles: ['admin', 'manager', 'supervisor'] },
        { path: '/invoicing', label: 'Facturación SAT', desc: 'Timbrado CFDI 4.0', icon: Receipt, color: 'bg-rose-500/10 text-rose-400 border-rose-500/20', roles: ['admin'] },
      ]
    },
    {
      title: 'Inteligencia Artificial',
      items: [
        { path: '/agent', label: 'Agente Copiloto IA', desc: 'Asistente de negocio virtual', icon: Bot, color: 'bg-sky-500/10 text-sky-400 border-sky-500/20', roles: ['admin', 'manager', 'supervisor'] },
        { path: '/marketing', label: 'Marketing WhatsApp', desc: 'Campañas automáticas', icon: Megaphone, color: 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20', roles: ['admin', 'manager'] },
        { path: '/analytics', label: 'Analytics Predictivo', desc: 'Tendencias y proyecciones', icon: TrendingUp, color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', roles: ['admin', 'manager'] },
      ]
    },
    {
      title: 'Administración y Ajustes',
      items: [
        { path: '/admin', label: 'Administración', desc: 'Control de usuarios y roles', icon: Shield, color: 'bg-rose-500/10 text-rose-400 border-rose-500/20', roles: ['admin'] },
        { path: '/branches', label: 'Sucursales', desc: 'Gestión multitienda', icon: Store, color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', roles: ['admin'] },
        { path: '/settings', label: 'Configuración', desc: 'Ajustes de ticket y empresa', icon: Settings, color: 'bg-slate-500/10 text-slate-400 border-slate-500/20', roles: ['admin', 'manager'] },
        { path: '/referral', label: 'Referidos', desc: 'Programa de recompensas', icon: Gift, color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', roles: ['admin', 'manager'] },
      ]
    }
  ]

  const isMM = BRANDING.isModaMiel

  // Desktop quick favorites
  const favNavbar = organizationSettings?.favorites?.navbar || ['/pos', '/inventory', '/clients', '/reports', '/closing']
  const desktopQuickItems = allNavCategories
    .flatMap(cat => cat.items)
    .filter(item => item.roles.includes(currentUser?.role || '') && favNavbar.includes(item.path))

  return (
    <>
      <nav
        className="text-white shadow-md fixed top-0 left-0 right-0 z-50 border-b transition-all duration-300 pt-[env(safe-area-inset-top,0px)]"
        style={{
          background: isMM ? 'var(--primary, #D4386C)' : '#0B0F19',
          borderBottomColor: isMM ? 'var(--secondary, #FF7597)' : 'rgba(255, 255, 255, 0.08)',
          borderBottomWidth: '1px'
        }}
      >
        <div className="max-w-7xl mx-auto px-2 sm:px-4">
          <div className="flex items-center justify-between min-h-[3.25rem] sm:min-h-[3.75rem] py-1 sm:py-0 gap-2">
            
            {/* Left Section: Mobile Menu Trigger + Brand Logo */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
              {/* Mobile Hamburger Button */}
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden p-2 text-white/90 hover:text-white hover:bg-white/10 rounded-lg transition-colors active:scale-95"
                title="Abrir menú de navegación"
                aria-label="Abrir menú"
              >
                <Menu size={22} />
              </button>

              <Link to="/pos" className="flex items-center gap-2 group">
                <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg overflow-hidden flex items-center justify-center shrink-0 border ${
                  isMM ? 'bg-white/15 border-white/30' : 'bg-slate-900 border-amber-500/30'
                }`}>
                  {currentUser?.avatar_url ? (
                    <img src={currentUser.avatar_url} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <img src={BRANDING.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="hidden xs:block">
                  <h1 className="font-black text-xs sm:text-sm tracking-tight text-white leading-none truncate max-w-[130px] sm:max-w-[180px]">
                    {organizationSettings?.businessName || currentUser?.businessName || BRANDING.appName}
                  </h1>
                  <span className={`text-[9px] font-mono font-bold block uppercase tracking-widest mt-0.5 ${
                    isMM ? 'text-pink-200' : 'text-amber-400'
                  }`}>
                    {BRANDING.whiteLabelName}
                  </span>
                </div>
              </Link>
            </div>

            {/* Desktop Navigation Links */}
            <div className="hidden lg:flex items-center gap-1.5 flex-1 justify-start ml-4">
              {desktopQuickItems.map(item => {
                const Icon = item.icon
                const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path))
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap text-xs sm:text-sm border ${
                      isActive
                        ? isMM 
                          ? 'bg-white text-[#D4386C] shadow-sm border-white' 
                          : 'bg-teal-500/15 text-teal-300 border-teal-500/40 shadow-xs'
                        : isMM
                          ? 'text-white/90 hover:bg-white/15 hover:text-white border-transparent'
                          : 'text-slate-300 hover:bg-slate-800/80 hover:text-white border-transparent'
                    }`}
                  >
                    <Icon size={16} className={isActive ? (isMM ? 'text-[#D4386C]' : 'text-teal-400') : 'opacity-80'} />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>

            {/* Right Action Icons */}
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              <Link
                to="/help"
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                title="Centro de Ayuda"
              >
                <LifeBuoy size={18} />
              </Link>

              {supportsFullscreen && (
                <button
                  type="button"
                  onClick={toggleFullScreen}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all hidden sm:flex"
                  title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
                >
                  {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                </button>
              )}

              <button
                type="button"
                onClick={() => changeLanguage(i18n.language === 'es' ? 'en' : 'es')}
                className="px-2.5 py-1 text-[11px] font-black bg-white/10 hover:bg-white/20 border border-white/20 rounded-md transition-all text-white font-mono"
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
                  type="button"
                  onClick={() => navigate('/settings')}
                  className="flex items-center gap-1.5 p-1 sm:pr-2.5 bg-white/10 hover:bg-white/20 rounded-lg border border-white/15 transition-all"
                >
                  <div className={`w-7 h-7 rounded-md flex items-center justify-center font-bold text-xs ${
                    isMM ? 'bg-white text-[#D4386C]' : 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                  }`}>
                    {currentUser?.username?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="text-left hidden md:block">
                    <div className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-300 leading-none mb-0.5">
                      {currentRole}
                    </div>
                    <div className="text-xs font-bold text-white leading-none truncate max-w-[90px]">
                      {currentUser?.username}
                    </div>
                  </div>
                </button>

                {/* Dropdown Menu Desktop */}
                <div className="absolute right-0 mt-2 w-52 bg-[#0F172A] border border-slate-800 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 translate-y-1 group-hover:translate-y-0 z-[60] overflow-hidden">
                  <div className="p-1.5 space-y-0.5">
                    <button
                      type="button"
                      onClick={() => setShowOrgSwitcher(true)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-amber-300 hover:bg-slate-800 rounded-lg transition-colors text-left"
                    >
                      <Building2 size={15} className="text-amber-400 shrink-0" />
                      <span>Cambiar de Negocio</span>
                    </button>
                    <Link to="/settings" className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800 rounded-lg transition-colors">
                      <Settings size={15} className="text-slate-400 shrink-0" />
                      <span>Configuración</span>
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-red-400 hover:bg-red-950/30 rounded-lg transition-colors text-left"
                    >
                      <LogOut size={15} className="shrink-0" />
                      <span>Cerrar Sesión</span>
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </nav>

      {/* ========================================================================= */}
      {/* MOBILE NAVIGATION DRAWER (Slide-Over Sheet) */}
      {/* ========================================================================= */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-[100] flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Drawer Content */}
          <div className="relative w-[290px] max-w-[85vw] bg-[#0B0F19] text-white border-r border-slate-800 flex flex-col h-full shadow-2xl z-10 animate-fadeIn">
            {/* Drawer Header */}
            <div className="p-3.5 border-b border-slate-800 flex items-center justify-between gap-3 bg-[#0F172A]/90">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-lg overflow-hidden border border-amber-500/30 bg-slate-900 shrink-0">
                  <img src={BRANDING.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-black text-xs text-white truncate">
                    {organizationSettings?.businessName || BRANDING.appName}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[9px] font-mono uppercase bg-teal-500/15 text-teal-400 px-1.5 py-0.2 rounded border border-teal-500/30 font-bold">
                      {currentRole}
                    </span>
                    <span className="text-[10px] text-slate-400 truncate">
                      {currentUser?.username}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                aria-label="Cerrar menú"
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Body (Navigation List) */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-3.5 custom-scrollbar">
              {allNavCategories.map((category, catIdx) => {
                const userFilteredItems = category.items.filter(item => 
                  item.roles.includes(currentUser?.role || '')
                )
                if (userFilteredItems.length === 0) return null

                return (
                  <div key={catIdx} className="space-y-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 py-0.5 font-mono">
                      {category.title}
                    </p>
                    <div className="space-y-1">
                      {userFilteredItems.map((item) => {
                        const Icon = item.icon
                        const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path))
                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={`flex items-center justify-between p-2 rounded-lg transition-all border ${
                              isActive 
                                ? 'bg-teal-500/15 text-teal-300 border-teal-500/40 shadow-xs'
                                : 'text-slate-300 hover:bg-slate-800/70 hover:text-white border-transparent'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-all ${
                                isActive
                                  ? 'bg-teal-500 text-slate-950 border-teal-400 shadow-xs font-black'
                                  : (item as any).color || 'bg-slate-800 text-slate-400 border-slate-700'
                              }`}>
                                <Icon size={16} />
                              </div>
                              <div className="min-w-0 text-left">
                                <span className={`block font-bold text-[13.5px] truncate leading-snug ${
                                  isActive ? 'text-teal-300' : 'text-slate-200'
                                }`}>
                                  {item.label}
                                </span>
                                {(item as any).desc && (
                                  <p className="text-[11px] text-slate-400 truncate leading-tight mt-0.5 font-medium">
                                    {(item as any).desc}
                                  </p>
                                )}
                              </div>
                            </div>
                            {isActive ? (
                              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse shrink-0 ml-1" />
                            ) : (
                              <ChevronRight size={14} className="text-slate-600 shrink-0 ml-1" />
                            )}
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Drawer Footer */}
            <div className="p-3 border-t border-slate-800 bg-[#070A11] space-y-2 safe-bottom">
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false)
                  setShowOrgSwitcher(true)
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold transition-colors"
              >
                <Building2 size={16} />
                <span>Cambiar de Negocio / Cliente</span>
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-red-950/30 hover:bg-red-900/40 text-red-400 border border-red-500/30 text-xs font-bold transition-colors"
              >
                <LogOut size={16} />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para cambiar de organización / negocio */}
      {showOrgSwitcher && (
        <OrganizationSwitcherModal
          isOpen={showOrgSwitcher}
          onClose={() => setShowOrgSwitcher(false)}
        />
      )}
    </>
  )
}
