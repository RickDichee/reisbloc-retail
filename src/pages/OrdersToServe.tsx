import { useEffect, useMemo, useState, useRef } from 'react'
import logger from '@/utils/logger'
import { Navigate } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import { usePermissions } from '@/hooks/usePermissions'
import supabaseService from '@/services/supabaseService'
import { Order } from '@/types'
import { ChefHat, Clock, CheckCircle, Users, Bell } from 'lucide-react'
import TipsWidget from '@/components/common/TipsWidget'

const normalizeDate = (value: any): Date => {
  if (!value) return new Date()
  if (value instanceof Date) return value
  if (typeof value.toDate === 'function') return value.toDate()
  return new Date(value)
}

const humanizeDuration = (date: Date) => {
  const diffMs = Date.now() - date.getTime()
  const minutes = Math.max(0, Math.floor(diffMs / 60000))
  if (minutes < 1) return 'Hace un momento'
  if (minutes === 1) return 'Hace 1 minuto'
  if (minutes < 60) return `Hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60
  return `Hace ${hours}h ${remaining}m`
}

export default function OrdersToServe() {
  const { currentUser } = useAppStore()
  const { canModifyOrders } = usePermissions()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyOrders, setBusyOrders] = useState<Record<string, boolean>>({})
  const [newOrderAlert, setNewOrderAlert] = useState(false)
  const previousOrderCount = useRef(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Inicializar audio de notificación
  useEffect(() => {
    audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBiuBzvLZiDYIF2W79+qbUg8OTqvn8raKOwcVa7r3GMUBAAAAAAABAAAAA')
  }, [])

  useEffect(() => {
    // Solo meseros pueden ver órdenes para servir
    if (!canModifyOrders) return

    const unsubscribe = supabaseService.subscribeToOrdersByStatus('ready', (data) => {
      const normalized = (data || []).map(order => ({
        ...order,
        createdAt: normalizeDate((order as any).createdAt),
        sentToKitchenAt: normalizeDate((order as any).sentToKitchenAt),
      }))
      
      // Detectar nuevas órdenes
      if (previousOrderCount.current > 0 && normalized.length > previousOrderCount.current) {
        setNewOrderAlert(true)
        // Reproducir sonido
        if (audioRef.current) {
          audioRef.current.play().catch(e => logger.warn('orders-to-serve', 'Error al reproducir audio', e as any))
        }
        // Auto-ocultar alerta después de 5 segundos
        setTimeout(() => setNewOrderAlert(false), 5000)
      }
      
      previousOrderCount.current = normalized.length
      setOrders(normalized)
      setLoading(false)
      setError(null)
    })

    return () => unsubscribe?.()
  }, [canModifyOrders])

  const byTable = useMemo(() => {
    const map = new Map<number, Order[]>()
    orders.forEach(order => {
      const table = order.tableNumber || 0 // Fallback to 0 if undefined
      const list = map.get(table) || []
      map.set(table, [...list, order])
    })

    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([tableNumber, list]) => ({
        tableNumber: tableNumber || 0, // Ensure tableNumber is always a number
        orders: list.sort((a, b) => {
          const aTime = a.sentToKitchenAt ? a.sentToKitchenAt.getTime() : 0
          const bTime = b.sentToKitchenAt ? b.sentToKitchenAt.getTime() : 0
          return aTime - bTime
        }),
      }))
  }, [orders])

  const handleMarkServed = async (orderId: string) => {
    if (!currentUser) return

    setBusyOrders(prev => ({ ...prev, [orderId]: true }))
    try {
      await supabaseService.updateOrderStatus(orderId, 'served')
      setOrders(prev => prev.filter(o => o.id !== orderId))
    } catch (err: any) {
      setError(err?.message || 'No se pudo marcar como servida')
    } finally {
      setBusyOrders(prev => ({ ...prev, [orderId]: false }))
    }
  }

  if (!canModifyOrders) {
    return <Navigate to="/pos" replace />
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-600">Cargando órdenes listas...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative bg-rb-canvas">
      {/* Background Doodle */}
      <div 
        className="fixed inset-0 z-0 opacity-40 pointer-events-none bg-repeat"
        style={{
          backgroundImage: 'url("/doodle_ceviche.png?v=2")',
          backgroundSize: '450px',
        }}
      />
      {/* Gradient Overlay */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-500/5 via-cyan-500/5 to-white/5 z-0 pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6 pb-12">
        {newOrderAlert && (
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-bounce">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3">
              <Bell className="animate-ring" size={32} />
              <div>
                <p className="text-xl font-bold">¡Nueva Orden Lista!</p>
                <p className="text-sm">Hay órdenes esperando para servir</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Header - Widget Premium Estandarizado */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-3xl shadow-xl overflow-hidden">
          <div className="px-6 py-8 sm:px-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                <ChefHat size={32} />
              </div>
              <div>
                <p className="text-sm text-emerald-100 uppercase tracking-tighter font-black">Servicio</p>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tighter uppercase">Órdenes Listas</h1>
                <p className="text-emerald-100 mt-1 font-bold opacity-80">PLATILLOS LISTOS PARA SERVIR</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 text-center">
                <p className="text-[10px] uppercase font-bold text-emerald-200">Mesas</p>
                <p className="text-3xl font-black">{byTable.length}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 text-center">
                <p className="text-[10px] uppercase font-bold text-emerald-200">Total</p>
                <p className="text-3xl font-black">{orders.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        {/* Tips Widget */}
        <TipsWidget />

        {/* Orders */}
        {orders.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center text-gray-600 shadow-sm">
            <CheckCircle size={48} className="mx-auto mb-4 text-green-500" />
            <p className="text-xl font-semibold">¡Todo servido!</p>
            <p className="text-sm mt-2">No hay órdenes pendientes para servir en este momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {byTable.map(group => (
              <div
                key={group.tableNumber}
                className="bg-white border-2 border-blue-200 rounded-2xl shadow-lg p-5 flex flex-col gap-4"
              >
                <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4">
                  <div>
                    <p className="text-sm text-blue-600 font-semibold">MESA</p>
                    <p className="text-4xl font-bold text-blue-900">{group.tableNumber}</p>
                  </div>
                  <div className="flex items-center gap-2 bg-blue-600 text-white rounded-full px-4 py-2">
                    <Users size={18} />
                    <span className="font-bold">{group.orders.length}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  {group.orders.map(order => {
                    const waitTime = order.sentToKitchenAt
                      ? humanizeDuration(order.sentToKitchenAt)
                      : 'N/A'

                    return (
                      <div
                        key={order.id}
                        className="border-2 border-gray-200 rounded-xl p-4 space-y-3 hover:border-blue-400 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-xs text-gray-500 uppercase">Orden</p>
                            <p className="font-mono font-bold text-gray-900">{order.id.slice(0, 8)}</p>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-1">
                            <Clock size={14} />
                            <span>{waitTime}</span>
                          </div>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-700 space-y-1 max-h-24 overflow-y-auto">
                          {order.items?.map(item => (
                            <div key={item.id} className="flex justify-between">
                              <span className="font-medium truncate">{item.productName}</span>
                              <span className="font-bold ml-2">×{item.quantity}</span>
                            </div>
                          ))}
                        </div>

                        {order.notes && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 text-xs text-yellow-800">
                            <p className="font-semibold">📝 Nota:</p>
                            <p>{order.notes}</p>
                          </div>
                        )}

                        <button
                          onClick={() => handleMarkServed(order.id)}
                          disabled={busyOrders[order.id]}
                          className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                        >
                          <CheckCircle size={18} />
                          Marcar Servida
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
