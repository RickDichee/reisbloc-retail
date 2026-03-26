import { Navigate } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import { usePermissions } from '@/hooks/usePermissions'
import DashboardLayout from '@/components/layout/DashboardLayout'
import AnalyticsDashboard from '@/components/admin/AnalyticsDashboard'

export default function Analytics() {
  const { currentUser } = useAppStore()
  const { isAdmin } = usePermissions()

  if (!currentUser) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/pos" replace />

  return (
    <DashboardLayout>
      <AnalyticsDashboard />
    </DashboardLayout>
  )
}
