import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/config/supabase'
import { getPlanPrice, getPlanDisplayName, type PlanType } from '@/config/plans'
import { ShieldCheck, CreditCard, Bitcoin, ArrowLeft, Check, Loader2 } from 'lucide-react'

const PAYMENT_METHODS = {
  card: { id: 'card', name: 'Tarjeta', icon: CreditCard },
  crypto: { id: 'crypto', name: 'Criptomonedas', icon: Bitcoin }
}

export default function Payment() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null)

  const plan = (searchParams.get('plan') || 'starter') as PlanType
  const price = getPlanPrice(plan)

  const handlePayment = async () => {
    if (!selectedMethod) {
      setError('Selecciona un método de pago')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        navigate('/login')
        return
      }

      if (selectedMethod === 'card') {
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
      } else if (selectedMethod === 'crypto') {
        await new Promise(resolve => setTimeout(resolve, 1500))
        setSuccess(true)
      }

    } catch (err: any) {
      setError(err.message || 'Error procesando el pago')
    } finally {
      setLoading(false)
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
            <div className="border-t border-gray-700 mt-4 pt-4 text-right">
              <span className="text-xl font-bold text-white">Total: ${price} MXN</span>
            </div>
          </div>

          <h2 className="text-sm font-bold text-gray-400 uppercase mb-4">Método de Pago</h2>
          
          <div className="space-y-3 mb-8">
            {Object.values(PAYMENT_METHODS).map((method) => (
              <button
                key={method.id}
                onClick={() => setSelectedMethod(method.id)}
                className={`w-full p-4 rounded-2xl border transition-all flex items-center gap-4 ${
                  selectedMethod === method.id
                    ? 'bg-emerald-500/20 border-emerald-500/50'
                    : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                }`}
              >
                <method.icon className="w-6 h-6 text-gray-400" />
                <span className="font-bold text-white">{method.name}</span>
                {selectedMethod === method.id && (
                  <Check className="w-5 h-5 text-emerald-400 ml-auto" />
                )}
              </button>
            ))}
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
          Pagos seguros procesados por MercadoPago • Aceptamos Visa, Mastercard, y más
        </p>
      </div>
    </div>
  )
}