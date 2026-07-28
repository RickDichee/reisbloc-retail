import React, { useState } from 'react'
import { Order } from '@/types/index'
import { X, Clock, User, DollarSign, Printer, Trash2, Package, ShoppingBag, AlertTriangle, Truck, CheckCircle2, ChevronRight, CreditCard } from 'lucide-react'
import printService from '@/services/printService'
import supabaseService from '@/services/supabaseService'

interface PendingOrdersModalProps {
  isOpen: boolean
  onClose: () => void
  orders: Order[]
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
  onCheckoutOrder,
  onRefresh
}: PendingOrdersModalProps) {
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  if (!isOpen) return null

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
        userId: 'system',
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

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('¿Estás seguro de cancelar este pedido/apartado? Las existencias regresarán automáticamente al inventario.')) {
      return
    }

    setCancellingId(orderId)
    try {
      await supabaseService.updateOrderStatus(orderId, 'cancelled')
      alert('✅ Pedido cancelado y stock devuelto al inventario.')
      onRefresh()
    } catch (err: any) {
      console.error('Error cancelling order:', err)
      alert('Error al cancelar pedido: ' + err.message)
    } finally {
      setCancellingId(null)
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
        <div style="text-align:center; font-size:10px;">REISBLOC STORE</div>
        <div className="divider"></div>
        <div>FOLIO: #${ticketId}</div>
        <div>FECHA: ${new Date(order.createdAt).toLocaleString('es-MX')}</div>
        ${order.notes ? `<div>CLIENTE/NOTAS: ${order.notes}</div>` : ''}
        <div className="divider"></div>
        <div style="font-weight:900; font-size:10px; margin-bottom:3px;">PRENDAS APARTADAS:</div>
        ${order.items.map(item => `
          <div style="margin-bottom:3px;">
            <div>${item.productName}</div>
            <div style="display:flex; justify-content:space-between; font-size:10px;">
              <span>${item.quantity} pz x $${Number(item.unitPrice).toFixed(2)}</span>
              <span>$${(item.quantity * item.unitPrice).toFixed(2)}</span>
            </div>
          </div>
        `).join('')}
        <div className="divider"></div>
        <div>TOTAL PEDIDO: $${total.toFixed(2)}</div>
        <div>ABONADO: $${paid.toFixed(2)}</div>
        <div style="font-size:12px; font-weight:900;">RESTANTE PENDIENTE: $${balance.toFixed(2)}</div>
        <div className="divider"></div>
        <div style="text-align:center; font-size:9px; margin-top:4px;">⚠️ ESTADO: ${balance === 0 ? 'PAGADO 100%' : 'PENDIENTE DE PAGO'}</div>
      </body>
      </html>
    `
    printService.printReceipt(html, { title: `Pedido_${ticketId}`, width: 58 })
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full p-6 animate-scaleIn border border-slate-100 max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-2xl">
              <ShoppingBag size={22} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Gestión de Pedidos & Apartados (Admin / Gerencia)</h2>
              <p className="text-xs text-slate-500 font-medium">
                {orders.length} pedido{orders.length !== 1 ? 's' : ''} activo{orders.length !== 1 ? 's' : ''} reteniendo stock hasta liquidación total
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 font-bold rounded-xl hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>

        {/* Content list */}
        {orders.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-3 my-auto">
            <Package size={48} className="mx-auto text-slate-300 stroke-1" />
            <p className="font-extrabold text-sm uppercase tracking-wider text-slate-500">No hay pedidos pendientes ni apartados</p>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Los pedidos creados por Gerencia/Admin o compras E-Commerce aparecerán aquí reservando inventario hasta su cobro 100%.
            </p>
          </div>
        ) : (
          <div className="overflow-y-auto space-y-4 pr-1 flex-1 custom-scrollbar">
            {orders.map((order) => {
              const folio = (order.id || '').replace('ticket-', '').slice(0, 8).toUpperCase()
              const totalAmount = Number(order.total || 0)
              const paidAmount = Number(order.paidAmount || 0)
              const pendingBalance = totalAmount - paidAmount

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

                  {/* 🔄 Flujo Cronológico de Entrega (No elimina el pedido hasta cobrar 100%) */}
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
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Prendas Apartadas ({order.items.length}):</p>
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs font-bold text-slate-800">
                        <span className="truncate pr-2">• {item.productName} ({item.quantity} pzs)</span>
                        <span className="font-mono text-slate-900 shrink-0">${(item.quantity * item.unitPrice).toFixed(2)}</span>
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

                    <div className="flex gap-2 flex-wrap sm:flex-nowrap">
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

                      <button
                        onClick={() => handleCancelOrder(order.id)}
                        disabled={cancellingId === order.id}
                        className="p-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-2xl text-xs font-bold transition-all disabled:opacity-50"
                        title="Cancelar apartado y devolver stock"
                      >
                        <Trash2 size={16} />
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
    </div>
  )
}
