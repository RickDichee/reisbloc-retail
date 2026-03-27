import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import { usePermissions } from '@/hooks/usePermissions'
import {
    Settings as SettingsIcon,
    Smartphone,
    FileText,
    Save,
    Globe,
    LayoutDashboard,
    ShieldCheck,
    ShoppingBag,
    Users,
    BarChart3,
    DollarSign,
    Banknote,
    Coins,
    Store,
    Megaphone,
    Bot,
    TrendingUp
} from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import DeviceApprovalPanel from '@/components/admin/DeviceApprovalPanel'
import AuditLogs from '@/components/admin/AuditLogs'
import { supabase } from '@/config/supabase'
import supabaseService from '@/services/supabaseService'
import logger from '@/utils/logger'

type SettingsTab = 'interface' | 'devices' | 'logs' | 'branding'

export default function Settings() {
    const { currentUser, setOrganizationSettings, accessibility, setAccessibility } = useAppStore()
    const { canManageDevices, canViewLogs } = usePermissions()
    const [activeTab, setActiveTab] = useState<SettingsTab>('interface')
    const [loading, setLoading] = useState(false)

    // Estado local para personalización de interfaz
    const [favorites, setFavorites] = useState<{ sidebar: string[], navbar: string[] }>({
        sidebar: ['/pos', '/tables', '/inventory', '/clients', '/reports'],
        navbar: ['/pos', '/inventory', '/reports']
    })
    const [posMode, setPosMode] = useState<'restaurant' | 'retail'>('retail')

    useEffect(() => {
        const loadOrgSettings = async () => {
            if (!currentUser?.organizationId) return
            try {
                const { data, error } = await supabase
                    .from('organizations')
                    .select('settings')
                    .eq('id', currentUser.organizationId)
                    .maybeSingle()

                if (error) throw error
                if (data?.settings) {
                    setOrganizationSettings(data.settings)
                    if (data.settings.favorites) {
                        setFavorites(data.settings.favorites)
                    }
                    // Force Retail Mode always
                    setPosMode('retail')
                }
            } catch (e) {
                logger.error('settings', 'Error loading org settings', e as any)
            }
        }
        loadOrgSettings()
    }, [currentUser?.organizationId, setOrganizationSettings])

    const saveInterfaceSettings = async (newFavorites: typeof favorites, newPosMode: typeof posMode) => {
        if (!currentUser?.organizationId) return
        setLoading(true)
        try {
            const { data: orgData, error: fetchError } = await supabase
                .from('organizations')
                .select('settings')
                .eq('id', currentUser.organizationId)
                .single()

            if (fetchError) throw fetchError

            const currentSettings = orgData?.settings || {}
            const updatedSettings = {
                ...currentSettings,
                favorites: newFavorites,
                posMode: newPosMode
            }

            const { error } = await supabase
                .from('organizations')
                .update({
                    settings: updatedSettings
                })
                .eq('id', currentUser.organizationId)

            if (error) throw error

            // 📝 Registro de Auditoría
            await supabaseService.createAuditLog({
                userId: currentUser.id,
                action: 'UPDATE_ORG_SETTINGS',
                entityType: 'organization',
                entityId: currentUser.organizationId,
                oldValue: currentSettings
            })

            setFavorites(newFavorites)
            setPosMode(newPosMode)
            setOrganizationSettings(updatedSettings)

            // También actualizar al usuario actual para que el Layout se entere de inmediato
            if (currentUser) {
                const { setCurrentUser } = useAppStore.getState()
                setCurrentUser({
                    ...currentUser,
                    organizationSettings: updatedSettings
                })
            }

            alert('✅ Configuración guardada correctamente')
        } catch (e) {
            logger.error('settings', 'Error al guardar interfaz', e as any)
            alert('❌ Error al guardar la configuración')
        } finally {
            setLoading(false)
        }
    }

    const toggleFavorite = (type: 'sidebar' | 'navbar', path: string) => {
        const current = [...favorites[type]]
        const index = current.indexOf(path)

        if (index > -1) {
            current.splice(index, 1)
        } else {
            if (type === 'navbar' && current.length >= 6) {
                alert('Máximo 6 elementos en la barra superior.')
                return
            }
            current.push(path)
        }

        setFavorites({ ...favorites, [type]: current })
    }

    if (!currentUser) return <Navigate to="/login" replace />
    if (currentUser.role !== 'admin') return <Navigate to="/pos" replace />

    const tabs = [
        { id: 'interface' as SettingsTab, label: 'Accesibilidad e Interfaz', icon: LayoutDashboard },
        { id: 'devices' as SettingsTab, label: 'Dispositivos', icon: Smartphone, enabled: canManageDevices },
        { id: 'branding' as SettingsTab, label: 'Marca Blanca', icon: Globe },
        { id: 'logs' as SettingsTab, label: 'Seguridad', icon: FileText, enabled: canViewLogs },
    ]

    const availableModules = [
        { id: '/pos', label: 'Punto de Venta', icon: Banknote },
        { id: '/tables', label: 'Gestión de Cuentas', icon: LayoutDashboard },
        { id: '/ecommerce', label: 'E-commerce', icon: Store },
        { id: '/inventory', label: 'Inventario', icon: ShoppingBag },
        { id: '/clients', label: 'Clientes', icon: Users },
        { id: '/reports', label: 'Reportes', icon: BarChart3 },
        { id: '/closing', label: 'Cierre de Caja', icon: DollarSign },
        { id: '/purchases', label: 'Compras', icon: Coins },
        { id: '/admin', label: 'Administración', icon: ShieldCheck },
        { id: '/marketing', label: 'Marketing AI', icon: Megaphone, ai: true },
        { id: '/agent', label: 'IA Agent', icon: Bot, ai: true },
        { id: '/analytics', label: 'Analytics', icon: TrendingUp, ai: true },
    ]

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-lg">
                            <SettingsIcon size={32} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">CONFIGURACIÓN</h1>
                            <p className="text-slate-500 font-medium">Personalización y ajustes del sistema</p>
                        </div>
                    </div>
                    <button
                        onClick={() => saveInterfaceSettings(favorites, posMode)}
                        disabled={loading}
                        className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                    >
                        {loading ? 'Guardando...' : <><Save size={20} /> Guardar Cambios</>}
                    </button>
                </div>

                {/* Tabs Bar */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {tabs.filter(t => t.enabled !== false).map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === tab.id
                                ? 'bg-slate-900 text-white shadow-xl'
                                : 'bg-white text-slate-500 border border-slate-100 hover:border-slate-200'
                                }`}
                        >
                            <tab.icon size={20} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="animate-fadeIn">
                    {activeTab === 'interface' && (
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 space-y-12">
                            {/* ♿ Accessibility Section */}
                            <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100 mb-8">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="p-3 bg-indigo-600 text-white rounded-xl shadow-md">
                                        <LayoutDashboard size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Accesibilidad Universal</h3>
                                        <p className="text-slate-600 font-medium text-sm">Adaptamos la experiencia para todos los usuarios.</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* High Contrast Toggle */}
                                    <div className="bg-white p-4 rounded-xl border border-indigo-100 flex items-center justify-between shadow-sm">
                                        <span className="font-bold text-slate-700">Modo Alto Contraste</span>
                                        <button
                                            onClick={() => setAccessibility({ highContrast: !accessibility.highContrast })}
                                            className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${accessibility.highContrast ? 'bg-indigo-600' : 'bg-slate-200'}`}
                                        >
                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${accessibility.highContrast ? 'left-7' : 'left-1'}`}></div>
                                        </button>
                                    </div>

                                    {/* Large Text Toggle */}
                                    <div className="bg-white p-4 rounded-xl border border-indigo-100 flex items-center justify-between shadow-sm">
                                        <span className="font-bold text-slate-700">Texto Grande (Lectura Fácil)</span>
                                        <button
                                            onClick={() => setAccessibility({ largeText: !accessibility.largeText })}
                                            className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${accessibility.largeText ? 'bg-indigo-600' : 'bg-slate-200'}`}
                                        >
                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${accessibility.largeText ? 'left-7' : 'left-1'}`}></div>
                                        </button>
                                    </div>
                                </div>
                                <p className="mt-3 text-xs text-indigo-500 font-bold text-center">
                                    * La configuración se guarda automáticamente en este dispositivo.
                                </p>
                            </div>


                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                                {/* Sidebar Setup */}
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-black text-slate-800 uppercase tracking-tighter text-lg">Sidebar (Panel Lateral)</h3>
                                        <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                                            {favorites.sidebar.length} Activos
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2">
                                        {availableModules.map(module => (
                                            <label
                                                key={`sidebar-${module.id}`}
                                                className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer group ${favorites.sidebar.includes(module.id)
                                                    ? 'border-slate-900 bg-slate-900 text-white shadow-xl'
                                                    : 'border-slate-100 bg-white hover:border-slate-200'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <module.icon size={20} className={favorites.sidebar.includes(module.id) ? 'text-white' : 'text-slate-400 group-hover:text-slate-900'} />
                                                    <span className="font-bold text-sm">{module.label}</span>
                                                    {(module as any).ai && (
                                                        <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 text-[10px] font-black rounded uppercase">
                                                            IA
                                                        </span>
                                                    )}
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    className="hidden"
                                                    checked={favorites.sidebar.includes(module.id)}
                                                    onChange={() => toggleFavorite('sidebar', module.id)}
                                                />
                                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${favorites.sidebar.includes(module.id) ? 'bg-emerald-400 border-emerald-400' : 'border-slate-200'}`}>
                                                    {favorites.sidebar.includes(module.id) && <Save size={12} className="text-white" />}
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Navbar Setup */}
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-black text-slate-800 uppercase tracking-tighter text-lg">Navbar (Barra Superior)</h3>
                                        <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                                            {favorites.navbar.length} / 6
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2">
                                        {availableModules.map(module => (
                                            <label
                                                key={`navbar-${module.id}`}
                                                className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer group ${favorites.navbar.includes(module.id)
                                                    ? 'border-emerald-500 bg-emerald-500 text-white shadow-xl'
                                                    : 'border-slate-100 bg-white hover:border-slate-200'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <module.icon size={20} className={favorites.navbar.includes(module.id) ? 'text-white' : 'text-slate-400 group-hover:text-emerald-600'} />
                                                    <span className="font-bold text-sm">{module.label}</span>
                                                    {(module as any).ai && (
                                                        <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 text-[10px] font-black rounded uppercase">
                                                            IA
                                                        </span>
                                                    )}
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    className="hidden"
                                                    checked={favorites.navbar.includes(module.id)}
                                                    onChange={() => toggleFavorite('navbar', module.id)}
                                                />
                                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${favorites.navbar.includes(module.id) ? 'bg-white border-white' : 'border-slate-200'}`}>
                                                    {favorites.navbar.includes(module.id) && <Save size={12} className="text-emerald-500" />}
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'devices' && <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100"><DeviceApprovalPanel /></div>}
                    {activeTab === 'logs' && <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100"><AuditLogs /></div>}
                    {activeTab === 'branding' && (
                        <div className="bg-white rounded-3xl p-12 text-center text-slate-400 space-y-4">
                            <Globe size={64} className="mx-auto opacity-20" />
                            <h2 className="text-2xl font-black text-slate-900">Configuración de Marca Blanca</h2>
                            <p className="max-w-md mx-auto">Sube tu logo, establece tus colores corporativos y personaliza el subdominio de tu catálogo digital.</p>
                            <div className="pt-8">
                                <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-xs font-black uppercase">Módulo Pro en Desarrollo</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    )
}

