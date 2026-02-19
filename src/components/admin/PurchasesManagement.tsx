import { useState, useEffect, useCallback } from 'react'
import {
  Truck,
  Plus,
  Phone,
  Mail,
  X,
  Save,
  Loader2,
  Trash2
} from 'lucide-react'
import supabaseService from '@/services/supabaseService'
import logger from '@/utils/logger'
import { useAppStore } from '@/store/appStore'
import { Supplier, PurchaseOrder } from '@/types'

export default function PurchasesManagement() {
  const { currentUser } = useAppStore()
  const [activeView, setActiveView] = useState<'orders' | 'providers'>('orders')
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [providers, setProviders] = useState<Supplier[]>([])
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [showProviderModal, setShowProviderModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [orderForm, setOrderForm] = useState({
    supplierId: '',
    folio: '',
    notes: '',
    total: 0
  })

  const [providerForm, setProviderForm] = useState({
    name: '',
    contactName: '',
    phone: '',
    email: '',
    taxId: ''
  })

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [o, p] = await Promise.all([
        supabaseService.getPurchaseOrders(),
        supabaseService.getSuppliers()
      ])
      setOrders(o)
      setProviders(p)
    } catch (e) {
      logger.error('purchases', 'Error loading purchase data', e as any)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      await supabaseService.createPurchaseOrder({
        supplierId: orderForm.supplierId,
        folio: orderForm.folio,
        notes: orderForm.notes,
        total: orderForm.total,
        date: new Date().toISOString()
      }, [])
      await loadData()
      setShowOrderModal(false)
      setOrderForm({ supplierId: '', folio: '', notes: '', total: 0 })
      // TODO: Replace with proper toast notification in future
      logger.info('purchases', 'Order created successfully')
    } catch (e) {
      logger.error('purchases', 'Error creating order', e as any)
      alert('Error al crear la orden. Verifique los datos.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCreateProvider = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      await supabaseService.createSupplier(providerForm)
      await loadData()
      setShowProviderModal(false)
      setProviderForm({ name: '', contactName: '', phone: '', email: '', taxId: '' })
    } catch (e) {
      logger.error('purchases', 'Error creating provider', e as any)
      alert('Error al crear el proveedor')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteOrder = async (id: string) => {
    if (!confirm('¿Seguro que deseas cancelar esta orden?')) return
    try {
      await supabaseService.deletePurchaseOrder(id)
      await loadData()
    } catch (e) {
      logger.error('purchases', 'Error deleting order', e as any)
    }
  }

  const handleDeleteProvider = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar este proveedor?')) return
    try {
      await supabaseService.deleteSupplier(id)
      await loadData()
    } catch (e) {
      logger.error('purchases', 'Error deleting provider', e as any)
    }
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Gestión de Abastecimiento</h2>
          <p className="text-gray-500 font-medium tracking-tight">Administra proveedores y reposición de inventario retail</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="bg-slate-100 p-1 rounded-xl flex border border-slate-200">
            <button
              onClick={() => setActiveView('orders')}
              className={`px-6 py-2 rounded-lg text-sm font-black transition-all ${activeView === 'orders' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Órdenes
            </button>
            <button
              onClick={() => setActiveView('providers')}
              className={`px-6 py-2 rounded-lg text-sm font-black transition-all ${activeView === 'providers' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Proveedores
            </button>
          </div>
          <button
            onClick={() => activeView === 'orders' ? setShowOrderModal(true) : setShowProviderModal(true)}
            className="bg-slate-900 text-white px-6 py-2 rounded-xl font-black flex items-center gap-2 hover:bg-black transition-all active:scale-95 shadow-xl shadow-slate-200 uppercase text-xs tracking-tighter"
          >
            <Plus size={18} />
            <span>Nueva {activeView === 'orders' ? 'Orden' : 'Proveedor'}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-24">
          <Loader2 className="w-12 h-12 text-slate-900 animate-spin" />
        </div>
      ) : (
        <>
          {/* Content */}
          {activeView === 'orders' ? (
            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
              <div className="grid grid-cols-12 gap-4 p-6 bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <div className="col-span-3 sm:col-span-2">Folio / ID</div>
                <div className="col-span-4 sm:col-span-4">Proveedor</div>
                <div className="hidden sm:block col-span-2">Fecha</div>
                <div className="col-span-3 sm:col-span-2 text-right">Total</div>
                <div className="col-span-2 text-center">Gestión</div>
              </div>

              <div className="divide-y divide-slate-100">
                {orders.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 font-bold italic">No hay órdenes registradas</div>
                ) : orders.map(order => (
                  <div key={order.id} className="grid grid-cols-12 gap-4 p-6 items-center hover:bg-slate-50 transition-colors group">
                    <div className="col-span-3 sm:col-span-2 font-mono font-black text-indigo-600 text-[10px] sm:text-xs">
                      {order.folio || order.id.slice(0, 8)}
                    </div>
                    <div className="col-span-4 sm:col-span-4 font-bold text-slate-900 truncate">
                      {order.supplier?.name || 'Distribuidor Directo'}
                    </div>
                    <div className="hidden sm:block col-span-2 text-xs font-bold text-slate-500">
                      {new Date(order.date).toLocaleDateString()}
                    </div>
                    <div className="col-span-3 sm:col-span-2 text-right font-black text-slate-900">
                      ${Number(order.total).toFixed(2)}
                    </div>
                    <div className="col-span-2 flex justify-center">
                      <button
                        onClick={() => handleDeleteOrder(order.id)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {providers.length === 0 ? (
                <div className="col-span-full p-24 text-center bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
                  <Truck size={48} className="text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-400 font-black uppercase">Sin proveedores en sistema</p>
                  <button onClick={() => setShowProviderModal(true)} className="text-indigo-600 font-black mt-2">REGISTRAR AHORA</button>
                </div>
              ) : providers.map(provider => (
                <div key={provider.id} className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-xl transition-all group relative">
                  <button
                    onClick={() => handleDeleteProvider(provider.id)}
                    className="absolute top-6 right-6 p-2 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={18} />
                  </button>
                  <div className="flex items-start justify-between mb-6">
                    <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl">
                      <Truck size={28} />
                    </div>
                    {provider.taxId && (
                      <span className="px-3 py-1 bg-slate-100 text-slate-500 text-[10px] font-black uppercase rounded-full tracking-widest leading-none">
                        {provider.taxId}
                      </span>
                    )}
                  </div>
                  <h3 className="font-black text-xl text-slate-900 mb-1">{provider.name}</h3>
                  <p className="text-[10px] font-black text-slate-400 mb-6 uppercase tracking-widest">{provider.contactName || 'AGENTE GENERAL'}</p>
                  <div className="space-y-3 pt-6 border-t border-slate-50">
                    <div className="flex items-center gap-3 text-slate-600 font-bold text-sm">
                      <Phone size={14} className="text-slate-300" /> {provider.phone || 'N/A'}
                    </div>
                    <div className="flex items-center gap-3 text-slate-600 font-bold text-sm truncate">
                      <Mail size={14} className="text-slate-300" /> {provider.email || 'N/A'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Modals */}
          {showOrderModal && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
                <div className="bg-slate-900 p-8 text-white flex justify-between items-center">
                  <h2 className="text-xl font-black uppercase tracking-tighter">Nueva Orden de Compra</h2>
                  <button onClick={() => setShowOrderModal(false)}><X size={24} /></button>
                </div>
                <form onSubmit={handleCreateOrder} className="p-8 space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Proveedor</label>
                    <select
                      required
                      className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold"
                      value={orderForm.supplierId}
                      onChange={e => setOrderForm({ ...orderForm, supplierId: e.target.value })}
                    >
                      <option value="">Seleccionar de BD...</option>
                      {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Folio OC</label>
                      <input
                        type="text"
                        className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold"
                        value={orderForm.folio}
                        onChange={e => setOrderForm({ ...orderForm, folio: e.target.value })}
                        placeholder="OC-001"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Monto Total</label>
                      <input
                        required
                        type="number"
                        step="0.01"
                        className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold"
                        value={orderForm.total}
                        onChange={e => setOrderForm({ ...orderForm, total: parseFloat(e.target.value) || 0 })}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div className="flex gap-4 pt-4">
                    <button type="button" onClick={() => setShowOrderModal(false)} className="flex-1 py-4 font-black text-slate-400 uppercase tracking-widest">Cancelar</button>
                    <button type="submit" disabled={isSaving} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black shadow-lg flex items-center justify-center gap-3">
                      {isSaving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                      GUARDAR ORDEN
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {showProviderModal && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
                <div className="bg-indigo-600 p-8 text-white flex justify-between items-center">
                  <h2 className="text-xl font-black uppercase tracking-tighter">Registrar Proveedor</h2>
                  <button onClick={() => setShowProviderModal(false)}><X size={24} /></button>
                </div>
                <form onSubmit={handleCreateProvider} className="p-8 space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nombre Comercial</label>
                    <input
                      required
                      type="text"
                      className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold"
                      value={providerForm.name}
                      onChange={e => setProviderForm({ ...providerForm, name: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">RFC / Tax ID</label>
                      <input
                        type="text"
                        className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold"
                        value={providerForm.taxId}
                        onChange={e => setProviderForm({ ...providerForm, taxId: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Teléfono</label>
                      <input
                        type="tel"
                        className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold"
                        value={providerForm.phone}
                        onChange={e => setProviderForm({ ...providerForm, phone: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex gap-4 pt-4">
                    <button type="button" onClick={() => setShowProviderModal(false)} className="flex-1 py-4 font-black text-slate-400 uppercase tracking-widest">Cerrar</button>
                    <button type="submit" disabled={isSaving} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg flex items-center justify-center gap-3">
                      {isSaving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                      GUARDAR
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}