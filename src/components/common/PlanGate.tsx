import { ReactNode } from 'react'
import { usePlanLimits, PlanFeature } from '@/hooks/usePlanLimits'
import { Zap } from 'lucide-react'

interface PlanGateProps {
  feature: PlanFeature
  children: ReactNode
  /** Si es true, muestra el children pero con un badge ⚡ Pro overlay. Default: true */
  showLocked?: boolean
  /** Texto personalizado del badge de upgrade */
  upgradeLabel?: string
}

/**
 * Componente que envuelve un feature y lo bloquea si el plan actual no lo incluye.
 * Muestra un overlay elegante con badge "⚡ Pro" sobre el contenido bloqueado.
 */
export function PlanGate({ feature, children, showLocked = true, upgradeLabel }: PlanGateProps) {
  const { canUseFeature, planName } = usePlanLimits()

  if (canUseFeature(feature)) {
    return <>{children}</>
  }

  if (!showLocked) return null

  return (
    <div className="relative group/gate">
      {/* Contenido bloqueado (opacidad reducida) */}
      <div className="opacity-40 pointer-events-none select-none">
        {children}
      </div>

      {/* Overlay de upgrade */}
      <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[2px] rounded-xl cursor-not-allowed">
        <div className="flex flex-col items-center gap-1 text-center px-3">
          <div className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-black px-3 py-1.5 rounded-full shadow-lg shadow-indigo-500/30">
            <Zap size={11} className="fill-current" />
            {upgradeLabel || (planName === 'Esencial' ? 'Requiere Pro' : 'Requiere Enterprise')}
          </div>
          <p className="text-[9px] text-slate-500 font-medium mt-0.5">
            reisbloc.store/upgrade
          </p>
        </div>
      </div>
    </div>
  )
}

export default PlanGate
