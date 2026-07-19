import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import { usePermissions } from '@/hooks/usePermissions'
import { Crown, Sparkles } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import MarketingAgent from '@/components/admin/MarketingAgent'
import UpsellBanner, { TokenBalanceChip } from '@/components/common/UpsellBanner'
import TokenPurchaseModal from '@/components/common/TokenPurchaseModal'
import UpgradeModal from '@/components/common/UpgradeModal'
import { useTokens } from '@/hooks/useTokens'
import { usePlanLimits } from '@/hooks/usePlanLimits'

export default function Marketing() {
  const { currentUser } = useAppStore()
  const { isAdmin } = usePermissions()
  const { balance } = useTokens()
  const { isPro, planName } = usePlanLimits()
  const [showTokenModal, setShowTokenModal] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  if (!currentUser) return <Navigate to="/login" replace />
  if (!hasAnyRole(['admin', 'manager'])) return <Navigate to="/pos" replace />

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header con acceso a tokens y upgrade */}
        <div className="flex items-center justify-between bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl text-white shadow-lg">
              <Sparkles size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">Marketing AI</h2>
              <p className="text-sm text-slate-500">Genera contenido para redes sociales</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {isPro ? (
              <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-100 to-rose-100 rounded-xl border border-pink-200">
                <Crown size={16} className="text-pink-600" />
                <span className="font-bold text-pink-700 text-sm">Plan {planName}</span>
              </div>
            ) : (
              <>
                <TokenBalanceChip onClick={() => setShowTokenModal(true)} />
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-bold text-sm transition-colors shadow-lg shadow-pink-600/20"
                >
                  <Crown size={16} />
                  Mejorar Plan
                </button>
              </>
            )}
          </div>
        </div>

        <MarketingAgent />
      </div>

      {/* Modales */}
      <TokenPurchaseModal
        isOpen={showTokenModal}
        onClose={() => setShowTokenModal(false)}
      />
      
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        reason="Accede a Marketing AI completo"
        feature="Marketing"
      />

      {/* Banner de upsell para usuarios sin tokens */}
      {!isPro && balance < 5 && <UpsellBanner featureName="generar posts" requiredTokens={5} />}
    </DashboardLayout>
  )
}
