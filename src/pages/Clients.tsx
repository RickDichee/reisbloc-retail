import { Users } from 'lucide-react'
import ClientsManagement from '@/components/admin/ClientsManagement'

export default function Clients() {
  return (
    <div className="min-h-screen relative bg-rb-canvas text-rb-text pb-12">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Header - Widget Premium */}
        <div className="bg-slate-900 text-white rounded-3xl shadow-xl overflow-hidden border border-slate-800">
          <div className="px-6 py-8 sm:px-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/10">
                <Users size={32} />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-widest font-black">Fidelización</p>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tighter uppercase">Clientes</h1>
                <p className="text-slate-400 mt-1 font-bold opacity-80 text-sm">GESTIÓN DE DIRECTORIO Y CRM</p>
              </div>
            </div>
          </div>
        </div>

        <ClientsManagement />
      </div>
    </div>
  )
}