import { Navigate } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import { usePermissions } from '@/hooks/usePermissions'
import DashboardLayout from '@/components/layout/DashboardLayout'
import AgentChat from '@/components/agent/AgentChat'

export default function Agent() {
  const { currentUser } = useAppStore()
  const { hasAnyRole } = usePermissions()

  if (!currentUser) return <Navigate to="/login" replace />
  if (!hasAnyRole(['admin', 'supervisor'])) return <Navigate to="/pos" replace />

  return (
    <DashboardLayout>
      <AgentChat />
    </DashboardLayout>
  )
}
