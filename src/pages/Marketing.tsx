import { Navigate } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import { usePermissions } from '@/hooks/usePermissions'
import DashboardLayout from '@/components/layout/DashboardLayout'
import MarketingAgent from '@/components/admin/MarketingAgent'

export default function Marketing() {
  const { currentUser } = useAppStore()
  const { isAdmin } = usePermissions()

  if (!currentUser) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/pos" replace />

  return (
    <DashboardLayout>
      <MarketingAgent />
    </DashboardLayout>
  )
}
