import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import { usePermissions } from '@/hooks/usePermissions'
import { useBranches, Branch } from '@/hooks/useBranches'
import DashboardLayout from '@/components/layout/DashboardLayout'
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  MapPin,
  Phone,
  Mail,
  Clock,
  Save,
  X
} from 'lucide-react'

export default function Branches() {
  const { currentUser } = useAppStore()
  const { isAdmin } = usePermissions()
  const { branches, currentBranch, createBranch, updateBranch, deleteBranch, loading } = useBranches()

  const [showModal, setShowModal] = useState(false)
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
    phone: '',
    email: '',
    city: '',
    state: '',
    default_open_time: '09:00',
    default_close_time: '21:00'
  })

  if (!currentUser) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/pos" replace />

  const openCreate = () => {
    setEditingBranch(null)
    setFormData({
      name: '',
      code: '',
      address: '',
      phone: '',
      email: '',
      city: '',
      state: '',
      default_open_time: '09:00',
      default_close_time: '21:00'
    })
    setShowModal(true)
  }

  const openEdit = (branch: Branch) => {
    setEditingBranch(branch)
    setFormData({
      name: branch.name || '',
      code: branch.code || '',
      address: branch.address || '',
      phone: branch.phone || '',
      email: branch.email || '',
      city: branch.city || '',
      state: branch.state || '',
      default_open_time: branch.default_open_time?.substring(0, 5) || '09:00',
      default_close_time: branch.default_close_time?.substring(0, 5) || '21:00'
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (editingBranch) {
      await updateBranch(editingBranch.id, formData)
    } else {
      await createBranch(formData)
    }
    
    setShowModal(false)
  }

  const handleDelete = async (branchId: string) => {
    if (confirm('¿Estás seguro de eliminar esta sucursal?')) {
      await deleteBranch(branchId)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-6 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-white/20 rounded-2xl backdrop-blur">
                <Building2 size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-black">Sucursales</h1>
                <p className="text-indigo-200">Gestiona tus puntos de venta</p>
              </div>
            </div>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-3 bg-white text-indigo-600 font-bold rounded-xl hover:bg-indigo-50 transition-colors"
            >
              <Plus size={20} />
              Nueva Sucursal
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-indigo-100 rounded-xl">
                <Building2 size={20} className="text-indigo-600" />
              </div>
              <span className="text-sm text-slate-500">Total Sucursales</span>
            </div>
            <p className="text-3xl font-black text-slate-900">{branches.length}</p>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-emerald-100 rounded-xl">
                <MapPin size={20} className="text-emerald-600" />
              </div>
              <span className="text-sm text-slate-500">Ciudades</span>
            </div>
            <p className="text-3xl font-black text-slate-900">
              {new Set(branches.filter(b => b.city).map(b => b.city)).size || '-'}
            </p>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-amber-100 rounded-xl">
                <Clock size={20} className="text-amber-600" />
              </div>
              <span className="text-sm text-slate-500">Sucursal Activa</span>
            </div>
            <p className="text-xl font-black text-slate-900 truncate">
              {currentBranch?.name || 'No seleccionada'}
            </p>
          </div>
        </div>

        {/* Branch List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {branches.map(branch => (
            <div 
              key={branch.id}
              className={`bg-white rounded-2xl p-6 border-2 transition-all ${
                currentBranch?.id === branch.id 
                  ? 'border-indigo-500 shadow-lg shadow-indigo-500/10' 
                  : 'border-slate-100 hover:border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl ${branch.is_main ? 'bg-amber-100' : 'bg-slate-100'}`}>
                    <Building2 size={24} className={branch.is_main ? 'text-amber-600' : 'text-slate-600'} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{branch.name}</h3>
                    {branch.code && (
                      <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {branch.code}
                      </span>
                    )}
                    {branch.is_main && (
                      <span className="ml-2 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded font-bold">
                        PRINCIPAL
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(branch)}
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  >
                    <Edit2 size={18} />
                  </button>
                  {!branch.is_main && (
                    <button
                      onClick={() => handleDelete(branch.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2 text-sm text-slate-600">
                {branch.address && (
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-slate-400" />
                    <span>{branch.address}</span>
                  </div>
                )}
                {branch.phone && (
                  <div className="flex items-center gap-2">
                    <Phone size={16} className="text-slate-400" />
                    <span>{branch.phone}</span>
                  </div>
                )}
                {branch.email && (
                  <div className="flex items-center gap-2">
                    <Mail size={16} className="text-slate-400" />
                    <span>{branch.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-slate-400" />
                  <span>
                    {branch.default_open_time?.substring(0, 5)} - {branch.default_close_time?.substring(0, 5)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {branches.length === 0 && !loading && (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-100">
            <Building2 size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-xl font-bold text-slate-900 mb-2">Sin sucursales</h3>
            <p className="text-slate-500 mb-6">Crea tu primera sucursal para empezar a gestionar tu negocio</p>
            <button
              onClick={openCreate}
              className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors"
            >
              Crear Sucursal
            </button>
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-900">
                  {editingBranch ? 'Editar Sucursal' : 'Nueva Sucursal'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Sucursal Centro"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Código</label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={e => setFormData({ ...formData, code: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="TDA-01"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Dirección</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Av. Principal #123"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Ciudad</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={e => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Morelia"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={e => setFormData({ ...formData, state: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Michoacán"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="4431234567"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="sucursal@tienda.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Hora Apertura</label>
                    <input
                      type="time"
                      value={formData.default_open_time}
                      onChange={e => setFormData({ ...formData, default_open_time: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Hora Cierre</label>
                    <input
                      type="time"
                      value={formData.default_close_time}
                      onChange={e => setFormData({ ...formData, default_close_time: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors"
                  >
                    <Save size={20} />
                    {editingBranch ? 'Guardar' : 'Crear'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
