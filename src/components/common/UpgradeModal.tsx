import { X, Crown, Zap, Check } from 'lucide-react'
import { PlanType, PLANS, getPlanDisplayName, getPlanPrice } from '@/config/plans'

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  reason: string
  feature?: string
  currentPlan?: PlanType
}

export default function UpgradeModal({ 
  isOpen, 
  onClose, 
  reason, 
  feature,
  currentPlan = 'free' 
}: UpgradeModalProps) {

  if (!isOpen) return null

  const recommendedPlan: PlanType = currentPlan === 'free' ? 'starter' : 
    currentPlan === 'starter' ? 'growth' : 'scale'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-fadeIn">
        {/* Header */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl">
                <Crown size={24} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                  Upgrade Requerido
                </h2>
                <p className="text-sm text-slate-500 font-medium">
                  {reason}
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <X size={20} className="text-slate-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Current Status */}
          {feature && (
            <div className="bg-slate-50 rounded-2xl p-4">
              <p className="text-sm text-slate-600 font-medium">
                Límite excedido en:
              </p>
              <p className="text-lg font-black text-slate-900 mt-1">
                {feature}
              </p>
            </div>
          )}

          {/* Recommended Plan / Custom quote */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-2xl p-6 text-white border border-slate-800">
            <div className="flex items-center gap-2 mb-3">
              <Zap size={20} className="text-amber-400" />
              <span className="text-xs font-black uppercase tracking-widest text-amber-400">
                Solución a la Medida
              </span>
            </div>
            <h3 className="text-2xl font-black mb-1">
              Desbloquea más capacidad
            </h3>
            <p className="text-sm text-slate-400 mb-6">
              Amplía tu límite de productos, empleados, terminales de cobro o sucursales de acuerdo a las necesidades reales de tu tienda.
            </p>

            <a 
              href="https://wa.me/5215665848231?text=Hola,%20requiero%20ampliar%20la%20capacidad%20de%20mi%20cuenta%20de%20Reisbloc%20Store"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-3.5 px-4 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-black rounded-xl transition-all text-center mb-3 shadow-lg shadow-teal-900/30"
            >
              Contactar por WhatsApp (+52 56 6584 8231) →
            </a>

            <a 
              href="/pricing"
              className="block w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-colors text-center text-xs"
            >
              Ver información de planes
            </a>
          </div>

          {/* Free Tier Reminder */}
          <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-4">
            <p className="text-xs text-emerald-400 font-medium">
              💡 La prueba gratuita individual está diseñada para validar el sistema. Para operar en piso de venta con tu equipo o terminales Clip, configuramos tu entorno personalizado.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function formatPlanFeature(key: string, value: number): string {
  const labels: Record<string, string> = {
    products: `${value === -1 ? '∞' : value} productos`,
    employees: `${value === -1 ? '∞' : value} empleados`,
    registers: `${value === -1 ? '∞' : value} cajas`,
    storageMB: value === -1 ? 'Almacenamiento ∞' : `${value}MB almacenamiento`,
    aiTokensPerDay: `${value === -1 ? '∞' : value} queries AI/día`,
    aiTokensPerMonth: `${value === -1 ? '∞' : value} tokens AI/mes`,
    clients: `${value === -1 ? '∞' : value} clientes`,
    purchases: `${value === -1 ? '∞' : value} compras`,
    branches: `${value === -1 ? '∞' : value} sucursales`,
  }
  return labels[key] || key
}

function getPlanDescription(plan: PlanType): string {
  const descriptions: Record<PlanType, string> = {
    free: 'Para empezar',
    starter: 'Para negocios en crecimiento',
    growth: 'Para negocios establecidos',
    scale: 'Para empresas',
    enterprise: 'Solución completa',
  }
  return descriptions[plan]
}
