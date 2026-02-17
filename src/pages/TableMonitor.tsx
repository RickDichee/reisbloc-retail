import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import logger from '@/utils/logger'
import { useAppStore } from '@/store/appStore'
import { usePermissions } from '@/hooks/usePermissions'
import supabaseService from '@/services/supabaseService'
import printService from '@/services/printService'
import { Order, OrderItem } from '@/types'
import { LayoutDashboard, ArrowLeftRight, Timer, Users, Edit, CheckCircle, CreditCard } from 'lucide-react'
import SplitBillModal from '@/components/pos/SplitBillModal'
import EditOrderModal from '@/components/admin/EditOrderModal'
import PaymentPanel, { PaymentResult } from '@/components/pos/PaymentPanel'

interface TransferState {
  [orderId: string]: number
}

type SplitPayment = {
  personNumber: number
  items: { item: OrderItem; quantity: number }[]
  subtotal: number
  manualAmount?: number
  paymentMethods: { method: 'cash' | 'transferencia' | 'tarjeta'; currency: 'MXN' | 'USD'; amount: number }[]
  tipAmount?: number
  tipCurrency?: 'MXN' | 'USD'
  paid?: boolean
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

// Helper para colores de Cuentas
const getTableColorStyles = (tableNum: number) => {
  const styles = [
    { bg: 'bg-slate-50', border: 'border-slate-200', header: 'from-slate-50 to-slate-100', text: 'text-slate-900', icon: 'text-slate-600' },
    { bg: 'bg-blue-50', border: 'border-blue-200', header: 'from-blue-50 to-blue-100', text: 'text-blue-900', icon: 'text-blue-600' },
    { bg: 'bg-indigo-50', border: 'border-indigo-200', header: 'from-indigo-50 to-indigo-100', text: 'text-indigo-900', icon: 'text-indigo-600' },
  ]
  return styles[(tableNum - 1) % styles.length] || styles[0]
}

export default function TableMonitor() {
  const { currentUser, tables } = useAppStore()
  const permissions = usePermissions()
  const canAccessTableMonitor = permissions.canAccessTableMonitor || currentUser?.role === 'capitan'
  const canManageTables = permissions.canManageTables || currentUser?.role === 'capitan'
  const canModifyOrders = permissions.canModifyOrders || currentUser?.role === 'capitan'
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [transferTargets, setTransferTargets] = useState<TransferState>({})
  const [busyOrders, setBusyOrders] = useState<Record<string, boolean>>({})
  const [splitBillOrder, setSplitBillOrder] = useState<Order | null>(null)
  const [editOrder, setEditOrder] = useState<Order | null>(null)
  const [paymentOrder, setPaymentOrder] = useState<{ ids: string[]; total: number; tableNumber: number } | null>(null)

  // ⚙️ CONFIGURACIÓN DE NEGOCIO (PRESETS)
  // Cambia esto a 'Mesa', 'Folio', 'Cuenta' o 'Cliente' según el tipo de negocio
  const entityName = 'Cuenta'

  const buildTicketHTML = (ordersList: Order[], tableNumber: number, title = 'Cuenta', paymentDetails?: { tip: number, total: number, method: string }): string => {
    const allItems = ordersList.flatMap(o => o.items || [])
    const subtotal = allItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
    const tax = 0
    const tip = paymentDetails?.tip || 0
    const total = paymentDetails?.total || subtotal
    const date = new Date().toLocaleString('es-MX')
    const businessName = currentUser?.businessName || 'REISBLOC POS'
    const cashierName = currentUser?.username || 'Staff'

    const lines = allItems
      .map(item => `
        <div style="display:flex;justify-content:space-between;margin:2px 0;">
          <span>${item.quantity}x ${item.productName}</span>
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
          ${tip > 0 ? `
          <div style="display:flex;justify-content:space-between;margin:2px 0;">
            <span>Propina:</span>
            <span>$${tip.toFixed(2)}</span>
          </div>
          ` : ''}
          <div style="display:flex;justify-content:space-between;margin:4px 0;font-size:14px;font-weight:bold;">
            <span>TOTAL${paymentDetails ? '' : ' A PAGAR'}:</span>
            <span>$${total.toFixed(2)}</span>
          </div>
        </div>
        
        <div style="text-align:center;font-size:10px;margin-top:12px;">
          ${paymentDetails ? `<div>Pagado: ${paymentDetails.method.toUpperCase()}</div>` : ''}
          <div>¡Gracias por su visita!</div>
        </div>
      </div>
    `
  }

  const formatCurrency = (amount: number, currency: 'MXN' | 'USD' = 'MXN') => {
    const symbol = currency === 'USD' ? 'US$' : '$'
    return `${symbol}${amount.toFixed(2)}`
  }

  const buildSplitTicketHTML = (split: SplitPayment, tableNumber: number, title: string) => {
    const date = new Date().toLocaleString('es-MX')
    const baseAmount = typeof split.manualAmount === 'number' ? split.manualAmount : split.subtotal
    const tip = split.tipAmount || 0
    const total = baseAmount + tip
    const businessName = currentUser?.businessName || 'REISBLOC POS'
    const cashierName = currentUser?.username || 'Staff'

    const items = split.items
      .map(({ item, quantity }) => `
      <div style="font-size:10px;margin-top:4px;">${entityName} ${tableNumber} · Persona ${split.personNumber}</div>
      <div style="font-size:10px;">${title}</div>
      <div style="font-size:10px;">${date}</div>
      <div style="font-size:10px;">Atendió: ${cashierName}</div>
    </div>
      `)
      .join('') || `
        <div style="display:flex;justify-content:space-between;margin:2px 0;">
          <span>Consumo General</span>
          <span>${formatCurrency(baseAmount)}</span>
        </div>
      `

    const payments = split.paymentMethods?.length
      ? split.paymentMethods
        .map((method, idx) => `
            <div style="display:flex;justify-content:space-between;margin:2px 0;font-size:9px;">
              <span>${idx + 1}. ${method.method.toUpperCase()} (${method.currency})</span>
              <span>${formatCurrency(method.amount, method.currency)}</span>
            </div>
          `)
        .join('')
      : '<div style="font-size:9px;text-align:center;">Sin pagos registrados</div>'

    return `
      <div style="width:58mm;padding:4px;font-family:'Courier New', monospace;font-size:11px;line-height:1.2;color:#000;">
        <div style="text-align:center;margin-bottom:8px;border-bottom:1px dashed #000;padding-bottom:8px;">
          <div style="font-weight:bold;font-size:14px;margin-bottom:4px;">${businessName.toUpperCase()}</div>
          <div style="font-size:10px;margin-top:4px;">${entityName} ${tableNumber} · Persona ${split.personNumber}</div>
          <div style="font-size:10px;">${title}</div>
          <div style="font-size:10px;">${date}</div>
          <div style="font-size:10px;">Atendió: ${cashierName}</div>
        </div>
        
        <div style="margin-bottom:8px;border-bottom:1px dashed #000;padding-bottom:8px;">
          ${items}
        </div>
        
        <div style="margin-bottom:8px;border-bottom:1px dashed #000;padding-bottom:8px;">
          <div style="display:flex;justify-content:space-between;margin:2px 0;">
            <span>Subtotal:</span>
            <span>${formatCurrency(baseAmount)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin:2px 0;">
            <span>Propina (${split.tipCurrency || 'MXN'}):</span>
            <span>${formatCurrency(tip, split.tipCurrency || 'MXN')}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin:4px 0;font-size:14px;font-weight:bold;">
            <span>TOTAL:</span>
            <span>${formatCurrency(total)}</span>
          </div>
        </div>
        <div style="margin-bottom:8px;padding-bottom:8px;border-bottom:1px dashed #000;">
          <div style="font-size:9px;margin-bottom:4px;font-weight:bold;">Pagos</div>
          ${payments}
        </div>
        <div style="text-align:center;font-size:10px;margin-top:12px;">
          <div>¡Gracias por su visita!</div>
        </div>
      </div>
    `
  }

  const handlePrintTable = async (ordersList: Order[], tableNumber: number, title = 'Cuenta', paymentDetails?: { tip: number, total: number, method: string }) => {
    try {
      const html = buildTicketHTML(ordersList, tableNumber, title, paymentDetails)
      await printService.printReceipt(html, { title, width: 58 })
    } catch (err) {
      // printService already logs errors
    }
  }

  const printSplitTickets = async (splitData: SplitPayment[], tableNumber: number) => {
    const safeTableNumber = tableNumber || 0 // Fallback for orders without table number

    for (const split of splitData) {
      const personaLabel = `Persona ${split.personNumber}`

      try {
        const customerHTML = buildSplitTicketHTML(split, safeTableNumber, `Cuenta · ${personaLabel}`)
        await printService.printReceipt(customerHTML, { title: `Cuenta ${personaLabel}`, width: 58 })
      } catch (err) {
        // printService already logs errors
      }
    }
  }

  const calculateOrderTotal = (order?: Order | null) => {
    if (!order?.items?.length) return 0
    return order.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  }

  const consolidateOrdersForPayment = (tableOrders: Order[]): { regular: Order[]; consolidated: { orders: Order[]; total: number } | null } => {
    // Consolidar TODAS las órdenes activas (enviadas, listas o servidas) para permitir cobro/división total
    const activeOrders = tableOrders.filter(o => ['sent', 'preparing', 'ready', 'served'].includes(o.status))

    // Si hay más de una orden activa, mostrar opción consolidada
    if (activeOrders.length > 1) {
      const consolidatedTotal = activeOrders.reduce((sum, o) => sum + calculateOrderTotal(o), 0)
      return {
        regular: tableOrders,
        consolidated: {
          orders: activeOrders,
          total: consolidatedTotal,
        }
      }
    }

    // Otherwise, show all individually
    return {
      regular: tableOrders,
      consolidated: null,
    }
  }

  useEffect(() => {
    if (!canAccessTableMonitor) return

    const unsubscribe = supabaseService.subscribeToActiveOrders(
      data => {
        const normalized = (data || []).map(order => ({
          ...order,
          createdAt: normalizeDate((order as any).createdAt),
          sentToKitchenAt: normalizeDate((order as any).sentToKitchenAt),
          closedAt: normalizeDate((order as any).closedAt),
        }))
        setOrders(normalized)
        setLoading(false)
        setError(null)
      },
      message => {
        setError(message)
        setLoading(false)
      }
    )

    return () => {
      unsubscribe?.()
    }
  }, [canAccessTableMonitor])

  const groupedByTable = useMemo(() => {
    const map = new Map<number, Order[]>()
    orders.forEach(order => {
      const table = order.tableNumber || 0 // Fallback to 0 if undefined
      const list = map.get(table) || []
      map.set(table, [...list, order])
    })

    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([tableNumber, list]) => ({
        tableNumber: tableNumber || 0, // Ensure always a number
        orders: list.sort((a, b) => {
          const aTime = a.createdAt ? a.createdAt.getTime() : 0
          const bTime = b.createdAt ? b.createdAt.getTime() : 0
          return bTime - aTime
        }),
      }))
  }, [orders])

  const handleTransfer = async (orderId: string) => {
    const target = transferTargets[orderId]
    if (!target) return

    setBusyOrders(prev => ({ ...prev, [orderId]: true }))
    try {
      await supabaseService.updateOrder(orderId, { tableNumber: target })
    } catch (err: any) {
      setError(err?.message || 'No se pudo transferir la mesa')
    } finally {
      setBusyOrders(prev => ({ ...prev, [orderId]: false }))
    }
  }

  const handleClose = async (orderId: string) => {
    if (!currentUser) return

    setBusyOrders(prev => ({ ...prev, [orderId]: true }))
    try {
      await supabaseService.updateOrder(orderId, { status: 'completed', closedBy: currentUser.id, closedAt: new Date() })
    } catch (err: any) {
      setError(err?.message || 'No se pudo cerrar la mesa')
    } finally {
      setBusyOrders(prev => ({ ...prev, [orderId]: false }))
    }
  }

  const handleMarkServed = async (orderId: string) => {
    if (!currentUser) return

    setBusyOrders(prev => ({ ...prev, [orderId]: true }))
    try {
      await supabaseService.updateOrderStatus(orderId, 'served')
    } catch (err: any) {
      setError(err?.message || 'No se pudo marcar como servida')
    } finally {
      setBusyOrders(prev => ({ ...prev, [orderId]: false }))
    }
  }

  const handleSplitBill = async (splits: SplitPayment[]) => {
    if (!currentUser || !splitBillOrder) return

    // Detectar si es una orden consolidada
    const isConsolidated = (splitBillOrder as any).isConsolidated
    const orderIds = isConsolidated ? ((splitBillOrder as any).originalOrderIds || [splitBillOrder.id]) : [splitBillOrder.id]

    const busyMap = orderIds.reduce((acc: any, id: string) => ({ ...acc, [id]: true }), {})
    setBusyOrders(prev => ({ ...prev, ...busyMap }))

    try {
      // Marcar todas las órdenes involucradas como pagadas
      for (const id of orderIds) {
        await supabaseService.updateOrderStatus(id, 'paid' as any)
      }
      await printSplitTickets(splits, splitBillOrder.tableNumber)
      setSplitBillOrder(null)
      alert('✅ Cuenta dividida exitosamente')
    } catch (err: any) {
      setError(err?.message || 'No se pudo dividir la cuenta')
    } finally {
      const freeMap = orderIds.reduce((acc: any, id: string) => ({ ...acc, [id]: false }), {})
      setBusyOrders(prev => ({ ...prev, ...freeMap }))
    }
  }

  const handleEditOrder = async (updatedItems: any[], notes: string) => {
    if (!currentUser || !editOrder) return

    setBusyOrders(prev => ({ ...prev, [editOrder.id]: true }))
    try {
      await supabaseService.updateOrder(editOrder.id, { items: updatedItems, notes })
      setEditOrder(null)
      alert('✅ Orden actualizada exitosamente')
    } catch (err: any) {
      setError(err?.message || 'No se pudo actualizar la orden')
      throw err
    } finally {
      setBusyOrders(prev => ({ ...prev, [editOrder.id]: false }))
    }
  }

  const handlePaymentComplete = async (result: PaymentResult) => {
    if (!currentUser || !paymentOrder) return

    // Validar que tableNumber es válido; si viene 0/intdefined, intentar recuperarlo desde las órdenes
    let tableNumber = paymentOrder.tableNumber
    if (!tableNumber || tableNumber <= 0) {
      const recovered = orders.find(o => paymentOrder.ids.includes(o.id))?.tableNumber
      if (recovered && recovered > 0) {
        tableNumber = recovered
        logger.warn('payment', 'Recuperado tableNumber desde órdenes activas', {
          tableNumber,
          orderIds: paymentOrder.ids,
        })
      } else {
        const errorMsg = `Error: Número de ${entityName.toLowerCase()} inválido`
        logger.error('payment', errorMsg, {
          paymentOrder,
          recoveredTable: recovered,
        })
        alert(`❌ ${errorMsg}`)
        setError(errorMsg)
        return
      }
    }

    // Si se solicita dividir cuenta
    if (result.splitRequested) {
      const ordersToSplit = orders.filter(o => paymentOrder.ids.includes(o.id))

      if (ordersToSplit.length > 0) {
        if (ordersToSplit.length > 1) {
          // Crear orden virtual consolidada con TODOS los items
          const virtualOrder: Order = {
            id: ordersToSplit[0].id,
            tableNumber: paymentOrder.tableNumber,
            status: 'served',
            items: ordersToSplit.flatMap(o => o.items || []),
            createdAt: new Date(),
            // @ts-ignore
            isConsolidated: true,
            originalOrderIds: ordersToSplit.map(o => o.id)
          }
          setSplitBillOrder(virtualOrder)
        } else {
          setSplitBillOrder(ordersToSplit[0])
        }
        setPaymentOrder(null)
      }
      return
    }

    const orderIds = paymentOrder.ids
    const allOrdersToClose = orderIds.map(id => ({ id, busy: true })).reduce((acc, o) => ({ ...acc, [o.id]: o.busy }), {})
    setBusyOrders(prev => ({ ...prev, ...allOrdersToClose }))

    try {
      logger.info('payment', `Starting payment process for ${orderIds.length} orders`)

      // Consolidate all orders for the table
      const ordersToProcess = orders.filter(o => orderIds.includes(o.id))
      const allItems = ordersToProcess.flatMap(o => o.items || [])
      const subtotal = allItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)

      const mappedMethod = result.paymentMethod === 'card' ? 'tarjeta' : (result.paymentMethod === 'digital' ? 'transferencia' : result.paymentMethod)

      logger.info('payment', `Creating sale: subtotal=${subtotal}, total=${result.total}, method=${mappedMethod}`)

      // Create a single sale for all orders
      await supabaseService.createSale({
        organizationId: currentUser.organizationId,
        orderIds,
        tableNumber,
        items: allItems,
        subtotal,
        discounts: 0,
        tax: 0,
        total: result.total,
        paymentMethod: mappedMethod as any,
        tip: result.tip,
        tipSource: result.tip > 0 ? (mappedMethod === 'cash' ? 'cash' : mappedMethod) : 'none',
        saleBy: currentUser.id,
        createdAt: new Date(),
      } as any)

      logger.info('payment', 'Sale created, printing ticket...')
      await handlePrintTable(ordersToProcess, tableNumber, 'Ticket de Pago', {
        tip: result.tip,
        total: result.total,
        method: mappedMethod
      })

      logger.info('payment', 'Closing orders...')
      // Close all orders
      for (const orderId of orderIds) {
        await supabaseService.updateOrderStatus(orderId, 'completed')
      }

      logger.info('payment', 'Payment process completed successfully ✅')
      setPaymentOrder(null)
      alert(`✅ Pago registrado y ${entityName.toLowerCase()} cerrada`)
    } catch (err: any) {
      const errorMsg = err?.message || 'No se pudo registrar el pago'
      logger.error('payment', `Payment failed: ${errorMsg}`, err)
      setError(errorMsg)
      alert(`❌ Error en pago: ${errorMsg}`)
    } finally {
      setBusyOrders(prev => {
        const updated = { ...prev }
        orderIds.forEach(id => delete updated[id])
        return updated
      })
    }
  }

  const handleCancelOrder = async (reason: string) => {
    if (!currentUser || !editOrder) return

    setBusyOrders(prev => ({ ...prev, [editOrder.id]: true }))
    try {
      await supabaseService.updateOrder(editOrder.id, { status: 'cancelled', cancelReason: reason, cancelledBy: currentUser.id, cancelledAt: new Date() })
      setEditOrder(null)
      alert('✅ Orden cancelada exitosamente')
    } catch (err: any) {
      setError(err?.message || 'No se pudo cancelar la orden')
      throw err
    } finally {
      setBusyOrders(prev => ({ ...prev, [editOrder.id]: false }))
    }
  }

  if (!canAccessTableMonitor) {
    return <Navigate to="/pos" replace />
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-rb-canvas">
        <div className="text-center text-slate-500 font-bold animate-pulse uppercase tracking-widest">Cargando monitor de cuentas...</div>
      </div>
    )
  }

  const availableTables = tables.length ? tables : Array.from({ length: 12 }, (_, i) => i + 1)
  const activeTables = groupedByTable.length
  const activeOrders = orders.length

  return (
    <div className="min-h-screen relative bg-gray-50">
      {/* Background Doodle */}
      <div
        className="fixed inset-0 z-0 opacity-40 pointer-events-none bg-repeat"
        style={{
          backgroundImage: 'url("/doodle_ceviche.png?v=2")',
          backgroundSize: '450px',
        }}
      />
      {/* Gradient Overlay */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-200/50 via-blue-100/20 to-slate-200/50 z-0 pointer-events-none" />
      <div className="relative z-10">
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
          {/* Header */}
          <div className="bg-slate-50 rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-6 sm:px-8 flex flex-col gap-6">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-lg">
                  <LayoutDashboard size={28} />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Monitor</h1>
                  <p className="text-slate-500 font-medium">Vista en tiempo real de la operación</p>
                </div>
                <div className="ml-auto">
                  <div className="px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-bold flex items-center gap-2">
                    <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span></span>
                    En Vivo
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div className="bg-slate-50 rounded-xl px-5 py-4 border border-slate-100">
                  <p className="text-slate-500 font-semibold uppercase text-xs tracking-wider">{entityName}s activas</p>
                  <p className="text-3xl font-black text-slate-900">{activeTables}</p>
                </div>
                <div className="bg-slate-50 rounded-xl px-5 py-4 border border-slate-100">
                  <p className="text-slate-500 font-semibold uppercase text-xs tracking-wider">Órdenes abiertas</p>
                  <p className="text-3xl font-black text-blue-600">{activeOrders}</p>
                </div>
                <div className="bg-slate-50 rounded-xl px-5 py-4 border border-slate-100">
                  <p className="text-slate-500 font-semibold uppercase text-xs tracking-wider">Capacidad</p>
                  <p className="text-3xl font-black text-slate-900">{availableTables.length}</p>
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

          {/* Tables */}
          {groupedByTable.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-400 font-bold shadow-sm uppercase tracking-widest text-sm">
              No hay {entityName.toLowerCase()}s activas ahora.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {groupedByTable.map(group => {
                const styles = getTableColorStyles(group.tableNumber)
                return (
                  <div
                    key={group.tableNumber}
                    className={`border-2 ${styles.border} ${styles.bg} rounded-2xl shadow-lg p-5 flex flex-col gap-3 transition-all hover:shadow-xl`}
                  >
                    <div className={`flex items-center justify-between rounded-xl p-3 bg-gradient-to-r ${styles.header}`}>
                      <div>
                        <p className={`text-sm font-semibold ${styles.text} opacity-70`}>{entityName}</p>
                        <p className={`text-3xl font-black ${styles.text}`}>{group.tableNumber}</p>
                      </div>
                      <div className={`flex items-center gap-2 text-sm font-medium ${styles.text}`}>
                        <Timer size={16} className={styles.icon} />
                        <span>{humanizeDuration(group.orders[0]?.createdAt || new Date())}</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {(() => {
                        const { regular, consolidated } = consolidateOrdersForPayment(group.orders)
                        const ordersToDisplay = consolidated ? regular : group.orders

                        return (
                          <>
                            {/* Consolidated Payment Card (if multiple served orders) */}
                            {consolidated && (
                              <div key="consolidated" className="border-2 border-amber-400 bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl p-4 space-y-3 shadow-sm">
                                <div className="flex items-center justify-between gap-2">
                                  <div>
                                    <p className="text-xs text-amber-700 font-bold uppercase tracking-wider">Total {entityName}</p>
                                    <p className="text-lg font-black text-amber-900">{consolidated.orders.length} órdenes</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-xs text-amber-700 font-semibold">A Pagar</p>
                                    <p className="text-2xl font-black text-amber-900">${consolidated.total.toFixed(2)}</p>
                                  </div>
                                </div>

                                <div className="bg-white/70 rounded-lg p-3 text-sm space-y-2 max-h-24 overflow-y-auto">
                                  {consolidated.orders.map(o => (
                                    <div key={o.id} className="flex justify-between items-center text-gray-700">
                                      <span className="text-xs">{o.id.slice(0, 8)}... ({o.items?.length || 0} items)</span>
                                      <span className="font-semibold">${calculateOrderTotal(o).toFixed(2)}</span>
                                    </div>
                                  ))}
                                </div>

                                {canModifyOrders && (
                                  <div className="grid grid-cols-2 gap-2">
                                    <button
                                      onClick={() => handlePrintTable(consolidated.orders, group.tableNumber, 'Cuenta General')}
                                      className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gray-900 text-white font-bold hover:bg-black transition-all"
                                    >
                                      Imprimir Cuenta
                                    </button>
                                    <button
                                      onClick={() => setPaymentOrder({
                                        ids: consolidated.orders.map(o => o.id),
                                        total: consolidated.total,
                                        tableNumber: group.tableNumber
                                      })}
                                      disabled={consolidated.orders.some(o => busyOrders[o.id])}
                                      className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold disabled:opacity-60 hover:shadow-lg transition-all"
                                    >
                                      <CreditCard size={18} /> Cobrar Todo
                                    </button>
                                  </div>
                                )}

                                {/* Botón de Dividir Cuenta para Mesa Consolidada */}
                                {canManageTables && (
                                  <button
                                    onClick={() => {
                                      // Crear orden virtual consolidada para dividir
                                      const virtualOrder: Order = {
                                        id: consolidated.orders[0].id, // Usar ID principal
                                        tableNumber: group.tableNumber,
                                        status: 'served',
                                        items: consolidated.orders.flatMap(o => o.items || []),
                                        createdAt: new Date(),
                                        // @ts-ignore
                                        isConsolidated: true,
                                        originalOrderIds: consolidated.orders.map(o => o.id)
                                      }
                                      setSplitBillOrder(virtualOrder)
                                    }}
                                    disabled={consolidated.orders.some(o => busyOrders[o.id])}
                                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-4 rounded-2xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest disabled:opacity-60 hover:bg-black transition-all shadow-lg active:scale-95"
                                  >
                                    <Users size={18} /> DIVIDIR CUENTA COMPLETA
                                  </button>
                                )}
                              </div>
                            )}

                            {/* Individual Orders */}
                            {ordersToDisplay.map(order => {
                              const total = calculateOrderTotal(order)
                              const status = order.status || 'open'
                              const targetTable = transferTargets[order.id] ?? group.tableNumber

                              return (
                                <div
                                  key={order.id}
                                  className="bg-slate-50 border border-gray-200 rounded-xl p-4 space-y-3 shadow-sm"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div>
                                      <p className="text-xs text-gray-500">Orden</p>
                                      <p className="font-semibold text-gray-900">{order.id.slice(0, 8)}...</p>
                                    </div>
                                    <div
                                      className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${status === 'sent'
                                        ? 'bg-blue-100 text-blue-700'
                                        : status === 'ready'
                                          ? 'bg-amber-100 text-amber-700'
                                          : status === 'served'
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : 'bg-slate-100 text-slate-700'
                                        }`}
                                    >
                                      {status}
                                    </div>
                                  </div>

                                  <div className="space-y-2 text-sm text-gray-700">
                                    <div className="flex justify-between">
                                      <span>Items</span>
                                      <span className="font-semibold">{order.items?.length || 0}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Total estimado</span>
                                      <span className="font-semibold">${total.toFixed(2)}</span>
                                    </div>
                                    {order.notes && (
                                      <p className="text-xs text-gray-500">Nota: {order.notes}</p>
                                    )}
                                  </div>

                                  <div className="bg-gray-50 rounded-lg p-2 text-xs text-gray-600 space-y-1">
                                    {order.items?.slice(0, 3).map((item, idx) => (
                                      <div key={`${order.id}-item-${idx}`} className="flex justify-between">
                                        <span className="truncate">{item.productName}</span>
                                        <span className="font-semibold">x{item.quantity}</span>
                                      </div>
                                    ))}
                                    {order.items && order.items.length > 3 && (
                                      <p className="text-[11px] text-gray-500">y {order.items.length - 3} más...</p>
                                    )}
                                  </div>

                                  {canModifyOrders && (
                                    <div className="flex flex-wrap gap-2">
                                      {status === 'ready' && (
                                        <button
                                          onClick={() => handleMarkServed(order.id)}
                                          disabled={busyOrders[order.id]}
                                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold disabled:opacity-60"
                                        >
                                          <CheckCircle size={16} /> Marcar servida
                                        </button>
                                      )}

                                      {status === 'served' && !consolidated && (
                                        <div className="flex flex-wrap gap-2 w-full">
                                          <button
                                            onClick={() => handlePrintTable([order], order.tableNumber, 'Cuenta')}
                                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold"
                                          >
                                            Imprimir Cuenta
                                          </button>
                                          <button
                                            onClick={() => setPaymentOrder({
                                              ids: [order.id],
                                              total,
                                              tableNumber: order.tableNumber
                                            })}
                                            disabled={busyOrders[order.id]}
                                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-600 text-white text-sm font-semibold disabled:opacity-60"
                                          >
                                            <CreditCard size={16} /> Cobrar
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {canManageTables && (
                                    <div className="flex flex-col gap-2">
                                      <button
                                        onClick={() => setEditOrder(order)}
                                        disabled={busyOrders[order.id]}
                                        className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold disabled:opacity-60 hover:bg-indigo-700 transition-colors"
                                      >
                                        <Edit size={16} /> Editar Orden
                                      </button>

                                      <div className="flex items-center gap-2">
                                        <select
                                          value={targetTable}
                                          onChange={e =>
                                            setTransferTargets(prev => ({
                                              ...prev,
                                              [order.id]: Number(e.target.value),
                                            }))
                                          }
                                          className="flex-1 rounded-lg border-gray-200 text-sm"
                                        >
                                          {availableTables.map(num => (
                                            <option key={num} value={num}>
                                              {entityName} {num}
                                            </option>
                                          ))}
                                        </select>
                                        <button
                                          onClick={() => handleTransfer(order.id)}
                                          disabled={busyOrders[order.id] || targetTable === group.tableNumber}
                                          className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-800 text-white text-xs font-black uppercase tracking-widest disabled:opacity-60 active:scale-95 transition-all"
                                        >
                                          <ArrowLeftRight size={16} /> TRANSFERIR
                                        </button>
                                      </div>
                                      <button
                                        onClick={() => setSplitBillOrder(order)}
                                        disabled={busyOrders[order.id]}
                                        className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-100 text-slate-800 border border-slate-200 text-xs font-black uppercase tracking-widest disabled:opacity-60 active:scale-95 transition-all"
                                      >
                                        <Users size={16} /> DIVIDIR CUENTA
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )
                            })}
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
      </div>

      {splitBillOrder && (
        <SplitBillModal
          order={splitBillOrder}
          onClose={() => setSplitBillOrder(null)}
          onConfirmSplit={handleSplitBill}
        />
      )}

      {editOrder && (
        <EditOrderModal
          order={editOrder}
          onClose={() => setEditOrder(null)}
          onSave={handleEditOrder}
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
    </div>
  )
}
