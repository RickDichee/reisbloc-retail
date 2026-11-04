import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';
import { BRANDING, isSanJudasUserEmail } from '@/config/branding';
import { tenantHasFeature } from '@/config/tenantFeatures';
import {
    Shield,
    Users,
    Package,
    LogOut,
    Menu,
    X,
    Store,
    BarChart3,
    DollarSign,
    ChevronLeft,
    ChevronRight,
    Settings,
    Banknote,
    Coins,
    Megaphone,
    Bot,
    TrendingUp,
    Building2
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import OrganizationSwitcherModal from './OrganizationSwitcherModal';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { currentUser, organizationSettings, accessibility } = useAppStore();
    const { logout } = useAuth();
    const { planName } = usePlanLimits();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [showOrgSwitcher, setShowOrgSwitcher] = useState(false);
    const [isMini, setIsMini] = useState(() => {
        const saved = localStorage.getItem('sidebar_mini');
        if (saved !== null) return saved === 'true';
        return typeof window !== 'undefined' ? window.innerWidth < 1280 : false;
    });

    const toggleMini = () => {
        const newState = !isMini;
        setIsMini(newState);
        localStorage.setItem('sidebar_mini', String(newState));
    };

    const userRole = currentUser?.role || 'employee';
    const activeOrgId = currentUser?.organizationId || organizationSettings?.id || null;
    const isJuguetesTenant = BRANDING.isJuguetes || activeOrgId === '324fd41f-b8af-4aef-9ea6-2f954350775a' || isSanJudasUserEmail(currentUser?.email) || (typeof window !== 'undefined' && window.location.hostname.includes('sanjudas'));
    const isBrandedTenant = BRANDING.isModaMiel || isJuguetesTenant || BRANDING.isLosChunches;
    const isPosPage = location.pathname === '/pos' || location.pathname.startsWith('/pos');
    const canShowOnlineStore = !isJuguetesTenant && (activeOrgId ? tenantHasFeature(activeOrgId, 'onlineStoreModule') : false);
    const canShowAiModules = tenantHasFeature(activeOrgId, 'aiModules');

    const sections = [
        {
            title: 'Operación en Caja',
            roles: ['admin', 'manager', 'cashier', 'employee', 'supervisor'],
            items: [
                { label: 'Punto de Venta', desc: 'Cobro, tickets y apartados', icon: Banknote, path: '/pos', color: 'bg-emerald-50 text-emerald-600 border-emerald-200', roles: ['admin', 'manager', 'cashier', 'employee', 'supervisor'] },
                { label: 'Cierre de Caja', desc: 'Arqueo y balance de turno', icon: DollarSign, path: '/closing', color: 'bg-amber-50 text-amber-600 border-amber-200', roles: ['admin', 'manager', 'cashier', 'supervisor'] },
                { label: 'Tienda en Línea', desc: 'Catálogo y pedidos web', icon: Store, path: '/ecommerce', color: 'bg-cyan-50 text-cyan-600 border-cyan-200', roles: ['admin', 'manager'] }
            ]
        },
        {
            title: 'Inventario & Catálogo',
            roles: ['admin', 'manager', 'supervisor', 'cashier'],
            items: [
                { label: 'Inventario', desc: 'Stock y códigos de barra', icon: Package, path: '/inventory', color: 'bg-blue-50 text-blue-600 border-blue-200', roles: ['admin', 'manager', 'supervisor', 'cashier'] },
                { label: 'Compras', desc: 'Entradas y proveedores', icon: Coins, path: '/purchases', color: 'bg-orange-50 text-orange-600 border-orange-200', roles: ['admin', 'manager'] }
            ]
        },
        {
            title: 'Clientes & Finanzas',
            roles: ['admin', 'manager', 'supervisor'],
            items: [
                { label: 'Clientes', desc: 'Historial, saldos y crédito', icon: Users, path: '/clients', color: 'bg-purple-50 text-purple-600 border-purple-200', roles: ['admin', 'manager', 'supervisor'] },
                { label: 'Reportes', desc: 'Ventas y rendimiento', icon: BarChart3, path: '/reports', color: 'bg-teal-50 text-teal-600 border-teal-200', roles: ['admin', 'manager', 'supervisor'] }
            ]
        },
        {
            title: 'Inteligencia Artificial',
            roles: ['admin', 'manager'],
            items: [
                { label: 'Marketing IA', desc: 'Promociones automáticas', icon: Megaphone, path: '/marketing', color: 'bg-fuchsia-50 text-fuchsia-600 border-fuchsia-200', roles: ['admin', 'manager'] },
                { label: 'Agente IA', desc: 'Asistente de negocio virtual', icon: Bot, path: '/agent', color: 'bg-sky-50 text-sky-600 border-sky-200', roles: ['admin', 'manager'] },
                { label: 'Analytics', desc: 'Métricas predictivas', icon: TrendingUp, path: '/analytics', color: 'bg-emerald-50 text-emerald-600 border-emerald-200', roles: ['admin', 'manager'] }
            ]
        },
        {
            title: 'Configuración & Sistema',
            roles: ['admin', 'manager'],
            items: [
                { label: 'Administración', desc: 'Usuarios, roles y accesos', icon: Shield, path: '/admin', color: 'bg-rose-50 text-rose-600 border-rose-200', roles: ['admin'] },
                { label: 'Configuración', desc: 'Ajustes de ticket y empresa', icon: Settings, path: '/settings', color: 'bg-slate-100 text-slate-600 border-slate-200', roles: ['admin', 'manager'] }
            ]
        }
    ];

    const visibleSections = sections.filter(sec => sec.roles.includes(userRole));
    const finalMenuItems = visibleSections.flatMap(sec => {
        const visibleItems = sec.items.filter(item => {
            if (item.path === '/ecommerce' && !canShowOnlineStore) return false;
            if ((item.path === '/marketing' || item.path === '/agent' || item.path === '/analytics') && !canShowAiModules) return false;
            if (item.path === '/admin' || item.path === '/settings') return true;
            const favSidebar = organizationSettings?.favorites?.sidebar || ['/pos', '/inventory', '/clients', '/reports', '/purchases', '/closing'];
            return favSidebar.includes(item.path) || location.pathname === item.path;
        });
        if (visibleItems.length === 0) return [];
        return [
            { label: sec.title === 'Inteligencia Artificial' && !canShowAiModules ? 'Analítica & Proyecciones' : sec.title, isHeader: true },
            ...visibleItems
        ];
    });

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    // 5 core mobile bottom items
    const mobileBottomItems = [
        { label: 'POS', icon: Banknote, path: '/pos' },
        { label: 'Stock', icon: Package, path: '/inventory' },
        { label: 'Clientes', icon: Users, path: '/clients' },
        { label: 'Cierre', icon: DollarSign, path: '/closing' },
    ];

    return (
        <div className="flex h-dvh bg-[var(--bg-canvas)] overflow-hidden transition-colors duration-200 pt-[calc(3.25rem+env(safe-area-inset-top,0px))] sm:pt-[calc(3.75rem+env(safe-area-inset-top,0px))]">
            {/* Sidebar Overlay for Mobile */}
            <div
                className={`fixed inset-0 z-[65] bg-black/60 backdrop-blur-sm md:hidden transition-opacity duration-300 ${
                    isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                }`}
                onClick={() => setIsSidebarOpen(false)}
            />

            {/* Sidebar (Desktop static / Mobile slide-over drawer) */}
            <aside
                className={`fixed md:static z-[70] inset-y-0 left-0 bg-[var(--bg-surface)] border-r border-slate-200/90 transition-all duration-300 ease-in-out flex flex-col pt-[env(safe-area-inset-top,0px)] md:pt-0 shrink-0 ${
                    isSidebarOpen ? 'translate-x-0 w-[290px] shadow-2xl' : '-translate-x-full md:translate-x-0'
                } ${isMini ? 'md:w-20' : 'md:w-64'}`}
            >
                {/* Logo Area / Mobile Header */}
                <div className={`px-4 py-4 border-b border-slate-100 flex items-center justify-between gap-3 ${isMini ? 'justify-center px-2 overflow-hidden' : ''}`}>
                    <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-0.5 rounded-xl text-white shadow-sm shrink-0 flex items-center justify-center w-10 h-10 overflow-hidden border ${
                            isBrandedTenant ? 'bg-[var(--primary)] border-[var(--primary)]/20' : 'bg-slate-900 border-amber-500/30'
                        }`}>
                            {organizationSettings?.logoUrl ? (
                                <img src={organizationSettings.logoUrl} alt="Logo" className="w-full h-full object-cover rounded-lg" />
                            ) : (
                                <img src={BRANDING.logoUrl} alt="Logo" className="w-full h-full object-cover rounded-lg" />
                            )}
                        </div>
                        {!isMini && (
                            <div className="animate-fadeIn min-w-0">
                                <h1 className="text-sm font-black text-slate-900 tracking-tight truncate leading-tight">
                                    {organizationSettings?.businessName || BRANDING.appName}
                                </h1>
                                <p className="text-[11px] text-slate-500 font-semibold truncate mt-0.5">{BRANDING.receiptTagline}</p>
                            </div>
                        )}
                    </div>

                    {/* Close button for mobile drawer */}
                    <button
                        type="button"
                        onClick={() => setIsSidebarOpen(false)}
                        className="md:hidden p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                        aria-label="Cerrar barra lateral"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Symmetric Navigation List */}
                <div className="px-3 py-3 overflow-y-auto flex-1 custom-scrollbar">
                    <nav className="space-y-1">
                        {finalMenuItems.map((item, idx) => {
                            if (item.isHeader) {
                                return (
                                    <div key={idx} className={`px-2.5 pt-4 first:pt-1 pb-1.5 ${isMini ? 'flex justify-center px-0' : ''}`}>
                                        {isMini ? (
                                            <div className="h-px bg-slate-200 w-8" />
                                        ) : (
                                            <p className="text-[10.5px] font-black font-mono text-slate-400 uppercase tracking-widest">
                                                {item.label}
                                            </p>
                                        )}
                                    </div>
                                );
                            }

                            const isActive = item.path ? (location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path))) : false;
                            
                            return (
                                <button
                                    key={item.path || idx}
                                    type="button"
                                    onClick={() => {
                                        if (item.path) {
                                            navigate(item.path);
                                            setIsSidebarOpen(false);
                                        }
                                    }}
                                    title={isMini ? `${item.label} - ${(item as any).desc || ''}` : ''}
                                    className={`w-full flex items-center rounded-xl transition-all duration-150 group border relative ${
                                        isActive
                                            ? isBrandedTenant
                                                ? 'bg-[var(--bg-canvas)] text-[var(--primary)] border-[var(--border-light)] shadow-xs'
                                                : 'bg-teal-50 text-teal-700 border-teal-200 shadow-xs font-black'
                                            : isBrandedTenant
                                                ? 'bg-white text-slate-800 hover:bg-[var(--bg-canvas)] hover:text-[var(--primary)] border-transparent hover:border-[var(--border-light)]'
                                                : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 border-transparent'
                                    } ${isMini ? 'justify-center p-2.5' : 'px-3 py-2.5 gap-3'}`}
                                >
                                    {/* Left Accent Indicator when Active */}
                                    {isActive && !isMini && (
                                        <span
                                            className={`absolute left-0 top-2 bottom-2 w-1 rounded-r-full ${
                                                isBrandedTenant ? 'bg-[var(--primary)]' : 'bg-teal-500'
                                            }`}
                                        />
                                    )}

                                    {item.icon && (
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
                                            isActive
                                                ? isBrandedTenant
                                                    ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-sm'
                                                    : 'bg-teal-600 text-white border-teal-600 shadow-sm font-black'
                                                : isBrandedTenant
                                                    ? 'bg-slate-50 text-slate-600 border-slate-200/80 group-hover:bg-white group-hover:text-[var(--primary)] group-hover:border-[var(--border-light)]'
                                                    : (item as any).color || 'bg-slate-100 text-slate-600 border-slate-200'
                                        }`}>
                                            <item.icon size={17} />
                                        </div>
                                    )}
                                    {!isMini && (
                                        <div className="flex-1 text-left min-w-0">
                                            <div className="flex items-center justify-between gap-1.5">
                                                <span className={`text-[13.5px] font-extrabold truncate leading-snug transition-colors ${
                                                    isActive 
                                                        ? (isBrandedTenant ? 'text-[var(--primary)]' : 'text-teal-700')
                                                        : 'text-slate-800 group-hover:text-[var(--primary)]'
                                                }`}>
                                                    {item.label}
                                                </span>
                                                {isActive && (
                                                    <span className={`w-2 h-2 rounded-full shrink-0 ${
                                                        isBrandedTenant ? 'bg-[var(--primary)]' : 'bg-teal-500'
                                                    }`} />
                                                )}
                                            </div>
                                            {(item as any).desc && (
                                                <p className={`text-[11px] truncate leading-tight mt-0.5 font-medium transition-colors ${
                                                    isActive
                                                        ? 'text-slate-600'
                                                        : 'text-slate-500 group-hover:text-slate-600'
                                                }`}>
                                                    {(item as any).desc}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {/* User Footer & Actions */}
                <div className="mt-auto p-3 border-t border-slate-200/80 bg-slate-50/70">
                    <div className={`flex items-center gap-2.5 px-2.5 py-2 mb-2 rounded-xl bg-white border border-slate-200/70 shadow-2xs ${isMini ? 'justify-center px-0' : ''}`}>
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center font-black text-xs shadow-2xs shrink-0 border ${
                            isBrandedTenant 
                                ? 'bg-[var(--primary)] text-white border-[var(--primary)]' 
                                : 'bg-slate-900 text-teal-400 border-teal-500/30'
                        }`}>
                            {currentUser?.username?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        {!isMini && (
                            <div className="overflow-hidden animate-fadeIn min-w-0">
                                <p className="text-xs font-black text-slate-900 truncate">{currentUser?.username || 'Usuario'}</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="text-[10px] text-slate-500 uppercase font-mono font-bold tracking-wider">{currentUser?.role || 'Staff'}</span>
                                    <span className="text-[10px] font-mono text-slate-400">&middot; Plan {planName}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {!isMini && !isBrandedTenant && (
                        <button
                            type="button"
                            onClick={() => setShowOrgSwitcher(true)}
                            className="w-full flex items-center rounded-xl text-amber-700 bg-amber-50 hover:bg-amber-100 transition-all text-xs font-bold border border-amber-200 gap-2.5 px-3 py-2 mb-1.5 shadow-2xs"
                        >
                            <Building2 size={15} className="shrink-0" />
                            <span className="truncate">Cambiar Negocio</span>
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={handleLogout}
                        className={`w-full flex items-center rounded-xl text-red-600 bg-white hover:bg-red-50 transition-all text-xs font-bold border border-slate-200/80 hover:border-red-200 ${
                            isMini ? 'justify-center p-2' : 'gap-2.5 px-3 py-2'
                        }`}
                    >
                        <LogOut size={15} className="shrink-0" />
                        {!isMini && <span className="animate-fadeIn">Cerrar Sesión</span>}
                    </button>

                    {/* Collapse Toggle Button (Desktop Only) */}
                    <button
                        type="button"
                        onClick={toggleMini}
                        className="hidden lg:flex mt-2 w-full items-center justify-center p-1.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-[var(--primary)] hover:border-[var(--border-light)] transition-all shadow-2xs"
                        title={isMini ? 'Expandir Barra Lateral' : 'Contraer Barra Lateral'}
                    >
                        {isMini ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className={`flex-1 flex flex-col h-full overflow-hidden relative ${accessibility.largeText ? 'text-lg' : ''} ${accessibility.highContrast ? 'high-contrast-mode' : ''}`}>
                <div className={`flex-1 overflow-auto p-1.5 sm:p-2 ${isPosPage ? 'pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-6' : 'pb-[calc(6rem+env(safe-area-inset-bottom,0px))] scroll-pb-[calc(6rem+env(safe-area-inset-bottom,0px))]'} md:pb-6 lg:p-6 ${accessibility.largeText ? 'text-lg' : ''}`}>
                    <div className="w-full max-w-[1720px] mx-auto h-full">
                        {children}
                    </div>
                </div>

                {/* Mobile Sticky Bottom Navigation (Accessible thumb bar) - Oculto en POS para no obstruir la barra de venta y cobro */}
                {!isPosPage && (
                    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 min-h-[4.5rem] bg-white/95 backdrop-blur-md border-t border-slate-200 flex items-center justify-around py-1 safe-bottom w-full shadow-lg">
                        {mobileBottomItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                            return (
                                <button
                                    key={item.path}
                                    type="button"
                                    onClick={() => navigate(item.path)}
                                    className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 min-w-[56px] min-h-[46px] rounded-lg transition-all active:scale-95 ${
                                        isActive 
                                            ? isBrandedTenant ? 'text-[var(--primary)] font-black' : 'text-teal-600 font-black'
                                            : 'text-slate-500 font-semibold'
                                    }`}
                                >
                                    <Icon size={18} className={isActive ? (isBrandedTenant ? 'text-[var(--primary)]' : 'text-teal-600') : 'text-slate-500'} />
                                    <span className="text-[9.5px] uppercase tracking-tight text-center font-mono">{item.label}</span>
                                </button>
                            );
                        })}
                        <button
                            type="button"
                            onClick={() => setIsSidebarOpen(true)}
                            className="flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 min-w-[56px] min-h-[46px] text-slate-500 font-semibold active:scale-95"
                        >
                            <Menu size={18} />
                            <span className="text-[9.5px] uppercase tracking-tight font-mono">Menú</span>
                        </button>
                    </div>
                )}
            </main>

            {/* Modal para alternar organizaciones / negocios */}
            {showOrgSwitcher && (
                <OrganizationSwitcherModal
                    isOpen={showOrgSwitcher}
                    onClose={() => setShowOrgSwitcher(false)}
                />
            )}
        </div>
    );
};

export default DashboardLayout;
