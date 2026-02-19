
import ClientsManagement from '@/components/admin/ClientsManagement'
import DashboardLayout from '@/components/layout/DashboardLayout'

export default function Clients() {
  return (
    <DashboardLayout>
      <div className="relative space-y-6">


        <ClientsManagement />
      </div>
    </DashboardLayout>
  )
}