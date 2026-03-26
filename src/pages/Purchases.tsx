import DashboardLayout from '@/components/layout/DashboardLayout'
import PurchasesManagement from '@/components/admin/PurchasesManagement'
import { useAppStore } from '@/store/appStore'
import { usePermissions } from '@/hooks/usePermissions'
import { Navigate } from 'react-router-dom'

export default function Purchases() {
    const { currentUser } = useAppStore()
    const { hasAnyRole } = usePermissions()

    if (!currentUser) return <Navigate to="/login" replace />
    if (!hasAnyRole(['admin', 'supervisor'])) return <Navigate to="/pos" replace />

    return (
        <DashboardLayout>
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
                <PurchasesManagement />
            </div>
        </DashboardLayout>
    )
}
