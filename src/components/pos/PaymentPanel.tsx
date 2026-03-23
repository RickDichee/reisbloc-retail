import { useState } from 'react'
import logger from '@/utils/logger'
import conektaService from '@/services/conektaService'
import { CheckCircle, CreditCard, DollarSign, Loader2, Users, X, Zap } from 'lucide-react'
import { usePlanLimits } from '@/hooks/usePlanLimits'

export interface PaymentResult {
  transactionId: string
  paymentMethod: 'cash' | 'card_conekta' | 'card'
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
  // Support both old (orderId) and new (orderIds) interfaces
  const ids = orderIds || (orderId ? [orderId] : [])

  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card_conekta' | 'card'>('cash')
  const { canUseFeature } = usePlanLimits()
  const [currency, setCurrency] = useState<'MXN' | 'USD'>('MXN')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [conektaCheckoutUrl, setConektaCheckoutUrl] = useState<string | null>(null)
  const [conektaTransactionId, setConektaTransactionId] = useState('')

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
      } else if (paymentMethod === 'card_conekta') {
        const result = await conektaService.createPaymentIntent({
          amount: finalTotal,
          currency: currency,
          orderId: ids.join('-'),
          description: `Venta POS Reisbloc - Tk ${tableNumber}`
        })

        if (!result.success || !result.checkoutUrl) {
          throw new Error(result.error || 'Error con Conekta API')
        }

        setConektaCheckoutUrl(result.checkoutUrl)
        setConektaTransactionId(result.transactionId || `conekta_${Date.now()}`)
        setLoading(false)
      } else {
        throw new Error('Método de pago no implementado por completo aún.')
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
        {/* Header */}
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
          {/* Currency Selection */}
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

          {/* Final Balance Info */}
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

          {/* Payment Method Selection */}
          {!conektaCheckoutUrl ? (
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-900 mb-3">Métodos de Cobro Integrados</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setPaymentMethod('cash')}
                  disabled={loading || success}
                  className={`p-3 rounded-xl flex flex-col items-center gap-1.5 transition-all ${paymentMethod === 'cash'
                    ? 'bg-emerald-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                  <DollarSign size={20} strokeWidth={2.5} />
                  <span className="text-[10px] font-black uppercase">Efectivo</span>
                </button>

                {canUseFeature('conekta') ? (
                  <button
                    onClick={() => setPaymentMethod('card_conekta')}
                    disabled={loading || success}
                    className={`p-3 rounded-xl flex flex-col items-center gap-1.5 transition-all ${paymentMethod === 'card_conekta'
                      ? 'bg-indigo-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                  >
                    <CreditCard size={20} />
                    <span className="text-[10px] font-black uppercase tracking-tighter text-center">Conekta</span>
                  </button>
                ) : (
                  <button
                    disabled
                    className="p-3 rounded-xl flex flex-col items-center gap-1.5 bg-gray-50 text-gray-300 cursor-not-allowed relative group"
                    title="Requiere Plan Pro"
                  >
                    <CreditCard size={20} />
                    <span className="text-[10px] font-black uppercase tracking-tighter text-center">Conekta</span>
                    <span className="absolute -top-1.5 -right-1.5 flex items-center gap-0.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full">
                      <Zap size={7} className="fill-current" />Pro
                    </span>
                  </button>
                )}

                <button
                  onClick={() => setPaymentMethod('card')}
                  disabled={loading || success}
                  className={`p-3 rounded-xl flex flex-col items-center gap-1.5 transition-all ${paymentMethod === 'card'
                    ? 'bg-slate-900 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                  <CreditCard size={20} />
                  <span className="text-[10px] font-black uppercase text-center leading-tight">Terminal<br/>Física</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="mb-6 text-center animate-scaleIn bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
               <h3 className="font-black text-indigo-900 mb-2">Escanea para Pagar</h3>
               <p className="text-xs text-indigo-600 font-bold mb-4">Compatible con Apple Pay, Tarjetas y OXXO</p>
               
               <div className="flex justify-center mb-6">
                  <div className="bg-white p-3 rounded-2xl shadow-lg inline-block">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(conektaCheckoutUrl)}`} 
                      alt="QR de Pago Conekta" 
                      className="w-40 h-40 object-contain"
                    />
                  </div>
               </div>

               <div className="flex flex-col gap-3">
                 <button
                   onClick={() => window.open(conektaCheckoutUrl, '_blank')}
                   className="w-full py-3 bg-white border border-indigo-200 text-indigo-700 font-bold rounded-xl hover:bg-indigo-100 transition-colors"
                 >
                   Abrir Link en esta Tablet
                 </button>
                 <button
                   onClick={() => {
                     setSuccess(true);
                     setTimeout(() => {
                       onPaymentComplete({
                         transactionId: conektaTransactionId,
                         paymentMethod: 'card_conekta',
                         currency,
                         total: orderTotal
                       });
                     }, 1000);
                   }}
                   disabled={success}
                   className="w-full py-3 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2"
                 >
                   {success ? <><CheckCircle size={20} /> ¡Aprobado!</> : 'Confirmar Pago Exitoso'}
                 </button>
               </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Multiple Orders Info */}
          {ids.length > 1 && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700 font-semibold">ℹ️ Múltiples órdenes consolidadas</p>
            </div>
          )}

          {/* Action Buttons */}
          {!conektaCheckoutUrl && (
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
                      {paymentMethod === 'card_conekta' 
                        ? 'Generar Terminal / QR' 
                        : paymentMethod === 'card'
                          ? 'Registrar Cobro en Terminal' 
                          : `Recibir $${orderTotal.toFixed(2)} en Efectivo`}
                    </>
                  )}
                </button>
              </div>

              {/* Dividir Cuenta Button - only for multiple orders */}
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
