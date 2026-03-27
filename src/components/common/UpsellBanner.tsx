import { useState, useEffect } from 'react'
import { Coins, Crown, X, ChevronRight, Sparkles } from 'lucide-react'
import { useTokens } from '@/hooks/useTokens'
import { usePlanLimits } from '@/hooks/usePlanLimits'

interface UpsellBannerProps {
  featureName?: string
  requiredTokens?: number
  minimal?: boolean
}

export default function UpsellBanner({ featureName, requiredTokens = 5, minimal = false }: UpsellBannerProps) {
  const { balance } = useTokens()
  const { isPro } = usePlanLimits()
  const [dismissed, setDismissed] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (isPro) return
    const wasDismissed = sessionStorage.getItem('upsell_dismissed')
    if (!wasDismissed) {
      const timer = setTimeout(() => setVisible(true), 2000)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [isPro])

  if (isPro || dismissed || !visible) return null

  const handleDismiss = () => {
    setDismissed(true)
    sessionStorage.setItem('upsell_dismissed', 'true')
  }

  const handleUpgrade = () => {
    window.open('/upgrade', '_blank')
  }

  if (minimal) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl">
        <Coins size={16} className="text-amber-500" />
        <span className="text-xs text-amber-700 font-medium">
          {balance > 0 ? `${balance} tokens` : 'Sin tokens'}
        </span>
        {balance < requiredTokens && (
          <button
            onClick={handleUpgrade}
            className="text-xs text-amber-600 hover:text-amber-700 font-bold underline"
          >
            Recargar
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-slideUp">
      <div className="bg-white rounded-2xl shadow-2xl border border-amber-200 overflow-hidden max-w-md w-full">
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <Crown size={18} />
            <span className="font-bold text-sm">¿Quieres más?</span>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X size={16} className="text-white" />
          </button>
        </div>
        
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 rounded-xl">
              <Coins size={24} className="text-amber-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-slate-900 text-sm">
                {balance > 0 ? `Tienes ${balance} tokens` : 'Sin tokens disponibles'}
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                {featureName 
                  ? `Se necesitan ${requiredTokens} tokens para ${featureName}`
                  : 'Recarga tokens o mejora tu plan para acceso ilimitado'
                }
              </p>
            </div>
          </div>
          
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleDismiss}
              className="flex-1 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
            >
              Después
            </button>
            <button
              onClick={handleUpgrade}
              className="flex-1 flex items-center justify-center gap-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-colors"
            >
              <Sparkles size={14} />
              Mejorar Plan
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function TokenBalanceChip({ onClick }: { onClick?: () => void }) {
  const { balance } = useTokens()
  
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-full transition-colors"
    >
      <Coins size={14} className="text-amber-600" />
      <span className="text-sm font-bold text-amber-700">{balance}</span>
    </button>
  )
}
