import { useState } from 'react'
import { OrderItem, Order } from '@/types'
import { LucideIcon, ShoppingBag, Plus, Minus, Trash2, Clock, Pencil } from 'lucide-react'

interface OrderPanelProps {
  tableNumber: number
  items: OrderItem[]
  activeOrders?: Order[]
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
  icon: Icon = ShoppingBag
}: OrderPanelProps) {
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null)
  const [editingPriceVal, setEditingPriceVal] = useState<string>('')

  const safeItems = items || []
  const totalPieces = safeItems.reduce((sum, item) => sum + ((item?.quantity || 0) * (item?.packQuantity || 1)), 0)

  const effectiveTotal = safeItems.reduce((sum, item) => {
    return sum + ((item?.unitPrice || 0) * (item?.quantity || 0))
  }, 0)

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 flex flex-col h-full">
      {/* Header Compacto */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
        <div>
          <div className="flex items-center gap-1.5">
            <Icon className="text-indigo-600 shrink-0" size={18} />
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">
              Ticket #{tableNumber}
            </h2>
          </div>
          <p className="text-[10px] font-bold text-slate-400 mt-0.5">
            {items.length} prod • {totalPieces} pzas total
          </p>
        </div>

        {items.length > 0 && (
          <button
            onClick={onClear}
            className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-[10px] font-black uppercase flex items-center gap-1 transition-all"
            title="Vaciar ticket y liberar caja para nuevas ventas"
          >
            <Trash2 size={12} />
            <span>Liberar Caja</span>
          </button>
        )}

        <div className="flex items-center gap-2">
          <div className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-xl font-black text-sm border border-indigo-100">
            {currency.format(effectiveTotal)}
          </div>
        </div>
      </div>

      {/* Lista o Carrito Vacío Compacto */}
      {items.length === 0 && activeOrders.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center my-auto">
          <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-300 mb-2">
            <ShoppingBag size={20} />
          </div>
          <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Ticket Vacío</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Selecciona prendas para cobrar</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-2 py-2 pr-1 custom-scrollbar">
          {items.map(item => (
            <div
              key={item.id}
              className="group relative rounded-xl border border-slate-200 bg-white p-2.5 shadow-2xs hover:border-indigo-300 transition-all space-y-1.5"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 pr-2 min-w-0">
                  <p className="text-xs font-black text-slate-900 truncate leading-tight">{item.productName}</p>
                  {editingPriceId === item.id ? (
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-[10px] font-bold text-slate-400">$</span>
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
                        className="w-16 px-1 py-0.5 border border-indigo-300 rounded font-black text-xs text-slate-900 bg-slate-50 outline-none focus:ring-1 focus:ring-indigo-500"
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
                        className="text-[10px] bg-indigo-600 text-white font-bold px-1.5 py-0.5 rounded"
                      >
                        ✓
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-xs font-black text-indigo-600">
                        {currency.format(item.unitPrice)}
                      </span>
                      <button
                        onClick={() => {
                          setEditingPriceId(item.id)
                          setEditingPriceVal(item.unitPrice.toString())
                        }}
                        className="p-0.5 text-slate-300 hover:text-indigo-600 transition-colors"
                        title="Editar precio unitario"
                      >
                        <Pencil size={11} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Subtotal */}
                <div className="text-right shrink-0">
                  <span className="font-black text-xs text-slate-900">
                    {currency.format(item.unitPrice * item.quantity)}
                  </span>
                </div>
              </div>

              {/* Botones de Cantidad (+ / - / eliminar) */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                {item.notes ? (
                  <button
                    onClick={() => onEditNote(item)}
                    className="text-[9.5px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded truncate max-w-[120px]"
                  >
                    📝 {item.notes}
                  </button>
                ) : (
                  <button
                    onClick={() => onEditNote(item)}
                    className="text-[9.5px] font-bold text-slate-400 hover:text-slate-600"
                  >
                    + Nota
                  </button>
                )}

                <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-0.5">
                  <button
                    onClick={() => onDecrement(item.id)}
                    className="w-5 h-5 bg-white hover:bg-slate-200 rounded text-slate-700 font-bold flex items-center justify-center transition-colors shadow-2xs"
                  >
                    <Minus size={11} />
                  </button>
                  <span className="w-6 text-center font-black text-xs text-slate-900">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => onIncrement(item.id)}
                    className="w-5 h-5 bg-slate-900 hover:bg-slate-800 text-white rounded font-bold flex items-center justify-center transition-colors shadow-2xs"
                  >
                    <Plus size={11} />
                  </button>
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
