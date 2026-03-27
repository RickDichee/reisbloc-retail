import { useState, useEffect } from 'react'
import { X, Copy, Check, Loader2, QrCode, Wallet, ArrowRight, Clock, AlertCircle, CheckCircle2, ExternalLink } from 'lucide-react'
import { useTokens, TokenPackage } from '@/hooks/useTokens'
import { useTokenPurchase } from '@/hooks/useTokenPurchase'

interface TokenPurchaseModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

const PACKAGES: Partial<TokenPackage>[] = [
  { id: 'launch_tokens', name: 'Launch', tokens: 500, price_mxn: 99, price_usd: 5.50 },
  { id: 'growth_tokens', name: 'Growth', tokens: 2000, price_mxn: 299, price_usd: 16.50 },
  { id: 'scale_tokens', name: 'Scale', tokens: 5000, price_mxn: 599, price_usd: 33.00 },
  { id: 'pro_tokens', name: 'Pro', tokens: 15000, price_mxn: 1299, price_usd: 72.00 },
  { id: 'enterprise_tokens', name: 'Enterprise', tokens: 50000, price_mxn: 3499, price_usd: 194.00 },
]

export default function TokenPurchaseModal({ isOpen, onClose, onSuccess }: TokenPurchaseModalProps) {
  const [step, setStep] = useState<'select' | 'payment' | 'waiting' | 'success'>('select')
  const [selectedPackage, setSelectedPackage] = useState<Partial<TokenPackage> | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'crypto' | 'spei'>('crypto')
  const [copied, setCopied] = useState(false)
  
  const { createSolanaPayment, createSpeiPayment, checkPaymentStatus, clearPayment, loading, error, currentPayment } = useTokenPurchase()
  const { fetchBalance } = useTokens()

  useEffect(() => {
    if (!isOpen) {
      setStep('select')
      setSelectedPackage(null)
      clearPayment()
    }
  }, [isOpen])

  useEffect(() => {
    if (currentPayment) {
      setStep('payment')
    }
  }, [currentPayment])

  const handleSelectPackage = (pkg: Partial<TokenPackage>) => {
    setSelectedPackage(pkg)
  }

  const handleCryptoPayment = async () => {
    if (!selectedPackage) return
    
    const result = await createSolanaPayment(
      selectedPackage.tokens!,
      selectedPackage.price_mxn!
    )
    
    if (result) {
      setStep('waiting')
      startPaymentCheck(result.reference)
    }
  }

  const handleSpeiPayment = async () => {
    if (!selectedPackage) return
    
    const result = await createSpeiPayment(
      selectedPackage.tokens!,
      selectedPackage.price_mxn!
    )
    
    if (result) {
      setStep('waiting')
    }
  }

  const startPaymentCheck = (reference: string) => {
    const checkInterval = setInterval(async () => {
      const status = await checkPaymentStatus(undefined, reference)
      
      if (status?.status === 'completed') {
        clearInterval(checkInterval)
        setStep('success')
        await fetchBalance()
        onSuccess?.()
      }
    }, 3000)

    return () => clearInterval(checkInterval)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleClose = () => {
    if (step === 'success') {
      onSuccess?.()
    }
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
      
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black">Recargar Tokens</h2>
              <p className="text-sm text-slate-300 mt-1">Elige tu paquete y método de pago</p>
            </div>
            <button onClick={handleClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {step === 'select' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                {PACKAGES.map((pkg) => (
                  <button
                    key={pkg.id}
                    onClick={() => handleSelectPackage(pkg)}
                    className={`p-4 rounded-2xl border-2 transition-all text-left ${
                      selectedPackage?.id === pkg.id
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-black text-slate-500 uppercase">{pkg.name}</span>
                      <span className="text-lg font-black text-slate-900">{pkg.tokens?.toLocaleString()}</span>
                    </div>
                    <div className="text-2xl font-black text-indigo-600">${pkg.price_mxn}</div>
                    <div className="text-xs text-slate-400">${pkg.price_usd} USD</div>
                    {pkg.id === 'growth' && (
                      <span className="inline-block mt-2 text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                        Más popular
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {selectedPackage && (
                <div className="space-y-3">
                  <div className="p-4 bg-slate-50 rounded-2xl">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-slate-600">Paquete seleccionado</span>
                      <span className="font-black text-slate-900">{selectedPackage.tokens?.toLocaleString()} tokens</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-slate-900">Total a pagar</span>
                      <span className="text-2xl font-black text-indigo-600">${selectedPackage.price_mxn} MXN</span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setPaymentMethod('crypto')}
                      className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                        paymentMethod === 'crypto'
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                          <QrCode size={20} className="text-white" />
                        </div>
                        <div className="text-left">
                          <div className="font-bold text-slate-900">USDC/SOL</div>
                          <div className="text-xs text-slate-500">Pago instantáneo</div>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => setPaymentMethod('spei')}
                      className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                        paymentMethod === 'spei'
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                          <Wallet size={20} className="text-white" />
                        </div>
                        <div className="text-left">
                          <div className="font-bold text-slate-900">SPEI</div>
                          <div className="text-xs text-slate-500">Transferencia bancaria</div>
                        </div>
                      </div>
                    </button>
                  </div>

                  <button
                    onClick={paymentMethod === 'crypto' ? handleCryptoPayment : handleSpeiPayment}
                    disabled={loading}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 text-white font-black rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      <>
                        {paymentMethod === 'crypto' ? 'Generar QR de Pago' : 'Generar Referencia SPEI'}
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>

                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                      {error}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {step === 'payment' && currentPayment && (
            <div className="text-center">
              {currentPayment.type === 'crypto' ? (
                <>
                  <div className="w-48 h-48 mx-auto bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                    <QrCode size={120} className="text-slate-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Escanea con tu wallet</h3>
                  <p className="text-sm text-slate-500 mb-4">
                    Usa Phantom, Solflare o cualquier wallet compatible con Solana Pay
                  </p>
                  
                  <div className="p-4 bg-slate-50 rounded-xl mb-4">
                    <div className="text-3xl font-black text-indigo-600 mb-1">
                      ${currentPayment.amountUsdc?.toFixed(2)} USDC
                    </div>
                    <div className="text-sm text-slate-500">
                      {currentPayment.tokens.toLocaleString()} tokens
                    </div>
                  </div>

                  <a
                    href={currentPayment.solanaPayUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-colors mb-4"
                  >
                    <ExternalLink size={16} />
                    Abrir en Wallet
                  </a>

                  <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                    <Clock size={14} />
                    <span>Expira en 30 minutos</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-4">
                    <Wallet size={32} className="text-blue-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Transferencia SPEI</h3>
                  <p className="text-sm text-slate-500 mb-4">
                    Realiza la transferencia desde tu banco
                  </p>

                  <div className="space-y-3 mb-4">
                    <div className="p-3 bg-slate-50 rounded-xl text-left">
                      <div className="text-xs text-slate-500 mb-1">Banco</div>
                      <div className="font-bold text-slate-900">{currentPayment.bank}</div>
                    </div>
                    
                    <div className="p-3 bg-slate-50 rounded-xl text-left">
                      <div className="text-xs text-slate-500 mb-1">CLABE</div>
                      <div className="flex items-center justify-between">
                        <div className="font-mono font-bold text-slate-900">{currentPayment.clabe}</div>
                        <button
                          onClick={() => copyToClipboard(currentPayment.clabe!)}
                          className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                          {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                        </button>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl text-left">
                      <div className="text-xs text-slate-500 mb-1">Concepto</div>
                      <div className="font-bold text-slate-900">{currentPayment.concept}</div>
                    </div>

                    <div className="p-4 bg-indigo-50 rounded-xl border-2 border-indigo-200">
                      <div className="text-3xl font-black text-indigo-600">
                        ${currentPayment.amountMxn.toLocaleString()} MXN
                      </div>
                      <div className="text-sm text-slate-500">
                        {currentPayment.tokens.toLocaleString()} tokens
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-2 text-sm text-amber-600 bg-amber-50 p-3 rounded-xl">
                    <AlertCircle size={16} />
                    <span>El pago puede tomar 24-48 horas en confirmarse</span>
                  </div>
                </>
              )}

              <button
                onClick={() => setStep('select')}
                className="mt-4 text-sm text-slate-500 hover:text-slate-700"
              >
                ← Volver a seleccionar
              </button>
            </div>
          )}

          {step === 'waiting' && currentPayment && (
            <div className="text-center py-8">
              <Loader2 size={48} className="animate-spin text-indigo-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-900 mb-2">Esperando confirmación...</h3>
              <p className="text-sm text-slate-500 mb-4">
                {currentPayment.type === 'crypto' 
                  ? 'El pago se confirmará automáticamente en segundos'
                  : 'Te notificaremos cuando recibamos tu transferencia'
                }
              </p>
              
              <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                <span>Verificando blockchain...</span>
              </div>

              <button
                onClick={() => setStep('select')}
                className="mt-6 text-sm text-slate-500 hover:text-slate-700"
              >
                Cancelar y volver
              </button>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={48} className="text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">¡Tokens acreditados!</h3>
              <p className="text-slate-500 mb-4">
                Tu compra fue procesada correctamente
              </p>
              
              <div className="p-4 bg-emerald-50 rounded-xl mb-6">
                <div className="text-sm text-slate-500">Tokens recibidos</div>
                <div className="text-3xl font-black text-emerald-600">
                  +{currentPayment?.tokens.toLocaleString()}
                </div>
              </div>

              <button
                onClick={handleClose}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-white font-black rounded-xl transition-colors"
              >
                Continuar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
