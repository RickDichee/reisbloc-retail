import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';
import { BRANDING } from '@/config/branding';
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
    LucideIcon,
    ChevronLeft,
    ChevronRight,
    Settings,
    Banknote,
    Coins,
    Zap,
    Megaphone,
    Bot,
    TrendingUp
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePlanLimits } from '@/hooks/usePlanLimits';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { currentUser, organizationSettings, accessibility } = useAppStore();
    const { logout } = useAuth();
    const { planName, isPro } = usePlanLimits();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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
    const isMM = BRANDING.isModaMiel;

    const sections = [
        {
            title: 'Sistema',
            roles: ['admin'],
            items: [
                { label: 'Administración', icon: Shield, path: '/admin', roles: ['admin'] }
            ]
        },
        {
            title: 'IA & Marketing',
            roles: ['admin', 'manager'],
            items: [
                { label: 'Marketing AI', icon: Megaphone, path: '/marketing', roles: ['admin', 'manager'] },
                { label: 'IA Agent', icon: Bot, path: '/agent', roles: ['admin', 'manager'] },
                { label: 'Analytics', icon: TrendingUp, path: '/analytics', roles: ['admin', 'manager'] }
            ]
        },
        {
            title: 'Operación',
            roles: ['admin', 'manager', 'cashier', 'employee', 'supervisor'],
            items: [
                { label: 'Punto de Venta', icon: Banknote, path: '/pos', roles: ['admin', 'manager', 'cashier', 'employee', 'supervisor'] },
                { label: 'E-commerce', icon: Store, path: '/ecommerce', roles: ['admin', 'manager'] }
            ]
        },
        {
            title: 'Gestión',
            roles: ['admin', 'manager', 'supervisor', 'cashier'],
            items: [
                { label: 'Inventario', icon: Package, path: '/inventory', roles: ['admin', 'manager', 'supervisor', 'cashier'] },
                { label: 'Clientes', icon: Users, path: '/clients', roles: ['admin', 'manager', 'supervisor'] },
                { label: 'Reportes', icon: BarChart3, path: '/reports', roles: ['admin', 'manager', 'supervisor'] },
                { label: 'Compras', icon: Coins, path: '/purchases', roles: ['admin', 'manager'] },
                { label: 'Cierre de Caja', icon: DollarSign, path: '/closing', roles: ['admin', 'manager', 'cashier', 'supervisor'] }
            ]
        },
        {
            title: 'Configuración',
            roles: ['admin', 'manager'],
            items: [
                { label: 'Accesibilidad y Diseño', icon: Settings, path: '/settings', roles: ['admin', 'manager'] }
            ]
        }
    ];

    const visibleSections = sections.filter(sec => sec.roles.includes(userRole));
    const finalMenuItems = visibleSections.flatMap(sec => {
        const visibleItems = sec.items.filter(item => {
            if (item.path === '/admin' || item.path === '/settings') return true;
            const favSidebar = organizationSettings?.favorites?.sidebar || ['/pos', '/inventory', '/clients', '/reports', '/purchases', '/marketing', '/agent', '/analytics', '/closing', '/ecommerce'];
            return favSidebar.includes(item.path) || location.pathname === item.path;
        });
        if (visibleItems.length === 0) return [];
        return [
            { label: sec.title, isHeader: true },
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
                className={`fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm md:hidden transition-opacity duration-300 ${
                    isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                }`}
                onClick={() => setIsSidebarOpen(false)}
            />

            {/* Sidebar (Desktop static / Mobile slide-over drawer) */}
            <aside
                className={`fixed md:static z-[70] inset-y-0 left-0 bg-[var(--bg-surface)] border-r border-slate-200 dark:border-slate-800 transition-transform duration-300 ease-in-out flex flex-col pt-[calc(3.25rem+env(safe-area-inset-top,0px))] md:pt-0 ${
                    isSidebarOpen ? 'translate-x-0 w-72 shadow-2xl' : '-translate-x-full md:translate-x-0'
                } ${isMini ? 'md:w-20' : 'md:w-72'}`}
            >
                {/* Logo Area / Mobile Header */}
                <div className={`p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 ${isMini ? 'justify-center overflow-hidden' : ''}`}>
                    <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-2 rounded-lg text-white shadow-sm shrink-0 flex items-center justify-center w-10 h-10 overflow-hidden ${
                            isMM ? 'bg-[#D4386C]' : 'bg-slate-900 border border-amber-500/30'
                        }`}>
                            {organizationSettings?.logoUrl ? (
                                <img src={organizationSettings.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                            ) : (
                                <img src={BRANDING.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                            )}
                        </div>
                        {!isMini && (
                            <div className="animate-fadeIn min-w-0">
                                <h1 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight truncate">
                                    {organizationSettings?.businessName || BRANDING.appName}
                                </h1>
                                <p className="text-[11px] text-slate-500 font-medium truncate">{BRANDING.receiptTagline}</p>
                            </div>
                        )}
                    </div>

                    {/* Close button for mobile drawer */}
                    <button
                        type="button"
                        onClick={() => setIsSidebarOpen(false)}
                        className="md:hidden p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        aria-label="Cerrar barra lateral"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-3 overflow-y-auto flex-1 custom-scrollbar">
                    <nav className="space-y-1">
                        {finalMenuItems.map((item, idx) => {
                            if (item.isHeader) {
                                return (
                                    <div key={idx} className={`px-3 pt-5 pb-1.5 ${isMini ? 'flex justify-center' : ''}`}>
                                        {isMini ? (
                                            <div className="h-px bg-slate-200 dark:bg-slate-800 w-full" />
                                        ) : (
                                            <p className="text-[10px] font-black font-mono text-slate-400 dark:text-slate-500 uppercase tracking-widest">{item.label}</p>
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
                                    title={isMini ? item.label : ''}
                                    className={`w-full flex items-center px-3 py-2.5 rounded-lg transition-all duration-150 font-bold text-xs sm:text-sm group border ${
                                        isActive
                                            ? isMM
                                                ? 'bg-pink-50 text-[#D4386C] border-pink-200 shadow-xs'
                                                : 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/30 shadow-xs font-black'
                                            : isMM
                                                ? 'text-slate-700 hover:bg-pink-50 hover:text-[#D4386C] border-transparent'
                                                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white border-transparent'
                                    } ${isMini ? 'justify-center gap-0' : 'gap-3'}`}
                                >
                                    {item.icon && (
                                        <item.icon
                                            size={18}
                                            className={isActive 
                                                ? (isMM ? 'text-[#D4386C]' : 'text-teal-500 dark:text-teal-400') 
                                                : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors'
                                            }
                                        />
                                    )}
                                    {!isMini && <span className="animate-fadeIn whitespace-nowrap">{item.label}</span>}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                <div className="mt-auto p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                    <div className={`flex items-center gap-2.5 px-3 py-2 mb-2 ${isMini ? 'justify-center px-0' : ''}`}>
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold text-xs shadow-xs shrink-0 border ${
                            isMM 
                                ? 'bg-white text-[#D4386C] border-pink-200' 
                                : 'bg-slate-900 text-teal-400 border-teal-500/30'
                        }`}>
                            {currentUser?.username?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        {!isMini && (
                            <div className="overflow-hidden animate-fadeIn min-w-0">
                                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{currentUser?.username || 'Usuario'}</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="text-[9px] text-slate-500 uppercase font-mono font-bold tracking-wider">{currentUser?.role || 'Staff'}</span>
                                    <span className="text-[9px] font-mono text-slate-400">&middot; Plan {planName}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={handleLogout}
                        className={`w-full flex items-center rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all text-xs font-bold border border-transparent hover:border-red-200 dark:hover:border-red-900/40 ${
                            isMini ? 'justify-center p-2' : 'gap-2.5 px-3 py-2'
                        }`}
                    >
                        <LogOut size={16} />
                        {!isMini && <span className="animate-fadeIn">Cerrar Sesión</span>}
                    </button>

                    {/* Collapse Toggle Button (Desktop Only) */}
                    <button
                        type="button"
                        onClick={toggleMini}
                        className="hidden lg:flex mt-2 w-full items-center justify-center p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all shadow-2xs"
                        title={isMini ? 'Expandir Barra Lateral' : 'Contraer Barra Lateral'}
                    >
                        {isMini ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className={`flex-1 flex flex-col h-full overflow-hidden relative ${accessibility.largeText ? 'text-lg' : ''} ${accessibility.highContrast ? 'high-contrast-mode' : ''}`}>
                <div className={`flex-1 overflow-auto p-2 pb-20 md:pb-6 lg:p-6 ${accessibility.largeText ? 'text-lg' : ''}`}>
                    <div className="max-w-7xl mx-auto h-full">
                        {children}
                    </div>
                </div>

                {/* Mobile Sticky Bottom Navigation (Accessible thumb bar) */}
                <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0B0F19]/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex items-center justify-around py-1 safe-bottom w-full shadow-lg">
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
                                        ? isMM ? 'text-[#D4386C] font-black' : 'text-teal-600 dark:text-teal-400 font-black'
                                        : 'text-slate-400 font-semibold'
                                }`}
                            >
                                <Icon size={18} className={isActive ? (isMM ? 'text-[#D4386C]' : 'text-teal-500 dark:text-teal-400') : 'text-slate-400'} />
                                <span className="text-[9.5px] uppercase tracking-tight text-center font-mono">{item.label}</span>
                            </button>
                        );
                    })}
                    <button
                        type="button"
                        onClick={() => setIsSidebarOpen(true)}
                        className="flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 min-w-[56px] min-h-[46px] text-slate-400 font-semibold active:scale-95"
                    >
                        <Menu size={18} />
                        <span className="text-[9.5px] uppercase tracking-tight font-mono">Menú</span>
                    </button>
                </div>
            </main>
        </div>
    );
};

export default DashboardLayout;
