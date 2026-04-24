import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/config/supabase'
import { getPlanPrice, getPlanDisplayName, type PlanType } from '@/config/plans'
import cryptoPaymentService from '@/services/cryptoPaymentService'
import { ShieldCheck, CreditCard, Bitcoin, ArrowLeft, Check, Loader2, Copy, ExternalLink } from 'lucide-react'

export default function Payment() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null)
  const [cryptoPayment, setCryptoPayment] = useState<{
    walletAddress: string
    amount: number
    referenceId: string
    expiresAt: Date
  } | null>(null)
  const [copied, setCopied] = useState(false)
  const [checkingPayment, setCheckingPayment] = useState(false)

  const plan = (searchParams.get('plan') || 'starter') as PlanType
  const price = getPlanPrice(plan)

  const copyAddress = async () => {
    if (cryptoPayment?.walletAddress) {
      await navigator.clipboard.writeText(cryptoPayment.walletAddress)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleCryptoPayment = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        navigate('/login')
        return
      }

      const payment = await cryptoPaymentService.createPayment({
        plan,
        userId: session.user.id
      })

      setCryptoPayment(payment)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const checkCryptoPayment = async () => {
    if (!cryptoPayment) return
    
    setCheckingPayment(true)
    try {
      const status = await cryptoPaymentService.checkPaymentStatus(cryptoPayment.referenceId)
      
      if (status.status === 'completed' || status.status === 'confirmed') {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          await cryptoPaymentService.completePayment(
            cryptoPayment.referenceId,
            session.user.id,
            plan
          )
        }
        setSuccess(true)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setCheckingPayment(false)
    }
  }

  useEffect(() => {
    if (cryptoPayment && !success) {
      const interval = setInterval(checkCryptoPayment, 10000)
      return () => clearInterval(interval)
    }
  }, [cryptoPayment, success])

  const handleCardPayment = async () => {
    setLoading(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        navigate('/login')
        return
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mercadopago-webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: 'create_preference',
          plan,
          userId: session.user.id
        })
      })

      if (!response.ok) throw new Error('Error creando preferencia de pago')

      const { init_point } = await response.json()
      
      if (init_point) {
        window.location.href = init_point
      } else {
        setSuccess(true)
      }
    } catch (err: any) {
      setError(err.message || 'Error procesando el pago')
    } finally {
      setLoading(false)
    }
  }

  const handlePayment = () => {
    if (selectedMethod === 'card') {
      handleCardPayment()
    } else if (selectedMethod === 'crypto') {
      handleCryptoPayment()
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#0B0B0B] flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-black text-white mb-4">¡Pago Recibido!</h1>
          <p className="text-gray-400 mb-8">
            Tu plan {getPlanDisplayName(plan)} se ha activado. Recibirás un correo de confirmación.
          </p>
          <button
            onClick={() => navigate('/admin')}
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 px-8 rounded-2xl transition-all"
          >
            Ir al Dashboard
          </button>
        </div>
      </div>
    )
  }

  if (cryptoPayment) {
    return (
      <div className="min-h-screen bg-[#0B0B0B] flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors"
          >
            <ArrowLeft size={20} />
            Volver
          </button>

          <div className="bg-gray-900 rounded-3xl border border-gray-800 p-8 shadow-2xl">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-500/20 mb-4">
                <Bitcoin className="w-8 h-8 text-orange-400" />
              </div>
              <h1 className="text-3xl font-black text-white mb-2">Pago con Solana</h1>
              <p className="text-gray-400">
                Envía <span className="text-orange-400 font-bold">{cryptoPayment.amount.toFixed(4)} SOL</span> 
                <br />a la siguiente dirección:
              </p>
            </div>

            <div className="bg-gray-800 rounded-2xl p-4 mb-6">
              <p className="text-xs text-gray-500 mb-2">Dirección del wallet</p>
              <div className="flex items-center gap-2">
                <code className="text-emerald-400 text-sm break-all flex-1">{cryptoPayment.walletAddress}</code>
                <button onClick={copyAddress} className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
                  <Copy size={18} className={copied ? 'text-emerald-400' : 'text-gray-400'} />
                </button>
              </div>
            </div>

            <div className="bg-gray-800 rounded-2xl p-4 mb-6">
              <p className="text-xs text-gray-500 mb-2">Monto a enviar</p>
              <p className="text-3xl font-black text-white">{cryptoPayment.amount.toFixed(4)} <span className="text-orange-400">SOL</span></p>
            </div>

            <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-4 mb-6">
              <p className="text-orange-400 text-sm text-center">
                ⚠️ No closes esta página hasta que el pago sea confirmado.
                <br />La confirmación puede tomar hasta 2 minutos.
              </p>
            </div>

            <button
              onClick={checkCryptoPayment}
              disabled={checkingPayment}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-700 text-white font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all"
            >
              {checkingPayment ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Verificar Pago
                </>
              )}
            </button>

            <p className="mt-6 text-center text-gray-500 text-xs">
              Puedes verificar manualmente en{' '}
              <a 
                href={`https://explorer.solana.com/address/${cryptoPayment.walletAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:underline inline-flex items-center gap-1"
              >
                Solana Explorer
                <ExternalLink size={12} />
              </a>
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0B0B0B] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft size={20} />
          Volver
        </button>

        <div className="bg-gray-900 rounded-3xl border border-gray-800 p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/20 mb-4">
              <ShieldCheck className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-3xl font-black text-white mb-2">Confirmar Pago</h1>
            <p className="text-gray-400">
              Plan <span className="text-emerald-400 font-bold">{getPlanDisplayName(plan)}</span>
            </p>
          </div>

          <div className="bg-gray-800/50 rounded-2xl p-6 mb-8">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Plan {getPlanDisplayName(plan)}</span>
              <span className="text-3xl font-black text-white">${price} <span className="text-lg text-gray-500">MXN</span></span>
            </div>
          </div>

          <h2 className="text-sm font-bold text-gray-400 uppercase mb-4">Método de Pago</h2>
          
          <div className="space-y-3 mb-8">
            <button
              onClick={() => setSelectedMethod('card')}
              className={`w-full p-4 rounded-2xl border transition-all flex items-center gap-4 ${
                selectedMethod === 'card'
                  ? 'bg-emerald-500/20 border-emerald-500/50'
                  : 'bg-gray-800 border-gray-700 hover:border-gray-600'
              }`}
            >
              <CreditCard className="w-6 h-6 text-gray-400" />
              <span className="font-bold text-white">Tarjeta (MercadoPago)</span>
              {selectedMethod === 'card' && <Check className="w-5 h-5 text-emerald-400 ml-auto" />}
            </button>

            <button
              onClick={() => setSelectedMethod('crypto')}
              className={`w-full p-4 rounded-2xl border transition-all flex items-center gap-4 ${
                selectedMethod === 'crypto'
                  ? 'bg-orange-500/20 border-orange-500/50'
                  : 'bg-gray-800 border-gray-700 hover:border-gray-600'
              }`}
            >
              <Bitcoin className="w-6 h-6 text-gray-400" />
              <span className="font-bold text-white">Criptomonedas (Solana)</span>
              {selectedMethod === 'crypto' && <Check className="w-5 h-5 text-orange-400 ml-auto" />}
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-500/50 rounded-2xl text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          <button
            onClick={handlePayment}
            disabled={loading || !selectedMethod}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5" />
                Pagar ${price} MXN
              </>
            )}
          </button>
        </div>

        <p className="mt-6 text-center text-gray-500 text-xs">
          Pagos seguros • MercadoPago y Solana aceptados
        </p>
      </div>
    </div>
  )
}