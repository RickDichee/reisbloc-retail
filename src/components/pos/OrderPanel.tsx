import { useState } from 'react'
import { OrderItem, Order } from '@/types'
import { LucideIcon, ShoppingBag, Plus, Minus, Trash2, Clock, Pencil } from 'lucide-react'

interface OrderPanelProps {
  tableNumber: number
  items: OrderItem[]
  activeOrders?: Order[] // Órdenes ya enviadas a cocina
  onIncrement: (itemId: string) => void
  onDecrement: (itemId: string) => void
  onRemove: (itemId: string) => void
  onClear: () => void
  onEditNote: (item: OrderItem) => void
  onUpdatePrice: (itemId: string, newPrice: number) => void
  onPrintAccount?: () => void
  onPay?: (total: number) => void
  icon?: LucideIcon
}

const currency = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
})

export function OrderPanel({
  tableNumber,
  items,
  activeOrders = [],
  onIncrement,
  onDecrement,
  onRemove,
  onClear,
  onEditNote,
  onUpdatePrice,
  onPrintAccount,
  onPay,
  icon: Icon = ShoppingBag
}: OrderPanelProps) {
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null)
  const [editingPriceVal, setEditingPriceVal] = useState<string>('')

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Icon className="text-indigo-600" size={24} />
            Ticket {tableNumber}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {items.length} productos {activeOrders.length > 0 ? '· Historial de venta' : ''}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg font-bold text-lg border border-indigo-100">
            {currency.format(items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0))}
          </div>
          {items.length > 0 && (
            <button
              onClick={onClear}
              className="text-xs font-bold text-red-500 hover:text-red-700 flex items-center gap-1 uppercase tracking-wider transition-colors"
            >
              <Trash2 size={12} /> Vaciar Ticket
            </button>
          )}
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
          {/* Sección: Historial (Vendido/Guardado) */}
          {activeOrders.length > 0 && (
            <div className="mb-4 pb-4 border-b border-gray-100">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Clock size={12} /> Ya registrado
              </h3>
              <div className="space-y-2 opacity-75">
                {activeOrders.flatMap(order => (order.items || []).map(item => ({ ...item }))).map((item: any, idx) => (
                  <div key={`prev-${idx}`} className="flex justify-between items-center text-sm text-gray-500 bg-gray-50 p-2 rounded-lg border border-gray-100">
                    <span className="font-medium text-gray-700">{item.productName}</span>
                    <span className="font-black text-gray-900 bg-slate-200 px-2 py-0.5 rounded text-[10px]">{item.quantity} pz</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sección: Carrito actual */}
          {items.length > 0 && (
            <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-2">Venta actual</h3>
          )}

          {items.map(item => (
            <div
              key={item.id}
              className="group relative rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:border-indigo-200 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 pr-4">
                  <p className="text-sm font-bold text-gray-900 mb-0.5">{item.productName}</p>
                  {editingPriceId === item.id ? (
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[10px] font-bold text-gray-400">$</span>
                      <input
                        type="number"
                        value={editingPriceVal}
                        onChange={(e) => setEditingPriceVal(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const num = parseFloat(editingPriceVal)
                            if (!isNaN(num) && num >= 0) {
                              onUpdatePrice(item.id, num)
                            }
                            setEditingPriceId(null)
                          } else if (e.key === 'Escape') {
                            setEditingPriceId(null)
                          }
                        }}
                        className="w-16 px-1.5 py-0.5 border border-indigo-200 rounded font-black text-xs text-slate-900 bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500"
                        autoFocus
                      />
                      <button
                        onClick={() => {
                          const num = parseFloat(editingPriceVal)
                          if (!isNaN(num) && num >= 0) {
                            onUpdatePrice(item.id, num)
                          }
                          setEditingPriceId(null)
                        }}
                        className="text-[9px] bg-slate-950 text-white px-1.5 py-0.5 rounded font-black uppercase hover:bg-slate-800 shrink-0"
                      >
                        ok
                      </button>
                    </div>
                  ) : (
                    <p 
                      onClick={() => {
                        setEditingPriceId(item.id)
                        setEditingPriceVal(item.unitPrice.toString())
                      }}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-black cursor-pointer underline decoration-dotted mt-0.5 flex items-center gap-1"
                      title="Haz clic para modificar el precio de este artículo"
                    >
                      {currency.format(item.unitPrice)} c/u ✏️
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-gray-900">
                    {currency.format(item.unitPrice * item.quantity)}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1 border border-gray-100">
                  <button
                    onClick={() => onDecrement(item.id)}
                    className="p-1 text-gray-500 hover:text-indigo-600 hover:bg-white hover:shadow-sm rounded transition-all"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-8 text-center text-sm font-black text-gray-900">{item.quantity}</span>
                  <button
                    onClick={() => onIncrement(item.id)}
                    className="p-1 text-gray-500 hover:text-indigo-600 hover:bg-white hover:shadow-sm rounded transition-all"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onEditNote(item)}
                    className={`p-2 rounded-lg transition-all ${item.notes ? 'bg-amber-50 text-amber-600' : 'text-gray-400 hover:text-amber-600 hover:bg-amber-50'}`}
                    title="Agregar nota"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => onRemove(item.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    title="Eliminar"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {item.notes && (
                <div className="mt-2 text-[10px] bg-amber-50 text-amber-700 px-2 py-1 rounded border border-amber-100 italic">
                  "{item.notes}"
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Acciones de Cuenta (Venta Viva) */}
      {activeOrders.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-2 gap-3">
          <button
            onClick={onPrintAccount}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all border border-slate-200"
          >
            Imprimir Ticket
          </button>
          <button
            onClick={() => {
              const total = activeOrders.reduce((sum, o) => sum + (o.total || 0), 0)
              onPay?.(total)
            }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-black transition-all shadow-lg"
          >
            Cobrar Cuenta
          </button>
        </div>
      )}
    </div>
  )
}

export default OrderPanel
