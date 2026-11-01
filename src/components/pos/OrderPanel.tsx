import { useState } from 'react'
import { OrderItem, Order } from '@/types'
import { LucideIcon, ShoppingBag, Plus, Minus, Trash2, Pencil } from 'lucide-react'

interface OrderPanelProps {
  tableNumber: number
  items: OrderItem[]
  activeOrders?: Order[]
  onIncrement: (itemId: string) => void
  onDecrement: (itemId: string) => void
  onUpdateQuantity?: (itemId: string, newQuantity: number) => void
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
  onUpdateQuantity,
  onRemove,
  onClear,
  onEditNote,
  onUpdatePrice,
  icon: Icon = ShoppingBag
}: OrderPanelProps) {
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null)
  const [editingPriceVal, setEditingPriceVal] = useState<string>('')
  const [editingQtyId, setEditingQtyId] = useState<string | null>(null)
  const [editingQtyVal, setEditingQtyVal] = useState<string>('')

  const safeItems = items || []
  const totalPieces = safeItems.reduce((sum, item) => sum + ((item?.quantity || 0) * (item?.packQuantity || 1)), 0)

  const effectiveTotal = safeItems.reduce((sum, item) => {
    return sum + ((item?.unitPrice || 0) * (item?.quantity || 0))
  }, 0)

  const commitQuantityEdit = (itemId: string, originalQty: number) => {
    if (!onUpdateQuantity) {
      setEditingQtyId(null)
      return
    }
    const parsed = parseInt(editingQtyVal, 10)
    if (!isNaN(parsed) && parsed >= 0) {
      onUpdateQuantity(itemId, parsed)
    } else {
      onUpdateQuantity(itemId, originalQty)
    }
    setEditingQtyId(null)
  }

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
          <p className="text-[10px] text-slate-400 mt-0.5">Selecciona productos para cobrar</p>
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
                  {(item.sku || (item as any).barcode) && (
                    <div className="mt-0.5">
                      <span className="text-[10px] font-mono font-black text-slate-900 bg-amber-200/80 px-1.5 py-0.5 rounded uppercase tracking-wider inline-block">
                        SKU: {item.sku || (item as any).barcode}
                      </span>
                    </div>
                  )}
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

              {/* Botones de Cantidad (+ / - / teclado directo / eliminar) */}
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

                <div className="flex items-center gap-1">
                  <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-0.5">
                    <button
                      type="button"
                      onClick={() => onDecrement(item.id)}
                      className="w-6 h-6 bg-white hover:bg-slate-200 rounded text-slate-700 font-bold flex items-center justify-center transition-colors shadow-2xs"
                      title="Disminuir (si llega a 0 se elimina)"
                    >
                      <Minus size={11} />
                    </button>

                    {editingQtyId === item.id ? (
                      <input
                        type="number"
                        min="0"
                        value={editingQtyVal}
                        onChange={(e) => setEditingQtyVal(e.target.value)}
                        onBlur={() => commitQuantityEdit(item.id, item.quantity)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            commitQuantityEdit(item.id, item.quantity)
                          } else if (e.key === 'Escape') {
                            setEditingQtyId(null)
                          }
                        }}
                        className="w-11 h-6 px-1 text-center font-black text-xs text-slate-900 bg-white border border-indigo-400 rounded outline-none focus:ring-2 focus:ring-indigo-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        autoFocus
                        onFocus={(e) => e.target.select()}
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingQtyId(item.id)
                          setEditingQtyVal(String(item.quantity))
                        }}
                        className="min-w-[28px] h-6 px-1 text-center font-black text-xs text-slate-900 hover:bg-indigo-50 hover:text-indigo-700 rounded transition-colors cursor-text"
                        title="Haz clic para escribir la cantidad con el teclado"
                      >
                        {item.quantity}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onIncrement(item.id)}
                      className="w-6 h-6 bg-slate-900 hover:bg-slate-800 text-white rounded font-bold flex items-center justify-center transition-colors shadow-2xs"
                    >
                      <Plus size={11} />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(item.id)}
                    className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-1"
                    title="Eliminar producto del ticket"
                  >
                    <Trash2 size={14} />
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
