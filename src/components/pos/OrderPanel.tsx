import { OrderItem, Order } from '@/types'
import { ShoppingBag, Plus, Minus, Trash2, Clock, Pencil } from 'lucide-react'

interface OrderPanelProps {
  tableNumber: number
  items: OrderItem[]
  activeOrders?: Order[] // Órdenes ya enviadas a cocina
  onIncrement: (itemId: string) => void
  onDecrement: (itemId: string) => void
  onRemove: (itemId: string) => void
  onEditNote: (item: OrderItem) => void
}

const currency = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
})

export function OrderPanel({ tableNumber, items, activeOrders = [], onIncrement, onDecrement, onRemove, onEditNote }: OrderPanelProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ShoppingBag className="text-indigo-600" size={24} />
            Mesa {tableNumber}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {items.length} productos · {activeOrders.length > 0 ? 'Con órdenes previas' : 'Nueva orden'}
          </p>
        </div>
        <div className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg font-bold text-lg border border-indigo-100">
          {currency.format(items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0))}
        </div>
      </div>

      {items.length === 0 && activeOrders.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center py-8">
            <ShoppingBag className="mx-auto text-gray-300 mb-4" size={48} />
            <p className="text-gray-500 text-lg font-medium">Carrito vacío</p>
            <p className="text-gray-400 text-sm mt-1">Agrega productos</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
          {/* Sección: Ya ordenado (Persistencia visual) */}
          {activeOrders.length > 0 && (
            <div className="mb-4 pb-4 border-b border-gray-100">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Clock size={12} /> Ya ordenado
              </h3>
              <div className="space-y-2 opacity-75">
                {activeOrders.flatMap(order => (order.items || []).map(item => ({ ...item, status: order.status }))).map((item, idx) => (
                  <div key={`prev-${idx}`} className="flex justify-between text-sm text-gray-500 bg-gray-50 p-2 rounded-lg border border-gray-100">
                    <div className="flex gap-2">
                      <span className="font-bold text-gray-700">x{item.quantity}</span>
                      <span>{item.productName}</span>
                    </div>
                    <span className="text-gray-400 font-mono text-xs">
                      {item.status === 'ready' ? '✅ Listo' : item.status === 'served' ? '🍽️ Servido' : '⏳ Prep'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sección: Orden Actual (Borrador) */}
          {items.length > 0 && (
            <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-2">Orden Actual</h3>
          )}

          {items.map(item => (
            <div
              key={item.id}
              className="group relative rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:border-indigo-200 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 pr-4">
                  <p className="text-sm font-bold text-gray-900 mb-0.5">{item.productName}</p>
                  <p className="text-xs text-gray-500 font-medium">{currency.format(item.unitPrice)} c/u</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onEditNote(item)}
                    className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all"
                    title="Nota"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => onRemove(item.id)}
                    className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all"
                    title="Eliminar"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {item.notes && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded px-2 py-1 mt-2 mb-3 italic">📝 {item.notes}</p>
              )}

              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1 border border-gray-200">
                  <button
                    onClick={() => onDecrement(item.id)}
                    className="h-7 w-7 rounded-md bg-white text-gray-500 hover:bg-gray-100 hover:text-gray-900 border border-gray-200 flex items-center justify-center font-bold transition-all shadow-sm"
                  >
                    <Minus size={14} strokeWidth={2.5} />
                  </button>
                  <span className="w-8 text-center text-sm font-bold text-gray-900">{item.quantity}</span>
                  <button
                    onClick={() => onIncrement(item.id)}
                    className="h-7 w-7 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 flex items-center justify-center font-bold transition-all shadow-sm"
                  >
                    <Plus size={14} strokeWidth={2.5} />
                  </button>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-indigo-700">
                    {currency.format(item.unitPrice * item.quantity)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default OrderPanel
