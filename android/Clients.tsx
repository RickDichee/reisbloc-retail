import { useState, useEffect } from 'react'
import { Users, Search, Plus, Edit2, Trash2, Phone, Mail, MapPin, X, Save, Loader2 } from 'lucide-react'
import { supabase } from '@/config/supabase'
import logger from '@/utils/logger'
import { useAppStore } from '@/store/useAppStore'

export default function Clients() {
  const { currentUser } = useAppStore()
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editingClient, setEditingClient] = useState<any>(null)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: ''
  })

  useEffect(() => {
    if (currentUser?.organizationId) {
      loadClients()
    }
  }, [currentUser?.organizationId])

  const loadClients = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('organization_id', currentUser?.organizationId)
        .is('deleted_at', null)
        .order('name', { ascending: true })

      if (error) throw error
      setClients(data || [])
    } catch (e) {
      logger.error('clients', 'Error loading clients', e as any)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (client: any = null) => {
    if (client) {
      setEditingClient(client)
      setFormData({
        name: client.name,
        phone: client.phone || '',
        email: client.email || '',
        address: client.address || '',
        notes: client.notes || ''
      })
    } else {
      setEditingClient(null)
      setFormData({ name: '', phone: '', email: '', address: '', notes: '' })
    }
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser?.organizationId) return

    setIsSaving(true)
    try {
      const payload = {
        ...formData,
        organization_id: currentUser.organizationId,
        updated_at: new Date().toISOString()
      }

      if (editingClient) {
        const { error } = await supabase.from('clients').update(payload).eq('id', editingClient.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('clients').insert([payload])
        if (error) throw error
      }

      await loadClients()
      setShowModal(false)
    } catch (e) {
      logger.error('clients', 'Error saving client', e as any)
      alert('Error al guardar el cliente')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteClient = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar este cliente?')) return
    
    // Actualización Optimista
    setClients(prev => prev.filter(c => c.id !== id))
    
    try {
      const { error } = await supabase
        .from('clients')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    } catch (e) {
      logger.error('clients', 'Error deleting client', e as any)
      loadClients() // Revertir si falla
    }
  }

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone?.includes(searchTerm)
  )

  return (
    <div className="min-h-screen relative bg-rb-canvas text-rb-text pb-12">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Header - Widget Premium */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-3xl shadow-xl overflow-hidden">
          <div className="px-6 py-8 sm:px-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                <Users size={32} />
              </div>
              <div>
                <p className="text-sm text-emerald-100 uppercase tracking-tighter font-black">Fidelización</p>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tighter uppercase">Clientes</h1>
                <p className="text-emerald-100 mt-1 font-bold opacity-80">DIRECTORIO DE CLIENTES FRECUENTES</p>
              </div>
            </div>
            <button 
              onClick={() => handleOpenModal()}
              className="bg-white text-emerald-700 px-6 py-3 rounded-2xl font-black flex items-center gap-2 shadow-lg hover:scale-105 transition-all active:scale-95"
            >
              <Plus size={20} />
              NUEVO CLIENTE
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-rb-border p-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text"
              placeholder="Buscar por nombre o teléfono..."
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-rb-border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Clients Grid */}
        {loading ? (
          <div className="text-center py-12 animate-pulse text-slate-400 font-bold">Cargando directorio...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClients.map(client => (
              <div key={client.id} className="bg-white rounded-3xl p-6 shadow-sm border border-rb-border hover:shadow-md transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center font-black text-xl">
                    {client.name[0]}
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleOpenModal(client)}
                      className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDeleteClient(client.id)}
                      className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-4">{client.name}</h3>
                <div className="space-y-2">
                  {client.phone && (
                    <div className="flex items-center gap-2 text-sm text-slate-500 font-bold">
                      <Phone size={14} className="text-emerald-500" />
                      {client.phone}
                    </div>
                  )}
                  {client.email && (
                    <div className="flex items-center gap-2 text-sm text-slate-500 font-bold">
                      <Mail size={14} className="text-emerald-500" />
                      {client.email}
                    </div>
                  )}
                </div>
                <div className="mt-6 pt-6 border-t border-slate-100 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] uppercase font-black text-slate-400">Total Consumido</p>
                    <p className="text-lg font-black text-emerald-600">${client.total_spent || '0.00'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-black text-slate-400">Última Visita</p>
                    <p className="text-sm font-bold text-slate-600">{client.last_visit ? new Date(client.last_visit).toLocaleDateString() : 'Nunca'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 text-white flex justify-between items-center">
              <h2 className="text-xl font-black uppercase tracking-tighter">
                {editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Nombre Completo</label>
                <input 
                  required
                  type="text"
                  className="w-full px-4 py-3 bg-slate-50 border border-rb-border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-slate-700"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="Ej. Juan Pérez"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Teléfono</label>
                  <input 
                    type="tel"
                    className="w-full px-4 py-3 bg-slate-50 border border-rb-border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-slate-700"
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    placeholder="998 123 4567"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Email</label>
                  <input 
                    type="email"
                    className="w-full px-4 py-3 bg-slate-50 border border-rb-border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-slate-700"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    placeholder="juan@ejemplo.com"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Dirección / Notas</label>
                <textarea 
                  className="w-full px-4 py-3 bg-slate-50 border border-rb-border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-medium text-slate-700 h-24 resize-none"
                  value={formData.address}
                  onChange={e => setFormData({...formData, address: e.target.value})}
                  placeholder="Dirección de entrega o preferencias del cliente..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black hover:bg-slate-200 transition-all"
                >
                  CANCELAR
                </button>
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                  {editingClient ? 'ACTUALIZAR' : 'GUARDAR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}