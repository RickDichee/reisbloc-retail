import { useState, useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import { usePermissions } from '@/hooks/usePermissions'
import { useAuth } from '@/hooks/useAuth'
import {
  Users,
  UserCheck,
  Package,
  Smartphone,
  FileText,
  Settings,
  Palette,
  ArrowLeft,
  ShoppingCart,
  Bot,
  BarChart3,
  DollarSign,
  Puzzle,
  Percent,
  Globe,
  LifeBuoy
} from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import DeviceApprovalPanel from '@/components/admin/DeviceApprovalPanel'
import AdminCard from '@/components/common/AdminCard'
import UsersManagement from '@/components/admin/UsersManagement'
import InventoryManagement from '@/components/admin/InventoryManagement'
import AuditLogsPanel from '@/components/admin/AuditLogsPanel'
import { shiftService } from '@/services/shiftService'
import logger from '@/utils/logger'
import AvatarUpload from '@/components/admin/AvatarUpload'
import { supabase } from '@/config/supabase'

import AIInsightsWidget from '@/components/common/AIInsightsWidget'
import PurchasesManagement from '@/components/admin/PurchasesManagement'
import supabaseService from '@/services/supabaseService'
import ClientsManagement from '@/components/admin/ClientsManagement'

type AdminTab = 'hub' | 'devices' | 'users' | 'inventory' | 'logs' | 'settings' | 'clients' | 'purchases' | 'llm' | 'reports' | 'closing' | 'integrations' | 'promotions' | 'ecommerce' | 'support'

export default function Admin() {
  const navigate = useNavigate()
  const { currentUser } = useAppStore()
  const { logout } = useAuth()
  const { canManageUsers, canManageInventory, canManageDevices, canViewLogs } = usePermissions()
  const [activeTab, setActiveTab] = useState<AdminTab>('hub')

  // Estado local para personalización (esto luego vendrá de useAppStore)
  const [brandColor, setBrandColor] = useState('neon')
  const [openingAmount, setOpeningAmount] = useState<string>('')
  const [activeShift, setActiveShift] = useState<any>(null)
  const [loadingShift, setLoadingShift] = useState(true)

  // AI Insights Data
  const [aiMetrics, setAiMetrics] = useState<any>(null)
  const [aiTopProducts, setAiTopProducts] = useState<any[]>([])
  const [loadingAI, setLoadingAI] = useState(false)

  // 🔒 Verificación de Seguridad: Blindaje para reisbloc-lab
  useEffect(() => {
    if (currentUser && currentUser.organizationId) {
      // 🛡️ ID Maestro Reisbloc Lab (v3.7.3)
      const isDevOrg = currentUser.organizationId === '8ba45da3-7373-4c9f-867f-5ea2d8300cc6'
      if (currentUser.username === 'admin' && !isDevOrg) {
        logger.warn('security', '⚠️ Intento de acceso administrativo desde organización no autorizada')
        // Aquí podrías forzar un logout si fuera necesario
      }
    }
  }, [currentUser])

  // 🎨 Cargar configuración de marca de la organización al montar
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
        if (data?.settings?.brandColor) {
          setBrandColor(data.settings.brandColor)
        }
      } catch (e) {
        logger.error('admin', 'Error loading org settings', e as any)
      }
    }
    loadOrgSettings()
  }, [currentUser?.organizationId])

  // Verificar si hay un turno abierto al cargar
  useEffect(() => {
    const checkShift = async () => {
      if (!currentUser) return
      const shift = await shiftService.getActiveShift(currentUser.id)
      setActiveShift(shift)
      setLoadingShift(false)
    }
    checkShift()
  }, [currentUser])

  const handleOpenShift = async () => {
    if (!currentUser || !openingAmount) return
    try {
      const shift = await shiftService.openShift(currentUser.id, currentUser.organizationId || '', parseFloat(openingAmount))
      setActiveShift(shift)
      alert('✅ Turno de caja abierto correctamente')
      setOpeningAmount('')
    } catch (error) {
      alert('❌ Error al abrir caja')
    }
  }

  const handleCloseShift = async () => {
    if (!activeShift) return
    const amount = prompt('Ingrese el monto final en efectivo para el arqueo:')
    if (amount === null || isNaN(parseFloat(amount))) return

    try {
      const salesDelta = await shiftService.calculateExpectedAmount(currentUser.organizationId || '', activeShift.start_time)
      const expected = Number(activeShift.opening_amount || 0) + salesDelta
      await shiftService.closeShift(activeShift.id, parseFloat(amount), expected)
      alert('✅ Turno cerrado y arqueo registrado con éxito')
      setActiveShift(null)
    } catch (error) {
      alert('❌ Error al cerrar turno')
    }
  }

  // Cargar datos para la IA cuando la pestaña está activa
  useEffect(() => {
    if (activeTab === 'llm' && !aiMetrics) {
      const loadAIMetrics = async () => {
        setLoadingAI(true)
        try {
          const now = new Date()
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

          const [metricsData, topProductsData] = await Promise.all([
            supabaseService.getSalesMetrics(thirtyDaysAgo, now),
            supabaseService.getTopProducts(thirtyDaysAgo, now, 5)
          ])

          setAiMetrics(metricsData)
          setAiTopProducts(topProductsData)
        } catch (error) {
          logger.error('admin', 'Error loading AI metrics', error as any)
        } finally {
          setLoadingAI(false)
        }
      }
      loadAIMetrics()
    }
  }, [activeTab, aiMetrics])

  const colorMap: Record<string, { gradient: string, primary: string, text: string }> = {
    neon: { gradient: 'from-[#00F5FF] to-[#00D1D1]', primary: '#00F5FF', text: '#1A1C1E' },
    indigo: { gradient: 'from-indigo-600 to-purple-600', primary: '#4f46e5', text: '#FFFFFF' },
    blue: { gradient: 'from-blue-600 to-cyan-600', primary: '#2563eb', text: '#FFFFFF' },
    rose: { gradient: 'from-rose-600 to-pink-600', primary: '#e11d48', text: '#FFFFFF' },
    emerald: { gradient: 'from-emerald-600 to-teal-600', primary: '#059669', text: '#FFFFFF' },
    amber: { gradient: 'from-amber-600 to-orange-600', primary: '#d97706', text: '#FFFFFF' }
  }

  // Efecto para aplicar el color de marca globalmente
  useEffect(() => {
    const colors = colorMap[brandColor]
    if (colors) {
      document.documentElement.style.setProperty('--brand-primary', colors.primary)
      document.documentElement.style.setProperty('--brand-text', colors.text)
      // Esto permite usar clases como bg-[var(--brand-primary)] en cualquier parte
      logger.info('admin', `Tema actualizado a: ${brandColor}`)
    }
  }, [brandColor])

  const saveBranding = async (color: string, logo?: string) => {
    if (!currentUser?.organizationId) return
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          settings: { brandColor: color, logoUrl: logo }
        })
        .eq('id', currentUser.organizationId)
      if (error) throw error
      logger.info('admin', 'Configuración de marca guardada')
    } catch (e) {
      logger.error('admin', 'Error al guardar marca', e as any)
    }
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />
  }

  if (currentUser.role !== 'admin') {
    return <Navigate to="/pos" replace />
  }

  const tabs = [
    { id: 'reports' as AdminTab, label: 'Reportes', icon: BarChart3, enabled: true },
    { id: 'closing' as AdminTab, label: 'Cierre de Caja', icon: DollarSign, enabled: true },
    { id: 'devices' as AdminTab, label: 'Dispositivos', icon: Smartphone, enabled: canManageDevices },
    { id: 'users' as AdminTab, label: 'Personal', icon: UserCheck, enabled: canManageUsers },
    { id: 'inventory' as AdminTab, label: 'Inventario', icon: Package, enabled: canManageInventory },
    { id: 'promotions' as AdminTab, label: 'Promociones', icon: Percent, enabled: true },
    { id: 'clients' as AdminTab, label: 'Clientes', icon: Users, enabled: true },
    { id: 'purchases' as AdminTab, label: 'Compras', icon: ShoppingCart, enabled: true },
    { id: 'ecommerce' as AdminTab, label: 'Venta Online', icon: Globe, enabled: true },
    { id: 'integrations' as AdminTab, label: 'Integraciones', icon: Puzzle, enabled: true },
    { id: 'llm' as AdminTab, label: 'IA Assistant', icon: Bot, enabled: true },
    { id: 'support' as AdminTab, label: 'Ayuda y Soporte', icon: LifeBuoy, enabled: true },
    { id: 'logs' as AdminTab, label: 'Logs de Auditoría', icon: FileText, enabled: canViewLogs },
    { id: 'settings' as AdminTab, label: 'Configuración', icon: Settings, enabled: true },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Administración</h1>
            <p className="text-sm text-gray-500 mt-1">Gestión del sistema y seguridad</p>
          </div>
          {/* Optional: Add global admin actions here if needed */}
        </div>

        {/* Back Button for Sub-pages */}
        {activeTab !== 'hub' && (
          <button
            onClick={() => setActiveTab('hub')}
            className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft size={18} />
            Volver al Panel
          </button>
        )}

        {/* Tab Content */}
        <div className="animate-fadeIn">
          {activeTab === 'hub' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {tabs.filter(tab => tab.enabled).map(tab => (
                <AdminCard
                  key={tab.id}
                  title={tab.label}
                  subtitle="Gestionar sección"
                  icon={tab.icon}
                  onClick={() => {
                    if (tab.id === 'reports') navigate('/reports')
                    else if (tab.id === 'closing') navigate('/closing')
                    else setActiveTab(tab.id)
                  }}
                  brandColor={brandColor}
                />
              ))}
            </div>
          )}

          {activeTab === 'devices' && <DeviceApprovalPanel />}
          {activeTab === 'users' && <UsersManagement />}
          {activeTab === 'inventory' && <InventoryManagement />}
          {activeTab === 'logs' && <AuditLogsPanel />}
          {activeTab === 'promotions' && (
            <div className="flex flex-col items-center justify-center h-96 text-gray-400 animate-fadeIn">
              <Percent size={64} className="mb-4 opacity-50" />
              <h2 className="text-2xl font-bold text-gray-600">Promociones y Descuentos</h2>
              <p>Configura Happy Hours, cupones y reglas de descuento automáticas.</p>
            </div>
          )}
          {activeTab === 'clients' && <ClientsManagement />}
          {activeTab === 'purchases' && <PurchasesManagement />}
          {activeTab === 'ecommerce' && (
            <div className="flex flex-col items-center justify-center h-96 text-gray-400 animate-fadeIn">
              <Globe size={64} className="mb-4 opacity-50" />
              <h2 className="text-2xl font-bold text-gray-600">Canales de Venta Online</h2>
              <p>Gestiona tu menú digital, pedidos web y delivery.</p>
            </div>
          )}
          {activeTab === 'integrations' && (
            <div className="flex flex-col items-center justify-center h-96 text-gray-400 animate-fadeIn">
              <Puzzle size={64} className="mb-4 opacity-50" />
              <h2 className="text-2xl font-bold text-gray-600">Centro de Integraciones</h2>
              <p className="text-center max-w-md mt-2">
                Conecta servicios externos como MercadoPago, WhatsApp, Meta y APIs personalizadas.
                <br />
                <span className="text-sm opacity-75">Módulo en desarrollo.</span>
              </p>
            </div>
          )}
          {activeTab === 'llm' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-gradient-to-r from-indigo-600 to-violet-700 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <Bot size={40} className="text-indigo-200" />
                    <h2 className="text-3xl font-bold">Reisbloc Intelligence</h2>
                  </div>
                  <p className="text-indigo-100 max-w-2xl text-lg">
                    Analizamos tu operación con inteligencia artificial para darte el impulso que tu negocio necesita,
                    desde optimización de recursos hasta estrategias de marketing sustentable.
                  </p>
                </div>
                <div className="absolute right-[-20px] bottom-[-20px] opacity-10 pointer-events-none">
                  <Bot size={240} />
                </div>
              </div>

              {!loadingAI ? (
                <AIInsightsWidget metrics={aiMetrics} topProducts={aiTopProducts} />
              ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 flex flex-col items-center justify-center text-gray-400">
                  <Bot size={48} className="animate-bounce mb-4 text-indigo-400" />
                  <p>Preparando tu consultoría personalizada...</p>
                </div>
              )}
            </div>
          )}
          {activeTab === 'support' && (
            <div className="flex flex-col items-center justify-center h-96 text-gray-400 animate-fadeIn">
              <LifeBuoy size={64} className="mb-4 opacity-50" />
              <h2 className="text-2xl font-bold text-gray-600">Centro de Ayuda</h2>
              <p>Tutoriales, chat de soporte y documentación de capacitación.</p>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                    <Palette size={24} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Personalización de Marca</h2>
                    <p className="text-sm text-gray-500">Configura la apariencia visual</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Branding Settings */}
                  <div className="space-y-4">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                      Colores del Sistema
                    </h3>
                    <div className="flex gap-4">
                      {Object.entries(colorMap).map(([color, values]) => (
                        <button
                          key={color}
                          onClick={() => {
                            setBrandColor(color)
                            saveBranding(color)
                          }}
                          style={{ backgroundColor: values.primary }}
                          className={`w-10 h-10 rounded-full border-4 shadow-sm transition-transform hover:scale-110 ${brandColor === color ? 'border-gray-300 scale-110 ring-2 ring-indigo-100' : 'border-white'
                            }`}
                          title={`Cambiar a ${color}`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Logo Upload */}
                  <div className="space-y-4">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                      Logotipo
                    </h3>
                    <div className="flex items-start gap-4">
                      {currentUser && (
                        <AvatarUpload
                          userId={currentUser.organizationId || 'global'}
                          currentAvatarUrl={currentUser.avatar_url}
                          onUploadComplete={(url) => {
                            logger.info('admin', 'Logo subido', { url })
                            saveBranding(brandColor, url)
                          }}
                        />
                      )}
                      <div className="flex-1">
                        <p className="text-xs text-gray-500">Sube tu logo para los tickets y la barra de navegación.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}