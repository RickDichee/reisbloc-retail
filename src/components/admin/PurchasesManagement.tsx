import { useState } from 'react'
import { 
  Truck, 
  Plus, 
  FileText, 
  Phone,
  Mail,
  MoreVertical,
  Filter,
  Download
} from 'lucide-react'

export default function PurchasesManagement() {
  const [activeView, setActiveView] = useState<'orders' | 'providers'>('orders')
  
  // Mock Data para visualización
  const orders = [
    { id: 'OC-2024-001', provider: 'Distribuidora Central', date: '2024-02-20', total: 4500.00, status: 'received', items: 12 },
    { id: 'OC-2024-002', provider: 'Cervecería Modelo', date: '2024-02-22', total: 2800.50, status: 'pending', items: 5 },
    { id: 'OC-2024-003', provider: 'Verduras Frescas SA', date: '2024-02-23', total: 1200.00, status: 'draft', items: 8 },
  ]

  const providers = [
    { id: 1, name: 'Distribuidora Central', contact: 'Juan Pérez', phone: '555-0123', email: 'ventas@distcentral.com', category: 'General' },
    { id: 2, name: 'Cervecería Modelo', contact: 'Soporte Ventas', phone: '800-CERVEZA', email: 'pedidos@modelo.com', category: 'Bebidas' },
    { id: 3, name: 'Verduras Frescas SA', contact: 'María Campos', phone: '555-0987', email: 'maria@verduras.com', category: 'Alimentos' },
  ]

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Compras y Abastecimiento</h2>
          <p className="text-gray-500">Gestiona proveedores y órdenes de reposición</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="bg-gray-100 p-1 rounded-lg flex">
            <button 
              onClick={() => setActiveView('orders')}
              className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeView === 'orders' ? 'bg-white text-slate-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Órdenes
            </button>
            <button 
              onClick={() => setActiveView('providers')}
              className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeView === 'providers' ? 'bg-white text-slate-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Proveedores
            </button>
          </div>
          <button className="btn-primary flex items-center gap-2 ml-2">
            <Plus size={18} />
            <span className="hidden sm:inline">Nueva {activeView === 'orders' ? 'Orden' : 'Proveedor'}</span>
          </button>
        </div>
      </div>

      {/* Content */}
      {activeView === 'orders' ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 p-4 bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <div className="col-span-3 sm:col-span-2">Folio</div>
                <div className="col-span-4 sm:col-span-4">Proveedor</div>
                <div className="hidden sm:block col-span-2">Fecha</div>
                <div className="col-span-3 sm:col-span-2 text-right">Total</div>
                <div className="col-span-2 text-center hidden sm:block">Estado</div>
            </div>
            {/* Table Body */}
            <div className="divide-y divide-gray-100">
                {orders.map(order => (
                    <div key={order.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-gray-50 transition-colors group cursor-pointer">
                        <div className="col-span-3 sm:col-span-2 font-mono font-bold text-blue-600 text-xs sm:text-sm">{order.id}</div>
                        <div className="col-span-4 sm:col-span-4 font-medium text-gray-900 truncate">{order.provider}</div>
                        <div className="hidden sm:block col-span-2 text-sm text-gray-500">{order.date}</div>
                        <div className="col-span-3 sm:col-span-2 text-right font-bold text-gray-900">${order.total.toFixed(2)}</div>
                        <div className="col-span-2 hidden sm:flex justify-center">
                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                                order.status === 'received' ? 'bg-green-100 text-green-700' :
                                order.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                'bg-gray-100 text-gray-600'
                            }`}>
                                {order.status === 'received' ? 'Recibido' : order.status === 'pending' ? 'Pendiente' : 'Borrador'}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {providers.map(provider => (
                <div key={provider.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all group relative">
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1 hover:bg-gray-100 rounded"><MoreVertical size={16} className="text-gray-400" /></button>
                    </div>
                    <div className="flex items-start justify-between mb-4">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                            <Truck size={24} />
                        </div>
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-[10px] font-bold uppercase rounded-lg">{provider.category}</span>
                    </div>
                    <h3 className="font-bold text-lg text-gray-900 mb-1">{provider.name}</h3>
                    <p className="text-sm text-gray-500 mb-4">{provider.contact}</p>
                    <div className="space-y-2 text-sm border-t border-gray-100 pt-4">
                        <div className="flex items-center gap-2 text-gray-600">
                            <Phone size={14} /> {provider.phone}
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                            <Mail size={14} /> {provider.email}
                        </div>
                    </div>
                </div>
            ))}
        </div>
      )}
    </div>
  )
}