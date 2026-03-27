import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import { usePlanLimits } from '@/hooks/usePlanLimits'
import { useMercadoPagoSubscription } from '@/hooks/useMercadoPagoSubscription'
import DashboardLayout from '@/components/layout/DashboardLayout'
import {
  Check,
  X,
  Crown,
  Sparkles,
  Zap,
  Star,
  Building,
  CreditCard,
  Shield,
  Loader2
} from 'lucide-react'
import { PlanType } from '@/config/plans'

const PLAN_FEATURES = {
  free: {
    label: 'Free',
    description: 'Perfecto para empezar',
    icon: Star,
    color: 'slate',
    price: 0,
    popular: false,
    features: [
      { text: 'Punto de Venta básico', included: true },
      { text: '50 productos', included: true },
      { text: '3 empleados', included: true },
      { text: '1 caja', included: true },
      { text: 'Reportes básicos', included: true },
      { text: '20 queries AI/día', included: true },
      { text: 'Inventario', included: true },
      { text: 'Clientes', included: true },
      { text: 'Reportes avanzados', included: false },
      { text: 'Múltiples cajas', included: false },
      { text: 'API Access', included: false },
      { text: 'Soporte prioritario', included: false },
    ]
  },
  starter: {
    label: 'Launch',
    description: 'Todo lo que necesitas para crecer',
    icon: Zap,
    color: 'indigo',
    price: 149,
    popular: true,
    features: [
      { text: 'Punto de Venta completo', included: true },
      { text: '500 productos', included: true },
      { text: '5 empleados', included: true },
      { text: '3 cajas', included: true },
      { text: 'Reportes básicos', included: true },
      { text: '100 queries AI/día', included: true },
      { text: 'Inventario avanzado', included: true },
      { text: 'Gestión de clientes', included: true },
      { text: 'Reportes avanzados', included: true },
      { text: 'Múltiples cajas', included: false },
      { text: 'API Access', included: false },
      { text: 'Soporte por email', included: true },
    ]
  },
  growth: {
    label: 'Growth',
    description: 'Para negocios en expansión',
    icon: Sparkles,
    color: 'emerald',
    price: 399,
    popular: false,
    features: [
      { text: 'Punto de Venta completo', included: true },
      { text: '2,000 productos', included: true },
      { text: '15 empleados', included: true },
      { text: '5 cajas', included: true },
      { text: 'Reportes ilimitados', included: true },
      { text: '500 queries AI/día', included: true },
      { text: 'Inventario inteligente', included: true },
      { text: 'CRM completo', included: true },
      { text: 'E-commerce incluido', included: true },
      { text: 'Múltiples cajas', included: true },
      { text: 'API Access', included: false },
      { text: 'Soporte prioritario', included: true },
    ]
  },
  scale: {
    label: 'Scale',
    description: 'El paquete completo',
    icon: Crown,
    color: 'amber',
    price: 799,
    popular: false,
    features: [
      { text: 'Todo en Growth', included: true },
      { text: 'Productos ilimitados', included: true },
      { text: 'Empleados ilimitados', included: true },
      { text: 'Cajas ilimitadas', included: true },
      { text: 'AI ilimitado', included: true },
      { text: 'Multi-sucursal (3)', included: true },
      { text: 'API Access', included: true },
      { text: 'White Label', included: false },
      { text: 'Soporte dedicado', included: true },
      { text: 'Onboarding personalizado', included: true },
    ]
  },
  enterprise: {
    label: 'Enterprise',
    description: 'Solución a medida',
    icon: Building,
    color: 'purple',
    price: null,
    popular: false,
    features: [
      { text: 'Todo en Scale', included: true },
      { text: 'Sucursales ilimitadas', included: true },
      { text: 'White Label', included: true },
      { text: 'Integraciones custom', included: true },
      { text: 'SLA garantizado', included: true },
      { text: 'Cuenta dedicada', included: true },
      { text: 'Capacitación incluido', included: true },
    ]
  }
}

export default function Pricing() {
  const navigate = useNavigate()
  const { currentUser } = useAppStore()
  const { plan } = usePlanLimits()
  const { createSubscription, loading } = useMercadoPagoSubscription()

  const handleSubscribe = async (planId: PlanType) => {
    if (!currentUser) {
      navigate('/register')
      return
    }

    if (planId === 'free') {
      navigate('/register')
      return
    }

    if (planId === 'enterprise') {
      window.open('mailto:ventas@reisbloc.store?subject=Interés%20en%20Reisbloc%20Enterprise', '_blank')
      return
    }

    try {
      const result = await createSubscription(planId)
      if (result?.init_point) {
        window.location.href = result.init_point
      }
    } catch (err) {
      console.error('Error creating subscription:', err)
    }
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-12 px-4">
        {/* Header */}
        <div className="max-w-7xl mx-auto text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-full text-sm font-bold mb-6">
            <Zap size={16} />
            Launch Special - Precios de lanzamiento
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4">
            Elige tu plan
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Empieza gratis y escala cuando tu negocio lo requiera. Sin contratos, cancela cuando quieras.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {/* Free */}
            <div className={`bg-white rounded-3xl p-6 border-2 border-slate-200 shadow-sm`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-slate-100 rounded-xl">
                  <Star size={24} className="text-slate-600" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Free</h3>
                  <p className="text-sm text-slate-500">Para empezar</p>
                </div>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-black text-slate-900">$0</span>
                <span className="text-slate-500">/mes</span>
              </div>
              <button
                onClick={() => navigate('/register')}
                className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors mb-6"
              >
                Empezar gratis
              </button>
              <ul className="space-y-3">
                {PLAN_FEATURES.free.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    {f.included ? (
                      <Check size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                    ) : (
                      <X size={16} className="text-slate-300 mt-0.5 shrink-0" />
                    )}
                    <span className={f.included ? 'text-slate-700' : 'text-slate-400'}>{f.text}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Launch (Popular) */}
            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-6 text-white relative shadow-xl shadow-indigo-500/20 transform scale-105">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-amber-400 text-slate-900 text-xs font-black rounded-full uppercase tracking-wider">
                Más Popular
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-white/20 rounded-xl">
                  <Zap size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-black">Launch</h3>
                  <p className="text-sm text-indigo-200">Todo lo que necesitas</p>
                </div>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-black">$149</span>
                <span className="text-indigo-200">/mes</span>
              </div>
              <button
                onClick={() => handleSubscribe('starter')}
                disabled={loading || plan === 'starter'}
                className="w-full py-3 px-4 bg-white text-indigo-600 hover:bg-indigo-50 font-bold rounded-xl transition-colors mb-6 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : null}
                {plan === 'starter' ? 'Plan Actual' : 'Comenzar ahora'}
              </button>
              <ul className="space-y-3">
                {PLAN_FEATURES.starter.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    {f.included ? (
                      <Check size={16} className="text-emerald-300 mt-0.5 shrink-0" />
                    ) : (
                      <X size={16} className="text-indigo-400 mt-0.5 shrink-0" />
                    )}
                    <span className={f.included ? 'text-white' : 'text-indigo-300'}>{f.text}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Growth */}
            <div className="bg-white rounded-3xl p-6 border-2 border-emerald-200 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-emerald-100 rounded-xl">
                  <Sparkles size={24} className="text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Growth</h3>
                  <p className="text-sm text-slate-500">Para crecer</p>
                </div>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-black text-slate-900">$399</span>
                <span className="text-slate-500">/mes</span>
              </div>
              <button
                onClick={() => handleSubscribe('growth')}
                disabled={loading || plan === 'growth'}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors mb-6 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : null}
                {plan === 'growth' ? 'Plan Actual' : 'Elegir Growth'}
              </button>
              <ul className="space-y-3">
                {PLAN_FEATURES.growth.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    {f.included ? (
                      <Check size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                    ) : (
                      <X size={16} className="text-slate-300 mt-0.5 shrink-0" />
                    )}
                    <span className={f.included ? 'text-slate-700' : 'text-slate-400'}>{f.text}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Scale */}
            <div className="bg-white rounded-3xl p-6 border-2 border-amber-200 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-amber-100 rounded-xl">
                  <Crown size={24} className="text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Scale</h3>
                  <p className="text-sm text-slate-500">Paquete completo</p>
                </div>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-black text-slate-900">$799</span>
                <span className="text-slate-500">/mes</span>
              </div>
              <button
                onClick={() => handleSubscribe('scale')}
                disabled={loading || plan === 'scale'}
                className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-colors mb-6 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : null}
                {plan === 'scale' ? 'Plan Actual' : 'Elegir Scale'}
              </button>
              <ul className="space-y-3">
                {PLAN_FEATURES.scale.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    {f.included ? (
                      <Check size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                    ) : (
                      <X size={16} className="text-slate-300 mt-0.5 shrink-0" />
                    )}
                    <span className={f.included ? 'text-slate-700' : 'text-slate-400'}>{f.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Enterprise CTA */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-purple-500/20 rounded-2xl">
                <Building size={32} className="text-purple-400" />
              </div>
              <div>
                <h3 className="text-2xl font-black">¿Necesitas una solución a medida?</h3>
                <p className="text-slate-400">Enterprise con funcionalidades custom, integraciones y soporte dedicado.</p>
              </div>
            </div>
            <button
              onClick={() => window.open('mailto:ventas@reisbloc.store?subject=Interés%20en%20Reisbloc%20Enterprise', '_blank')}
              className="px-8 py-4 bg-white text-slate-900 font-bold rounded-xl hover:bg-slate-100 transition-colors whitespace-nowrap"
            >
              Contactar ventas
            </button>
          </div>

          {/* FAQ / Trust */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="p-6 bg-white rounded-2xl border border-slate-100">
              <CreditCard size={32} className="mx-auto text-indigo-600 mb-3" />
              <h4 className="font-bold text-slate-900 mb-2">Pagos seguros</h4>
              <p className="text-sm text-slate-500">Procesamos tus pagos con MercadoPago, el método más seguro en México.</p>
            </div>
            <div className="p-6 bg-white rounded-2xl border border-slate-100">
              <Shield size={32} className="mx-auto text-emerald-600 mb-3" />
              <h4 className="font-bold text-slate-900 mb-2">Sin compromiso</h4>
              <p className="text-sm text-slate-500">Cancela cuando quieras. Sin contratos ni penalizaciones.</p>
            </div>
            <div className="p-6 bg-white rounded-2xl border border-slate-100">
              <Sparkles size={32} className="mx-auto text-amber-500 mb-3" />
              <h4 className="font-bold text-slate-900 mb-2">Setup en minutos</h4>
              <p className="text-sm text-slate-500">Crea tu cuenta y empieza a vender en menos de 5 minutos.</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
