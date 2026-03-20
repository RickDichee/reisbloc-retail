import { useState, useEffect } from 'react'
import logger from '@/utils/logger'
import { X, DollarSign, Loader2, CheckCircle, CreditCard, Users, Smartphone, Zap } from 'lucide-react'
import mercadopagoService from '@/services/mercadopagoService'
import supabaseService from '@/services/supabaseService'
import { supabase } from '@/config/supabase'
import { OrderItem } from '@/types'
import { useAppStore } from '@/store/appStore'

export interface PaymentResult {
  transactionId: string
  paymentMethod: 'cash' | 'card' | 'transfer' | 'card_clip' | 'card_mp'
  currency?: 'MXN' | 'USD'
  total: number
  splitRequested?: boolean
}

interface PaymentPanelProps {
  orderTotal: number
  items: OrderItem[]
  orderId?: string
  orderIds?: string[]
  tableNumber: number
  onPaymentComplete: (result: PaymentResult) => void
  onCancel: () => void
}

export default function PaymentPanel({
  orderTotal,
  items,
  orderId,
  orderIds,
  tableNumber,
  onPaymentComplete,
  onCancel,
}: PaymentPanelProps) {
  // Support both old (orderId) and new (orderIds) interfaces
  const ids = orderIds || (orderId ? [orderId] : [])

  const { currentUser } = useAppStore()
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer' | 'card_clip' | 'card_mp'>('cash')
  const [currency, setCurrency] = useState<'MXN' | 'USD'>('MXN')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paidAmount, setPaidAmount] = useState(0)
  const [pendingSaleId, setPendingSaleId] = useState<string | null>(null)
  const [webhookWaiting, setWebhookWaiting] = useState(false)

  // Real-time subscription for payments
  useEffect(() => {
    if (!pendingSaleId) return

    logger.info('payment', 'Subscribing to payments for sale', pendingSaleId)

    const subscription = supabase
      .channel(`sale-payments-${pendingSaleId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'retail_sale_payments',
        filter: `sale_id=eq.${pendingSaleId}`
      }, (payload: any) => {
        const newPayment = payload.new
        logger.info('payment', 'New payment detected via Realtime', newPayment)
        setPaidAmount(prev => prev + Number(newPayment.amount))
      })
      .on('broadcast', { event: 'clip_payment' }, (payload: any) => {
        if (payload.payload.saleId === pendingSaleId) {
          logger.info('payment', 'Clip payment confirmed via Broadcast', payload.payload)
          setPaidAmount(prev => prev + Number(payload.payload.amount))
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [pendingSaleId])

  // Monitor total paid to auto-complete
  useEffect(() => {
    if (paidAmount > 0 && paidAmount >= orderTotal && !success) {
      setSuccess(true)
      setTimeout(() => {
        onPaymentComplete({
          transactionId: `multi-${pendingSaleId}`,
          paymentMethod,
          currency,
          total: paidAmount,
        })
      }, 1500)
    }
  }, [paidAmount, orderTotal, success, pendingSaleId, paymentMethod, currency, onPaymentComplete])

  const handlePayment = async () => {
    try {
      setLoading(true)
      setError(null)

      const finalTotal = orderTotal

      // Handle standard methods
      if (paymentMethod === 'cash') {
        const transactionId = `cash-${Date.now()}`

        // If we have a pending sale (e.g. partial Clip), we just add this payment
        if (pendingSaleId) {
          await supabaseService.addRetailPayment({
            saleId: pendingSaleId,
            method: 'cash',
            amount: finalTotal - paidAmount
          })
          // The useEffect will handle success state
        } else {
          // Direct legacy flow for pure cash
          setSuccess(true)
          setTimeout(() => {
            onPaymentComplete({
              transactionId,
              paymentMethod,
              currency,
              total: finalTotal,
            })
          }, 1500)
        }
      } else if (paymentMethod === 'card_clip') {
        // Init Clip flow
        if (!pendingSaleId) {
          try {
            setLoading(true)
            const newSaleId = await supabaseService.createPendingRetailSale({
              tableNumber,
              subtotal: orderTotal,
              total: orderTotal,
              saleBy: currentUser?.id || 'anonymous',
              notes: 'Pago Clip SMART MATCH pending'
            }, items)
            setPendingSaleId(newSaleId)
            setWebhookWaiting(true)
            logger.info('payment', 'Pending retail sale created for Clip match', newSaleId)
          } catch (err: any) {
            setError('Error al iniciar flujo Clip: ' + err.message)
          } finally {
            setLoading(false)
          }
        } else {
          setWebhookWaiting(true)
        }
      } else if (paymentMethod === 'card' || paymentMethod === 'card_mp' || paymentMethod === 'transfer') {
        // Existing MP logic or Manual Card
        try {
          const payment = await mercadopagoService.processDirectPayment({
            amount: finalTotal - paidAmount,
            description: `Venta ${tableNumber}`,
            orderId: ids[0] || 'retail',
            email: 'customer@reisbloc.com',
            paymentMethodId: paymentMethod
          })

          if (pendingSaleId) {
            await supabaseService.addRetailPayment({
              saleId: pendingSaleId,
              method: paymentMethod,
              amount: finalTotal - paidAmount,
              referenceId: payment.id
            })
          } else {
            setSuccess(true)
            setTimeout(() => {
              onPaymentComplete({
                transactionId: payment.id,
                paymentMethod: paymentMethod,
                currency,
                total: finalTotal,
              })
            }, 1500)
          }
        } catch (err: any) {
          logger.error('payment', 'Payment processing error', err as any)
          throw err
        }
      }
    } catch (err: any) {
      const msg = err?.message || 'Error al procesar pago'
      logger.error('payment', 'Payment error', msg)
      setError(msg)
    } finally {
      if (paymentMethod !== 'card_clip') {
        setLoading(false)
      }
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
              <h2 className="text-2xl font-bold text-white">Procesar Pago</h2>
              <p className="text-blue-100 text-sm mt-1">Cuenta {tableNumber}</p>
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
                  ${(orderTotal - paidAmount).toFixed(2)}
                </p>
              </div>
              {paidAmount > 0 && (
                <div className="text-right">
                  <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Pagado</p>
                  <p className="text-xl font-bold text-emerald-300">
                    ${paidAmount.toFixed(2)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-900 mb-3">Método de Pago</label>
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => setPaymentMethod('cash')}
                disabled={loading || success}
                className={`p-3 rounded-xl flex flex-col items-center gap-1.5 transition-all ${paymentMethod === 'cash'
                  ? 'bg-emerald-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600'
                  }`}
              >
                <DollarSign size={20} strokeWidth={2.5} />
                <span className="text-[10px] font-black uppercase">Efectivo</span>
              </button>

              <button
                onClick={() => setPaymentMethod('card_clip')}
                disabled={loading || success}
                className={`p-3 rounded-xl flex flex-col items-center gap-1.5 transition-all ${paymentMethod === 'card_clip'
                  ? 'bg-orange-500 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600'
                  }`}
              >
                <Zap size={20} className={webhookWaiting ? 'animate-pulse' : ''} />
                <span className="text-[10px] font-black uppercase tracking-tighter text-center">Clip Terminal</span>
              </button>

              <button
                onClick={() => setPaymentMethod('card_mp')}
                disabled={loading || success}
                className={`p-3 rounded-xl flex flex-col items-center gap-1.5 transition-all ${paymentMethod === 'card_mp'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600'
                  }`}
              >
                <Smartphone size={20} />
                <span className="text-[10px] font-black uppercase text-center">Mercado Pago</span>
              </button>

              <button
                onClick={() => setPaymentMethod('transfer')}
                disabled={loading || success}
                className={`p-3 rounded-xl flex flex-col items-center gap-1.5 transition-all ${paymentMethod === 'transfer'
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600'
                  }`}
              >
                <CreditCard size={20} />
                <span className="text-[10px] font-black uppercase tracking-tighter text-center">Transfer</span>
              </button>
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
            </div>
          )}

          {/* Webhook / Smart Match Waiting View */}
          {webhookWaiting && (
            <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-xl animate-pulse">
              <div className="flex items-center gap-3">
                <Loader2 size={24} className="animate-spin text-orange-600" />
                <div>
                  <p className="text-sm font-black text-orange-900 uppercase">Esperando Terminal Clip...</p>
                  <p className="text-xs text-orange-700">Ingrese el monto en su Clip Plus 2. La venta se liberará automáticamente al recibir el pago.</p>
                </div>
              </div>
            </div>
          )}

          {/* Mercado Pago QR View */}
          {paymentMethod === 'card_mp' && !success && (
            <div className="mb-6 bg-blue-50 p-6 rounded-2xl border-2 border-dashed border-blue-200 flex flex-col items-center">
              <div className="w-40 h-40 bg-white rounded-xl shadow-md flex items-center justify-center border border-blue-100 mb-4 relative overflow-hidden">
                {/* Mock QR - In production, this would be an SVG from MP API */}
                <div className="grid grid-cols-4 grid-rows-4 gap-1 w-32 h-32 opacity-20">
                  {[...Array(16)].map((_, i) => <div key={i} className="bg-blue-900 rounded-sm" />)}
                </div>
                <Smartphone size={48} className="absolute text-blue-600 animate-bounce" />
              </div>
              <p className="text-xs font-black text-blue-800 uppercase tracking-widest">Escanee para Pagar</p>
              <p className="text-[10px] text-blue-600 font-bold mt-1">Mercado Pago QR Dinámico</p>
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
                  <>Pagar ${orderTotal.toFixed(2)}</>
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
                Dividir Cuenta (antes de completar)
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
