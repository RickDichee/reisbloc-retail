import { Navigate } from 'react-router-dom'
import ClientsManagement from '@/components/admin/ClientsManagement'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useAppStore } from '@/store/appStore'
import { usePermissions } from '@/hooks/usePermissions'

export default function Clients() {
  const { currentUser } = useAppStore()
  const { hasAnyRole } = usePermissions()

  if (!currentUser) return <Navigate to="/login" replace />
  if (!hasAnyRole(['admin', 'manager', 'supervisor'])) return <Navigate to="/pos" replace />

  return (
    <DashboardLayout>
      <div className="relative space-y-6">
        <ClientsManagement />
      </div>
    </DashboardLayout>
  )
}