import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import { usePermissions } from '@/hooks/usePermissions'
import supabaseService from '@/services/supabaseService'
import printService from '@/services/printService'
import { Order, SplitPayment } from '@/types'
import {
  LayoutDashboard,
  Timer,
  Edit,
  CreditCard,
  Users,
  Printer
} from 'lucide-react'
import SplitBillModal from '@/components/pos/SplitBillModal'
import EditOrderModal from '@/components/admin/EditOrderModal'
import PaymentPanel, { PaymentResult } from '@/components/pos/PaymentPanel'
import DashboardLayout from '@/components/layout/DashboardLayout'

interface TransferState {
  [orderId: string]: number
}

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

const getTableColorStyles = (tableNum: number) => {
  const styles = [
    { bg: 'bg-slate-50', border: 'border-slate-200', header: 'from-slate-50 to-slate-100', text: 'text-slate-900', icon: 'text-slate-600' },
    { bg: 'bg-blue-50', border: 'border-blue-200', header: 'from-blue-50 to-blue-100', text: 'text-blue-900', icon: 'text-blue-600' },
    { bg: 'bg-indigo-50', border: 'border-indigo-200', header: 'from-indigo-50 to-indigo-100', text: 'text-indigo-900', icon: 'text-indigo-600' },
  ]
  return styles[(tableNum - 1) % styles.length] || styles[0]
}

export default function TableMonitor() {
  const navigate = useNavigate()
  const { currentUser, tickets } = useAppStore()
  const permissions = usePermissions()
  const canAccessTableMonitor = permissions.canAccessTableMonitor
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [_transferTargets] = useState<TransferState>({})
  const [busyOrders, setBusyOrders] = useState<Record<string, boolean>>({})
  void busyOrders
  const [splitBillOrder, setSplitBillOrder] = useState<Order | null>(null)
  const [editOrder, setEditOrder] = useState<Order | null>(null)
  const [paymentOrder, setPaymentOrder] = useState<{ ids: string[]; total: number; tableNumber: number } | null>(null)

  const entityName = 'Caja'

  const buildTicketHTML = (ordersList: Order[], tableNumber: number, title = 'Cuenta', totalAmount?: number): string => {
    const allItems = ordersList.flatMap(o => o.items || [])
    const subtotal = allItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
    const total = totalAmount || subtotal
    const date = new Date().toLocaleString('es-MX')
    const businessName = currentUser?.businessName || 'REISBLOC POS'
    const cashierName = currentUser?.username || 'Staff'

    const lines = allItems
      .map(item => `
        <div style="display:flex;justify-content:space-between;margin:2px 0;">
          <span>${item.productName} (${item.quantity} pz)</span>
          <span>$${(item.unitPrice * item.quantity).toFixed(2)}</span>
        </div>
      `)
      .join('')

    return `
      <div style="width:58mm;padding:4px;font-family:'Courier New', monospace;font-size:11px;line-height:1.2;color:#000;">
        <div style="text-align:center;margin-bottom:8px;border-bottom:1px dashed #000;padding-bottom:8px;">
          <div style="font-weight:bold;font-size:14px;margin-bottom:4px;">${businessName.toUpperCase()}</div>
          <div style="font-size:10px;margin-top:4px;">${entityName}: ${tableNumber}</div>
          <div style="font-size:10px;">${title}</div>
          <div style="font-size:10px;">${date}</div>
          <div style="font-size:10px;">Atendió: ${cashierName}</div>
        </div>
        
        <div style="margin-bottom:8px;border-bottom:1px dashed #000;padding-bottom:8px;">
          ${lines || '<div style="text-align:center;">(Sin items)</div>'}
        </div>
        
        <div style="margin-bottom:8px;border-bottom:1px dashed #000;padding-bottom:8px;">
          <div style="display:flex;justify-content:space-between;margin:2px 0;">
            <span>Subtotal:</span>
            <span>$${subtotal.toFixed(2)}</span>
          </div>
          <div style="font-weight:bold;display:flex;justify-content:space-between;font-size:14px;margin-top:4px;">
            <span>TOTAL:</span>
            <span>$${total.toFixed(2)}</span>
          </div>
        </div>

        
        <div style="text-align:center;font-size:9px;margin-top:12px;">
          *** Gracias por visitarnos ***
          <br/>Este ticket no es comprobante fiscal
        </div>
      </div>
    `
  }

  const handleCancelTable = async (ordersList: Order[]) => {
    if (!currentUser) return
    const reason = prompt('Motivo de la cancelación (Opcional):')
    if (reason === null) return // Cancelled prompt

    try {
      setLoading(true)
      for (const order of ordersList) {
        await supabaseService.cancelOrder(order.id, reason || 'Cancelado desde monitor', currentUser.id)
      }
      // Actualización local por si el realtime tarda
      setOrders(prev => prev.filter(o => !ordersList.some(ol => ol.id === o.id)))
    } catch (err: any) {
      setError(err?.message || 'Error al cancelar la cuenta')
    } finally {
      setLoading(false)
    }
  }

  const handlePrintTable = async (ordersList: Order[], tableNumber: number, title = 'Cuenta / Caja', totalAmount?: number) => {
    try {
      const html = buildTicketHTML(ordersList, tableNumber, title, totalAmount)
      await printService.printReceipt(html, { title, width: 58 })
    } catch (err: any) {
      setError(err?.message || 'Error al imprimir ticket')
    }
  }

  useEffect(() => {
    if (!canAccessTableMonitor) return
    const sub = supabaseService.subscribeToOrders((orders) => {
      setOrders(orders)
    })

    const loadOrders = async () => {
      try {
        const data = await supabaseService.getActiveOrders()
        setOrders(data)
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }

    loadOrders()
    return () => { sub?.() }
  }, [canAccessTableMonitor])

  const groupedByTable = useMemo(() => {
    const groups: { [key: number]: Order[] } = {}
    orders.forEach(o => {
      const ticketNum = o.tableNumber ?? o.ticketNumber ?? 0
      if (!groups[ticketNum]) groups[ticketNum] = []
      groups[ticketNum].push(o)
    })
    return Object.entries(groups).map(([num, ords]) => ({ tableNumber: parseInt(num), orders: ords.sort((a, b) => normalizeDate(a.createdAt).getTime() - normalizeDate(b.createdAt).getTime()) }))
  }, [orders])

  const calculateOrderTotal = (order: Order) => order.items?.reduce((s, i) => s + (i.unitPrice * i.quantity), 0) || 0

  const consolidateOrdersForPayment = (ordersList: Order[]) => {
    if (ordersList.length <= 1) return { regular: ordersList, consolidated: null }
    const total = ordersList.reduce((sum, o) => sum + calculateOrderTotal(o), 0)
    return { regular: [], consolidated: { orders: ordersList, total } }
  }

  const handleSplitBill = async (splits: SplitPayment[]) => {
    if (!splitBillOrder || !currentUser) return
    const orderIds = (splitBillOrder as any).isConsolidated ? (splitBillOrder as any).originalOrderIds : [splitBillOrder.id]
    const tableNumber = splitBillOrder.tableNumber
    try {
      for (const split of splits) {
        const subtotal = split.items.reduce((s: number, i: any) => s + (i.unitPrice * i.quantity), 0)
        const total = subtotal
        const method = split.paymentMethods[0]?.method || 'cash'
        const finalMethod = method === 'tarjeta' ? 'card' : (method === 'transferencia' ? 'digital' : 'cash')
        await supabaseService.createSale({
          organizationId: currentUser.organizationId,
          orderIds,
          tableNumber,
          items: split.items,
          subtotal,
          discounts: 0,
          tax: 0,
          total,
          paymentMethod: finalMethod as any,
          tip: 0,
          tipSource: 'none',
          saleBy: currentUser.id,
          createdAt: new Date(),
        } as any)
      }
      for (const id of orderIds) { await supabaseService.updateOrderStatus(id, 'completed') }
      setSplitBillOrder(null)
      alert('✅ Cuenta dividida y pagada exitosamente')
    } catch (err: any) {
      setError(err?.message || 'Error al procesar división')
    }
  }

  const handleEditOrder = async (orderId: string, updates: any) => {
    setBusyOrders(prev => ({ ...prev, [orderId]: true }))
    try {
      await supabaseService.updateOrder(orderId, updates)
      setEditOrder(null)
    } catch (err: any) {
      setError(err?.message || 'No se pudo actualizar la orden')
    } finally {
      setBusyOrders(prev => ({ ...prev, [orderId]: false }))
    }
  }

  const handlePaymentComplete = async (result: PaymentResult) => {
    if (!paymentOrder || !currentUser) return
    const { ids: orderIds, tableNumber } = paymentOrder
    const ordersToProcess = orders.filter(o => orderIds.includes(o.id))
    const allItems = ordersToProcess.flatMap(o => o.items || [])
    const subTotal = allItems.reduce((s, i) => s + (i.unitPrice * i.quantity), 0)
    const finalMethod = result.paymentMethod === 'card' ? 'card' : (result.paymentMethod === 'card_mercadopago' ? 'digital' : 'cash')
    try {
      await supabaseService.createSale({
        organizationId: currentUser.organizationId,
        orderIds,
        tableNumber,
        items: allItems,
        subtotal: subTotal,
        discounts: 0,
        tax: 0,
        total: result.total,
        paymentMethod: finalMethod as any,
        tip: 0,
        tipSource: 'none',
        saleBy: currentUser.id,
        createdAt: new Date(),
      } as any)
      await handlePrintTable(ordersToProcess, tableNumber, 'Ticket de Pago', result.total)
      for (const id of orderIds) { await supabaseService.updateOrderStatus(id, 'completed') }
      setPaymentOrder(null)
      alert(`✅ Pago registrado y ${entityName.toLowerCase()} cerrada`)
    } catch (err: any) {
      const msg = err?.message || 'No se pudo registrar el pago'
      setError(msg); alert(`❌ Error: ${msg}`)
    } finally {
      setBusyOrders(prev => {
        const u = { ...prev }; orderIds.forEach(id => delete u[id]); return u
      })
    }
  }

  const handleCancelOrder = async (reason: string) => {
    if (!currentUser || !editOrder) return
    setBusyOrders(prev => ({ ...prev, [editOrder.id]: true }))
    try {
      await supabaseService.updateOrder(editOrder.id, { status: 'cancelled', cancelReason: reason, cancelledBy: currentUser.id, cancelledAt: new Date() })
      setEditOrder(null); alert('✅ Orden cancelada exitosamente')
    } catch (err: any) {
      setError(err?.message || 'No se pudo cancelar'); throw err;
    } finally {
      setBusyOrders(prev => ({ ...prev, [editOrder.id]: false }))
    }
  }

  if (!canAccessTableMonitor) return <Navigate to="/pos" replace />
  if (loading) return (
    <DashboardLayout>
      <div className="min-h-screen flex items-center justify-center bg-rb-canvas">
        <div className="text-center text-slate-500 font-bold animate-pulse uppercase tracking-widest">Cargando monitor...</div>
      </div>
    </DashboardLayout>
  )

  const availableTables = (tickets || []).length 
    ? tickets 
    : Array.from({ length: 12 }, (_, i) => i + 1)

  return (
    <DashboardLayout>
      <div className="relative space-y-6">
        <div className="bg-slate-50 rounded-3xl shadow-xl border border-slate-200 overflow-hidden px-6 py-6 sm:px-8 flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-lg"><LayoutDashboard size={28} /></div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase">Monitor de Cuentas</h1>
              <p className="text-slate-500 font-medium">Control de ventas abiertas y cajas</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="bg-slate-50 rounded-xl px-5 py-4 border border-slate-100"><p className="text-slate-500 font-semibold uppercase text-xs tracking-wider">{entityName}s activas</p><p className="text-3xl font-black">{groupedByTable.length}</p></div>
            <div className="bg-slate-50 rounded-xl px-5 py-4 border border-slate-100"><p className="text-slate-500 font-semibold uppercase text-xs tracking-wider">Ventas abiertas</p><p className="text-3xl font-black text-blue-600">{orders.length}</p></div>
            <div className="bg-slate-50 rounded-xl px-5 py-4 border border-slate-100"><p className="text-slate-500 font-semibold uppercase text-xs tracking-wider">Puntos de venta</p><p className="text-3xl font-black">{availableTables.length}</p></div>
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">{error}</div>}

        {groupedByTable.length === 0 ? (
          <>
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-400 font-bold shadow-sm uppercase tracking-widest text-sm">Caja disponible - click para iniciar venta</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {(availableTables as number[]).filter((t: number) => !groupedByTable.find(g => g.tableNumber === t)).map((tableNum: number) => {
              const styles = getTableColorStyles(tableNum)
              return (
                <div key={tableNum} onClick={() => navigate('/pos')} className={`border-2 ${styles.border} ${styles.bg} rounded-2xl shadow-lg p-5 flex flex-col gap-3 transition-all hover:shadow-xl hover:scale-105 cursor-pointer`}>
                  <div className={`flex items-center justify-between rounded-xl p-3 bg-gradient-to-r ${styles.header}`}>
                    <div><p className={`text-sm font-semibold ${styles.text} opacity-70`}>{entityName}</p><p className={`text-3xl font-black ${styles.text}`}>{tableNum}</p></div>
                  </div>
                  <p className="text-xs text-slate-400">Click para vender</p>
                </div>
              )
            })}
          </div>
          </>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {groupedByTable.map(group => {
              const styles = getTableColorStyles(group.tableNumber)
              return (
                <div key={group.tableNumber} className={`border-2 ${styles.border} ${styles.bg} rounded-2xl shadow-lg p-5 flex flex-col gap-3 transition-all hover:shadow-xl`}>
                  <div className={`flex items-center justify-between rounded-xl p-3 bg-gradient-to-r ${styles.header}`}>
                    <div><p className={`text-sm font-semibold ${styles.text} opacity-70`}>{entityName}</p><p className={`text-3xl font-black ${styles.text}`}>{group.tableNumber}</p></div>
                    <div className={`flex items-center gap-2 text-sm font-medium ${styles.text}`}><Timer size={16} className={styles.icon} /><span>{humanizeDuration(group.orders[0]?.createdAt || new Date())}</span></div>
                  </div>
                  <div className="space-y-3">
                    {(() => {
                      const { regular, consolidated } = consolidateOrdersForPayment(group.orders)
                      const displayList = consolidated ? regular : group.orders
                      return (
                        <>
                          {consolidated && (
                            <div className="border-2 border-amber-400 bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl p-4 space-y-3 shadow-sm">
                              <div className="flex items-center justify-between">
                                <div><p className="text-xs text-amber-700 font-bold uppercase tracking-wider">Total Venta</p><p className="text-lg font-black text-amber-900">{consolidated.orders.length} lotes</p></div>
                                <div className="text-right"><p className="text-xs text-amber-700 font-semibold">Total</p><p className="text-2xl font-black text-amber-900">${consolidated.total.toFixed(2)}</p></div>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => handlePrintTable(consolidated.orders, group.tableNumber, 'Cuenta General')} className="px-4 py-3 rounded-lg bg-gray-900 text-white font-bold text-xs flex items-center justify-center gap-1 hover:bg-slate-800 transition-colors"><Printer size={14} /> Ticket</button>
                                <button onClick={() => setPaymentOrder({ ids: consolidated.orders.map(o => o.id), total: consolidated.total, tableNumber: group.tableNumber })} className="px-4 py-3 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1 hover:bg-emerald-700 transition-colors"><CreditCard size={14} /> Cobrar</button>
                                <button onClick={() => {
                                  const virtual: Order = { id: consolidated.orders[0].id, tableNumber: group.tableNumber, status: 'served', items: consolidated.orders.flatMap(o => o.items || []), createdAt: new Date(), originalOrderIds: consolidated.orders.map(o => o.id) } as any;
                                  (virtual as any).isConsolidated = true; setSplitBillOrder(virtual);
                                }} className="px-4 py-3 rounded-lg bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-1 hover:bg-slate-800 transition-colors"><Users size={14} /> Dividir</button>
                                <button onClick={() => handleCancelTable(consolidated.orders)} className="px-4 py-3 rounded-lg bg-red-50 text-red-600 font-bold text-xs border border-red-200 flex items-center justify-center gap-1 hover:bg-red-100 transition-colors uppercase tracking-tight">Cancelar</button>
                              </div>
                            </div>
                          )}
                          {displayList.map(order => (
                            <div key={order.id} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3 shadow-sm">
                              <div className="flex items-center justify-between">
                                <div><p className="text-xs text-gray-500">Folio: {order.id.slice(0, 6).toUpperCase()}</p></div>
                              </div>
                              <div className="text-xs text-gray-700">Total: <span className="font-bold">${calculateOrderTotal(order).toFixed(2)}</span></div>
                              {order.items?.length && (
                                <div className="bg-gray-50 rounded-lg p-2 text-[10px] text-gray-600">
                                  {order.items.slice(0, 2).map((it, ix) => <div key={ix} className="flex justify-between items-center py-0.5"><span>{it.productName}</span><span className="font-bold">{it.quantity} pz</span></div>)}
                                  {order.items.length > 2 && <div className="text-gray-400">...</div>}
                                </div>
                              )}
                              <div className="flex gap-2">
                                <button onClick={() => setEditOrder(order)} className="flex-1 p-2 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-100"><Edit size={14} className="inline mr-1" /> Editar</button>
                                {order.status === 'served' && !consolidated && (
                                  <button onClick={() => setPaymentOrder({ ids: [order.id], total: calculateOrderTotal(order), tableNumber: group.tableNumber })} className="flex-1 p-2 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold border border-amber-100"><CreditCard size={14} className="inline mr-1" /> Cobrar</button>
                                )}
                              </div>
                            </div>
                          ))}
                        </>
                      )
                    })()}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {splitBillOrder && <SplitBillModal order={splitBillOrder} onClose={() => setSplitBillOrder(null)} onConfirmSplit={handleSplitBill} />}
      {editOrder && (
        <EditOrderModal
          order={editOrder}
          onClose={() => setEditOrder(null)}
          onSave={(items, notes) => handleEditOrder(editOrder.id, { items, notes })}
          onCancel={handleCancelOrder}
        />
      )}
      {paymentOrder && (
        <PaymentPanel
          orderIds={paymentOrder.ids}
          orderTotal={paymentOrder.total}
          tableNumber={paymentOrder.tableNumber}
          onPaymentComplete={handlePaymentComplete}
          onCancel={() => setPaymentOrder(null)}
        />
      )}
    </DashboardLayout>
  )
}
