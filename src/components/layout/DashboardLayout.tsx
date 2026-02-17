import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    ShoppingCart,
    Shield,
    Users,
    Package,
    LogOut,
    Menu,
    Store,
    ChefHat,
    Wine,
    LayoutGrid,
    BarChart3,
    DollarSign,
    LucideIcon
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { logout, user } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);

    const menuItems: { label: string; icon?: LucideIcon; path?: string; isHeader?: boolean }[] = [
        { label: 'Operación', isHeader: true },
        { label: 'Punto de Venta', icon: ShoppingCart, path: '/pos' },
        { label: 'Gestión de Cuentas', icon: LayoutGrid, path: '/tables' },
        { label: 'Cocina', icon: ChefHat, path: '/kitchen' },
        { label: 'Bar', icon: Wine, path: '/bar' },

        { label: 'Gestión', isHeader: true },
        { label: 'Inventario', icon: Package, path: '/inventory' },
        { label: 'Clientes', icon: Users, path: '/clients' },
        { label: 'Reportes', icon: BarChart3, path: '/reports' },
        { label: 'Cierre de Caja', icon: DollarSign, path: '/closing' },

        { label: 'Sistema', isHeader: true },
        { label: 'Administración', icon: Shield, path: '/admin' },
    ];

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            {/* Sidebar Overlay for Mobile */}
            <div
                className={`fixed inset-0 z-20 bg-gray-900/50 lg:hidden ${isSidebarOpen ? 'block' : 'hidden'}`}
                onClick={() => setIsSidebarOpen(false)}
            />

            {/* Sidebar */}
            <aside
                className={`fixed lg:static z-30 inset-y-0 left-0 bg-white border-r border-slate-200 transition-all duration-300 ease-in-out flex flex-col ${isSidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0 lg:w-72 lg:static lg:block hidden'
                    } lg:w-72`}
            >
                {/* Logo Area */}
                <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                    <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-200">
                        <Store size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 tracking-tight">Reisbloc</h1>
                        <p className="text-xs text-slate-500 font-medium">Retail & POS System</p>
                    </div>
                </div>

                <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
                    <nav className="space-y-1.5">
                        {menuItems.map((item, idx) => {
                            if (item.isHeader) {
                                return (
                                    <div key={idx} className="px-4 pt-6 pb-2">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{item.label}</p>
                                    </div>
                                );
                            }

                            const isActive = item.path ? (location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path))) : false;
                            return (
                                <button
                                    key={item.path || idx}
                                    onClick={() => item.path && navigate(item.path)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium text-sm group ${isActive
                                        ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200'
                                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                        }`}
                                >
                                    {item.icon && <item.icon size={20} className={isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'} />}
                                    {item.label}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                <div className="mt-auto p-4 border-t border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-3 px-4 py-3 mb-2">
                        <div className="h-10 w-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-indigo-600 font-bold shadow-sm">
                            {user?.username?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-bold text-slate-900 truncate">{user?.username || 'Usuario'}</p>
                            <p className="text-xs text-slate-500 truncate capitalize">{user?.role || 'Staff'}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-red-600 hover:bg-red-50 hover:shadow-sm transition-all text-sm font-bold border border-transparent hover:border-red-100"
                    >
                        <LogOut size={18} />
                        Cerrar Sesión
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
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
