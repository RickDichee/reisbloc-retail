import React, { useState } from 'react'
import { Order } from '@/types/index'
import { X, Clock, User, DollarSign, Printer, CheckCircle, Trash2, Package, ShoppingBag } from 'lucide-react'
import printService from '@/services/printService'
import supabaseService from '@/services/supabaseService'

interface PendingOrdersModalProps {
  isOpen: boolean
  onClose: () => void
  orders: Order[]
  onCheckoutOrder: (order: Order) => void
  onRefresh: () => void
}

export default function PendingOrdersModal({
  isOpen,
  onClose,
  orders,
  onCheckoutOrder,
  onRefresh
}: PendingOrdersModalProps) {
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  if (!isOpen) return null

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
        ${order.notes ? `<div>NOTAS: ${order.notes}</div>` : ''}
        <div className="divider"></div>
        <div style="font-weight:900; font-size:10px; margin-bottom:3px;">PRENDAS EN APARTADO:</div>
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
        <div style="font-size:13px; font-weight:900; text-align:right;">TOTAL APARTADO: $${Number(order.total).toFixed(2)}</div>
        <div className="divider"></div>
        <div style="text-align:center; font-size:9px; margin-top:4px;">⚠️ ESTADO: PENDIENTE DE PAGO</div>
      </body>
      </html>
    `
    printService.printReceipt(html, { title: `Pedido_${ticketId}`, width: 58 })
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 animate-scaleIn border border-slate-100 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-2xl">
              <ShoppingBag size={22} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 uppercase">Pedidos Pendientes & Apartados</h2>
              <p className="text-xs text-slate-500 font-medium">
                {orders.length} pedido{orders.length !== 1 ? 's' : ''} activo{orders.length !== 1 ? 's' : ''} reservando stock en sistema
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
            <p className="font-extrabold text-sm uppercase tracking-wider text-slate-500">No hay pedidos o apartados pendientes</p>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Cuando guardes un pedido en caja o llegue una compra en línea, aparecerá en esta lista reteniendo el inventario.
            </p>
          </div>
        ) : (
          <div className="overflow-y-auto space-y-4 pr-1 flex-1 custom-scrollbar">
            {orders.map((order) => {
              const folio = (order.id || '').replace('ticket-', '').slice(0, 8).toUpperCase()
              const totalAmount = Number(order.total || 0)

              return (
                <div
                  key={order.id}
                  className="bg-slate-50 border border-slate-200 rounded-3xl p-4 sm:p-5 hover:border-indigo-300 transition-all space-y-3 relative group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="bg-amber-400 text-slate-950 font-mono font-black text-xs px-2.5 py-1 rounded-xl uppercase">
                        #{folio}
                      </span>
                      <span className="text-xs font-black text-slate-800 flex items-center gap-1">
                        <Clock size={13} className="text-slate-400" />
                        <span>{new Date(order.createdAt).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}</span>
                      </span>
                    </div>

                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider self-start sm:self-auto">
                      ● Stock Reservado
                    </span>
                  </div>

                  {/* Customer Info */}
                  {order.notes && (
                    <div className="bg-white p-2.5 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-2">
                      <User size={14} className="text-slate-400 shrink-0" />
                      <span className="truncate">{order.notes}</span>
                    </div>
                  )}

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

                  {/* Total & Action Buttons */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase block leading-none">Total Pendiente:</span>
                      <span className="text-2xl font-black text-slate-900 tracking-tight">${totalAmount.toFixed(2)}</span>
                    </div>

                    <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                      <button
                        onClick={() => handlePrintOrderTicket(order)}
                        className="p-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-2xl text-xs font-bold transition-all shadow-sm"
                        title="Imprimir Ticket de Pedido"
                      >
                        <Printer size={16} />
                      </button>

                      <button
                        onClick={() => handleCancelOrder(order.id)}
                        disabled={cancellingId === order.id}
                        className="p-3 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-2xl text-xs font-bold transition-all disabled:opacity-50"
                        title="Cancelar apartado y devolver stock"
                      >
                        <Trash2 size={16} />
                      </button>

                      <button
                        onClick={() => {
                          onCheckoutOrder(order)
                          onClose()
                        }}
                        className="flex-1 py-3 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 transition-all active:scale-95"
                      >
                        <DollarSign size={16} />
                        <span>Cobrar Pedido</span>
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
