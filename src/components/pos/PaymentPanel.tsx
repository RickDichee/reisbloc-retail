import { useState } from 'react'
import logger from '@/utils/logger'
import { CheckCircle, DollarSign, ArrowLeftRight, Loader2, Users, X, Building2, Hash, FileText } from 'lucide-react'

export interface PaymentResult {
  transactionId: string
  paymentMethod: 'cash' | 'transfer' | 'card_mercadopago' | 'card' | 'clip'
  currency?: 'MXN' | 'USD'
  total: number
  splitRequested?: boolean
  authCode?: string
  last4?: string
  transferReference?: string
  transferBank?: string
  notes?: string
}

interface PaymentPanelProps {
  orderTotal: number
  orderId?: string
  orderIds?: string[]
  tableNumber: number
  onPaymentComplete: (result: PaymentResult) => void
  onCancel: () => void
}

const COMMON_BANKS = ['BBVA', 'Banamex', 'Santander', 'Banorte', 'Nu', 'Mercado Pago', 'STP', 'Azteca']

export default function PaymentPanel({
  orderTotal,
  orderId,
  orderIds,
  tableNumber,
  onPaymentComplete,
  onCancel,
}: PaymentPanelProps) {
  const ids = orderIds || (orderId ? [orderId] : [])

  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('cash')
  const [currency, setCurrency] = useState<'MXN' | 'USD'>('MXN')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Campos específicos para Transferencia Bancaria
  const [transferReference, setTransferReference] = useState('')
  const [transferBank, setTransferBank] = useState('')
  const [transferNotes, setTransferNotes] = useState('')

  const handlePayment = async () => {
    try {
      setLoading(true)
      setError(null)
      const finalTotal = orderTotal

      if (paymentMethod === 'cash') {
        const transactionId = `cash-${Date.now()}`
        setSuccess(true)
        setTimeout(() => {
          onPaymentComplete({
            transactionId,
            paymentMethod: 'cash',
            currency,
            total: finalTotal,
          })
        }, 800)
      } else if (paymentMethod === 'transfer') {
        const transactionId = `transfer-${Date.now()}`
        setSuccess(true)
        setTimeout(() => {
          onPaymentComplete({
            transactionId,
            paymentMethod: 'transfer',
            currency,
            total: finalTotal,
            transferReference: transferReference.trim(),
            transferBank: transferBank.trim(),
            notes: transferNotes.trim(),
          })
        }, 800)
      }
    } catch (err: any) {
      const msg = err?.message || 'Error al procesar cobro'
      logger.error('payment', 'Payment error', msg)
      setError(msg)
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-black/60 to-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all animate-fadeIn max-h-[92dvh] flex flex-col">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-t-2xl p-6 relative overflow-hidden flex-shrink-0">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12" />

          <div className="flex justify-between items-center relative z-10">
            <div>
              <h2 className="text-2xl font-black text-white">Procesar Cobro</h2>
              <p className="text-indigo-200 text-xs font-bold mt-0.5 uppercase tracking-wider">Ticket {tableNumber}</p>
            </div>
            <button
              onClick={onCancel}
              className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
              disabled={loading || success}
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Moneda */}
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">Moneda de Pago</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCurrency('MXN')}
                disabled={loading || success}
                className={`flex-1 px-3 py-2.5 rounded-xl font-black text-xs uppercase tracking-wide transition-all ${
                  currency === 'MXN'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                🇲🇽 MXN (${orderTotal.toFixed(2)})
              </button>
              <button
                type="button"
                onClick={() => setCurrency('USD')}
                disabled={loading || success}
                className={`flex-1 px-3 py-2.5 rounded-xl font-black text-xs uppercase tracking-wide transition-all ${
                  currency === 'USD'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                🇺🇸 USD (${(orderTotal / 17).toFixed(2)})
              </button>
            </div>
          </div>

          {/* Saldo a Cobrar */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-5 rounded-2xl shadow-inner relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-10">
              <DollarSign size={56} className="text-white" />
            </div>

            <div className="relative z-10">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total a Pagar</p>
              <p className="text-3xl font-black text-white mt-1">
                ${orderTotal.toFixed(2)} <span className="text-xs text-emerald-400 font-bold">{currency}</span>
              </p>
            </div>
          </div>

          {/* Selector de Método de Pago: Solo Efectivo y Transferencia */}
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">Forma de Pago</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                disabled={loading || success}
                className={`p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all border-2 ${
                  paymentMethod === 'cash'
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-700 shadow-md ring-2 ring-emerald-500/20'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className={`p-2.5 rounded-xl ${paymentMethod === 'cash' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                  <DollarSign size={24} strokeWidth={2.5} />
                </div>
                <span className="text-xs font-black uppercase tracking-tight">Efectivo</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('transfer')}
                disabled={loading || success}
                className={`p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all border-2 ${
                  paymentMethod === 'transfer'
                    ? 'bg-indigo-500/10 border-indigo-600 text-indigo-700 shadow-md ring-2 ring-indigo-500/20'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className={`p-2.5 rounded-xl ${paymentMethod === 'transfer' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                  <ArrowLeftRight size={24} strokeWidth={2.5} />
                </div>
                <span className="text-xs font-black uppercase tracking-tight">Transferencia</span>
              </button>
            </div>
          </div>

          {/* Detalles de Transferencia Bancaria */}
          {paymentMethod === 'transfer' && (
            <div className="bg-indigo-50/60 border border-indigo-200 rounded-2xl p-4 space-y-3.5 animate-fadeIn">
              <div className="flex items-center gap-2 text-indigo-950 font-black text-xs uppercase tracking-wider">
                <Building2 size={16} className="text-indigo-600" />
                <span>Datos de la Transferencia</span>
              </div>

              {/* Referencia o Clave de Rastreo */}
              <div>
                <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 mb-1">
                  <Hash size={13} className="text-slate-500" />
                  <span>Referencia / Clave de Rastreo / Folio</span>
                </label>
                <input
                  type="text"
                  value={transferReference}
                  onChange={(e) => setTransferReference(e.target.value)}
                  placeholder="ej. 839201 o últimos 4 dígitos"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Banco Emisor */}
              <div>
                <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 mb-1">
                  <Building2 size={13} className="text-slate-500" />
                  <span>Banco Emisor</span>
                </label>
                <input
                  type="text"
                  value={transferBank}
                  onChange={(e) => setTransferBank(e.target.value)}
                  placeholder="ej. BBVA, Nu, Banamex..."
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-1.5"
                />

                {/* Chips rápidos de bancos comunes */}
                <div className="flex flex-wrap gap-1">
                  {COMMON_BANKS.map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setTransferBank(b)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-all ${
                        transferBank === b
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notas adicionales */}
              <div>
                <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 mb-1">
                  <FileText size={13} className="text-slate-500" />
                  <span>Titular o Notas (opcional)</span>
                </label>
                <input
                  type="text"
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  placeholder="ej. Pagó Juan Pérez / Comprobante verificado"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-xs text-red-700 font-bold">{error}</p>
            </div>
          )}

          {ids.length > 1 && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
              <p className="text-xs text-blue-700 font-bold">ℹ️ {ids.length} pedidos consolidados en este cobro</p>
            </div>
          )}

          {/* Botones de Acción */}
          <div className="flex flex-col gap-2 pt-2">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onCancel}
                disabled={loading || success}
                className="flex-1 px-4 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black text-xs uppercase tracking-wide transition-all disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handlePayment}
                disabled={loading || success}
                className={`flex-2 px-5 py-3.5 rounded-xl font-black text-xs uppercase tracking-wider text-white shadow-lg transition-all flex items-center justify-center gap-2 ${
                  paymentMethod === 'transfer'
                    ? 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 shadow-indigo-500/30'
                    : 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 shadow-emerald-500/30'
                } disabled:opacity-50`}
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Procesando...
                  </>
                ) : success ? (
                  <>
                    <CheckCircle size={18} />
                    ¡Cobro Exitoso!
                  </>
                ) : (
                  <>
                    <CheckCircle size={18} />
                    {paymentMethod === 'transfer'
                      ? `Confirmar Transferencia ($${orderTotal.toFixed(2)})`
                      : `Cobrar $${orderTotal.toFixed(2)} Efectivo`}
                  </>
                )}
              </button>
            </div>

            {ids.length > 1 && !loading && (
              <button
                type="button"
                onClick={() => onPaymentComplete({
                  transactionId: `split-request-${Date.now()}`,
                  paymentMethod: 'cash',
                  currency: 'MXN',
                  total: 0,
                  splitRequested: true,
                })}
                disabled={loading || success}
                className="w-full px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-black text-xs uppercase tracking-wide transition-all flex items-center justify-center gap-2"
              >
                <Users size={16} />
                Dividir Cobro
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
