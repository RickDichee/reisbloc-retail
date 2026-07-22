import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { ShoppingBag, Globe, ExternalLink, Package, Truck, Clock, CheckCircle, XCircle, ChevronRight, Plus, Minus, Trash2 } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import supabaseService from '@/services/supabaseService'
import { EcommerceOrder, EcommerceOrderStatus } from '@/types'

export default function Ecommerce() {
  const { currentUser } = useAppStore()
  const [orgSlug, setOrgSlug] = useState<string | undefined>(undefined)
  const [orders, setOrders] = useState<EcommerceOrder[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'orders'>('overview')

  useEffect(() => {
    const loadOrgSlug = async () => {
      if (!currentUser?.organizationId) return
      try {
        const org = await supabaseService.getOrganizationById(currentUser.organizationId)
        if (org?.slug) {
          setOrgSlug(org.slug)
        }
      } catch (e) {
        console.error('Error loading org slug', e)
      }
    }
    loadOrgSlug()
  }, [currentUser?.organizationId])

  const loadOrders = async () => {
    if (!currentUser?.organizationId) return
    setLoadingOrders(true)
    try {
      // Load ecommerce orders
      const data = await supabaseService.getEcommerceOrders(currentUser.organizationId)
      setOrders(data)
    } catch (e) {
      console.error('Error loading orders', e)
    } finally {
      setLoadingOrders(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'orders') {
      loadOrders()
    }
  }, [activeTab])

  const storeUrl = orgSlug ? `${window.location.origin}/p/${orgSlug}` : undefined

  const getStatusColor = (status: EcommerceOrderStatus) => {
    const colors: Record<EcommerceOrderStatus, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      confirmed: 'bg-blue-100 text-blue-700',
      preparing: 'bg-purple-100 text-purple-700',
      shipped: 'bg-indigo-100 text-indigo-700',
      delivered: 'bg-emerald-100 text-emerald-700',
      cancelled: 'bg-red-100 text-red-700'
    }
    return colors[status]
  }

  const getStatusLabel = (status: EcommerceOrderStatus) => {
    const labels: Record<EcommerceOrderStatus, string> = {
      pending: 'Pendiente',
      confirmed: 'Confirmado',
      preparing: 'Preparando',
      shipped: 'Enviado',
      delivered: 'Entregado',
      cancelled: 'Cancelado'
    }
    return labels[status]
  }

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
          {orgSlug ? (
            <a href={storeUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl">
              <Globe size={20} />
              Ver Tienda Online
              <ExternalLink size={16} className="text-slate-400" />
            </a>
          ) : (
            <button disabled className="flex items-center gap-2 px-6 py-3 bg-slate-300 text-slate-500 rounded-xl font-bold cursor-not-allowed">
              <Globe size={20} />
              Configurando...
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 rounded-xl font-bold ${activeTab === 'overview' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600'}`}
          >
            Resumen
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-6 py-3 rounded-xl font-bold ${activeTab === 'orders' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600'}`}
          >
            Pedidos
          </button>
        </div>

        {activeTab === 'overview' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Stats Cards */}
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                    <Package size={20} />
                  </div>
                  <span className="font-bold text-slate-600 text-sm uppercase">Pedidos (Mes)</span>
                </div>
                <div className="text-4xl font-black text-slate-900">{orders.length}</div>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                    <Truck size={20} />
                  </div>
                  <span className="font-bold text-slate-600 text-sm uppercase">Pendientes</span>
                </div>
                <div className="text-4xl font-black text-slate-900">
                  {orders.filter(o => o.status === 'pending' || o.status === 'confirmed' || o.status === 'preparing').length}
                </div>
              </div>
            </div>

            {/* Setup Guide */}
            <div className="bg-purple-50 p-6 rounded-3xl border border-purple-100 lg:row-span-2">
              <h3 className="text-xl font-black text-purple-900 mb-4">Tu Tienda Digital</h3>
              <p className="text-purple-700/80 mb-6 font-medium">Configura tu catálogo para vender en línea automáticamente.</p>

              <div className="space-y-4">
                <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-purple-100/50">
                  <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs">✓</div>
                  <span className="font-bold text-purple-900 text-sm">Cuenta SaaS & POS Activa</span>
                </div>
                <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-purple-100/50">
                  <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs">✓</div>
                  <span className="font-bold text-purple-900 text-sm">Sincronización de Inventarios en Vivo</span>
                </div>
                <div className="flex items-center gap-3 bg-white p-[#E62E6B]/10 p-3 rounded-xl border border-pink-200">
                  <div className="w-6 h-6 rounded-full bg-[#E62E6B] text-white flex items-center justify-center font-bold text-xs">⭐</div>
                  <div>
                    <span className="font-black text-slate-900 text-sm block">Subdominio VIP Personalizado</span>
                    <span className="text-[10px] text-[#E62E6B] font-bold uppercase">{orgSlug || 'tienda'}.reisbloc.com</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-purple-200/50 text-center">
                <p className="text-xs font-black text-purple-600 uppercase">⭐ E-commerce VIP Activo</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100">
              <h3 className="text-lg font-black mb-4">Acciones Rápidas</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button onClick={() => setActiveTab('orders')} className="p-4 bg-slate-50 rounded-xl text-center hover:bg-slate-100">
                  <Package size={24} className="mx-auto text-purple-600" />
                  <p className="font-bold text-sm mt-2">Ver Pedidos</p>
                </button>
                <a href={storeUrl} target="_blank" className="p-4 bg-slate-50 rounded-xl text-center hover:bg-slate-100">
                  <Globe size={24} className="mx-auto text-purple-600" />
                  <p className="font-bold text-sm mt-2">Ver Tienda</p>
                </a>
              </div>
            </div>
          </div>
        ) : (
          /* Orders Tab */
          <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <h2 className="text-xl font-black">Pedidos Online</h2>
            </div>
            
            {loadingOrders ? (
              <div className="p-12 text-center">
                <Clock size={32} className="mx-auto text-slate-300 animate-pulse" />
                <p className="text-slate-500 mt-2">Cargando pedidos...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="p-12 text-center">
                <Package size={48} className="mx-auto text-slate-200" />
                <p className="text-slate-500 mt-4">No hay pedidos aún</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {orders.map(order => (
                  <div key={order.id} className="p-4 hover:bg-slate-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-black text-lg">#{order.id.slice(0, 8).toUpperCase()}</p>
                        <p className="text-sm text-slate-500">
                          {order.items?.length || 0} producto(s) • ${order.total.toFixed(2)}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(order.status)}`}>
                          {order.status === 'delivered' ? <CheckCircle size={14} /> :
                           order.status === 'cancelled' ? <XCircle size={14} /> :
                           <Clock size={14} />}
                          {getStatusLabel(order.status)}
                        </span>
                        <p className="text-xs text-slate-500 mt-1">
                          {new Date(order.createdAt).toLocaleDateString('es-MX')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}