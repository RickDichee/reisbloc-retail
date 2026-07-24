import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import { useBranches } from '@/hooks/useBranches'
import {
  Store,
  Users,
  Package,
  CreditCard,
  Check,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  BarChart3,
  Smartphone
} from 'lucide-react'
import { PlanType } from '@/config/plans'
import { supabase } from '@/config/supabase'

const STEPS = [
  {
    id: 1,
    title: '¡Bienvenido a Reisbloc!',
    subtitle: 'Configuremos tu negocio en 2 minutos',
    icon: Sparkles,
    color: 'indigo',
    fields: []
  },
  {
    id: 2,
    title: 'Tu Negocio',
    subtitle: '¿Cómo se llama tu tienda?',
    icon: Store,
    color: 'emerald',
    fields: [
      { name: 'storeName', label: 'Nombre de tu negocio', placeholder: 'Ej: Tienda Don José', type: 'text', required: true },
      { name: 'storeType', label: 'Tipo de negocio', placeholder: 'Ej: Ropa, Abarrotes, Ferretería', type: 'text', required: false }
    ]
  },
  {
    id: 3,
    title: 'Productos',
    subtitle: '¿Cuántos productos manejas aproximadamente?',
    icon: Package,
    color: 'amber',
    fields: [
      { 
        name: 'productCount', 
        label: 'Cantidad de productos', 
        type: 'select', 
        required: true,
        options: [
          { value: '1-50', label: 'Menos de 50' },
          { value: '50-200', label: '50 - 200' },
          { value: '200-500', label: '200 - 500' },
          { value: '500-1000', label: '500 - 1,000' },
          { value: '1000+', label: 'Más de 1,000' }
        ]
      }
    ]
  },
  {
    id: 4,
    title: 'Tu Equipo',
    subtitle: '¿Cuántas personas usan el sistema?',
    icon: Users,
    color: 'purple',
    fields: [
      { 
        name: 'teamSize', 
        label: 'Número de empleados', 
        type: 'select', 
        required: true,
        options: [
          { value: '1', label: 'Solo yo' },
          { value: '2-5', label: '2 - 5 personas' },
          { value: '5-10', label: '5 - 10 personas' },
          { value: '10+', label: 'Más de 10' }
        ]
      }
    ]
  },
  {
    id: 5,
    title: '¿Cómo cobras?',
    subtitle: 'Selecciona tus métodos de pago',
    icon: CreditCard,
    color: 'emerald',
    fields: [
      { 
        name: 'paymentMethods', 
        label: 'Métodos de pago aceptados', 
        type: 'checkbox-group', 
        required: false,
        options: [
          { value: 'cash', label: '💵 Efectivo', default: true },
          { value: 'card', label: '💳 Tarjeta (débito/crédito)' },
          { value: 'transfer', label: '🏦 Transferencia' },
          { value: 'oxxo', label: '🛒 OXXO' },
          { value: 'mp_qr', label: '📱 MercadoPago QR' }
        ]
      }
    ]
  }
]

export default function Onboarding() {
  const navigate = useNavigate()
  const { currentUser, setOrganizationSettings, setOrgPlan } = useAppStore()
  const { createBranch, selectBranch } = useBranches()

  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<Record<string, any>>({
    storeName: '',
    storeType: '',
    productCount: '',
    teamSize: '',
    paymentMethods: ['cash']
  })
  const [loading, setLoading] = useState(false)
  const [completed, setCompleted] = useState(false)

  if (!currentUser) {
    navigate('/login')
    return null
  }

  const step = STEPS[currentStep]
  const Icon = step.icon

  const updateField = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleNext = async () => {
    if (currentStep === 0) {
      // Primer paso - Ir al segundo
      setCurrentStep(1)
      return
    }

    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      // Último paso - Guardar y completar
      await completeOnboarding()
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleSkip = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const completeOnboarding = async () => {
    setLoading(true)
    try {
      // 1. Crear sucursal principal
      if (formData.storeName) {
        const branch = await createBranch({
          name: formData.storeName,
          code: 'MAIN-01',
          is_main: true,
          default_open_time: '09:00',
          default_close_time: '21:00'
        })
        if (branch) {
          selectBranch(branch.id)
        }
      }

      // 2. Guardar configuración de negocio
      const settings = {
        onboarding_completed: true,
        onboarding_date: new Date().toISOString(),
        store_name: formData.storeName,
        store_type: formData.storeType,
        product_count: formData.productCount,
        team_size: formData.teamSize,
        payment_methods: formData.paymentMethods,
        preferences: {
          sidebar: ['/pos', '/tables', '/inventory', '/clients', '/reports'],
          navbar: ['/pos', '/inventory', '/reports']
        }
      }

      await setOrganizationSettings(settings)
      
      // Establecer plan por defecto como 'free' al crear organización
      setOrgPlan('free', 'Onboarding completado')
      
      // Actualizar en Supabase
      // usando supabase importado estáticamente
      await supabase
        .from('organizations')
        .update({ 
          settings,
          name: formData.storeName || 'Mi Negocio'
        })
        .eq('id', currentUser.organizationId)

      setCompleted(true)
    } catch (err) {
      console.error('Error completing onboarding:', err)
    } finally {
      setLoading(false)
    }
  }

  const goToDashboard = () => {
    navigate('/admin')
  }

  const renderField = (field: any) => {
    if (field.type === 'text') {
      return (
        <input
          key={field.name}
          type="text"
          placeholder={field.placeholder}
          value={formData[field.name] || ''}
          onChange={(e) => updateField(field.name, e.target.value)}
          className="w-full px-6 py-4 bg-slate-100 border-2 border-slate-200 rounded-2xl text-lg text-slate-900 focus:border-indigo-500 focus:bg-white outline-none transition-all"
        />
      )
    }

    if (field.type === 'select') {
      return (
        <select
          key={field.name}
          value={formData[field.name] || ''}
          onChange={(e) => updateField(field.name, e.target.value)}
          className="w-full px-6 py-4 bg-slate-100 border-2 border-slate-200 rounded-2xl text-lg text-slate-900 focus:border-indigo-500 focus:bg-white outline-none transition-all"
        >
          <option value="">Selecciona una opción</option>
          {field.options?.map((opt: any) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      )
    }

    if (field.type === 'checkbox-group') {
      return (
        <div key={field.name} className="space-y-3">
          {field.options?.map((opt: any) => (
            <label
              key={opt.value}
              className={`flex items-center gap-4 p-4 bg-slate-100 rounded-xl cursor-pointer transition-all ${
                formData[field.name]?.includes(opt.value) 
                  ? 'bg-indigo-50 border-2 border-indigo-500' 
                  : 'border-2 border-transparent hover:bg-slate-50'
              }`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={formData[field.name]?.includes(opt.value) || false}
                onChange={(e) => {
                  const current = formData[field.name] || []
                  if (e.target.checked) {
                    updateField(field.name, [...current, opt.value])
                  } else {
                    updateField(field.name, current.filter((v: string) => v !== opt.value))
                  }
                }}
              />
              <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                formData[field.name]?.includes(opt.value) 
                  ? 'bg-indigo-500 border-indigo-500' 
                  : 'border-slate-300'
              }`}>
                {formData[field.name]?.includes(opt.value) && (
                  <Check size={14} className="text-white" />
                )}
              </span>
              <span className="text-slate-700 font-medium">{opt.label}</span>
            </label>
          ))}
        </div>
      )
    }

    return null
  }

  if (completed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-12 max-w-lg w-full text-center shadow-2xl">
          <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check size={48} className="text-emerald-600" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-4">
            ¡Listo para empezar!
          </h1>
          <p className="text-slate-600 mb-8 text-lg">
            Tu negocio está configurado. Empieza a vender y hacer crecer tu tienda.
          </p>
          <button
            onClick={goToDashboard}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all text-lg flex items-center justify-center gap-2"
          >
            Ir al Dashboard
            <ChevronRight size={24} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-xs text-slate-400 mb-2">
            <span>Paso {currentStep + 1} de {STEPS.length}</span>
            <span>{Math.round(((currentStep + 1) / STEPS.length) * 100)}%</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
              style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl p-8 shadow-2xl">
          {/* Step Header */}
          <div className="text-center mb-8">
            <div className={`w-16 h-16 bg-${step.color}-100 rounded-2xl flex items-center justify-center mx-auto mb-4`}>
              <Icon size={32} className={`text-${step.color}-600`} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">{step.title}</h2>
            <p className="text-slate-500">{step.subtitle}</p>
          </div>

          {/* Fields */}
          <div className="space-y-4 mb-8">
            {step.fields.map(field => (
              <div key={field.name}>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {renderField(field)}
              </div>
            ))}
          </div>

          {/* Welcome Step - Special */}
          {currentStep === 0 && (
            <div className="bg-indigo-50 rounded-2xl p-6 mb-8">
              <h3 className="font-bold text-indigo-900 mb-3">🚀 Te enseñamos en 2 minutos:</h3>
              <ul className="space-y-2 text-sm text-indigo-700">
                <li className="flex items-center gap-2">
                  <Smartphone size={16} />
                  <span>Cobra rápido con el Punto de Venta</span>
                </li>
                <li className="flex items-center gap-2">
                  <Package size={16} />
                  <span>Controla tu inventario</span>
                </li>
                <li className="flex items-center gap-2">
                  <Users size={16} />
                  <span>Gestiona a tu equipo</span>
                </li>
                <li className="flex items-center gap-2">
                  <BarChart3 size={16} />
                  <span>Ve reportes y analytics</span>
                </li>
                <li className="flex items-center gap-2">
                  <Sparkles size={16} />
                  <span>Usa IA para crecer</span>
                </li>
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            {currentStep > 0 && (
              <button
                onClick={handleBack}
                className="px-6 py-4 bg-slate-100 text-slate-700 font-bold rounded-2xl hover:bg-slate-200 transition-all flex items-center gap-2"
              >
                <ChevronLeft size={20} />
                Atrás
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={loading}
              className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? 'Guardando...' : currentStep === 0 ? 'Comenzar' : currentStep === STEPS.length - 1 ? 'Finalizar' : 'Continuar'}
              <ChevronRight size={20} />
            </button>
          </div>

          {currentStep > 0 && currentStep < STEPS.length - 1 && (
            <button
              onClick={handleSkip}
              className="w-full mt-3 text-sm text-slate-400 hover:text-slate-600 font-medium"
            >
              Omitir por ahora
            </button>
          )}
        </div>

        {/* Features Pills */}
        <div className="flex justify-center gap-2 mt-6 flex-wrap">
          {['Offline', 'Multi-usuario', 'IA Incluida', 'Gratis'].map(f => (
            <span key={f} className="px-3 py-1 bg-white/10 text-white/80 text-xs font-medium rounded-full">
              {f}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
