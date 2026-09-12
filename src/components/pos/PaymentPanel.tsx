import { useState } from 'react'
import logger from '@/utils/logger'
import mercadopagoService from '@/services/mercadopagoService'
import clipPinpadService from '@/services/clipPinpadService'
import { CheckCircle, CreditCard, DollarSign, Loader2, Users, X, Smartphone } from 'lucide-react'
import { usePlanLimits } from '@/hooks/usePlanLimits'

export interface PaymentResult {
  transactionId: string
  paymentMethod: 'cash' | 'card_mercadopago' | 'card' | 'clip'
  currency?: 'MXN' | 'USD'
  total: number
  splitRequested?: boolean
  authCode?: string
  last4?: string
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

  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card_mercadopago' | 'card' | 'clip'>('cash')
  const { canUseFeature } = usePlanLimits()
  const [currency, setCurrency] = useState<'MXN' | 'USD'>('MXN')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [clipStatusMessage, setClipStatusMessage] = useState<string | null>(null)
  const [mercadopagoUrl, setMercadopagoUrl] = useState<string | null>(null)
  const [mercadopagoId, setMercadopagoId] = useState('')

  const handlePayment = async () => {
    try {
      setLoading(true)
      setError(null)
      setClipStatusMessage(null)

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
      } else if (paymentMethod === 'clip') {
        setClipStatusMessage(`Enviando $${finalTotal.toFixed(2)} MXN a Clip Total 3...`)
        const shortOrderId = ids[0] ? ids[0].slice(-4) : Date.now().toString().slice(-4)
        const reference = `REIS-TK${tableNumber}-${shortOrderId}`

        const pinpadResp = await clipPinpadService.createPayment(finalTotal, reference)

        if (!pinpadResp || !pinpadResp.pinpad_request_id) {
          throw new Error(pinpadResp?.message || 'No se pudo comunicar con Clip Total 3. Verifica que esté en Modo PinPad.')
        }

        setClipStatusMessage('Esperando tarjeta en la terminal Clip...')
        logger.info('payment', 'Terminal Clip solicitada', { reference, pinpadRequestId: pinpadResp.pinpad_request_id })

        const result = await clipPinpadService.pollPayment(
          pinpadResp.pinpad_request_id,
          (status) => {
            if (status === 'PENDING') {
              setClipStatusMessage('💳 Inserte, deslice o acerque tarjeta en Clip Total 3...')
            } else if (status === 'PROCESSING' || status === 'IN_PROCESS') {
              setClipStatusMessage('⏳ Procesando cobro con el banco...')
            } else {
              setClipStatusMessage(`Terminal Clip: ${status}...`)
            }
          },
          90
        )

        if (result.status === 'PAID' || result.status === 'APPROVED') {
          setClipStatusMessage('✅ ¡Pago aprobado! Imprimiendo ticket...')
          setSuccess(true)
          setTimeout(() => {
            onPaymentComplete({
              transactionId: result.pinpad_request_id,
              paymentMethod: 'clip',
              currency,
              total: finalTotal,
              authCode: result.detail?.authorization_code,
              last4: result.detail?.last4,
            })
          }, 1200)
        } else {
          throw new Error(`El pago en la Terminal Clip no fue aprobado (Estado: ${result.status})`)
        }
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
      setClipStatusMessage(null)
    } finally {
      if (paymentMethod !== 'card_mercadopago') {
        setLoading(false)
      }
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  onClick={() => setPaymentMethod('cash')}
                  disabled={loading || success}
                  className={`p-3 rounded-xl flex flex-col items-center gap-1.5 transition-all ${paymentMethod === 'cash'
                    ? 'bg-emerald-600 text-white shadow-lg ring-2 ring-emerald-400'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                  <DollarSign size={22} strokeWidth={2.5} />
                  <span className="text-[11px] font-black uppercase tracking-tight text-center">Efectivo</span>
                </button>

                <button
                  onClick={() => setPaymentMethod('clip')}
                  disabled={loading || success}
                  className={`p-3 rounded-xl flex flex-col items-center gap-1.5 transition-all ${paymentMethod === 'clip'
                    ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg ring-2 ring-amber-400'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                  <Smartphone size={22} strokeWidth={2.5} />
                  <span className="text-[11px] font-black uppercase tracking-tight text-center leading-tight">Clip Total 3</span>
                </button>

                <button
                  onClick={() => setPaymentMethod('card')}
                  disabled={loading || success}
                  className={`p-3 rounded-xl flex flex-col items-center gap-1.5 transition-all ${paymentMethod === 'card'
                    ? 'bg-slate-900 text-white shadow-lg ring-2 ring-slate-400'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                  <CreditCard size={22} />
                  <span className="text-[11px] font-black uppercase tracking-tight text-center leading-tight">Tarjeta Ext.</span>
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
                    <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center">
                      <span className="text-[#00B1EA] font-black text-xs">M</span>
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-tight text-center leading-tight">Mercado Pago</span>
                  </button>
                ) : (
                  <button
                    disabled
                    className="p-3 rounded-xl flex flex-col items-center gap-1.5 bg-gray-50 text-gray-300 cursor-not-allowed relative"
                  >
                    <div className="w-6 h-6 bg-gray-200 rounded-lg flex items-center justify-center">
                      <span className="text-gray-400 font-black text-xs">M</span>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-tight text-center leading-tight">Mercado Pago</span>
                  </button>
                )}
              </div>

              {paymentMethod === 'clip' && !loading && !clipStatusMessage && (
                <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">💳</span>
                    <div>
                      <span className="font-bold block">Terminal Clip Total 3:</span>
                      <span className="text-[11px] text-amber-800">El monto exacto ($ {orderTotal.toFixed(2)} MXN) se enviará directamente a la pantalla de la terminal.</span>
                    </div>
                  </div>
                </div>
              )}

              {clipStatusMessage && (
                <div className="mt-3 p-3.5 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-orange-200 text-orange-950 text-xs animate-pulse">
                  <div className="flex items-center gap-2 font-black text-orange-700 mb-1">
                    <Loader2 size={16} className="animate-spin" />
                    <span>Conexión con Terminal Clip Total 3</span>
                  </div>
                  <p className="font-semibold text-[11px]">{clipStatusMessage}</p>
                </div>
              )}
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
                  className={`flex-1 px-6 py-4 rounded-xl font-bold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-white ${
                    paymentMethod === 'clip'
                      ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-orange-500/30'
                      : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-green-500/50'
                  }`}
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
                        : paymentMethod === 'clip'
                          ? `Enviar $${orderTotal.toFixed(2)} a Clip`
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