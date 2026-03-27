import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import { usePermissions } from '@/hooks/usePermissions'
import { Crown, Sparkles } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import AgentChat from '@/components/agent/AgentChat'
import UpsellBanner, { TokenBalanceChip } from '@/components/common/UpsellBanner'
import TokenPurchaseModal from '@/components/common/TokenPurchaseModal'
import UpgradeModal from '@/components/common/UpgradeModal'
import { useTokens } from '@/hooks/useTokens'
import { usePlanLimits } from '@/hooks/usePlanLimits'

export default function Agent() {
  const { currentUser } = useAppStore()
  const { hasAnyRole } = usePermissions()
  const { balance } = useTokens()
  const { isPro, planName } = usePlanLimits()
  const [showTokenModal, setShowTokenModal] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  if (!currentUser) return <Navigate to="/login" replace />
  if (!hasAnyRole(['admin', 'supervisor'])) return <Navigate to="/pos" replace />

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header con acceso a tokens y upgrade */}
        <div className="flex items-center justify-between bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl text-white shadow-lg">
              <Sparkles size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">IA Agent</h2>
              <p className="text-sm text-slate-500">Tu asistente inteligente</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {isPro ? (
              <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-xl border border-indigo-200">
                <Crown size={16} className="text-indigo-600" />
                <span className="font-bold text-indigo-700 text-sm">Plan {planName}</span>
              </div>
            ) : (
              <>
                <TokenBalanceChip onClick={() => setShowTokenModal(true)} />
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-colors shadow-lg shadow-indigo-600/20"
                >
                  <Crown size={16} />
                  Mejorar Plan
                </button>
              </>
            )}
          </div>
        </div>

        <AgentChat />
      </div>

      {/* Modales */}
      <TokenPurchaseModal
        isOpen={showTokenModal}
        onClose={() => setShowTokenModal(false)}
      />
      
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        reason="Accede a más queries AI"
        feature="IA Agent"
      />

      {/* Banner de upsell para usuarios sin tokens */}
      {!isPro && balance < 5 && <UpsellBanner featureName="usar el IA Agent" requiredTokens={1} />}
    </DashboardLayout>
  )
}
