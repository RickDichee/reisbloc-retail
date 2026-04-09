import { useState } from 'react'
import logger from '@/utils/logger'
import mercadopagoService from '@/services/mercadopagoService'
import { CheckCircle, CreditCard, DollarSign, Loader2, Users, X } from 'lucide-react'
import { usePlanLimits } from '@/hooks/usePlanLimits'

export interface PaymentResult {
  transactionId: string
  paymentMethod: 'cash' | 'card_mercadopago' | 'card'
  currency?: 'MXN' | 'USD'
  total: number
  splitRequested?: boolean
}

interface PaymentPanelProps {
  orderTotal: number
  orderId?: string
  orderIds?: string[]
  tableNumber: number
  onPaymentComplete: (result: PaymentResult) => void
  onCancel: () => void
}

export default function PaymentPanel({
  orderTotal,
  orderId,
  orderIds,
  tableNumber,
  onPaymentComplete,
  onCancel,
}: PaymentPanelProps) {
  const ids = orderIds || (orderId ? [orderId] : [])

  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card_mercadopago' | 'card'>('cash')
  const { canUseFeature } = usePlanLimits()
  const [currency, setCurrency] = useState<'MXN' | 'USD'>('MXN')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mercadopagoUrl, setMercadopagoUrl] = useState<string | null>(null)
  const [mercadopagoId, setMercadopagoId] = useState('')

  const handlePayment = async () => {
    try {
      setLoading(true)
      setError(null)

      const finalTotal = orderTotal

      if (paymentMethod === 'cash' || paymentMethod === 'card') {
        const transactionId = `${paymentMethod}-${Date.now()}`
        setSuccess(true)
        setTimeout(() => {
          onPaymentComplete({
            transactionId,
            paymentMethod,
            currency,
            total: finalTotal,
          })
        }, 1500)
      } else if (paymentMethod === 'card_mercadopago') {
        const result = await mercadopagoService.createPaymentPreference({
          amount: finalTotal,
          description: `Venta POS Reisbloc - Tk ${tableNumber}`,
          orderId: ids.join('-'),
        })

        if (!result.id) {
          throw new Error('Error al crear preferencia de Mercado Pago')
        }

        setMercadopagoUrl(result.init_point)
        setMercadopagoId(result.id)
        setLoading(false)
      }
    } catch (err: any) {
      const msg = err?.message || 'Error al procesar cobro'
      logger.error('payment', 'Payment error', msg)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-black/60 to-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all animate-fadeIn max-h-[90vh] flex flex-col">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-2xl p-6 relative overflow-hidden flex-shrink-0">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12" />

          <div className="flex justify-between items-center relative z-10">
            <div>
              <h2 className="text-2xl font-bold text-white">Procesar Cobro</h2>
              <p className="text-blue-100 text-sm mt-1">Ticket {tableNumber}</p>
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

        <div className="p-6 overflow-y-auto">
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-900 mb-2">Moneda de Pago</label>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrency('MXN')}
                disabled={loading || success}
                className={`flex-1 px-3 py-2 rounded-lg font-semibold transition-all ${currency === 'MXN'
                  ? 'bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-lg'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
              >
                🇲🇽 MXN (${orderTotal.toFixed(2)})
              </button>
              <button
                onClick={() => setCurrency('USD')}
                disabled={loading || success}
                className={`flex-1 px-3 py-2 rounded-lg font-semibold transition-all ${currency === 'USD'
                  ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
              >
                🇺🇸 USD (${(orderTotal / 17).toFixed(2)})
              </button>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-5 rounded-xl mb-6 shadow-inner relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-10">
              <DollarSign size={48} className="text-white" />
            </div>

            <div className="flex justify-between items-end relative z-10">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo Pendiente</p>
                <p className="text-3xl font-black text-white">
                  ${orderTotal.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {!mercadopagoUrl ? (
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-900 mb-3">Forma de Pago</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setPaymentMethod('cash')}
                  disabled={loading || success}
                  className={`p-3 rounded-xl flex flex-col items-center gap-1.5 transition-all ${paymentMethod === 'cash'
                    ? 'bg-emerald-600 text-white shadow-lg ring-2 ring-emerald-400'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                  <DollarSign size={24} strokeWidth={2.5} />
                  <span className="text-[11px] font-black uppercase tracking-tight text-center">Efectivo</span>
                </button>

                <button
                  onClick={() => setPaymentMethod('card')}
                  disabled={loading || success}
                  className={`p-3 rounded-xl flex flex-col items-center gap-1.5 transition-all ${paymentMethod === 'card'
                    ? 'bg-slate-900 text-white shadow-lg ring-2 ring-slate-400'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                  <CreditCard size={24} />
                  <span className="text-[11px] font-black uppercase tracking-tight text-center leading-tight">Tarjeta</span>
                </button>

                {canUseFeature('mercadopago') ? (
                  <button
                    onClick={() => setPaymentMethod('card_mercadopago')}
                    disabled={loading || success}
                    className={`p-3 rounded-xl flex flex-col items-center gap-1.5 transition-all ${paymentMethod === 'card_mercadopago'
                      ? 'bg-[#00B1EA] text-white shadow-lg ring-2 ring-[#00B1EA]'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                  >
                    <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center">
                      <span className="text-[#00B1EA] font-black text-sm">M</span>
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-tight text-center leading-tight">Mercado<br />Pago</span>
                  </button>
                ) : (
                  <button
                    disabled
                    className="p-3 rounded-xl flex flex-col items-center gap-1.5 bg-gray-50 text-gray-300 cursor-not-allowed relative"
                  >
                    <div className="w-7 h-7 bg-gray-200 rounded-lg flex items-center justify-center">
                      <span className="text-gray-400 font-black text-sm">M</span>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-tight text-center leading-tight">Mercado<br />Pago</span>
                    <span className="absolute -top-2 -right-2 px-1.5 py-0.5 bg-indigo-600 text-white text-[8px] font-black rounded-full">
                      Launch
                    </span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="mb-6 text-center animate-scaleIn bg-blue-50 p-6 rounded-2xl border border-blue-100">
              <h3 className="font-black text-blue-900 mb-2">Pagar con Mercado Pago</h3>
              <p className="text-xs text-blue-600 font-bold mb-4">Escanea el QR o usa el botón inferior</p>

              <div className="flex justify-center mb-6">
                <div className="bg-white p-3 rounded-2xl shadow-lg inline-block">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(mercadopagoUrl)}`}
                    alt="QR Mercado Pago"
                    className="w-40 h-40 object-contain"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => window.open(mercadopagoUrl, '_blank')}
                  className="w-full py-3 bg-white border border-blue-200 text-blue-700 font-bold rounded-xl hover:bg-blue-100 transition-colors"
                >
                  Continuar en Mercado Pago
                </button>
                <button
                  onClick={() => {
                    setSuccess(true)
                    setTimeout(() => {
                      onPaymentComplete({
                        transactionId: mercadopagoId,
                        paymentMethod: 'card_mercadopago',
                        currency,
                        total: orderTotal
                      })
                    }, 1000)
                  }}
                  disabled={success}
                  className="w-full py-3 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2"
                >
                  {success ? <><CheckCircle size={20} /> ¡Aprobado!</> : 'Confirmar Pago Exitoso'}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {ids.length > 1 && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700 font-semibold">ℹ️ Múltiples órdenes consolidadas</p>
            </div>
          )}

          {!mercadopagoUrl && (
            <div className="flex gap-2 flex-col">
              <div className="flex gap-3">
                <button
                  onClick={onCancel}
                  disabled={loading || success}
                  className="flex-1 px-6 py-4 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>

                <button
                  onClick={handlePayment}
                  disabled={loading || success}
                  className="flex-1 px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-bold shadow-lg shadow-green-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Procesando...
                    </>
                  ) : success ? (
                    <>
                      <CheckCircle size={20} />
                      ¡Completado!
                    </>
                  ) : (
                    <>
                      {paymentMethod === 'card_mercadopago'
                        ? 'Generar Link Mercado Pago'
                        : paymentMethod === 'card'
                          ? 'Registrar Info (Pago Externo)'
                          : `Cobrar $${orderTotal.toFixed(2)} en Efectivo`}
                    </>
                  )}
                </button>
              </div>

              {ids.length > 1 && !loading && (
                <button
                  onClick={() => onPaymentComplete({
                    transactionId: `split-request-${Date.now()}`,
                    paymentMethod: 'cash',
                    currency: 'MXN',
                    total: 0,
                    splitRequested: true,
                  })}
                  disabled={loading || success}
                  className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Users size={18} />
                  Dividir Cobro
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}