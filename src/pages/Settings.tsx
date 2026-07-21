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
    TrendingUp,
    Upload,
    Check,
    AlertCircle
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
        { id: 'branding' as SettingsTab, label: 'Marca y Catálogo', icon: Globe },
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
                        <BrandingSettings currentUser={currentUser} />
                    )}
                </div>
            </div>
        </DashboardLayout>
    )
}

function BrandingSettings({ currentUser }: { currentUser: any }) {
    const [org, setOrg] = useState<any>(null)
    const [slug, setSlug] = useState('')
    const [logoUrl, setLogoUrl] = useState('')
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [error, setError] = useState('')
    const [checkingSlug, setCheckingSlug] = useState(false)

    // Ticket Settings States
    const [ticketShowLogo, setTicketShowLogo] = useState(true)
    const [ticketBusinessName, setTicketBusinessName] = useState('')
    const [ticketAddress, setTicketAddress] = useState('')
    const [ticketPhone, setTicketPhone] = useState('')
    const [ticketFooterMsg, setTicketFooterMsg] = useState('¡Gracias por su compra!')

    useEffect(() => {
        const loadOrg = async () => {
            if (!currentUser?.organizationId) return
            const data = await supabaseService.getOrganizationById(currentUser.organizationId)
            if (data) {
                setOrg(data)
                setSlug(data.slug || '')
                setLogoUrl(data.logo_url || '')
                
                const s = data.settings || {}
                setTicketShowLogo(s.ticketShowLogo ?? true)
                setTicketBusinessName(s.ticketBusinessName || '')
                setTicketAddress(s.ticketAddress || '')
                setTicketPhone(s.ticketPhone || '')
                setTicketFooterMsg(s.ticketFooterMsg || '¡Gracias por su compra!')
            }
        }
        loadOrg()
    }, [currentUser?.organizationId])

    const isValidSlug = (s: string) => /^[a-z0-9-]+$/.test(s) && s.length >= 3 && s.length <= 50

    const checkSlugAvailability = async (newSlug: string) => {
        if (!isValidSlug(newSlug) || newSlug === org?.slug) return true
        setCheckingSlug(true)
        try {
            const exists = await supabaseService.getOrganizationBySlug(newSlug)
            setCheckingSlug(false)
            return !exists
        } catch {
            setCheckingSlug(false)
            return false
        }
    }

    const handleSlugChange = async (value: string) => {
        const sanitized = value.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-')
        setSlug(sanitized)
        setSaved(false)
        setError('')
    }

    const handleSave = async () => {
        if (!isValidSlug(slug)) {
            setError('El slug debe tener entre 3 y 50 caracteres (solo letras, números y guiones)')
            return
        }

        const available = await checkSlugAvailability(slug)
        if (!available) {
            setError('Este enlace ya está en uso. Prueba otro.')
            return
        }

        setSaving(true)
        setError('')
        try {
            const updatedSettings = {
                ...(org?.settings || {}),
                ticketShowLogo,
                ticketBusinessName,
                ticketAddress,
                ticketPhone,
                ticketFooterMsg
            }

            await supabase
                .from('organizations')
                .update({ 
                    slug: slug.trim(),
                    logo_url: logoUrl.trim(),
                    settings: updatedSettings
                })
                .eq('id', currentUser.organizationId)

            useAppStore.setState({
                currentUser: {
                    ...currentUser,
                    organizationSettings: updatedSettings
                }
            })
            
            setSaved(true)
            setTimeout(() => setSaved(false), 3000)
        } catch (e: any) {
            setError(e.message || 'Error al guardar')
        } finally {
            setSaving(false)
        }
    }

    const storeUrl = slug ? `${window.location.origin}/p/${slug}` : ''

    return (
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 space-y-8">
            <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
                <div className="p-3 bg-purple-100 rounded-xl">
                    <Globe size={24} className="text-purple-600" />
                </div>
                <div>
                    <h2 className="text-xl font-black text-slate-900">Tu Tienda Online</h2>
                    <p className="text-sm text-slate-500">Personaliza el enlace y logo de tu catálogo digital</p>
                </div>
            </div>

            {/* Logo Upload */}
            <div className="space-y-4">
                <label className="block text-sm font-bold text-slate-700">Logo de tu negocio</label>
                <div className="flex items-center gap-6">
                    <div className="w-24 h-24 bg-slate-100 rounded-2xl overflow-hidden flex items-center justify-center border-2 border-dashed border-slate-300">
                        {logoUrl ? (
                            <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                            <Globe size={32} className="text-slate-300" />
                        )}
                    </div>
                    <div className="flex-1">
                        <input
                            type="text"
                            value={logoUrl}
                            onChange={(e) => setLogoUrl(e.target.value)}
                            placeholder="URL de tu logo (https://...)"
                            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl font-bold focus:border-purple-500 outline-none"
                        />
                        <p className="text-xs text-slate-400 mt-2">Sube tu logo a Storage o usa una URL pública</p>
                    </div>
                </div>
            </div>

            {/* Slug / Subdomain */}
            <div className="space-y-4">
                <label className="block text-sm font-bold text-slate-700">Enlace de tu tienda</label>
                <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-bold">{window.location.origin}/p/</span>
                    <input
                        type="text"
                        value={slug}
                        onChange={(e) => handleSlugChange(e.target.value)}
                        placeholder="mi-negocio"
                        className="flex-1 px-4 py-3 border-2 border-slate-200 rounded-xl font-mono font-bold focus:border-purple-500 outline-none"
                    />
                </div>
                {slug && isValidSlug(slug) && (
                    <div className="flex items-center gap-2 text-sm">
                        {checkingSlug ? (
                            <span className="text-slate-400">Verificando...</span>
                        ) : slug === org?.slug ? (
                            <span className="text-emerald-600 font-bold flex items-center gap-1">
                                <Check size={14} /> Tu enlace actual
                            </span>
                        ) : (
                            <span className="text-emerald-600 font-bold flex items-center gap-1">
                                <Check size={14} /> Disponible
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Preview Link */}
            {slug && isValidSlug(slug) && (
                <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100">
                    <p className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-2">Vista previa</p>
                    <div className="flex items-center justify-between">
                        <a 
                            href={storeUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-lg font-black text-purple-700 hover:underline"
                        >
                            {storeUrl}
                        </a>
                        <a
                            href={storeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700"
                        >
                            Visitar →
                        </a>
                    </div>
                </div>
            )}

            {/* Ticket Customization Section */}
            <div className="space-y-6 pt-6 border-t border-slate-100">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                        <FileText size={20} />
                    </div>
                    <div>
                        <h3 className="text-md font-black text-slate-800 uppercase tracking-tight">Diseño de Ticket Impreso</h3>
                        <p className="text-xs text-slate-500 font-medium">Configura la información visible en tus tickets de venta</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 p-6 rounded-2xl border border-slate-200/50">
                    <div className="flex items-center gap-3 md:col-span-2 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                        <input
                            type="checkbox"
                            id="ticketShowLogoBranding"
                            checked={ticketShowLogo}
                            onChange={(e) => setTicketShowLogo(e.target.checked)}
                            className="w-5 h-5 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                        />
                        <label htmlFor="ticketShowLogoBranding" className="text-sm font-black text-slate-700 cursor-pointer uppercase tracking-tight">
                            Mostrar logotipo de tu marca en el ticket
                        </label>
                    </div>

                    <div>
                        <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-widest text-[9px]">
                            Nombre del Negocio (Ticket)
                        </label>
                        <input
                            type="text"
                            value={ticketBusinessName}
                            onChange={(e) => setTicketBusinessName(e.target.value)}
                            placeholder="Ej. MODA MIEL MX"
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-600 outline-none font-bold text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-widest text-[9px]">
                            Teléfono de contacto (Ticket)
                        </label>
                        <input
                            type="text"
                            value={ticketPhone}
                            onChange={(e) => setTicketPhone(e.target.value)}
                            placeholder="Ej. 55-1234-5678"
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-600 outline-none font-bold text-sm"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-widest text-[9px]">
                            Dirección comercial (Ticket)
                        </label>
                        <input
                            type="text"
                            value={ticketAddress}
                            onChange={(e) => setTicketAddress(e.target.value)}
                            placeholder="Ej. Av. Principal 123, Col. Centro"
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-600 outline-none font-bold text-sm"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-widest text-[9px]">
                            Mensaje de Pie de Página (Ticket)
                        </label>
                        <input
                            type="text"
                            value={ticketFooterMsg}
                            onChange={(e) => setTicketFooterMsg(e.target.value)}
                            placeholder="Ej. ¡Gracias por su compra! Con su ticket tiene 15 días para cambios."
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-600 outline-none font-bold text-sm"
                        />
                    </div>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="flex items-center gap-2 p-4 bg-red-50 text-red-600 rounded-xl">
                    <AlertCircle size={18} />
                    <span className="font-bold text-sm">{error}</span>
                </div>
            )}

            {/* Save Button */}
            <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                    onClick={handleSave}
                    disabled={saving || !slug}
                    className={`flex items-center gap-2 px-8 py-4 rounded-xl font-bold transition-all ${
                        saved 
                            ? 'bg-emerald-500 text-white' 
                            : 'bg-purple-600 text-white hover:bg-purple-700'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                    {saving ? (
                        'Guardando...'
                    ) : saved ? (
                        <>
                            <Check size={20} /> Guardado
                        </>
                    ) : (
                        <>
                            <Save size={20} /> Guardar Configuración
                        </>
                    )}
                </button>
            </div>
        </div>
    )
}
