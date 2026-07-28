import React, { useState, useEffect } from 'react'
import { X, Receipt, ShoppingBag, Clock, DollarSign, Printer, User, FileText, CheckCircle2, AlertCircle } from 'lucide-react'
import supabaseService from '@/services/supabaseService'
import printService from '@/services/printService'
import { sanitizeHTML } from '@/utils/sanitize'

interface ClientHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  client: any
}

export default function ClientHistoryModal({
  isOpen,
  onClose,
  client
}: ClientHistoryModalProps) {
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending')
  const [pendingOrders, setPendingOrders] = useState<any[]>([])
  const [completedSales, setCompletedSales] = useState<any[]>([])
  const [totalDebt, setTotalDebt] = useState<number>(0)
  const [totalSpent, setTotalSpent] = useState<number>(0)

  useEffect(() => {
    if (!isOpen || !client) return

    const loadClientData = async () => {
      setLoading(true)
      try {
        const clientName = client.name || ''
        const searchStr = clientName.toLowerCase()

        // 1. Cargar todas las órdenes activas (pedidos sin cobrar o con abonos)
        const allOrders = await supabaseService.getActiveOrders()
        const clientOrders = allOrders.filter(o => {
          const notesStr = (o.notes || '').toLowerCase()
          return notesStr.includes(searchStr) || (o as any).client_id === client.id || (o as any).clientId === client.id
        })

        setPendingOrders(clientOrders)
        const debt = clientOrders.reduce((sum, o) => sum + Number(o.pendingBalance ?? o.total ?? 0), 0)
        setTotalDebt(debt)

        // 2. Cargar historial de ventas cobradas pasadas
        const allSales = await supabaseService.getSalesByDateRange(
          new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // Último año
          new Date()
        )

        const clientSales = allSales.filter(s => {
          const notesStr = (s.notes || '').toLowerCase()
          return notesStr.includes(searchStr) || (s as any).client_id === client.id || (s as any).clientId === client.id
        })

        setCompletedSales(clientSales)
        const spent = clientSales.reduce((sum, s) => sum + Number(s.total || 0), 0)
        setTotalSpent(spent)

        if (clientOrders.length > 0) {
          setActiveTab('pending')
        } else {
          setActiveTab('completed')
        }
      } catch (e) {
        console.error('Error loading client history:', e)
      } finally {
        setLoading(false)
      }
    }

    loadClientData()
  }, [isOpen, client])

  if (!isOpen || !client) return null

  const handlePrintTicket = (item: any) => {
    const folio = (item.id || '').slice(0, 10).toUpperCase()
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; color: #000 !important; }
          body {
            font-family: 'Consolas', 'Courier New', monospace;
            font-size: 11px;
            width: 48mm;
            margin: 0 auto;
            padding: 2mm 0;
          }
          .divider { border-bottom: 2px dashed #000; margin: 4px 0; }
        </style>
      </head>
      <body>
        <div style="text-align:center; font-weight:900; font-size:13px;">DOCUMENTO DE CLIENTE CRM</div>
        <div style="text-align:center; font-size:10px;">REISBLOC STORE</div>
        <div className="divider"></div>
        <div>CLIENTE: ${client.name}</div>
        <div>FOLIO: #${folio}</div>
        <div>FECHA: ${new Date(item.createdAt || item.created_at || Date.now()).toLocaleString('es-MX')}</div>
        <div className="divider"></div>
        ${(item.items || []).map((i: any) => `
          <div style="margin-bottom:3px;">
            <div>${i.productName || i.name}</div>
            <div style="display:flex; justify-between; font-size:10px;">
              <span>${i.quantity} pz x $${Number(i.unitPrice || i.price || 0).toFixed(2)}</span>
              <span>$${(Number(i.quantity) * Number(i.unitPrice || i.price || 0)).toFixed(2)}</span>
            </div>
          </div>
        `).join('')}
        <div className="divider"></div>
        <div style="font-size:13px; font-weight:900; text-align:right;">TOTAL: $${Number(item.total || 0).toFixed(2)}</div>
      </body>
      </html>
    `
    printService.printReceipt(html, { title: `Ticket_${folio}`, width: 58 })
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full p-6 animate-scaleIn border border-slate-100 max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-md">
              {client.name[0].toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">{client.name}</h2>
              <p className="text-xs text-slate-500 font-medium">
                {client.phone ? `Tel: ${client.phone}` : 'Sin teléfono'} {client.email ? `• ${client.email}` : ''}
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 font-bold rounded-xl hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>

        {/* Resumen de Adeudo & Inversión */}
        <div className="grid grid-cols-2 gap-3 mb-4 shrink-0">
          <div className={`p-4 rounded-2xl border ${totalDebt > 0 ? 'bg-red-50 border-red-200 text-red-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'}`}>
            <p className="text-[9.5px] font-black uppercase tracking-widest leading-none mb-1 opacity-70">Saldo Pendiente (Adeudo)</p>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black">${totalDebt.toFixed(2)}</span>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${totalDebt > 0 ? 'bg-red-200 text-red-900' : 'bg-emerald-200 text-emerald-900'}`}>
                {totalDebt > 0 ? `🔴 ${pendingOrders.length} Pedidos Activos` : '🟢 Al día (0 Deuda)'}
              </span>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900">
            <p className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Compras Liquidadas (Histórico)</p>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black">${totalSpent.toFixed(2)}</span>
              <span className="text-xs font-bold text-slate-500">{completedSales.length} compras totales</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 mb-4 shrink-0">
          <button
            onClick={() => setActiveTab('pending')}
            className={`pb-3 px-4 font-black text-xs uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'pending'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <ShoppingBag size={15} />
            <span>Pedidos & Apartados Activos ({pendingOrders.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`pb-3 px-4 font-black text-xs uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'completed'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Receipt size={15} />
            <span>Historial de Compras ({completedSales.length})</span>
          </button>
        </div>

        {/* Tab Content */}
        {loading ? (
          <div className="py-16 text-center text-slate-400 font-bold text-sm my-auto">Cargando historial del cliente...</div>
        ) : activeTab === 'pending' ? (
          <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
            {pendingOrders.length === 0 ? (
              <div className="py-12 text-center text-slate-400 font-semibold text-xs my-auto">
                Este cliente no tiene pedidos o apartados pendientes de cobro.
              </div>
            ) : (
              pendingOrders.map(order => {
                const folio = (order.id || '').replace('ticket-', '').slice(0, 8).toUpperCase()
                const paid = Number(order.paidAmount || 0)
                const total = Number(order.total || 0)
                const balance = total - paid

                return (
                  <div key={order.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 hover:border-indigo-300 transition-all">
                    <div className="flex justify-between items-center">
                      <span className="font-mono font-black text-xs bg-amber-400 text-slate-950 px-2 py-0.5 rounded-lg uppercase">
                        #{folio}
                      </span>
                      <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                        <Clock size={12} />
                        {new Date(order.createdAt || Date.now()).toLocaleString('es-MX')}
                      </span>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-slate-100 text-xs space-y-1">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Prendas:</p>
                      {order.items.map((i: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-slate-800 font-semibold">
                          <span>• {i.productName} ({i.quantity} pzs)</span>
                          <span className="font-mono">${(i.quantity * i.unitPrice).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between items-end pt-1">
                      <div>
                        <span className="text-[9px] font-black text-slate-400 uppercase block">Cobro & Abonos:</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-lg font-black text-slate-900">${total.toFixed(2)}</span>
                          {paid > 0 && <span className="text-xs text-emerald-600 font-bold">(Abonado: ${paid.toFixed(2)})</span>}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-black text-red-600 uppercase block">Saldo Deuda: ${balance.toFixed(2)}</span>
                        <button
                          onClick={() => handlePrintTicket(order)}
                          className="mt-1 px-3 py-1 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-700 inline-flex items-center gap-1"
                        >
                          <Printer size={12} />
                          Ticket
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
            {completedSales.length === 0 ? (
              <div className="py-12 text-center text-slate-400 font-semibold text-xs my-auto">
                No hay compras o tickets pasados registrados a nombre de este cliente.
              </div>
            ) : (
              completedSales.map(sale => {
                const folio = (sale.id || '').slice(0, 8).toUpperCase()
                return (
                  <div key={sale.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-mono font-black text-xs bg-slate-900 text-white px-2 py-0.5 rounded-lg uppercase">
                        Venta #${folio}
                      </span>
                      <span className="text-[11px] font-bold text-slate-500">
                        {new Date(sale.created_at || sale.createdAt || Date.now()).toLocaleString('es-MX')}
                      </span>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-slate-100 text-xs space-y-1">
                      {(sale.items || []).map((i: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-slate-800 font-semibold">
                          <span>• {i.productName || i.name} ({i.quantity} pzs)</span>
                          <span className="font-mono">${(i.quantity * (i.unitPrice || i.price)).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between items-center pt-1">
                      <span className="text-base font-black text-slate-900">Total Liquidado: ${Number(sale.total || 0).toFixed(2)}</span>
                      <button
                        onClick={() => handlePrintTicket(sale)}
                        className="px-3 py-1 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-700 inline-flex items-center gap-1"
                      >
                        <Printer size={12} />
                        Ticket
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

      </div>
    </div>
  )
}
