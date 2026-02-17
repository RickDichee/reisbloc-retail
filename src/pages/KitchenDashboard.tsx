import { useEffect, useState } from 'react'
import logger from '@/utils/logger'
import supabaseService from '@/services/supabaseService'
import { Order, Product } from '@/types/index'
import { Clock, CheckCircle, Flame } from 'lucide-react'

export default function KitchenDashboard() {
  const [sentOrders, setSentOrders] = useState<Order[]>([])
  const [readyOrders, setReadyOrders] = useState<Order[]>([])
  const [completedOrders, setCompletedOrders] = useState<Order[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'sent' | 'ready' | 'completed'>('sent')

  useEffect(() => {
    loadProducts()
    subscribeToOrders()
  }, [])

  const loadProducts = async () => {
    try {
      const prods = await supabaseService.getAllProducts()
      setProducts(prods)
    } catch (error) {
      logger.error('kitchen-dashboard', 'Error loading products', error as any)
    }
  }

  const subscribeToOrders = () => {
    // Suscribirse a órdenes enviadas
    const unsubSent = supabaseService.subscribeToOrdersByStatus('sent', (orders) => {
      setSentOrders(orders.sort((a, b) => {
        const timeA = a.createdAt instanceof Date ? a.createdAt.getTime() : 0
        const timeB = b.createdAt instanceof Date ? b.createdAt.getTime() : 0
        return timeB - timeA
      }))
      setLoading(false)
    })

    // Suscribirse a órdenes listas
    const unsubReady = supabaseService.subscribeToOrdersByStatus('ready', (orders) => {
      setReadyOrders(orders.sort((a, b) => {
        const timeA = a.createdAt instanceof Date ? a.createdAt.getTime() : 0
        const timeB = b.createdAt instanceof Date ? b.createdAt.getTime() : 0
        return timeB - timeA
      }))
    })

    // Suscribirse a órdenes completadas (últimas 5)
    const unsubCompleted = supabaseService.subscribeToOrdersByStatus('completed', (orders) => {
      setCompletedOrders(
        orders
          .sort((a, b) => {
            const timeA = a.createdAt instanceof Date ? a.createdAt.getTime() : 0
            const timeB = b.createdAt instanceof Date ? b.createdAt.getTime() : 0
            return timeB - timeA
          })
          .slice(0, 5)
      )
    })

    return () => {
      unsubSent?.()
      unsubReady?.()
      unsubCompleted?.()
    }
  }

  const markAsReady = async (orderId: string) => {
    try {
      await supabaseService.updateOrderStatus(orderId, 'ready')
      logger.info('kitchen-dashboard', 'Orden marcada como lista', { orderId })
    } catch (error) {
      logger.error('kitchen-dashboard', 'Error marking order as ready', error as any)
    }
  }

  const markAsCompleted = async (orderId: string) => {
    try {
      await supabaseService.updateOrderStatus(orderId, 'completed')
      logger.info('kitchen-dashboard', 'Orden marcada como completada', { orderId })
    } catch (error) {
      logger.error('kitchen-dashboard', 'Error marking order as completed', error as any)
    }
  }

  const getProductName = (productId: string) => {
    return products.find(p => p.id === productId)?.name || 'Desconocido'
  }

  const renderOrderCards = (orders: Order[], status: 'sent' | 'ready' | 'completed') => {
    if (orders.length === 0) {
      return (
        <div className="col-span-full flex items-center justify-center py-16 text-gray-400">
          <p className="text-lg">No hay órdenes en {status === 'sent' ? 'Preparación' : status === 'ready' ? 'Listas' : 'Completadas'}</p>
        </div>
      )
    }

    return orders.map(order => (
      <div
        key={order.id}
        className={`rounded-xl p-5 shadow-lg transition-all hover:shadow-xl ${
          status === 'sent'
            ? 'bg-red-50 border-4 border-red-400 animate-pulse'
            : status === 'ready'
              ? 'bg-green-50 border-4 border-green-400'
              : 'bg-gray-50 border-2 border-gray-300'
        }`}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4 pb-3 border-b-2">
          <div className="flex items-center gap-2">
            {status === 'sent' && <Flame size={28} className="text-red-600 animate-bounce" />}
            {status === 'ready' && <CheckCircle size={28} className="text-green-600" />}
            <span className="font-bold text-xl">Mesa {order.tableNumber}</span>
          </div>
          <span className="text-sm text-gray-600">
            {order.createdAt instanceof Date
              ? order.createdAt.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
              : 'N/A'}
          </span>
        </div>

        {/* Items */}
        <div className="space-y-2 mb-4">
          {order.items.map((item, idx) => (
            <div key={idx} className="flex justify-between items-start bg-white p-2 rounded-lg">
              <div>
                <div className="font-bold text-lg">{item.quantity}x</div>
                <div className="text-sm text-gray-700">{getProductName(item.productId)}</div>
                {item.notes && <div className="text-xs italic text-gray-500 mt-1">📝 {item.notes}</div>}
              </div>
            </div>
          ))}
        </div>

        {/* Notes */}
        {order.notes && (
          <div className="bg-blue-100 border-l-4 border-blue-500 p-2 mb-3 rounded text-sm text-blue-700 font-semibold">
            📌 {order.notes}
          </div>
        )}

        {/* Actions */}
        {status === 'sent' && (
          <button
            onClick={() => markAsReady(order.id!)}
            className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition-all transform hover:scale-105"
          >
            ✓ Listo para Servir
          </button>
        )}
        {status === 'ready' && (
          <button
            onClick={() => markAsCompleted(order.id!)}
            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-all transform hover:scale-105"
          >
            ✓ Completada
          </button>
        )}
      </div>
    ))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-white text-2xl">Cargando órdenes...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-xl p-6 mb-6 shadow-2xl">
        <h1 className="text-4xl font-bold">🍽️ COCINA & BAR</h1>
        <p className="text-red-100 mt-2">Panel de Control en Tiempo Real</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-red-600 rounded-lg p-4 text-center shadow-lg">
          <div className="text-3xl font-bold">{sentOrders.length}</div>
          <div className="text-sm text-red-100">En Preparación</div>
        </div>
        <div className="bg-green-600 rounded-lg p-4 text-center shadow-lg">
          <div className="text-3xl font-bold">{readyOrders.length}</div>
          <div className="text-sm text-green-100">Listas para Servir</div>
        </div>
        <div className="bg-gray-600 rounded-lg p-4 text-center shadow-lg">
          <div className="text-3xl font-bold">{completedOrders.length}</div>
          <div className="text-sm text-gray-100">Completadas</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-3 mb-6">
        {(['sent', 'ready', 'completed'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 rounded-lg font-bold transition-all transform hover:scale-105 ${
              activeTab === tab
                ? 'bg-blue-600 shadow-lg'
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            {tab === 'sent' ? `🔥 Preparación (${sentOrders.length})` : tab === 'ready' ? `✓ Listas (${readyOrders.length})` : `Completadas (${completedOrders.length})`}
          </button>
        ))}
      </div>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {activeTab === 'sent' && renderOrderCards(sentOrders, 'sent')}
        {activeTab === 'ready' && renderOrderCards(readyOrders, 'ready')}
        {activeTab === 'completed' && renderOrderCards(completedOrders, 'completed')}
      </div>
    </div>
  )
}
