import { useState, useEffect } from 'react'
import logger from '@/utils/logger'
import { X, DollarSign, Loader2, CheckCircle, CreditCard, Users } from 'lucide-react'
import mercadopagoService from '@/services/mercadopagoService'
import { APP_CONFIG } from '@/config/constants'

export interface PaymentResult {
  transactionId: string
  paymentMethod: 'cash' | 'card' | 'transfer'
  currency?: 'MXN' | 'USD'
  tip: number
  tipCurrency?: 'MXN' | 'USD'
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

  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash')
  const [currency, setCurrency] = useState<'MXN' | 'USD'>('MXN')
  const [tipPercentage, setTipPercentage] = useState(APP_CONFIG.DEFAULT_TIP_PERCENTAGE || 10)
  const [tipAmount, setTipAmount] = useState((orderTotal * (APP_CONFIG.DEFAULT_TIP_PERCENTAGE || 10)) / 100)
  const [tipCurrency, setTipCurrency] = useState<'MXN' | 'USD'>('MXN')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [requestingSplit, setRequestingSplit] = useState(false)

  const total = orderTotal + tipAmount

  useEffect(() => {
    // When currency changes, also change tip currency to match
    setTipCurrency(currency)
  }, [currency])

  const handleTipChange = (amount: number) => {
    setTipAmount(amount)
    setTipPercentage(amount > 0 ? Math.round((amount / orderTotal) * 100) : 0)
  }

  const handlePayment = async () => {
    try {
      setLoading(true)
      setError(null)

      if (paymentMethod === 'cash') {
        // Cash payment - direct
        const transactionId = `cash-${Date.now()}`
        logger.info('payment', 'Cash payment', { amount: total, tip: tipAmount })

        // Simular un pequeño delay para mejor UX
        await new Promise(resolve => setTimeout(resolve, 800))
        setSuccess(true)

        setTimeout(() => {
          onPaymentComplete({
            transactionId,
            paymentMethod,
            currency,
            tip: tipAmount,
            tipCurrency,
            total,
          })
        }, 1500)
      } else if (paymentMethod === 'card' || paymentMethod === 'transfer') {
        // MODO MANUAL: Registrar pago sin abrir ventana externa
        try {
          // Usamos processDirectPayment que ahora es un mock local
          const payment = await mercadopagoService.processDirectPayment({
            amount: total,
            description: `Mesa ${tableNumber} - ${ids.length} orden${ids.length > 1 ? 'es' : ''}`,
            orderId: ids[0],
            email: 'customer@restaurant.com',
            paymentMethodId: paymentMethod
          })

          logger.info('payment', 'Pago registrado manualmente', payment.id)

          setSuccess(true)
          setTimeout(() => {
            onPaymentComplete({
              transactionId: payment.id,
              paymentMethod: paymentMethod,
              currency,
              tip: tipAmount,
              tipCurrency,
              total,
            })
          }, 1500)
        } catch (err: any) {
          logger.error('payment', 'MercadoPago error', err as any)
          throw err
        }
      }
    } catch (err: any) {
      const msg = err?.message || 'Error al procesar pago'
      logger.error('payment', 'Payment error', msg)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const tipPercentages = [10, 15, 20]

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-black/60 to-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all animate-fadeIn max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-2xl p-6 relative overflow-hidden flex-shrink-0">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12" />

          <div className="flex justify-between items-center relative z-10">
            <div>
              <h2 className="text-2xl font-bold text-white">Procesar Pago</h2>
              <p className="text-blue-100 text-sm mt-1">Mesa {tableNumber}</p>
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
                className={`flex-1 px-3 py-2 rounded-lg font-semibold transition-all ${
                  currency === 'MXN'
                    ? 'bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-lg'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                🇲🇽 MXN (${orderTotal.toFixed(2)})
              </button>
              <button
                onClick={() => setCurrency('USD')}
                disabled={loading || success}
                className={`flex-1 px-3 py-2 rounded-lg font-semibold transition-all ${
                  currency === 'USD'
                    ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                🇺🇸 USD (${(orderTotal / 17).toFixed(2)})
              </button>
            </div>
          </div>

          {/* Order Details */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-5 rounded-xl mb-6 border border-gray-200">
            <div className="flex justify-between mb-3 text-gray-700">
              <span className="font-medium">Subtotal:</span>
              <span className="font-semibold">
                {currency === 'USD' ? `USD $${(orderTotal / 17).toFixed(2)}` : `MXN $${orderTotal.toFixed(2)}`}
              </span>
            </div>
            <div className="flex justify-between mb-4 pb-4 border-b border-gray-300">
              <span className="font-medium text-gray-700">Propina:</span>
              <span className="font-semibold text-gray-700">
                {tipCurrency === 'USD' ? `USD $${(tipAmount / 17).toFixed(2)}` : `MXN $${tipAmount.toFixed(2)}`}
              </span>
            </div>
            <div className="flex justify-between text-xl">
              <span className="font-bold text-gray-900">Total:</span>
              <span className="font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                {currency === 'USD' ? `USD $${(total / 17).toFixed(2)}` : `MXN $${total.toFixed(2)}`}
              </span>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-900 mb-3">Método de Pago</label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setPaymentMethod('cash')}
                disabled={loading || success}
                className={`p-4 rounded-xl flex flex-col items-center gap-2 transition-all transform hover:scale-105 ${
                  paymentMethod === 'cash'
                    ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/50'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                <DollarSign size={24} strokeWidth={2.5} />
                <span className="text-xs font-semibold">Efectivo</span>
              </button>

              <button
                onClick={() => setPaymentMethod('card')}
                disabled={loading || success}
                className={`p-4 rounded-xl flex flex-col items-center gap-2 transition-all transform hover:scale-105 ${
                  paymentMethod === 'card'
                    ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/50'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                <CreditCard size={24} strokeWidth={2.5} />
                <span className="text-xs font-semibold">Tarjeta</span>
              </button>

              <button
                onClick={() => setPaymentMethod('transfer')}
                disabled={loading || success}
                className={`p-4 rounded-xl flex flex-col items-center gap-2 transition-all transform hover:scale-105 ${
                  paymentMethod === 'transfer'
                    ? 'bg-gradient-to-br from-purple-500 to-violet-600 text-white shadow-lg shadow-purple-500/50'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                <CreditCard size={24} strokeWidth={2.5} />
                <span className="text-xs font-semibold">Transferencia</span>
              </button>
            </div>
          </div>

          {/* Tip Selection */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-900 mb-3">Propina (opcional)</label>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {tipPercentages.map(percentage => (
                <button
                  key={percentage}
                  onClick={() => {
                    const amount = (orderTotal * percentage) / 100
                    handleTipChange(amount)
                    setTipPercentage(percentage)
                  }}
                  disabled={loading || success}
                  className={`py-2 rounded-lg font-semibold text-sm transition-all ${
                    tipPercentage === percentage
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  {percentage}%
                </button>
              ))}
              <button
                onClick={() => setTipPercentage(0)}
                disabled={loading || success}
                className={`py-2 rounded-lg font-semibold text-sm transition-all ${
                  tipPercentage === 0
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                Otro
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                value={tipAmount || ''}
                onChange={e => handleTipChange(parseFloat(e.target.value) || 0)}
                disabled={loading || success}
                placeholder="Monto personalizado"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

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
              <p className="text-xs text-blue-600 mt-1">Puedes dividir la cuenta después de pagar si es necesario</p>
            </div>
          )}

          {/* Action Buttons */}
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
                  <>Pagar ${total.toFixed(2)}</>
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
                  tip: 0,
                  tipCurrency: 'MXN',
                  total: 0,
                  splitRequested: true,
                })}
                disabled={loading || success}
                className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Users size={18} />
                Dividir Cuenta (antes de completar)
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
