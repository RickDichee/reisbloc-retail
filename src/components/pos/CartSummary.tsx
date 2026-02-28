import { useMemo } from 'react'
import printService from '@/services/printService'
import { OrderItem, Product } from '@/types'
import { ShoppingCart, Send, Trash2, AlertTriangle } from 'lucide-react'

interface CartSummaryProps {
  tableNumber: number
  items: OrderItem[]
  onSend: () => void
  onClear: () => void
  sending: boolean
  products?: Product[]
  stockError?: string
}

const currency = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
})

export function CartSummary({ tableNumber, items, onSend, onClear, sending, products = [], stockError }: CartSummaryProps) {
  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
    const tax = subtotal * 0.16
    const total = subtotal + tax
    return { subtotal, tax, total }
  }, [items])

  const hasStockIssue = useMemo(() => {
    return items.some(item => {
      const product = products.find(p => p.id === item.productId)
      return product?.hasInventory && (product.currentStock ?? 0) < item.quantity
    })
  }, [items, products])

  const isDisabled = items.length === 0 || sending || hasStockIssue

  const handlePrint = async () => {
    if (items.length === 0) return
    // Construir HTML simple para ticket de cuenta (58mm)
    const date = new Date().toLocaleString('es-MX')
    const lines = items
      .map(item => `
        <div style="display:flex;justify-content:space-between;margin:2px 0;">
          <span>${item.quantity}x ${item.productName}</span>
          <span>$${(item.unitPrice * item.quantity).toFixed(2)}</span>
        </div>
      `)
      .join('')

    const html = `
      <div style="width:58mm;padding:8px;font-family:'Courier New', monospace;font-size:11px;line-height:1.2;color:#000;">
        <div style="text-align:center;margin-bottom:8px;border-bottom:1px solid #000;">
          <div style="font-weight:bold;font-size:12px;">REISBLOC RETAIL</div>
          <div style="font-size:9px;">Tienda POS</div>
          <div style="font-size:9px;">Caja ${tableNumber}</div>
        </div>
        <div style="margin-bottom:6px;font-size:9px;">
          <div>Fecha: ${date}</div>
        </div>
        <div style="margin-bottom:8px;border-bottom:1px solid #000;padding-bottom:8px;">
          ${lines}
        </div>
        <div style="margin-bottom:8px;border-bottom:1px solid #000;padding-bottom:8px;">
          <div style="display:flex;justify-content:space-between;margin:2px 0;">
            <span>Subtotal:</span>
            <span>$${totals.subtotal.toFixed(2)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin:2px 0;">
            <span>IVA (16%):</span>
            <span>$${totals.tax.toFixed(2)}</span>
          </div>
          <div style="font-weight:bold;display:flex;justify-content:space-between;font-size:12px;">
            <span>TOTAL:</span>
            <span>$${totals.total.toFixed(2)}</span>
          </div>
        </div>
        <div style="text-align:center;font-size:9px;margin-top:8px;">
          <div>Este no es comprobante fiscal.</div>
          <div style="margin-top:4px;font-size:8px;">Gracias por su preferencia</div>
        </div>
      </div>
    `

    try {
      await printService.printReceipt(html, { title: 'Cuenta', width: 58 })
    } catch (e) {
      // noop: errores ya se loguean en printService
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col h-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ShoppingCart className="text-indigo-600" size={24} />
            Resumen
          </h2>
          <p className="text-sm font-medium text-gray-500 mt-1">Caja {tableNumber}</p>
        </div>
        <button
          onClick={onClear}
          disabled={items.length === 0}
          className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-red-600 disabled:cursor-not-allowed disabled:text-gray-300 transition-colors p-2 rounded-lg hover:bg-red-50"
        >
          <Trash2 size={18} />
          Limpiar
        </button>
      </div>

      {stockError && (
        <div className="mb-4 rounded-lg bg-red-50 p-4 border border-red-200 animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-red-500" size={20} />
            <p className="text-sm font-bold text-red-700">{stockError}</p>
          </div>
        </div>
      )}

      {hasStockIssue && !stockError && (
        <div className="mb-4 rounded-lg bg-amber-50 p-4 border border-amber-200 animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-amber-500" size={20} />
            <p className="text-sm font-bold text-amber-700">Stock insuficiente</p>
          </div>
        </div>
      )}

      <div className="bg-gray-50 rounded-lg p-4 space-y-3 mb-6 border border-gray-100">
        <div className="flex justify-between text-gray-600 text-sm">
          <span>Subtotal</span>
          <span className="font-semibold">{currency.format(totals.subtotal)}</span>
        </div>
        <div className="flex justify-between text-gray-600 text-sm">
          <span>IVA (16%)</span>
          <span className="font-semibold">{currency.format(totals.tax)}</span>
        </div>
        <div className="h-px bg-gray-200" />
        <div className="flex justify-between pt-1">
          <span className="font-bold text-gray-900 text-lg">Total</span>
          <span className="font-black text-indigo-600 text-xl">
            {currency.format(totals.total)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-auto">
        <button
          onClick={handlePrint}
          disabled={items.length === 0}
          className={`w-full rounded-lg px-4 py-3 text-sm font-bold transition-all flex items-center justify-center gap-2 border ${items.length === 0
            ? 'cursor-not-allowed bg-gray-100 text-gray-400 border-gray-200'
            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 shadow-sm'
            }`}
        >
          Imprimir
        </button>

        <button
          onClick={onSend}
          disabled={isDisabled}
          className={`w-full rounded-lg px-4 py-3 text-sm font-bold text-white transition-all flex items-center justify-center gap-2 shadow-sm ${isDisabled
            ? 'cursor-not-allowed bg-gray-200 text-gray-400'
            : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
        >
          {sending ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              <span>Enviando...</span>
            </>
          ) : hasStockIssue ? (
            <>
              <AlertTriangle size={18} />
              <span>Stock</span>
            </>
          ) : (
            <>
              <Send size={18} />
              <span>Enviar</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}

export default CartSummary
