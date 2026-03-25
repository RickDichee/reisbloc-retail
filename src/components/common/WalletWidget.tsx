import { useState } from 'react'
import { Coins, History, ChevronDown, ChevronUp, Loader2, Zap } from 'lucide-react'
import { useTokens, TOKEN_COSTS } from '@/hooks/useTokens'

interface WalletWidgetProps {
  onOpenPurchase?: () => void
  compact?: boolean
}

export default function WalletWidget({ onOpenPurchase, compact = false }: WalletWidgetProps) {
  const { balance, transactions, loading, fetchTransactions } = useTokens()
  const [showHistory, setShowHistory] = useState(false)

  const toggleHistory = async () => {
    if (!showHistory) {
      await fetchTransactions()
    }
    setShowHistory(!showHistory)
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'purchase': return 'text-emerald-600 bg-emerald-50'
      case 'bonus': return 'text-amber-600 bg-amber-50'
      case 'refund': return 'text-blue-600 bg-blue-50'
      case 'usage': return 'text-slate-600 bg-slate-50'
      default: return 'text-slate-600 bg-slate-50'
    }
  }

  const getFeatureLabel = (feature: string | null) => {
    const labels: Record<string, string> = {
      ai_chat: 'Chat IA',
      post_generation: 'Post Marketing',
      ai_insights: 'Insights IA',
      report_pdf: 'Reporte PDF',
      data_export: 'Exportar Datos',
      signup_bonus: 'Bono bienvenida',
    }
    return labels[feature || ''] || feature || 'General'
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg">
        <Coins size={16} className="text-amber-500" />
        <span className="text-sm font-bold text-slate-700">{balance}</span>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Coins size={24} className="text-amber-400" />
            <span className="text-sm font-medium text-slate-300">Tokens Disponibles</span>
          </div>
          <Zap size={16} className="text-amber-400" />
        </div>
        
        {loading ? (
          <Loader2 size={32} className="animate-spin text-slate-400" />
        ) : (
          <p className="text-4xl font-black mb-4">{balance.toLocaleString()}</p>
        )}
        
        <button
          onClick={onOpenPurchase}
          className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          <Coins size={18} />
          Recargar Tokens
        </button>
      </div>

      <div className="border-t border-slate-100">
        <button
          onClick={toggleHistory}
          className="w-full px-4 py-3 flex items-center justify-between text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <History size={16} />
            <span className="text-sm font-medium">Historial Reciente</span>
          </div>
          {showHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        
        {showHistory && (
          <div className="max-h-64 overflow-y-auto border-t border-slate-100">
            {transactions.length === 0 ? (
              <p className="p-4 text-center text-sm text-slate-400">Sin transacciones aún</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {transactions.slice(0, 20).map(tx => (
                  <div key={tx.id} className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${getTypeColor(tx.type)}`}>
                        {tx.type === 'usage' ? '-' : '+'}{Math.abs(tx.amount)}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-slate-700">
                          {getFeatureLabel(tx.feature)}
                        </p>
                        <p className="text-xs text-slate-400">
                          {new Date(tx.created_at).toLocaleDateString('es-MX', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-slate-500">
                      {tx.balance_after}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function TokenCostBadge({ feature }: { feature: string }) {
  const cost = TOKEN_COSTS[feature] ?? 1
  
  return (
    <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 bg-amber-100 text-amber-700 rounded-full">
      <Coins size={12} />
      {cost} tokens
    </span>
  )
}

export function TokenGate({ 
  feature, 
  children, 
  fallback 
}: { 
  feature: string
  children: React.ReactNode
  fallback?: React.ReactNode 
}) {
  const { balance } = useTokens()
  const cost = TOKEN_COSTS[feature] ?? 1
  
  if (balance >= cost) {
    return <>{children}</>
  }
  
  return fallback ? <>{fallback}</> : null
}
