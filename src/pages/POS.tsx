import { useEffect, useMemo, useState, useRef } from 'react'
import logger from '@/utils/logger'
import { useAppStore } from '@/store/appStore'
import supabaseService from '@/services/supabaseService'
import DashboardLayout from '@/components/layout/DashboardLayout'
import ProductGrid from '@/components/pos/ProductGrid'
import OrderPanel from '@/components/pos/OrderPanel'
import PaymentPanel, { PaymentResult } from '@/components/pos/PaymentPanel'
import OrderNoteModal from '@/components/pos/OrderNoteModal'
import ManualItemModal from '@/components/pos/ManualItemModal'
import { Product, OrderItem } from '@/types/index'
import { shiftService } from '@/services/shiftService'
import printService from '@/services/printService'
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner'
import { PlusCircle, Search, Printer, DollarSign, LayoutGrid, AlertTriangle } from 'lucide-react'
import { Navigate } from 'react-router-dom'

const buildTicketHTML = (ordersList: any[], tableNumber: number, title = 'Cuenta', totalAmount: number): string => {
  const allItems = ordersList.flatMap(o => o.items || [])
  const lines = allItems.map(item => `
        <div style="display:flex;justify-content:space-between;margin:2px 0;">
          <span>${item.quantity}x ${item.productName}</span>
          <span>$${(item.unitPrice * item.quantity).toFixed(2)}</span>
        </div>
    `).join('')

  return `
      <div style="width:58mm;padding:4px;font-family:'Courier New', monospace;font-size:11px;color:#000;">
        <div style="text-align:center;border-bottom:1px dashed #000;padding-bottom:8px;margin-bottom:8px;">
            <div style="font-weight:bold;font-size:14px;">REISBLOC POS</div>
            <div>Cuenta: ${tableNumber}</div>
            <div>${title}</div>
            <div>${new Date().toLocaleString()}</div>
        </div>
        <div style="border-bottom:1px dashed #000;padding-bottom:8px;margin-bottom:8px;">${lines || '(Sin items)'}</div>
        <div style="text-align:right;font-weight:bold;font-size:14px;border-top:1px solid #000;padding-top:4px;">TOTAL: $${totalAmount.toFixed(2)}</div>
        <div style="text-align:center;margin-top:12px;font-size:10px;">*** Gracias por su compra ***</div>
      </div>
    `
}

export default function POS() {
  const {
    currentUser,
    products,
    setProducts,
    tables,
    currentTableNumber,
    setCurrentTable,
    draftOrders,
    addItemToDraft,
    incrementDraftItem,
    decrementDraftItem,
    removeDraftItem,
    clearDraftForTable,
  } = useAppStore()

  const [loading, setLoading] = useState(true)
  const [activeTableOrders, setActiveTableOrders] = useState<any[]>([])
  const [editingItem, setEditingItem] = useState<OrderItem | null>(null)
  const cashRegisterAudioRef = useRef<HTMLAudioElement | null>(null)

  const [paymentPanel, setPaymentPanel] = useState<{
    isOpen: boolean
    orderId: string | null
    orderTotal: number
    orderIds?: string[]
  }>({
    isOpen: false,
    orderId: null,
    orderTotal: 0,
    orderIds: []
  })

  const [searchTerm, setSearchTerm] = useState('')
  const [showManualItemModal, setShowManualItemModal] = useState(false)
  const [activeShift, setActiveShift] = useState<any>(null)

  const tableNumber = currentTableNumber || 1
  const items = draftOrders[tableNumber] || []
  const isReadOnly = currentUser?.role === 'supervisor'

  // 🔫 Scanner Integration
  useBarcodeScanner((code) => {
    if (isReadOnly || !currentUser) return
    // @ts-ignore
    const product = products.find(p => p.barcode === code || p.sku === code)
    if (product) handleAddProduct(product)
  })

  if (!currentUser && !loading) {
    return <Navigate to="/login" replace />
  }

  useEffect(() => {
    cashRegisterAudioRef.current = new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU7/3//3/9//3//3/9//3//3/9//3//3/9//3//3/9//3//3/9//3//3/9//3//3/9//3//3/w==')
    loadProducts()
    checkShift()
  }, [])

  const checkShift = async () => {
    if (!currentUser) return
    try {
      const shift = await shiftService.getActiveShift(currentUser.id)
      setActiveShift(shift)
    } catch (e) {
      logger.error('pos', 'Error checking shift', e as any)
    }
  }

  const loadProducts = async () => {
    setLoading(true)
    try {
      const prods = await supabaseService.getAllRetailProducts()
      setProducts(prods)
    } catch (error) {
      logger.error('pos', 'Error loading retail products', error as any)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!currentTableNumber) {
      setActiveTableOrders([])
      return
    }
    const unsubscribe = supabaseService.subscribeToActiveOrders((orders) => {
      setActiveTableOrders(orders.filter(o => o.tableNumber === currentTableNumber))
    })
    return () => unsubscribe?.()
  }, [currentTableNumber])

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchTerm) {
      // @ts-ignore
      const exactMatch = products.find(p => p.barcode === searchTerm || p.sku === searchTerm)
      if (exactMatch) {
        handleAddProduct(exactMatch)
        setSearchTerm('')
        return
      }
      if (filteredProducts.length === 1) {
        handleAddProduct(filteredProducts[0])
        setSearchTerm('')
      }
    }
  }

  const filteredProducts = useMemo(() => {
    let result = products
    if (!searchTerm) return result
    const lower = searchTerm.toLowerCase()
    return result.filter(p =>
      p.name.toLowerCase().includes(lower) ||
      // @ts-ignore
      p.sku?.toLowerCase().includes(lower) ||
      // @ts-ignore
      p.barcode?.includes(lower)
    )
  }, [products, searchTerm])

  const handleUpdateItemNote = (itemId: string, note: string) => {
    useAppStore.setState(state => {
      const tableDraft = state.draftOrders[tableNumber] || [];
      const updatedDraft = tableDraft.map(item =>
        item.id === itemId ? { ...item, notes: note } : item
      );
      return {
        draftOrders: { ...state.draftOrders, [tableNumber]: updatedDraft }
      };
    });
  }

  const handleAddProduct = (product: Product) => {
    if (!currentUser || isReadOnly) return
    addItemToDraft(tableNumber, product, currentUser.id)
  }

  const handleAddManualItem = (description: string, price: number) => {
    if (!currentUser || isReadOnly) return
    const virtualProduct: any = {
      id: `manual-${Date.now()}`,
      name: description,
      price: price,
      category: 'Manual',
      image: '',
    }
    addItemToDraft(tableNumber, virtualProduct, currentUser.id)
  }

  const handlePrintAccount = async (tableNum: number) => {
    try {
      const ordersToPrint = activeTableOrders
      const draftItems = draftOrders[tableNum] || []
      const activeTotal = ordersToPrint.reduce((sum, o) => sum + (o.items?.reduce((s: number, i: any) => s + (i.unitPrice * i.quantity), 0) || 0), 0)
      const draftTotal = draftItems.reduce((sum, i) => sum + (i.unitPrice * i.quantity), 0)
      const total = activeTotal + draftTotal
      if (total === 0) return

      const allItems = [...ordersToPrint.flatMap(o => o.items || []), ...draftItems]
      const itemsForTicket = [{ id: 'consolidated', items: allItems }]

      const ticketHTML = buildTicketHTML(itemsForTicket, tableNum, 'Pre-cuenta', total)
      await printService.printReceipt(ticketHTML, { title: 'Pre-cuenta', width: 58 })
    } catch (error) {
      logger.error('pos', 'Error printing account', error as any)
      alert('Error al imprimir cuenta')
    }
  }

  const [stockWarning, setStockWarning] = useState<{ isOpen: boolean, items: any[] }>({ isOpen: false, items: [] })

  const checkStockAvailability = (orders: any[], currentDraft: any[]) => {
    // Combine all items to be sold
    const allItems = [...currentDraft, ...orders.flatMap(o => o.items || [])]

    // Agrupar por producto para sumar cantidades totales
    const totals: Record<string, number> = {}
    allItems.forEach(item => {
      if (item.productId) {
        totals[item.productId] = (totals[item.productId] || 0) + item.quantity
      }
    })

    const warnings: any[] = []

    Object.keys(totals).forEach(prodId => {
      // @ts-ignore
      const product = products.find(p => p.id === prodId)
      // Solo validar si el producto existe y tiene control de inventario (hasInventory)
      // Y excluimos items manuales que no tienen ID real en products
      if (product && product.hasInventory) {
        const currentStock = product.currentStock || 0
        if (currentStock < totals[prodId]) {
          warnings.push({
            name: product.name,
            current: currentStock,
            requested: totals[prodId],
            deficit: totals[prodId] - currentStock
          })
        }
      }
    })

    return warnings
  }

  const confirmCheckout = () => {
    const activeTotal = activeTableOrders.reduce((sum, o) => sum + (o.items?.reduce((s: number, i: any) => s + (i.unitPrice * i.quantity), 0) || 0), 0)
    const draftTotal = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0)
    const finalTotal = activeTotal + draftTotal

    if (finalTotal === 0) return

    setPaymentPanel({
      isOpen: true,
      orderId: 'retail-direct',
      orderTotal: finalTotal,
      orderIds: activeTableOrders.map(o => o.id)
    })
  }

  const handleQuickCheckout = async () => {
    if (!currentUser || isReadOnly) return

    // 1. Stock Check 🛡️
    const formattedDraft = items.map(i => ({ ...i, productId: i.productId })) // Ensure shape
    const stockIssues = checkStockAvailability(activeTableOrders, formattedDraft)

    if (stockIssues.length > 0) {
      setStockWarning({ isOpen: true, items: stockIssues })
      return
    }

    confirmCheckout()
  }

  const handlePaymentComplete = async (result: PaymentResult) => {
    if (!currentUser || isReadOnly) return
    const { orderIds } = paymentPanel
    const targetIds = orderIds || (paymentPanel.orderId ? [paymentPanel.orderId] : [])
    if (targetIds.length === 0) return

    try {
      const mappedMethod = result.paymentMethod === 'card' ? 'tarjeta' : (result.paymentMethod === 'transfer' ? 'transferencia' : result.paymentMethod)

      // Fetch combined items: Draft + any previously open orders
      const ordersToProcess = activeTableOrders.filter(o => (targetIds || []).includes(o.id))
      const allItems = [...items, ...ordersToProcess.flatMap(o => o.items || [])]

      await supabaseService.createRetailSale({
        tableNumber,
        subtotal: paymentPanel.orderTotal,
        total: result.total,
        paymentMethod: mappedMethod,
        saleBy: currentUser.id,
        notes: 'Venta Directa Retail'
      }, allItems)

      try {
        const ticketHTML = buildTicketHTML([{ items: allItems }], tableNumber, 'Ticket de Venta', result.total)
        await printService.printReceipt(ticketHTML, { title: 'Ticket de Pago', width: 58 })
      } catch (printErr) {
        logger.warn('pos', 'No se pudo imprimir ticket final', printErr as any)
      }

      clearDraftForTable(tableNumber)
      setPaymentPanel({ isOpen: false, orderId: null, orderTotal: 0, orderIds: [] })
      cashRegisterAudioRef.current?.play().catch(() => { })
      alert(`✅ Venta completada!\nTotal: $${result.total.toFixed(2)}`)
    } catch (error: any) {
      logger.error('pos', 'Error recording sale', error)
      alert(`Error: ${error.message}`)
    }
  }

  const tableButtons = useMemo(() => {
    const baseTables = tables.length ? tables : Array.from({ length: 3 }, (_, i) => i + 1)
    return baseTables.slice(0, 3)
  }, [tables])

  if (loading) return <div className="flex items-center justify-center min-h-screen">Cargando...</div>

  const currentTotal = (
    activeTableOrders.reduce((sum, o) => sum + (o.items?.reduce((s: number, i: any) => s + (i.unitPrice * i.quantity), 0) || 0), 0) +
    items.reduce((sum, i) => sum + (i.unitPrice * i.quantity), 0)
  )

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-2rem)] flex flex-col gap-4">
        {/* Unified Header with Search and Accounts */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 items-center shrink-0">
          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200 shrink-0">
            <LayoutGrid size={18} className="text-slate-400 ml-2" />
            {tableButtons.map(num => (
              <button
                key={num}
                onClick={() => setCurrentTable(num)}
                className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${tableNumber === num ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Caja {num}
              </button>
            ))}
          </div>

          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl bg-slate-50 font-bold focus:ring-2 focus:ring-slate-900 transition-all"
              placeholder="Escanear o buscar producto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
          </div>

          <button
            onClick={() => setShowManualItemModal(true)}
            className="hidden md:flex p-3 bg-slate-900 text-white rounded-xl shadow-lg hover:scale-105 transition-all"
          >
            <PlusCircle size={24} />
          </button>
        </div>

        {/* Main Workspace: Combined Grid and Cart */}
        <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
          {/* Catalog Panel (Left) */}
          <div className="flex-[5] flex flex-col min-h-0 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="flex-1 min-h-0 p-4 overflow-y-auto custom-scrollbar">
              <ProductGrid products={filteredProducts} onAdd={handleAddProduct} disableAdd={isReadOnly || !!activeShift?.end_time} />
            </div>
          </div>

          {/* Cart Panel (Right) */}
          <div className="flex-[3] flex flex-col min-h-0 bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-2">
              <OrderPanel
                tableNumber={tableNumber}
                items={items}
                activeOrders={[]} // Hide restaurant statuses in Retail Pivot
                onIncrement={(id) => incrementDraftItem(tableNumber, id)}
                onDecrement={(id) => decrementDraftItem(tableNumber, id)}
                onRemove={(id) => removeDraftItem(tableNumber, id)}
                onClear={() => clearDraftForTable(tableNumber)}
                onEditNote={(item) => setEditingItem(item)}
              />
            </div>

            {/* Checkout Region */}
            <div className="p-4 bg-white border-t border-slate-200 space-y-4 shrink-0 shadow-[0_-4px_10px_rgba(0,0,0,0.03)]">
              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl">
                <span className="font-black text-slate-500 text-sm">TOTAL</span>
                <span className="font-black text-3xl text-slate-900 tracking-tight">
                  ${currentTotal.toFixed(2)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handlePrintAccount(tableNumber)}
                  disabled={currentTotal === 0}
                  className="py-4 bg-slate-100 text-slate-900 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-slate-200 transition-all border border-slate-300"
                >
                  <Printer size={20} />
                  Ticket
                </button>
                <button
                  onClick={handleQuickCheckout}
                  disabled={currentTotal === 0}
                  className="py-4 bg-emerald-600 text-white font-black rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all"
                >
                  <DollarSign size={20} />
                  COBRAR
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modals */}
        {paymentPanel.isOpen && (
          <PaymentPanel
            orderId={paymentPanel.orderId || ''}
            orderIds={paymentPanel.orderIds}
            orderTotal={paymentPanel.orderTotal}
            items={[...items, ...activeTableOrders.filter(o => paymentPanel.orderIds?.includes(o.id)).flatMap(o => o.items || [])]}
            tableNumber={tableNumber}
            onPaymentComplete={handlePaymentComplete}
            onCancel={() => setPaymentPanel({ isOpen: false, orderId: null, orderTotal: 0, orderIds: [] })}
          />
        )}

        {editingItem && (
          <OrderNoteModal
            isOpen={!!editingItem}
            onClose={() => setEditingItem(null)}
            onSave={(note) => { handleUpdateItemNote(editingItem.id, note); setEditingItem(null); }}
            initialNote={editingItem.notes || ''}
            itemName={editingItem.productName}
          />
        )}

        {showManualItemModal && (
          <ManualItemModal
            isOpen={showManualItemModal}
            onClose={() => setShowManualItemModal(false)}
            onAdd={handleAddManualItem}
          />
        )}

        {stockWarning.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-red-100">
              <div className="bg-red-50 p-6 border-b border-red-100 flex items-center gap-4">
                <div className="p-3 bg-red-100 text-red-600 rounded-full shrink-0">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-red-900 leading-none mb-1">Stock Insuficiente</h3>
                  <p className="text-red-700/80 text-sm font-medium">Algunos productos exceden las existencias.</p>
                </div>
              </div>

              <div className="p-6">
                <p className="text-slate-600 font-medium mb-4 text-sm">Los siguientes productos quedarán con inventario negativo si procedes:</p>
                <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden mb-6">
                  <div className="max-h-48 overflow-y-auto custom-scrollbar">
                    {stockWarning.items.map((item, idx) => (
                      <div key={idx} className="p-3 border-b border-slate-100 last:border-0 flex justify-between items-center text-sm">
                        <span className="font-bold text-slate-800 line-clamp-1">{item.name}</span>
                        <div className="text-right shrink-0 ml-4">
                          <div className="text-red-600 font-black">-{item.deficit}</div>
                          <div className="text-[10px] text-slate-400">Stock actual: {item.current}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStockWarning({ isOpen: false, items: [] })}
                    className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      // 📝 Audit Log: Forced Sale
                      supabaseService.createAuditLog({
                        userId: currentUser?.id || 'system',
                        action: 'SALE_FORCE_STOCK',
                        entityType: 'retail_sale',
                        entityId: 'pre-check',
                        oldValue: { warnings: stockWarning.items },
                        details: 'User forced sale with insufficient stock'
                      }).catch(console.error)

                      setStockWarning({ isOpen: false, items: [] })
                      confirmCheckout() // Proceder
                    }}
                    className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
                  >
                    Forzar Venta
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  )
}
