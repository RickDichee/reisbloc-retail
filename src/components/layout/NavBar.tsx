import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '@/store/appStore'
import { BRANDING, isSanJudasUserEmail } from '@/config/branding'
import { tenantHasFeature } from '@/config/tenantFeatures'
import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/usePermissions'
import { changeLanguage } from '@/i18n'
import {
  ShoppingCart,
  BarChart3,
  Shield,
  Settings,
  LogOut,
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
        { path: '/pos', label: 'Punto de Venta', desc: 'Caja rápida y tickets', icon: ShoppingCart, color: 'bg-emerald-50 text-emerald-600 border-emerald-200', roles: ['admin', 'manager', 'supervisor', 'cashier', 'employee'] },
        { path: '/closing', label: 'Cierre de Caja', desc: 'Corte y arqueo de turno', icon: DollarSign, color: 'bg-amber-50 text-amber-600 border-amber-200', roles: ['admin', 'manager', 'supervisor', 'cashier'] },
        { path: '/ecommerce', label: 'Tienda en Línea', desc: 'Catálogo y pedidos web', icon: ShoppingBag, color: 'bg-cyan-50 text-cyan-600 border-cyan-200', roles: ['admin', 'manager', 'supervisor'] },
      ]
    },
    {
      title: 'Inventario y Catálogo',
      items: [
        { path: '/inventory', label: 'Inventario', desc: 'Existencias y stock', icon: Package, color: 'bg-blue-50 text-blue-600 border-blue-200', roles: ['admin', 'manager', 'supervisor', 'cashier'] },
        { path: '/purchases', label: 'Compras', desc: 'Entradas y proveedores', icon: ShoppingBag, color: 'bg-orange-50 text-orange-600 border-orange-200', roles: ['admin', 'manager'] },
        { path: '/wholesale', label: 'Catálogo Mayorista', desc: 'Precios por bulto y volumen', icon: Package, color: 'bg-indigo-50 text-indigo-600 border-indigo-200', roles: ['admin', 'manager'] },
        { path: '/wholesale-dashboard', label: 'Portal B2B', desc: 'Pedidos de clientes mayoristas', icon: Store, color: 'bg-indigo-50 text-indigo-600 border-indigo-200', roles: ['admin', 'manager', 'wholesaler'] },
      ]
    },
    {
      title: 'Gestión Comercial',
      items: [
        { path: '/clients', label: 'Clientes & Créditos', desc: 'Historial y apartados', icon: Users, color: 'bg-purple-50 text-purple-600 border-purple-200', roles: ['admin', 'manager', 'supervisor', 'cashier'] },
        { path: '/reports', label: 'Reportes Financieros', desc: 'Ventas y balance diario', icon: BarChart3, color: 'bg-teal-50 text-teal-600 border-teal-200', roles: ['admin', 'manager', 'supervisor'] },
        { path: '/invoicing', label: 'Facturación SAT', desc: 'Timbrado CFDI 4.0', icon: Receipt, color: 'bg-rose-50 text-rose-600 border-rose-200', roles: ['admin'] },
      ]
    },
    {
      title: 'Inteligencia Artificial',
      items: [
        { path: '/agent', label: 'Agente Copiloto IA', desc: 'Asistente de negocio virtual', icon: Bot, color: 'bg-sky-50 text-sky-600 border-sky-200', roles: ['admin', 'manager', 'supervisor'] },
        { path: '/marketing', label: 'Marketing WhatsApp', desc: 'Campañas automáticas', icon: Megaphone, color: 'bg-fuchsia-50 text-fuchsia-600 border-fuchsia-200', roles: ['admin', 'manager'] },
        { path: '/analytics', label: 'Analytics Predictivo', desc: 'Tendencias y proyecciones', icon: TrendingUp, color: 'bg-emerald-50 text-emerald-600 border-emerald-200', roles: ['admin', 'manager'] },
      ]
    },
    {
      title: 'Administración y Ajustes',
      items: [
        { path: '/admin', label: 'Administración', desc: 'Control de usuarios y roles', icon: Shield, color: 'bg-rose-50 text-rose-600 border-rose-200', roles: ['admin'] },
        { path: '/branches', label: 'Sucursales', desc: 'Gestión multitienda', icon: Store, color: 'bg-amber-50 text-amber-600 border-amber-200', roles: ['admin'] },
        { path: '/settings', label: 'Configuración', desc: 'Ajustes de ticket y empresa', icon: Settings, color: 'bg-slate-100 text-slate-600 border-slate-200', roles: ['admin', 'manager'] },
        { path: '/referral', label: 'Referidos', desc: 'Programa de recompensas', icon: Gift, color: 'bg-amber-50 text-amber-600 border-amber-200', roles: ['admin', 'manager'] },
      ]
    }
  ]

  const isMM = BRANDING.isModaMiel
  const isJG = BRANDING.isJuguetes || currentUser?.organizationId === '324fd41f-b8af-4aef-9ea6-2f954350775a' || isSanJudasUserEmail(currentUser?.email) || (typeof window !== 'undefined' && window.location.hostname.includes('sanjudas'))
  const isLC = BRANDING.isLosChunches
  // isBranded: true cuando el tenant tiene colores propios (no el default oscuro)
  const isBranded = isMM || isJG || isLC
  const activeOrgId = currentUser?.organizationId || organizationSettings?.id || null
  const canShowOnlineStore = !isJG && (activeOrgId ? tenantHasFeature(activeOrgId, 'onlineStoreModule') : false)
  const canShowAiModules = tenantHasFeature(activeOrgId, 'aiModules')
  const canShowWholesale = tenantHasFeature(activeOrgId, 'wholesaleModule')
  const canShowInvoicing = tenantHasFeature(activeOrgId, 'invoicingModule')
  const canShowBranches = tenantHasFeature(activeOrgId, 'branchesModule')

  const filterItemByTenant = (item: any) => {
    if (item.path === '/ecommerce' && !canShowOnlineStore) return false
    if ((item.path === '/marketing' || item.path === '/agent' || item.path === '/analytics') && !canShowAiModules) return false
    if ((item.path === '/wholesale' || item.path === '/wholesale-dashboard') && !canShowWholesale) return false
    if (item.path === '/invoicing' && !canShowInvoicing) return false
    if (item.path === '/branches' && !canShowBranches) return false
    if (item.path === '/referral' && isBranded) return false
    return true
  }

  // Desktop quick favorites
  const favNavbar = organizationSettings?.favorites?.navbar || ['/pos', '/inventory', '/clients', '/reports', '/closing']
  const desktopQuickItems = allNavCategories
    .flatMap(cat => cat.items)
    .filter(item => {
      if (!filterItemByTenant(item)) return false
      return item.roles.includes(currentUser?.role || '') && favNavbar.includes(item.path)
    })

  return (
    <>
      <nav
        className="text-white shadow-md fixed top-0 left-0 right-0 z-50 border-b transition-all duration-300 pt-[env(safe-area-inset-top,0px)]"
        style={{
          background: isBranded ? 'var(--primary, #D4386C)' : '#0B0F19',
          borderBottomColor: isBranded ? 'var(--secondary, #FF7597)' : 'rgba(255, 255, 255, 0.08)',
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
                  isBranded ? 'bg-white/15 border-white/30' : 'bg-slate-900 border-amber-500/30'
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
                    isBranded ? 'text-[var(--on-primary-soft)]' : 'text-amber-400'
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
                        ? isBranded
                          ? 'bg-white/20 text-white shadow-sm border-white/40' 
                          : 'bg-teal-500/15 text-teal-300 border-teal-500/40 shadow-xs'
                        : isBranded
                          ? 'text-white/90 hover:bg-white/15 hover:text-white border-transparent'
                          : 'text-slate-300 hover:bg-slate-800/80 hover:text-white border-transparent'
                    }`}
                  >
                    <Icon size={16} className={isActive ? (isBranded ? 'text-white' : 'text-teal-400') : 'opacity-80'} />
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

              {/* User Profile Menu */}
              <div className="relative group">
                <button
                  type="button"
                  onClick={() => navigate('/settings')}
                  className="flex items-center gap-1.5 p-1 sm:pr-2.5 bg-white/10 hover:bg-white/20 rounded-lg border border-white/15 transition-all"
                >
                  <div className={`w-7 h-7 rounded-md flex items-center justify-center font-bold text-xs ${
                    isBranded ? 'bg-white text-[var(--primary)]' : 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
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
                <div className="absolute right-0 mt-2 w-52 bg-white border border-slate-200 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 translate-y-1 group-hover:translate-y-0 z-[60] overflow-hidden">
                  <div className="p-1.5 space-y-0.5">
                    {!isBranded && (
                      <button
                        type="button"
                        onClick={() => setShowOrgSwitcher(true)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-amber-700 hover:bg-amber-50 rounded-lg transition-colors text-left"
                      >
                        <Building2 size={15} className="text-amber-600 shrink-0" />
                        <span>Cambiar de Negocio</span>
                      </button>
                    )}
                    <Link to="/settings" className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                      <Settings size={15} className="text-slate-500 shrink-0" />
                      <span>Configuración</span>
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors text-left"
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Drawer Content */}
          <div className="relative w-[290px] max-w-[85vw] bg-white text-slate-900 border-r border-slate-200 flex flex-col h-full shadow-2xl z-10 animate-fadeIn">
            {/* Drawer Header */}
            <div className="p-3.5 border-b border-slate-200 flex items-center justify-between gap-3 bg-[var(--bg-canvas)]">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-9 h-9 rounded-xl overflow-hidden border shrink-0 ${
                  isBranded ? 'border-[var(--primary)]/30 bg-[var(--primary)]' : 'border-amber-500/30 bg-slate-900'
                }`}>
                  <img src={BRANDING.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-black text-xs text-slate-900 truncate">
                    {organizationSettings?.businessName || BRANDING.appName}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded border font-bold ${
                      isBranded
                        ? 'bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/30'
                        : 'bg-teal-50 text-teal-700 border-teal-200'
                    }`}>
                      {currentRole}
                    </span>
                    <span className="text-[10px] text-slate-500 font-semibold truncate">
                      {currentUser?.username}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="Cerrar menú"
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Body (Navigation List) */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-3.5 custom-scrollbar">
              {allNavCategories.map((category, catIdx) => {
                const userFilteredItems = category.items.filter(item => {
                  if (!filterItemByTenant(item)) return false
                  return item.roles.includes(currentUser?.role || '')
                })
                if (userFilteredItems.length === 0) return null

                return (
                  <div key={catIdx} className="space-y-1">
                    <p className="text-[10.5px] font-black uppercase tracking-widest text-slate-400 px-2.5 py-0.5 font-mono">
                      {category.title === 'Inteligencia Artificial' && !canShowAiModules ? 'Analítica & Proyecciones' : category.title}
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
                            className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all border ${
                              isActive 
                                ? isBranded
                                  ? 'bg-[var(--bg-canvas)] text-[var(--primary)] border-[var(--border-light)] shadow-xs'
                                  : 'bg-teal-50 text-teal-700 border-teal-200 shadow-xs'
                                : 'bg-white text-slate-800 hover:bg-[var(--bg-canvas)] hover:text-[var(--primary)] border-transparent'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
                                isActive
                                  ? isBranded
                                    ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-sm'
                                    : 'bg-teal-600 text-white border-teal-600 shadow-sm font-black'
                                  : isBranded
                                    ? 'bg-slate-50 text-slate-600 border-slate-200/80'
                                    : (item as any).color || 'bg-slate-100 text-slate-600 border-slate-200'
                              }`}>
                                <Icon size={17} />
                              </div>
                              <div className="min-w-0 text-left">
                                <span className={`block font-extrabold text-[13.5px] truncate leading-snug ${
                                  isActive
                                    ? (isBranded ? 'text-[var(--primary)]' : 'text-teal-700')
                                    : 'text-slate-800'
                                }`}>
                                  {item.label}
                                </span>
                                {(item as any).desc && (
                                  <p className="text-[11px] text-slate-500 truncate leading-tight mt-0.5 font-medium">
                                    {(item as any).desc}
                                  </p>
                                )}
                              </div>
                            </div>
                            {isActive ? (
                              <span className={`w-2 h-2 rounded-full shrink-0 ml-1 ${
                                isBranded ? 'bg-[var(--primary)]' : 'bg-teal-500'
                              }`} />
                            ) : (
                              <ChevronRight size={14} className="text-slate-400 shrink-0 ml-1" />
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
            <div className="p-3 border-t border-slate-200 bg-slate-50 space-y-2 safe-bottom">
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false)
                  setShowOrgSwitcher(true)
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-xs font-bold transition-colors"
              >
                <Building2 size={16} />
                <span>Cambiar de Negocio / Cliente</span>
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-white hover:bg-red-50 text-red-600 border border-slate-200 hover:border-red-200 text-xs font-bold transition-colors"
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
