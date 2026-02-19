import DashboardLayout from '@/components/layout/DashboardLayout'
import PurchasesManagement from '@/components/admin/PurchasesManagement'
import { useAppStore } from '@/store/appStore'
import { Navigate } from 'react-router-dom'

export default function Purchases() {
    const { currentUser } = useAppStore()

    // Protección básica de ruta
    if (!currentUser) return <Navigate to="/login" replace />

    // Opcional: restringir acceso solo a admin/supervisor si es necesario
    // if (currentUser.role === 'staff') return <Navigate to="/pos" replace />

    return (
        <DashboardLayout>
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
                <PurchasesManagement />
            </div>
        </DashboardLayout>
    )
}
