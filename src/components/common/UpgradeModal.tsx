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

          {/* Recommended Plan */}
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white">
            <div className="flex items-center gap-2 mb-3">
              <Zap size={20} className="text-amber-300" />
              <span className="text-xs font-black uppercase tracking-widest">
                Plan Recomendado
              </span>
            </div>
            <h3 className="text-2xl font-black mb-1">
              {getPlanDisplayName(recommendedPlan)}
            </h3>
            <p className="text-3xl font-black">
              ${getPlanPrice(recommendedPlan)}
              <span className="text-sm font-medium opacity-70">/mes</span>
            </p>
            <ul className="mt-4 space-y-2">
              {Object.entries(PLANS[recommendedPlan])
                .filter(([key]) => !['allowMultiStore', 'allowApiAccess', 'supportLevel'].includes(key))
                .slice(0, 5)
                .map(([key, value]) => (
                  <li key={key} className="flex items-center gap-2 text-sm">
                    <Check size={16} className="text-emerald-300 shrink-0" />
                    <span>
                      {formatPlanFeature(key, value as number)}
                    </span>
                  </li>
                ))
              }
            </ul>
            <button className="w-full mt-6 py-4 bg-white text-indigo-600 font-black rounded-xl hover:bg-indigo-50 transition-colors">
              Hacer Upgrade Ahora
            </button>
          </div>

          {/* Other Plans */}
          <div className="space-y-3">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
              O explora otros planes
            </p>
            {(['starter', 'growth', 'scale'] as PlanType[])
              .filter(p => p !== recommendedPlan)
              .slice(0, 2)
              .map(plan => (
                <button 
                  key={plan}
                  className="w-full p-4 border border-slate-200 rounded-xl flex items-center justify-between hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors"
                >
                  <div className="text-left">
                    <p className="font-bold text-slate-900">
                      {getPlanDisplayName(plan)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {getPlanDescription(plan)}
                    </p>
                  </div>
                  <p className="font-black text-slate-900">
                    ${getPlanPrice(plan)}
                  </p>
                </button>
              ))
            }
          </div>

          {/* Free Tier Reminder */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <p className="text-sm text-emerald-800 font-medium">
              💡 Recuerda: El plan Free incluye 100 productos, 3 empleados y 1 caja. 
              Perfecto para empezar.
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
