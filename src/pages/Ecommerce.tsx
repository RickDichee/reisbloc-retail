import DashboardLayout from '@/components/layout/DashboardLayout'
import { ShoppingBag, Globe, ExternalLink, Activity } from 'lucide-react'
import { useAppStore } from '@/store/appStore'

export default function Ecommerce() {
    const { currentUser } = useAppStore()
    const storeUrl = `${window.location.origin}/p/${currentUser?.organizationId || 'demo'}`

    return (
        <DashboardLayout>
            <div className="space-y-6 animate-fadeIn">
                {/* Header */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-purple-600 text-white rounded-2xl shadow-lg shadow-purple-200">
                            <ShoppingBag size={32} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">E-COMMERCE</h1>
                            <p className="text-slate-500 font-medium">Gestiona tu tienda en línea y pedidos digitales.</p>
                        </div>
                    </div>
                    <a href={storeUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl">
                        <Globe size={20} />
                        Ver Tienda Online
                        <ExternalLink size={16} className="text-slate-400" />
                    </a>
                </div>

                {/* Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Stats Cards */}
                    <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                                    <Activity size={20} />
                                </div>
                                <span className="font-bold text-slate-600 text-sm uppercase">Ventas Online (Mes)</span>
                            </div>
                            <div className="text-4xl font-black text-slate-900">$0.00</div>
                        </div>
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                                    <Globe size={20} />
                                </div>
                                <span className="font-bold text-slate-600 text-sm uppercase">Visitas</span>
                            </div>
                            <div className="text-4xl font-black text-slate-900">0</div>
                        </div>
                    </div>

                    {/* Setup Guide */}
                    <div className="bg-purple-50 p-6 rounded-3xl border border-purple-100 lg:row-span-2">
                        <h3 className="text-xl font-black text-purple-900 mb-4">Tu Tienda Digital</h3>
                        <p className="text-purple-700/80 mb-6 font-medium">Configura tu catálogo para vender en línea automáticamente.</p>

                        <div className="space-y-4">
                            <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-purple-100/50">
                                <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs">✓</div>
                                <span className="font-bold text-purple-900 text-sm">Crear cuenta</span>
                            </div>
                            <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-purple-100/50 opacity-60">
                                <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-xs">2</div>
                                <span className="font-bold text-slate-900 text-sm">Publicar Productos</span>
                            </div>
                            <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-purple-100/50 opacity-60">
                                <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-xs">3</div>
                                <span className="font-bold text-slate-900 text-sm">Configurar Envíos</span>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-purple-200/50 text-center">
                            <p className="text-xs font-black text-purple-400 uppercase tracking-widest">Próximamente v4.5</p>
                        </div>
                    </div>

                    {/* Placeholder Area */}
                    <div className="lg:col-span-2 h-64 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 gap-4">
                        <ShoppingBag size={48} className="opacity-20" />
                        <p className="font-bold">El panel de gestión de pedidos online estará disponible pronto.</p>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    )
}
