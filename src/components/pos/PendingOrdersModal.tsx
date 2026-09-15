import React, { useState } from 'react'
import { Order, OrderItem, Product } from '@/types/index'
import { 
  X, Clock, User, DollarSign, Printer, Trash2, Package, ShoppingBag, 
  AlertTriangle, Truck, CheckCircle2, CreditCard, Pencil, Plus, Minus, 
  Search, ArrowLeft, Save, Check
} from 'lucide-react'
import printService from '@/services/printService'
import supabaseService from '@/services/supabaseService'
import { useAppStore } from '@/store/appStore'

interface PendingOrdersModalProps {
  isOpen: boolean
  onClose: () => void
  orders: Order[]
  products?: Product[]
  onCheckoutOrder: (order: Order) => void
  onRefresh: () => void
}

const statusWorkflow: { id: Order['status']; label: string; icon: any; color: string }[] = [
  { id: 'pending_surtir', label: '1. Pendiente Surtir', icon: Package, color: 'bg-amber-100 text-amber-900 border-amber-300' },
  { id: 'listo_entrega', label: '2. Listo p/ Entrega', icon: CheckCircle2, color: 'bg-blue-100 text-blue-900 border-blue-300' },
  { id: 'pendiente_entrega', label: '3. En Tránsito', icon: Truck, color: 'bg-purple-100 text-purple-900 border-purple-300' },
  { id: 'entregado', label: '4. Entregado', icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-900 border-emerald-300' }
]

export default function PendingOrdersModal({
  isOpen,
  onClose,
  orders,
  products: propProducts,
  onCheckoutOrder,
  onRefresh
}: PendingOrdersModalProps) {
  const { organizationSettings, currentUser, products: storeProducts } = useAppStore()
  const availableProducts = (propProducts && propProducts.length > 0) ? propProducts : (storeProducts || [])
  const storeTitle = organizationSettings?.ticketBusinessName || organizationSettings?.businessName || organizationSettings?.name || currentUser?.businessName || 'Moda Miel MX'

  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Subvistas: Edición y Creación
  const [editingOrder, setEditingOrder] = useState<Order | null>(null)
  const [editItems, setEditItems] = useState<OrderItem[]>([])
  const [editNotes, setEditNotes] = useState('')
  const [editProductSearch, setEditProductSearch] = useState('')

  const [isCreatingOrder, setIsCreatingOrder] = useState(false)
  const [newOrderClient, setNewOrderClient] = useState('')
  const [newOrderItems, setNewOrderItems] = useState<OrderItem[]>([])
  const [newOrderInitialAbono, setNewOrderInitialAbono] = useState<string>('')
  const [newOrderProductSearch, setNewOrderProductSearch] = useState('')

  if (!isOpen) return null

  // 🛡️ Filtro estricto: Solo mostrar órdenes que no estén canceladas, pagadas o completadas
  const activeOrders = orders.filter(o => 
    o.status !== 'cancelled' && 
    o.status !== 'completed' && 
    o.status !== 'paid' && 
    (o as any).status !== 'deleted'
  )

  const handleUpdateStatus = async (orderId: string, newStatus: Order['status']) => {
    setUpdatingId(orderId)
    try {
      await supabaseService.updateOrderStatus(orderId, newStatus)
      onRefresh()
    } catch (err: any) {
      alert('Error al actualizar estado del pedido: ' + err.message)
    } finally {
      setUpdatingId(null)
    }
  }

  const handleRegisterAbono = async (order: Order) => {
    const total = Number(order.total || 0)
    const currentPaid = Number(order.paidAmount || 0)
    const currentBalance = total - currentPaid

    const input = prompt(`Monto del Abono / Pago Parcial para el cliente:\n(Saldo Restante Pendiente: $${currentBalance.toFixed(2)})`)
    if (!input) return

    const abonoNum = parseFloat(input)
    if (isNaN(abonoNum) || abonoNum <= 0) {
      alert('⚠️ Ingresa un monto válido mayor a 0.')
      return
    }

    const newPaid = currentPaid + abonoNum
    const newBalance = Math.max(0, total - newPaid)
    const isFullyPaid = newBalance === 0

    setUpdatingId(order.id)
    try {
      await supabaseService.updateOrder(order.id, {
        paidAmount: newPaid,
        pendingBalance: newBalance,
        paymentStatus: isFullyPaid ? 'paid' : 'partial',
        isPaid: isFullyPaid
      })

      // Auditoría obligatoria
      await supabaseService.createAuditLog({
        userId: currentUser?.id || 'system',
        action: 'ORDER_PARTIAL_PAYMENT',
        entityType: 'ORDER',
        entityId: order.id,
        newValue: { abono: abonoNum, totalPaid: newPaid, pendingBalance: newBalance, isFullyPaid }
      })

      alert(`✅ Abono de $${abonoNum.toFixed(2)} registrado. Saldo pendiente: $${newBalance.toFixed(2)}`)
      onRefresh()
    } catch (err: any) {
      alert('Error al registrar abono: ' + err.message)
    } finally {
      setUpdatingId(null)
    }
  }

  // 🗑️ ELIMINAR PEDIDO DEFINITIVAMENTE (Con devolución de inventario)
  const handleDeleteOrder = async (order: Order) => {
    const folio = (order.id || '').replace('ticket-', '').slice(0, 8).toUpperCase()
    if (!confirm(`⚠️ ¿Estás seguro de ELIMINAR permanentemente el pedido #${folio}?\n\nLas existencias apartadas se regresarán automáticamente al inventario.`)) {
      return
    }

    setDeletingId(order.id)
    try {
      // 1. Restaurar stock al inventario
      if (order.items && order.items.length > 0) {
        const stockToRestore = order.items
          .filter(i => i.productId && !i.productId.toLowerCase().startsWith('manual-'))
          .map(item => ({
            productId: item.productId,
            quantity: (Number(item.quantity) || 1) * (Number(item.packQuantity) || 1)
          }))
        if (stockToRestore.length > 0) {
          await supabaseService.updateRetailStockBatch(stockToRestore)
        }
      }

      // 2. Eliminar de Supabase y de la memoria local
      await supabaseService.deleteOrder(order.id)

      // 3. Auditoría
      await supabaseService.createAuditLog({
        userId: currentUser?.id || 'system',
        action: 'ORDER_DELETED',
        entityType: 'ORDER',
        entityId: order.id,
        newValue: { folio, deletedBy: currentUser?.username || 'user' },
        ipAddress: 'pos-terminal'
      }).catch(console.error)

      alert(`✅ Pedido #${folio} eliminado permanentemente y existencias devueltas al inventario.`)
      onRefresh()
    } catch (err: any) {
      console.error('Error deleting order:', err)
      alert('Error al eliminar pedido: ' + (err.message || 'Error desconocido'))
    } finally {
      setDeletingId(null)
    }
  }

  // ✏️ INICIAR EDICIÓN DE UN PEDIDO EXISTENTE
  const startEditOrder = (order: Order) => {
    setEditingOrder(order)
    setEditItems((order.items || []).map(i => ({ ...i })))
    setEditNotes(order.notes || '')
    setEditProductSearch('')
  }

  const cancelEditOrder = () => {
    setEditingOrder(null)
    setEditItems([])
    setEditNotes('')
    setEditProductSearch('')
  }

  const updateEditItemQty = (itemId: string, delta: number) => {
    setEditItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const newQty = Math.max(1, (Number(item.quantity) || 1) + delta)
        return { ...item, quantity: newQty }
      }
      return item
    }))
  }

  const removeEditItem = (itemId: string) => {
    setEditItems(prev => prev.filter(item => item.id !== itemId))
  }

  const addProductToEdit = (product: Product) => {
    const existing = editItems.find(i => i.productId === product.id)
    if (existing) {
      updateEditItemQty(existing.id, 1)
    } else {
      const newItem: OrderItem = {
        id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        productId: product.id,
        productName: product.name,
        quantity: 1,
        unitPrice: Number(product.price) || 0,
        addedAt: new Date(),
        addedBy: currentUser?.id || 'system',
        canBeDeleted: true,
        packQuantity: product.packQuantity || 1,
        sku: product.sku || product.barcode || ''
      }
      setEditItems(prev => [...prev, newItem])
    }
    setEditProductSearch('')
  }

  const saveEditOrder = async () => {
    if (!editingOrder) return
    if (editItems.length === 0) {
      alert('⚠️ El pedido debe contener al menos un producto. Si deseas anularlo por completo, usa la opción de Eliminar.')
      return
    }

    setIsSaving(true)
    try {
      // 1. Calcular delta de inventario entre original y modificado
      const origMap = new Map<string, number>()
      for (const item of (editingOrder.items || [])) {
        if (item.productId && !item.productId.toLowerCase().startsWith('manual-')) {
          const qty = (Number(item.quantity) || 1) * (Number(item.packQuantity) || 1)
          origMap.set(item.productId, (origMap.get(item.productId) || 0) + qty)
        }
      }

      const updatedMap = new Map<string, number>()
      for (const item of editItems) {
        if (item.productId && !item.productId.toLowerCase().startsWith('manual-')) {
          const qty = (Number(item.quantity) || 1) * (Number(item.packQuantity) || 1)
          updatedMap.set(item.productId, (updatedMap.get(item.productId) || 0) + qty)
        }
      }

      const stockAdjustments: { productId: string; quantity: number }[] = []
      const allProductIds = new Set([...origMap.keys(), ...updatedMap.keys()])
      for (const prodId of allProductIds) {
        const origQty = origMap.get(prodId) || 0
        const newQty = updatedMap.get(prodId) || 0
        const diff = origQty - newQty // Si antes era 2 y ahora 3, diff es -1 (descuenta 1)
        if (diff !== 0) {
          stockAdjustments.push({ productId: prodId, quantity: diff })
        }
      }

      if (stockAdjustments.length > 0) {
        await supabaseService.updateRetailStockBatch(stockAdjustments)
      }

      // 2. Calcular nuevos totales y balance
      const newTotal = editItems.reduce((sum, i) => sum + (Number(i.quantity || 1) * Number(i.unitPrice || 0)), 0)
      const paidAmount = Number(editingOrder.paidAmount || 0)
      const newBalance = Math.max(0, newTotal - paidAmount)
      const isFullyPaid = newBalance === 0

      // 3. Guardar cambios en el pedido
      await supabaseService.updateOrder(editingOrder.id, {
        items: editItems,
        total: newTotal,
        notes: editNotes.trim(),
        pendingBalance: newBalance,
        isPaid: isFullyPaid,
        paymentStatus: isFullyPaid ? 'paid' : (paidAmount > 0 ? 'partial' : 'unpaid')
      })

      // 4. Log de auditoría
      await supabaseService.createAuditLog({
        userId: currentUser?.id || 'system',
        action: 'ORDER_MODIFIED',
        entityType: 'ORDER',
        entityId: editingOrder.id,
        newValue: {
          itemsCount: editItems.length,
          newTotal,
          newBalance,
          notes: editNotes,
          modifiedBy: currentUser?.username || 'user'
        }
      }).catch(console.error)

      alert('✅ Pedido modificado con éxito e inventario actualizado.')
      cancelEditOrder()
      onRefresh()
    } catch (err: any) {
      console.error('Error saving order edit:', err)
      alert('Error al guardar cambios: ' + (err.message || 'Error desconocido'))
    } finally {
      setIsSaving(false)
    }
  }

  // 🛍️ INICIAR CREACIÓN DE NUEVO PEDIDO
  const startCreateOrder = () => {
    setIsCreatingOrder(true)
    setNewOrderClient('')
    setNewOrderItems([])
    setNewOrderInitialAbono('')
    setNewOrderProductSearch('')
  }

  const cancelCreateOrder = () => {
    setIsCreatingOrder(false)
    setNewOrderClient('')
    setNewOrderItems([])
    setNewOrderInitialAbono('')
    setNewOrderProductSearch('')
  }

  const addProductToNewOrder = (product: Product) => {
    const existing = newOrderItems.find(i => i.productId === product.id)
    if (existing) {
      setNewOrderItems(prev => prev.map(item => {
        if (item.id === existing.id) {
          return { ...item, quantity: (Number(item.quantity) || 1) + 1 }
        }
        return item
      }))
    } else {
      const newItem: OrderItem = {
        id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        productId: product.id,
        productName: product.name,
        quantity: 1,
        unitPrice: Number(product.price) || 0,
        addedAt: new Date(),
        addedBy: currentUser?.id || 'system',
        canBeDeleted: true,
        packQuantity: product.packQuantity || 1,
        sku: product.sku || product.barcode || ''
      }
      setNewOrderItems(prev => [...prev, newItem])
    }
    setNewOrderProductSearch('')
  }

  const updateNewOrderItemQty = (itemId: string, delta: number) => {
    setNewOrderItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const newQty = Math.max(1, (Number(item.quantity) || 1) + delta)
        return { ...item, quantity: newQty }
      }
      return item
    }))
  }

  const removeNewOrderItem = (itemId: string) => {
    setNewOrderItems(prev => prev.filter(item => item.id !== itemId))
  }

  const saveNewOrder = async () => {
    if (!newOrderClient.trim()) {
      alert('⚠️ Ingresa el nombre o teléfono del cliente para este pedido.')
      return
    }
    if (newOrderItems.length === 0) {
      alert('⚠️ Agrega al menos un producto al pedido.')
      return
    }

    const total = newOrderItems.reduce((sum, i) => sum + (Number(i.quantity || 1) * Number(i.unitPrice || 0)), 0)
    const initialAbono = parseFloat(newOrderInitialAbono) || 0
    if (initialAbono < 0 || initialAbono > total) {
      alert(`⚠️ El abono debe ser entre $0 y el total ($${total.toFixed(2)}).`)
      return
    }

    const pendingBalance = Math.max(0, total - initialAbono)
    const isFullyPaid = pendingBalance === 0

    setIsSaving(true)
    try {
      // 1. Descontar existencias del inventario
      const stockToDeduct = newOrderItems
        .filter(i => i.productId && !i.productId.toLowerCase().startsWith('manual-'))
        .map(i => ({
          productId: i.productId,
          quantity: -(Number(i.quantity) || 1) * (Number(i.packQuantity) || 1)
        }))
      if (stockToDeduct.length > 0) {
        await supabaseService.updateRetailStockBatch(stockToDeduct)
      }

      // 2. Crear pedido
      const orderPayload: any = {
        tableNumber: 1,
        items: newOrderItems,
        total,
        notes: newOrderClient.trim(),
        status: 'pending_surtir',
        createdBy: currentUser?.id || 'system',
        organizationId: currentUser?.organizationId,
        paidAmount: initialAbono,
        pendingBalance,
        paymentStatus: isFullyPaid ? 'paid' : (initialAbono > 0 ? 'partial' : 'unpaid'),
        isPaid: isFullyPaid
      }

      const orderId = await supabaseService.createOrder(orderPayload)

      // 3. Log de auditoría
      await supabaseService.createAuditLog({
        userId: currentUser?.id || 'system',
        action: 'POS_PENDING_ORDER_CREATED',
        entityType: 'ORDER',
        entityId: orderId,
        newValue: {
          client: newOrderClient,
          total,
          paidAmount: initialAbono,
          itemsCount: newOrderItems.length,
          createdBy: currentUser?.username || 'user'
        }
      }).catch(console.error)

      alert(`✅ Pedido #${(orderId || '').slice(0, 8).toUpperCase()} creado con éxito. Stock apartado.`)
      cancelCreateOrder()
      onRefresh()
    } catch (err: any) {
      console.error('Error creating new order:', err)
      alert('Error al crear pedido: ' + (err.message || 'Error desconocido'))
    } finally {
      setIsSaving(false)
    }
  }

  const handlePrintOrderTicket = (order: Order) => {
    const ticketId = (order.id || '').replace('ticket-', '').slice(0, 10).toUpperCase()
    const paid = Number(order.paidAmount || 0)
    const total = Number(order.total || 0)
    const balance = Math.max(0, total - paid)

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; color: #000 !important; }
          body {
            font-family: 'Consolas', 'Courier New', monospace;
            font-weight: 700;
            font-size: 11px;
            width: 48mm;
            margin: 0 auto;
            padding: 2mm 0;
            text-align: left;
          }
          .divider { border-bottom: 2px dashed #000; margin: 4px 0; }
        </style>
      </head>
      <body>
        <div style="text-align:center; font-weight:900; font-size:13px;">📋 TICKET DE PEDIDO / APARTADO</div>
        <div style="text-align:center; font-size:10px; font-weight:bold;">${storeTitle.toUpperCase()}</div>
        <div class="divider"></div>
        <div>FOLIO: #${ticketId}</div>
        <div>FECHA: ${new Date(order.createdAt).toLocaleString('es-MX')}</div>
        ${order.notes ? `<div>CLIENTE/NOTAS: ${order.notes}</div>` : ''}
        <div class="divider"></div>
        <div style="font-weight:900; font-size:10px; margin-bottom:3px;">PRENDAS APARTADAS:</div>
        ${(order.items || []).map(item => `
          <div style="margin-bottom:3px;">
            <div>${item.productName}</div>
            <div style="display:flex; justify-content:space-between; font-size:10px;">
              <span>${item.quantity} pz x $${Number(item.unitPrice).toFixed(2)}</span>
              <span>$${(item.quantity * item.unitPrice).toFixed(2)}</span>
            </div>
          </div>
        `).join('')}
        <div class="divider"></div>
        <div>TOTAL PEDIDO: $${total.toFixed(2)}</div>
        <div>ABONADO: $${paid.toFixed(2)}</div>
        <div style="font-size:12px; font-weight:900;">RESTANTE PENDIENTE: $${balance.toFixed(2)}</div>
        <div class="divider"></div>
        <div style="text-align:center; font-size:9px; margin-top:4px;">⚠️ ESTADO: ${balance === 0 ? 'PAGADO 100%' : 'PENDIENTE DE PAGO'}</div>
      </body>
      </html>
    `
    printService.printReceipt(html, { title: `Pedido_${ticketId}` })
  }

  // Filtrado de productos para agregar
  const filteredProductsForEdit = editProductSearch.trim() === '' ? [] : availableProducts.filter(p => 
    p.active !== false && (
      p.name.toLowerCase().includes(editProductSearch.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(editProductSearch.toLowerCase())) ||
      (p.barcode && p.barcode.toLowerCase().includes(editProductSearch.toLowerCase()))
    )
  ).slice(0, 6)

  const filteredProductsForNew = newOrderProductSearch.trim() === '' ? [] : availableProducts.filter(p => 
    p.active !== false && (
      p.name.toLowerCase().includes(newOrderProductSearch.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(newOrderProductSearch.toLowerCase())) ||
      (p.barcode && p.barcode.toLowerCase().includes(newOrderProductSearch.toLowerCase()))
    )
  ).slice(0, 6)

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full p-6 animate-scaleIn border border-slate-100 max-h-[92vh] flex flex-col">
        
        {/* ======================================================== */}
        {/* VISTA 1: MODIFICAR PEDIDO EXISTENTE */}
        {/* ======================================================== */}
        {editingOrder ? (
          <div className="flex flex-col flex-1 overflow-hidden space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={cancelEditOrder}
                  className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors"
                  title="Volver"
                >
                  <ArrowLeft size={18} />
                </button>
                <div>
                  <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                    <Pencil size={18} className="text-indigo-600" />
                    <span>Modificar Pedido #{(editingOrder.id || '').slice(0, 8).toUpperCase()}</span>
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">Ajusta productos, cantidades o notas del cliente</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 font-bold rounded-xl hover:bg-slate-100">
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto space-y-4 flex-1 pr-1 custom-scrollbar">
              {/* Notas / Cliente */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">
                  Cliente / Teléfono / Notas:
                </label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  placeholder="Ej: Laura Gómez (Tel: 5512345678) - Apartado vestidos"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Buscar y Agregar Producto */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">
                  + Agregar Producto al Pedido:
                </label>
                <div className="relative">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={editProductSearch}
                    onChange={e => setEditProductSearch(e.target.value)}
                    placeholder="Buscar por nombre, código o SKU..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                {filteredProductsForEdit.length > 0 && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-2 shadow-lg space-y-1 mt-1">
                    {filteredProductsForEdit.map(prod => (
                      <button
                        key={prod.id}
                        type="button"
                        onClick={() => addProductToEdit(prod)}
                        className="w-full p-2 hover:bg-indigo-50 rounded-xl text-left flex justify-between items-center text-xs font-bold text-slate-800 transition-colors"
                      >
                        <span className="truncate">{prod.name}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-indigo-600 font-mono font-black">${Number(prod.price).toFixed(2)}</span>
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg">Stock: {prod.currentStock ?? 'N/A'}</span>
                          <span className="text-emerald-600 font-black">+ Agregar</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Lista de Items Actuales */}
              <div className="space-y-2">
                <p className="text-xs font-black text-slate-700 uppercase tracking-wider">
                  Prendas en el Pedido ({editItems.length}):
                </p>
                {editItems.length === 0 ? (
                  <p className="text-xs text-red-500 italic py-2">No hay prendas seleccionadas</p>
                ) : (
                  <div className="space-y-2">
                    {editItems.map(item => {
                      const itemSubtotal = (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0)
                      return (
                        <div key={item.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-slate-900 truncate">{item.productName}</p>
                            <p className="text-[11px] font-bold text-slate-500 font-mono">${Number(item.unitPrice).toFixed(2)} c/u</p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => updateEditItemQty(item.id, -1)}
                              className="w-7 h-7 bg-white border border-slate-200 rounded-xl flex items-center justify-center font-black text-slate-700 hover:bg-slate-100 active:scale-95"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="w-8 text-center text-xs font-black text-slate-900 font-mono">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateEditItemQty(item.id, 1)}
                              className="w-7 h-7 bg-white border border-slate-200 rounded-xl flex items-center justify-center font-black text-slate-700 hover:bg-slate-100 active:scale-95"
                            >
                              <Plus size={14} />
                            </button>

                            <span className="w-20 text-right text-xs font-black text-slate-900 font-mono">
                              ${itemSubtotal.toFixed(2)}
                            </span>

                            <button
                              type="button"
                              onClick={() => removeEditItem(item.id)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-xl transition-colors ml-1"
                              title="Quitar prenda"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Totales y Botones de Guardar */}
            <div className="border-t border-slate-100 pt-3 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase block">Nuevo Total / Saldo Pendiente:</span>
                {(() => {
                  const newTotal = editItems.reduce((sum, i) => sum + (Number(i.quantity || 1) * Number(i.unitPrice || 0)), 0)
                  const paid = Number(editingOrder.paidAmount || 0)
                  const balance = Math.max(0, newTotal - paid)
                  return (
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-black text-slate-900 font-mono">${newTotal.toFixed(2)}</span>
                      {paid > 0 && (
                        <span className="text-xs font-bold text-slate-500">
                          (Abonado: ${paid.toFixed(2)} | Resta: <strong className="text-red-600 font-mono">${balance.toFixed(2)}</strong>)
                        </span>
                      )}
                    </div>
                  )
                })()}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={cancelEditOrder}
                  disabled={isSaving}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={saveEditOrder}
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-indigo-200 transition-all active:scale-95 disabled:opacity-50"
                >
                  <Save size={15} />
                  <span>{isSaving ? 'Guardando...' : 'Guardar Cambios'}</span>
                </button>
              </div>
            </div>
          </div>
        ) : isCreatingOrder ? (
          /* ======================================================== */
          /* VISTA 2: CREAR NUEVO PEDIDO / APARTADO */
          /* ======================================================== */
          <div className="flex flex-col flex-1 overflow-hidden space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={cancelCreateOrder}
                  className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors"
                  title="Volver"
                >
                  <ArrowLeft size={18} />
                </button>
                <div>
                  <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                    <Plus size={18} className="text-emerald-600" />
                    <span>Crear Nuevo Pedido / Apartado</span>
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">Reserva existencias y genera un folio de pedido</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 font-bold rounded-xl hover:bg-slate-100">
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto space-y-4 flex-1 pr-1 custom-scrollbar">
              {/* Cliente */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">
                  Cliente (Nombre y/o Teléfono) *:
                </label>
                <input
                  type="text"
                  value={newOrderClient}
                  onChange={e => setNewOrderClient(e.target.value)}
                  placeholder="Ej: María Hernández - 5544332211"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Buscar y Agregar Producto */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">
                  Buscar Productos para Apartar:
                </label>
                <div className="relative">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={newOrderProductSearch}
                    onChange={e => setNewOrderProductSearch(e.target.value)}
                    placeholder="Buscar por nombre, código o SKU..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                {filteredProductsForNew.length > 0 && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-2 shadow-lg space-y-1 mt-1">
                    {filteredProductsForNew.map(prod => (
                      <button
                        key={prod.id}
                        type="button"
                        onClick={() => addProductToNewOrder(prod)}
                        className="w-full p-2 hover:bg-emerald-50 rounded-xl text-left flex justify-between items-center text-xs font-bold text-slate-800 transition-colors"
                      >
                        <span className="truncate">{prod.name}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-emerald-600 font-mono font-black">${Number(prod.price).toFixed(2)}</span>
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg">Stock: {prod.currentStock ?? 'N/A'}</span>
                          <span className="text-indigo-600 font-black">+ Agregar</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Lista de Items Seleccionados */}
              <div className="space-y-2">
                <p className="text-xs font-black text-slate-700 uppercase tracking-wider">
                  Prendas Seleccionadas ({newOrderItems.length}):
                </p>
                {newOrderItems.length === 0 ? (
                  <div className="py-6 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs font-semibold">
                    Usa el buscador para agregar las prendas de este apartado
                  </div>
                ) : (
                  <div className="space-y-2">
                    {newOrderItems.map(item => {
                      const itemSubtotal = (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0)
                      return (
                        <div key={item.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-slate-900 truncate">{item.productName}</p>
                            <p className="text-[11px] font-bold text-slate-500 font-mono">${Number(item.unitPrice).toFixed(2)} c/u</p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => updateNewOrderItemQty(item.id, -1)}
                              className="w-7 h-7 bg-white border border-slate-200 rounded-xl flex items-center justify-center font-black text-slate-700 hover:bg-slate-100 active:scale-95"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="w-8 text-center text-xs font-black text-slate-900 font-mono">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateNewOrderItemQty(item.id, 1)}
                              className="w-7 h-7 bg-white border border-slate-200 rounded-xl flex items-center justify-center font-black text-slate-700 hover:bg-slate-100 active:scale-95"
                            >
                              <Plus size={14} />
                            </button>

                            <span className="w-20 text-right text-xs font-black text-slate-900 font-mono">
                              ${itemSubtotal.toFixed(2)}
                            </span>

                            <button
                              type="button"
                              onClick={() => removeNewOrderItem(item.id)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-xl transition-colors ml-1"
                              title="Quitar prenda"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Abono inicial opcional */}
              <div className="space-y-1.5 bg-amber-50/60 border border-amber-200/80 p-3 rounded-2xl">
                <label className="text-xs font-black text-amber-900 uppercase tracking-wider block">
                  Abono Inicial del Cliente (Opcional):
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-black">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newOrderInitialAbono}
                    onChange={e => setNewOrderInitialAbono(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-2 bg-white border border-amber-300 rounded-xl text-sm font-black text-slate-900 outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Totales y Botón Guardar */}
            <div className="border-t border-slate-100 pt-3 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase block">Total Pedido:</span>
                {(() => {
                  const total = newOrderItems.reduce((sum, i) => sum + (Number(i.quantity || 1) * Number(i.unitPrice || 0)), 0)
                  const abono = parseFloat(newOrderInitialAbono) || 0
                  const resta = Math.max(0, total - abono)
                  return (
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-black text-slate-900 font-mono">${total.toFixed(2)}</span>
                      {abono > 0 && (
                        <span className="text-xs font-bold text-slate-500">
                          (Abono: ${abono.toFixed(2)} | Resta: <strong className="text-red-600 font-mono">${resta.toFixed(2)}</strong>)
                        </span>
                      )}
                    </div>
                  )
                })()}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={cancelCreateOrder}
                  disabled={isSaving}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={saveNewOrder}
                  disabled={isSaving || newOrderItems.length === 0 || !newOrderClient.trim()}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-emerald-200 transition-all active:scale-95 disabled:opacity-50"
                >
                  <Check size={16} />
                  <span>{isSaving ? 'Creando...' : 'Crear Pedido'}</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ======================================================== */
          /* VISTA 3: LISTADO PRINCIPAL DE PEDIDOS */
          /* ======================================================== */
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-amber-50 text-amber-600 rounded-2xl">
                  <ShoppingBag size={22} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Gestión de Pedidos & Apartados (Admin / Gerencia)</h2>
                  <p className="text-xs text-slate-500 font-medium">
                    {activeOrders.length} pedido{activeOrders.length !== 1 ? 's' : ''} activo{activeOrders.length !== 1 ? 's' : ''} reteniendo stock hasta liquidación total
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Botón para Crear / Agregar Pedido */}
                <button
                  type="button"
                  onClick={startCreateOrder}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-emerald-200 transition-all active:scale-95 uppercase tracking-wider"
                  title="Crear nuevo pedido o apartado"
                >
                  <Plus size={16} />
                  <span className="hidden sm:inline">Nuevo Pedido</span>
                </button>

                <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 font-bold rounded-xl hover:bg-slate-100">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Content list */}
            {activeOrders.length === 0 ? (
              <div className="py-16 text-center text-slate-400 space-y-3 my-auto">
                <Package size={48} className="mx-auto text-slate-300 stroke-1" />
                <p className="font-extrabold text-sm uppercase tracking-wider text-slate-500">No hay pedidos pendientes ni apartados</p>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Los pedidos creados por Gerencia/Admin o compras E-Commerce aparecerán aquí reservando inventario hasta su cobro 100%.
                </p>
                <button
                  type="button"
                  onClick={startCreateOrder}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider mt-3 shadow-md"
                >
                  <Plus size={15} />
                  <span>Crear Primer Pedido</span>
                </button>
              </div>
            ) : (
              <div className="overflow-y-auto space-y-4 pr-1 flex-1 custom-scrollbar">
                {activeOrders.map((order) => {
                  const folio = (order.id || '').replace('ticket-', '').slice(0, 8).toUpperCase()
                  const totalAmount = Number(order.total || 0)
                  const paidAmount = Number(order.paidAmount || 0)
                  const pendingBalance = Math.max(0, totalAmount - paidAmount)

                  // ⚠️ Cálculo de Alerta por tiempo sin cobrar (si tiene más de 2 horas)
                  const createdDate = new Date(order.createdAt || Date.now())
                  const diffHours = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60)
                  const isOldUnpaidAlert = diffHours >= 2 && pendingBalance > 0

                  const currentStatus = order.status || 'pending_surtir'

                  return (
                    <div
                      key={order.id}
                      className={`bg-slate-50 border rounded-3xl p-4 sm:p-5 transition-all space-y-3 relative group ${
                        isOldUnpaidAlert ? 'border-red-300 bg-red-50/20 shadow-md' : 'border-slate-200 hover:border-indigo-300'
                      }`}
                    >
                      {/* ALERTA DE PEDIDO ANTIGUO SIN COBRAR */}
                      {isOldUnpaidAlert && (
                        <div className="bg-red-500 text-white font-black text-[10px] uppercase px-3 py-1.5 rounded-xl flex items-center justify-between animate-pulse shadow-sm">
                          <span className="flex items-center gap-1">
                            <AlertTriangle size={14} />
                            <span>⚠️ ALERTA AUDITORÍA: PEDIDO HACE {Math.floor(diffHours)} HORAS SIN COBRAR TOTALMENTE</span>
                          </span>
                          <span className="font-mono">PENDIENTE: ${pendingBalance.toFixed(2)}</span>
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="bg-slate-900 text-amber-300 font-mono font-black text-xs px-2.5 py-1 rounded-xl uppercase">
                            #{folio}
                          </span>
                          <span className="text-xs font-black text-slate-800 flex items-center gap-1">
                            <Clock size={13} className="text-slate-400" />
                            <span>{createdDate.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}</span>
                          </span>
                        </div>

                        {/* Estado de Cobro (Abono Parcial vs Sin Pagos) */}
                        <div className="flex items-center gap-2">
                          {paidAmount > 0 ? (
                            <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                              🟡 Abono: ${paidAmount.toFixed(2)} (Resta: ${pendingBalance.toFixed(2)})
                            </span>
                          ) : (
                            <span className="bg-red-100 text-red-800 border border-red-200 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                              🔴 Sin Cobrar ($0.00)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Customer Info & Notes */}
                      {order.notes && (
                        <div className="bg-white p-2.5 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-2">
                          <User size={14} className="text-slate-400 shrink-0" />
                          <span className="truncate">{order.notes}</span>
                        </div>
                      )}

                      {/* 🔄 Flujo Cronológico de Entrega */}
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                          Flujo de Preparación y Entrega:
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                          {statusWorkflow.map((st) => {
                            const isActive = currentStatus === st.id
                            const IconComponent = st.icon
                            return (
                              <button
                                key={st.id}
                                type="button"
                                onClick={() => handleUpdateStatus(order.id, st.id)}
                                disabled={updatingId === order.id}
                                className={`py-2 px-2 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1 border transition-all ${
                                  isActive
                                    ? `${st.color} shadow-sm ring-2 ring-indigo-500`
                                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                <IconComponent size={12} />
                                <span className="truncate">{st.label.split('. ')[1]}</span>
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Items List */}
                      <div className="space-y-1.5 bg-white p-3 rounded-2xl border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Prendas Apartadas ({(order.items || []).length}):</p>
                        {(order.items || []).map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center text-xs font-bold text-slate-800">
                            <span className="truncate pr-2">• {item.productName} ({item.quantity} pzs)</span>
                            <span className="font-mono text-slate-900 shrink-0">${((Number(item.quantity) || 1) * Number(item.unitPrice || 0)).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>

                      {/* Total, Abonos & Action Buttons */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                        <div>
                          <span className="text-[10px] font-black text-slate-400 uppercase block leading-none">Total Pedido / Restante:</span>
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black text-slate-900 tracking-tight">${totalAmount.toFixed(2)}</span>
                            {pendingBalance > 0 && pendingBalance !== totalAmount && (
                              <span className="text-xs font-black text-red-600">Restante: ${pendingBalance.toFixed(2)}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2 flex-wrap sm:flex-nowrap items-center">
                          {/* Botón Modificar Pedido */}
                          <button
                            type="button"
                            onClick={() => startEditOrder(order)}
                            className="px-3 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-2xl text-xs font-black transition-all shadow-sm flex items-center gap-1.5 uppercase"
                            title="Modificar prendas, cantidades o notas"
                          >
                            <Pencil size={15} />
                            <span>Modificar</span>
                          </button>

                          {/* Registrar Abono / Pago Parcial */}
                          {pendingBalance > 0 && (
                            <button
                              onClick={() => handleRegisterAbono(order)}
                              className="px-3 py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-950 rounded-2xl text-xs font-black transition-all shadow-sm flex items-center gap-1.5 uppercase"
                              title="Registrar Abono o Pago Parcial"
                            >
                              <CreditCard size={15} />
                              <span>Abono ($)</span>
                            </button>
                          )}

                          <button
                            onClick={() => handlePrintOrderTicket(order)}
                            className="p-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-2xl text-xs font-bold transition-all shadow-sm"
                            title="Imprimir Ticket de Pedido"
                          >
                            <Printer size={16} />
                          </button>

                          {/* Botón Eliminar Pedido Definitivamente */}
                          <button
                            onClick={() => handleDeleteOrder(order)}
                            disabled={deletingId === order.id}
                            className="px-3 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-2xl text-xs font-black transition-all disabled:opacity-50 flex items-center gap-1 uppercase"
                            title="Eliminar pedido y devolver existencias"
                          >
                            <Trash2 size={15} />
                            <span className="hidden sm:inline">Eliminar</span>
                          </button>

                          <button
                            onClick={() => {
                              onCheckoutOrder(order)
                              onClose()
                            }}
                            className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-200 transition-all active:scale-95"
                          >
                            <DollarSign size={16} />
                            <span>Cobrar Total (${pendingBalance.toFixed(2)})</span>
                          </button>
                        </div>
                      </div>

                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
