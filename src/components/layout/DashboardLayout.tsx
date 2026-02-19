import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';
import {
    Shield,
    Users,
    Package,
    LogOut,
    Menu,
    Store,
    LayoutGrid,
    BarChart3,
    DollarSign,
    LucideIcon,
    ChevronLeft,
    ChevronRight,
    Settings,
    Banknote,
    Coins
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { currentUser, organizationSettings } = useAppStore();
    const { logout } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isMini, setIsMini] = useState(() => {
        const saved = localStorage.getItem('sidebar_mini');
        return saved === 'true';
    });

    const toggleMini = () => {
        const newState = !isMini;
        setIsMini(newState);
        localStorage.setItem('sidebar_mini', String(newState));
    };

    const menuItems: { label: string; icon?: LucideIcon; path?: string; isHeader?: boolean }[] = [
        { label: 'Sistema', isHeader: true },
        { label: 'Administración', icon: Shield, path: '/admin' },

        { label: 'Operación', isHeader: true },
        { label: 'Punto de Venta', icon: Banknote, path: '/pos' },
        { label: 'Monitor de Operaciones', icon: LayoutGrid, path: '/tables' },
        { label: 'E-commerce', icon: Store, path: '/ecommerce' },

        { label: 'Gestión', isHeader: true },
        { label: 'Inventario', icon: Package, path: '/inventory' },
        { label: 'Clientes', icon: Users, path: '/clients' },
        { label: 'Reportes', icon: BarChart3, path: '/reports' },
        { label: 'Compras', icon: Coins, path: '/purchases' },
        { label: 'Cierre de Caja', icon: DollarSign, path: '/closing' },

        { label: 'Configuración', isHeader: true },
        { label: 'Accesibilidad y Diseño', icon: Settings, path: '/settings' },
    ];

    const DEFAULT_SIDEBAR_ITEMS = ['/pos', '/tables', '/inventory', '/clients', '/reports', '/purchases'];

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    return (
        <div className="flex h-dvh bg-[var(--bg-canvas)] overflow-hidden transition-colors duration-200">
            {/* Sidebar Overlay for Mobile */}
            <div
                className={`fixed inset-0 z-20 bg-gray-900/50 lg:hidden ${isSidebarOpen ? 'block' : 'hidden'}`}
                onClick={() => setIsSidebarOpen(false)}
            />

            {/* Sidebar */}
            <aside
                className={`fixed lg:static z-30 inset-y-0 left-0 bg-[var(--bg-surface)] border-r border-slate-200 transition-all duration-300 ease-in-out flex flex-col ${isSidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0'
                    } ${isMini ? 'lg:w-20' : 'lg:w-72'}`}
            >
                {/* Logo Area */}
                <div className={`p-6 border-b border-slate-100 flex items-center gap-3 ${isMini ? 'justify-center overflow-hidden' : ''}`}>
                    <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-200 shrink-0">
                        <Store size={24} />
                    </div>
                    {!isMini && (
                        <div className="animate-fadeIn">
                            <h1 className="text-xl font-black text-slate-900 tracking-tight">Reisbloc</h1>
                            <p className="text-xs text-slate-500 font-medium">Retail & POS System</p>
                        </div>
                    )}
                </div>

                <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
                    <nav className="space-y-1.5">
                        {menuItems.filter(item => {
                            if (item.isHeader) return true;
                            if (item.path === '/admin' || item.path === '/settings') return true;

                            // 🛡️ Fallback: Si no hay configuración, mostrar los básicos
                            const visibleItems = organizationSettings?.favorites?.sidebar || DEFAULT_SIDEBAR_ITEMS;
                            return visibleItems.includes(item.path) || location.pathname === item.path;
                        }).map((item, idx) => {
                            if (item.isHeader) {
                                return (
                                    <div key={idx} className={`px-4 pt-6 pb-2 ${isMini ? 'flex justify-center' : ''}`}>
                                        {isMini ? (
                                            <div className="h-px bg-slate-100 w-full" />
                                        ) : (
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{item.label}</p>
                                        )}
                                    </div>
                                );
                            }

                            const isActive = item.path ? (location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path))) : false;
                            return (
                                <button
                                    key={item.path || idx}
                                    onClick={() => item.path && navigate(item.path)}
                                    title={isMini ? item.label : ''}
                                    className={`w-full flex items-center px-4 py-3 rounded-xl transition-all duration-200 font-medium text-sm group ${isActive
                                        ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200'
                                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                        } ${isMini ? 'justify-center gap-0' : 'gap-3'}`}
                                >
                                    {item.icon && <item.icon size={20} className={isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'} />}
                                    {!isMini && <span className="animate-fadeIn whitespace-nowrap">{item.label}</span>}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                <div className="mt-auto p-4 border-t border-slate-100 bg-slate-50/50">
                    <div className={`flex items-center gap-3 px-4 py-3 mb-2 ${isMini ? 'justify-center px-0' : ''}`}>
                        <div className="h-10 w-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-indigo-600 font-bold shadow-sm shrink-0">
                            {currentUser?.username?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        {!isMini && (
                            <div className="overflow-hidden animate-fadeIn">
                                <p className="text-sm font-bold text-slate-900 truncate">{currentUser?.username || 'Usuario'}</p>
                                <p className="text-xs text-slate-500 truncate capitalize">{currentUser?.role || 'Staff'}</p>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={handleLogout}
                        className={`w-full flex items-center rounded-xl text-red-600 hover:bg-red-50 hover:shadow-sm transition-all text-sm font-bold border border-transparent hover:border-red-100 ${isMini ? 'justify-center p-2.5' : 'gap-3 px-4 py-2.5'}`}
                    >
                        <LogOut size={18} />
                        {!isMini && <span className="animate-fadeIn">Cerrar Sesión</span>}
                    </button>

                    {/* Collapse Toggle Button (Desktop Only) */}
                    <button
                        onClick={toggleMini}
                        className="hidden lg:flex mt-4 w-full items-center justify-center p-2 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all shadow-sm"
                        title={isMini ? 'Expandir Sidebar' : 'Contraer Sidebar'}
                    >
                        {isMini ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-full overflow-hidden relative">
                <div className="flex-1 overflow-auto p-2 lg:p-8">
                    <div className="max-w-7xl mx-auto h-full">
                        {children}
                    </div>
                </div>

                {/* Mobile Bottom Navigation */}
                <div className="lg:hidden bg-white border-t border-slate-200 flex items-center justify-around py-1 safe-bottom w-full overflow-hidden">
                    {menuItems.filter(item => !item.isHeader && ['Punto de Venta', 'Gestión de Cuentas', 'Cierre de Caja'].includes(item.label)).map((item) => {
                        const Icon = item.icon!;
                        const isActive = location.pathname === item.path;
                        return (
                            <button
                                key={item.path}
                                onClick={() => item.path && navigate(item.path)}
                                className={`flex flex-col items-center justify-center gap-0.5 px-2 py-2 min-w-[60px] min-h-[48px] rounded-xl transition-all ${isActive ? 'text-slate-900' : 'text-slate-400'}`}
                            >
                                <Icon size={20} className={isActive ? 'text-slate-900' : 'text-slate-400'} />
                                <span className="text-[9px] font-black uppercase tracking-tight text-center">{item.label.split(' ').pop()}</span>
                            </button>
                        );
                    })}
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="flex flex-col items-center justify-center gap-0.5 px-2 py-2 min-w-[60px] min-h-[48px] text-slate-400"
                    >
                        <Menu size={20} />
                        <span className="text-[9px] font-black uppercase tracking-tight">Más</span>
                    </button>
                </div>
            </main>
        </div>
    );
};

export default DashboardLayout;
