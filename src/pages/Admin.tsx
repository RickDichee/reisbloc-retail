import { useState, useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import { usePermissions } from '@/hooks/usePermissions'
import {
  Users,
  UserCheck,
  Package,
  Shield,
  ArrowLeft,
  ShoppingCart,
  Bot,
  BarChart3,
  DollarSign,
  Puzzle,
  Percent,
  Globe,
  LifeBuoy,
  ExternalLink,
  Copy,
  Check,
  Settings,
  History
} from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import AdminCard from '@/components/common/AdminCard'
import UsersManagement from '@/components/admin/UsersManagement'
import InventoryManagement from '@/components/admin/InventoryManagement'
import AuditLogs from '@/components/admin/AuditLogs'
import logger from '@/utils/logger'

import AIInsightsWidget from '@/components/common/AIInsightsWidget'
import AgentChat from '@/components/agent/AgentChat'
import PurchasesManagement from '@/components/admin/PurchasesManagement'
import supabaseService from '@/services/supabaseService'
import ClientsManagement from '@/components/admin/ClientsManagement'

type AdminTab = 'hub' | 'users' | 'inventory' | 'clients' | 'purchases' | 'llm' | 'reports' | 'closing' | 'integrations' | 'promotions' | 'ecommerce' | 'support' | 'logs'

export default function Admin() {
  const { currentUser } = useAppStore()
  const navigate = useNavigate()
  const { canManageUsers, canManageInventory } = usePermissions()
  const [activeTab, setActiveTab] = useState<AdminTab>('hub')

  // AI Insights Data (Free Tier)
  const [aiMetrics, setAiMetrics] = useState<any>(null)
  const [aiTopProducts, setAiTopProducts] = useState<any[]>([])
  const [loadingAI, setLoadingAI] = useState(false)

  // 🔒 Verificación de Seguridad: Blindaje para reisbloc-lab
  useEffect(() => {
    if (currentUser && currentUser.organizationId) {
      const isDevOrg = currentUser.organizationId === '8ba45da3-7373-4c9f-867f-5ea2d8300cc6'
      if (currentUser.username === 'admin' && !isDevOrg) {
        logger.warn('security', '⚠️ Intento de acceso administrativo desde organización no autorizada')
      }
    }
  }, [currentUser])

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
        } catch (e) {
          logger.error('admin', 'Error loading AI metrics', e as any)
        } finally {
          setLoadingAI(false)
        }
      }
      loadAIMetrics()
    }
  }, [activeTab, aiMetrics])

  if (!currentUser) return <Navigate to="/login" replace />
  if (currentUser.role !== 'admin') return <Navigate to="/pos" replace />

  const tabs = [
    { id: 'reports' as AdminTab, label: 'Reportes', icon: BarChart3, enabled: true },
    { id: 'closing' as AdminTab, label: 'Cierre de Caja', icon: DollarSign, enabled: true },
    { id: 'users' as AdminTab, label: 'Personal', icon: UserCheck, enabled: canManageUsers },
    { id: 'inventory' as AdminTab, label: 'Inventario', icon: Package, enabled: canManageInventory },
    { id: 'promotions' as AdminTab, label: 'Promociones', icon: Percent, enabled: true },
    { id: 'clients' as AdminTab, label: 'Clientes', icon: Users, enabled: true },
    { id: 'purchases' as AdminTab, label: 'Compras', icon: ShoppingCart, enabled: true },
    { id: 'ecommerce' as AdminTab, label: 'E-commerce', icon: Globe, enabled: true },
    { id: 'integrations' as AdminTab, label: 'Integraciones', icon: Puzzle, enabled: true },
    { id: 'llm' as AdminTab, label: 'IA Assistant', icon: Bot, enabled: true },
    { id: 'logs' as AdminTab, label: 'Auditoría', icon: History, enabled: true },
    { id: 'support' as AdminTab, label: 'Ayuda y Soporte', icon: LifeBuoy, enabled: true },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header - Premium Slate/Emerald Style */}
        <div className="bg-slate-900 text-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.2)] overflow-hidden border border-white/5 relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full -mr-32 -mt-32"></div>
          <div className="px-6 py-6 sm:px-8 flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-white/5 rounded-2xl backdrop-blur-md border border-white/10 shadow-inner">
                <Shield size={28} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-[10px] text-emerald-400 uppercase tracking-[0.2em] font-black mb-0.5">Centro de Mando</p>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tighter uppercase leading-none">Administración</h1>
                <p className="text-slate-400 mt-2 font-bold tracking-tight opacity-80 uppercase text-xs">Panel de control operativo y gestión</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-3 flex flex-col items-end">
                <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Organización</span>
                <span className="font-bold text-white text-sm">{currentUser?.organizationId?.split('-')[0] || 'REISBLOC'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Back Button for Sub-pages */}
        {activeTab !== 'hub' && (
          <button
            onClick={() => setActiveTab('hub')}
            className="flex items-center gap-2 px-6 py-3 bg-white rounded-xl shadow-sm border border-slate-100 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all"
          >
            <ArrowLeft size={18} />
            Volver al Hub
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
                  subtitle="Gestionar módulo"
                  icon={tab.icon}
                  onClick={() => {
                    if (tab.id === 'reports') navigate('/reports')
                    else if (tab.id === 'closing') navigate('/closing')
                    else setActiveTab(tab.id)
                  }}
                  brandColor={
                    ['reports', 'closing', 'inventory'].includes(tab.id) ? 'emerald' :
                      ['users', 'clients'].includes(tab.id) ? 'indigo' :
                        ['logs', 'support'].includes(tab.id) ? 'slate' :
                          'amber'
                  }
                />
              ))}
            </div>
          )}

          {activeTab === 'users' && <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100"><UsersManagement /></div>}
          {activeTab === 'inventory' && <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100"><InventoryManagement /></div>}
          {activeTab === 'promotions' && (
            <div className="bg-white rounded-3xl p-12 text-center text-slate-400 space-y-4 border border-slate-100">
              <Percent size={64} className="mx-auto opacity-20" />
              <h2 className="text-2xl font-black text-slate-900 uppercase">Promociones y Descuentos</h2>
              <p className="max-w-md mx-auto font-medium">Configura Happy Hours, cupones y reglas de descuento automáticas para fidelizar a tus clientes.</p>
              <div className="pt-8">
                <span className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-full text-xs font-black uppercase">Módulo en Desarrollo</span>
              </div>
            </div>
          )}
          {activeTab === 'clients' && <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100"><ClientsManagement /></div>}
          {activeTab === 'purchases' && <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100"><PurchasesManagement /></div>}
          {activeTab === 'ecommerce' && <EcommerceDashboard />}
          {activeTab === 'integrations' && (
            <div className="bg-white rounded-3xl p-12 text-center text-slate-400 space-y-4 border border-slate-100">
              <Puzzle size={64} className="mx-auto opacity-20" />
              <h2 className="text-2xl font-black text-slate-900 uppercase">Centro de Integraciones</h2>
              <p className="max-w-md mx-auto font-medium">Conecta Reisbloc con MercadoPago, WhatsApp Business, Meta Ads y más.</p>
              <div className="pt-8">
                <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-xs font-black uppercase">Módulo Enterprise</span>
              </div>
            </div>
          )}
          {activeTab === 'llm' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-slate-900 rounded-[2rem] p-10 text-white shadow-2xl relative overflow-hidden border border-white/10">
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                  <div className="p-6 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20">
                    <Bot size={58} className="text-indigo-400" />
                  </div>
                  <div>
                    <h2 className="text-4xl font-black tracking-tighter mb-2">REISBLOC INTELLIGENCE</h2>
                    <p className="text-slate-400 max-w-2xl text-lg font-medium">
                      Consultoría avanzada con IA. Optimizamos tu inventario, analizamos tendencias de venta y te damos recomendaciones estratégicas en tiempo real.
                    </p>
                  </div>
                </div>
                <div className="absolute right-[-40px] top-[-40px] opacity-[0.03] pointer-events-none">
                  <Bot size={300} />
                </div>
              </div>

              {/* Free Tier: AI Insights Widget */}
              <div className="mb-6">
                {!loadingAI ? (
                  <AIInsightsWidget metrics={aiMetrics} topProducts={aiTopProducts} />
                ) : (
                  <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-20 flex flex-col items-center justify-center text-slate-400">
                    <Bot size={64} className="animate-pulse mb-6 text-indigo-500 opacity-50" />
                    <p className="font-black text-slate-900 uppercase tracking-widest text-sm">Sincronizando flujos de datos...</p>
                  </div>
                )}
              </div>

              {/* Premium Tier: Agent Chat */}
              <div className="mt-8 border-t border-slate-200 pt-8">
                <div className="mb-6">
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">AI Agent Studio <span className="text-[10px] ml-2 bg-gradient-to-r from-amber-400 to-orange-500 text-white px-3 py-1 rounded-full align-middle">PREMIUM</span></h3>
                  <p className="text-sm font-medium text-slate-500">Un agente conversacional autónomo para ejecutar tareas complejas con integraciones externas bajo el esquema Zero-Risk.</p>
                </div>
                <AgentChat />
              </div>
            </div>
          )}
          {activeTab === 'logs' && <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100"><AuditLogs /></div>}
          {activeTab === 'support' && (
            <div className="bg-white rounded-3xl p-12 text-center text-slate-400 space-y-4 border border-slate-100">
              <LifeBuoy size={64} className="mx-auto opacity-20" />
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Centro de Ayuda y Soporte</h2>
              <p className="max-w-md mx-auto font-medium">Accede a tutoriales, documentación técnica y canal directo con nuestros especialistas.</p>
              <div className="pt-8">
                <button className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:shadow-lg transition-all">
                  Abrir Ticket de Soporte
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

function EcommerceDashboard() {
  const { currentUser } = useAppStore()
  const [org, setOrg] = useState<any>(null)
  const [productsCount, setProductsCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      if (!currentUser?.organizationId) return
      setLoading(true)
      try {
        const [orgData, prods] = await Promise.all([
          supabaseService.getOrganizationById(currentUser.organizationId),
          supabaseService.getPublicProducts(currentUser.organizationId)
        ])
        setOrg(orgData)
        setProductsCount(prods.length)
      } catch (e) {
        logger.error('admin', 'Error loading ecommerce data', e as any)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [currentUser])

  const storeUrl = org ? `${window.location.origin}/p/${org.slug}` : ''

  const copyToClipboard = () => {
    navigator.clipboard.writeText(storeUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-20 flex flex-col items-center justify-center text-slate-400 border border-slate-100">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-bold uppercase tracking-widest text-xs">Cargando presencia online...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8">
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest ring-1 ring-emerald-100">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            Tienda en Vivo
          </div>
        </div>

        <div className="max-w-2xl space-y-8">
          <div className="space-y-2">
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">Mi Tienda Online</h2>
            <p className="text-slate-500 font-medium text-lg leading-relaxed">
              Tu catálogo digital está activo y listo para recibir clientes. Comparte el enlace directo o úsalo como menú digital en tus mesas.
            </p>
          </div>

          <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6 group">
            <div className="space-y-1 text-center md:text-left">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Enlace Público</p>
              <p className="text-lg font-bold text-slate-900 break-all">{storeUrl}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={copyToClipboard}
                className="p-4 bg-white hover:bg-slate-900 hover:text-white rounded-2xl border border-slate-200 shadow-sm transition-all flex items-center gap-2 font-bold text-sm"
              >
                {copied ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />}
                {copied ? 'Copiado' : 'Copiar'}
              </button>
              <a
                href={storeUrl}
                target="_blank"
                rel="noreferrer"
                className="p-4 bg-slate-900 text-white hover:bg-indigo-600 rounded-2xl shadow-xl transition-all flex items-center gap-2 font-bold text-sm"
              >
                <ExternalLink size={18} />
                Visitar Tienda
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm">
              <div className="text-slate-400 mb-2"><Package size={20} /></div>
              <p className="text-3xl font-black text-slate-900 leading-none mb-1">{productsCount}</p>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Productos Visibles</p>
            </div>
            <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm">
              <div className="text-slate-400 mb-2"><Globe size={20} /></div>
              <p className="text-3xl font-black text-slate-900 leading-none mb-1">Activo</p>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado del Catálogo</p>
            </div>
            <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm">
              <div className="text-slate-400 mb-2"><ShoppingCart size={20} /></div>
              <p className="text-3xl font-black text-slate-900 leading-none mb-1">Próximamente</p>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pedidos Online</p>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Preview / Shortcuts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-indigo-50/50 border border-indigo-100 p-8 rounded-[2.5rem] space-y-4">
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm">
            <Settings size={24} />
          </div>
          <h3 className="text-xl font-black text-slate-900 uppercase">Personalización</h3>
          <p className="text-slate-600 font-medium text-sm leading-relaxed">
            Cambia el banner, colores y tipografía de tu tienda para que coincidan con tu marca.
          </p>
          <button className="text-indigo-600 font-black text-xs uppercase tracking-widest border-b-2 border-indigo-600/20 pb-1 hover:border-indigo-600 transition-all">
            Configurar diseño v4.1
          </button>
        </div>

        <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white space-y-4 relative overflow-hidden">
          <div className="absolute right-[-20px] bottom-[-20px] opacity-10">
            <DollarSign size={150} />
          </div>
          <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-white">
            <DollarSign size={24} />
          </div>
          <h3 className="text-xl font-black uppercase">Pagos Digitales</h3>
          <p className="text-slate-400 font-medium text-sm leading-relaxed">
            Acepta pagos con tarjetas y transferencias directamente desde tu catálogo online.
          </p>
          <button className="text-white font-black text-xs uppercase tracking-widest border-b-2 border-white/20 pb-1 hover:border-white transition-all">
            Activar módulo de pago
          </button>
        </div>
      </div>
    </div>
  )
}