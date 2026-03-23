import { useState, useEffect, useCallback } from 'react'
import { Users, Search, Plus, Edit2, Trash2, Phone, Mail, X, Save, Loader2, Calendar } from 'lucide-react'
import { supabase } from '@/config/supabase'
import { useAppStore } from '@/store/appStore'
import logger from '@/utils/logger'
import { withOrg } from '@/utils/queryHelpers'

export default function ClientsManagement() {
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

    const loadClients = useCallback(async () => {
        setLoading(true)
        try {
            const { data, error } = await withOrg(
                supabase.from('clients').select('*'),
                currentUser?.organizationId
            )
                .is('deleted_at', null)
                .order('name', { ascending: true })

            if (error) throw error
            setClients(data || [])
        } catch (e) {
            logger.error('clients', 'Error loading clients', e as any)
        } finally {
            setLoading(false)
        }
    }, [currentUser?.organizationId])

    useEffect(() => {
        loadClients()
    }, [loadClients])

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
        <div className="space-y-8 animate-fadeIn max-w-[1600px] mx-auto px-1">
            {/* Header with Stats */}
            {/* Header - Premium Slate/Emerald Style */}
            <div className="bg-slate-900 text-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.2)] overflow-hidden border border-white/5 relative mb-8">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full -mr-32 -mt-32"></div>
                <div className="px-6 py-6 sm:px-8 flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-white/5 rounded-2xl backdrop-blur-md border border-white/10 shadow-inner">
                            <Users size={28} className="text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-[10px] text-emerald-400 uppercase tracking-[0.2em] font-black mb-0.5">CRM & Loyalty</p>
                            <h1 className="text-3xl sm:text-4xl font-black tracking-tighter uppercase leading-none">Clientes</h1>
                            <p className="text-slate-400 mt-2 font-bold tracking-tight opacity-80 uppercase text-xs">Gestión de relaciones y fidelización</p>
                        </div>
                    </div>
                    <div className="hidden md:flex gap-4">
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center min-w-[100px]">
                            <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Total</span>
                            <span className="text-2xl font-black text-white">{clients.length}</span>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center min-w-[100px]">
                            <span className="text-[10px] text-emerald-400 uppercase font-black tracking-widest">Fidelidad</span>
                            <span className="text-2xl font-black text-emerald-400">
                                {clients.length > 0
                                    ? `${Math.round((clients.filter(c => parseFloat(c.total_spent || 0) > 0).length / clients.length) * 100)}%`
                                    : '0%'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search and Actions - Integrated Bar */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-8">
                <div className="relative w-full md:max-w-xl group">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por Nombre, Teléfono o Email..."
                        className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-0 outline-none font-bold text-slate-700 transition-all shadow-sm hover:shadow-md focus:shadow-lg"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="w-full md:w-auto bg-emerald-500 text-slate-950 px-8 py-4 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-emerald-400 transition-all active:scale-95 shadow-[0_10px_20px_rgba(16,185,129,0.3)] uppercase tracking-tight"
                >
                    <Plus size={24} />
                    Nuevo Cliente
                </button>
            </div>

            {/* Clients Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-64 bg-slate-100/50 rounded-[2.5rem] animate-pulse border border-slate-100" />
                    ))}
                </div>
            ) : filteredClients.length === 0 ? (
                <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-slate-100 flex flex-col items-center">
                    <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                        <Users size={48} className="text-slate-200" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 mb-2">Sin clientes aún</h3>
                    <p className="text-slate-400 font-bold max-w-sm mb-8">Comienza a construir tu base de datos de clientes para ofrecer una experiencia personalizada.</p>
                    <button
                        onClick={() => handleOpenModal()}
                        className="bg-slate-100 text-slate-600 px-8 py-3 rounded-xl font-black hover:bg-slate-200 transition-all uppercase text-sm tracking-tighter"
                    >
                        Crear Primer Cliente
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {filteredClients.map(client => (
                        <div key={client.id} className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 hover:shadow-2xl hover:-translate-y-1 transition-all group relative overflow-hidden">
                            <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                <button
                                    onClick={() => handleOpenModal(client)}
                                    className="p-3 bg-white text-slate-600 rounded-xl hover:bg-slate-900 hover:text-white transition-all shadow-lg border border-slate-100"
                                >
                                    <Edit2 size={18} />
                                </button>
                                <button
                                    onClick={() => handleDeleteClient(client.id)}
                                    className="p-3 bg-white text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-lg border border-slate-100"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>

                            <div className="flex flex-col items-center text-center mb-8">
                                <div className="w-20 h-20 bg-gradient-to-br from-slate-50 to-slate-100 text-slate-900 rounded-[2rem] flex items-center justify-center font-black text-3xl border border-slate-200 mb-4 shadow-inner ring-4 ring-white">
                                    {client.name[0]}
                                </div>
                                <h3 className="text-xl font-black text-slate-900 leading-tight mb-1">{client.name}</h3>
                                <div className="flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest leading-none">
                                    <Calendar size={10} />
                                    Miembro desde {new Date(client.created_at).getFullYear()}
                                </div>
                            </div>

                            <div className="space-y-4 mb-8">
                                <div className="p-4 bg-slate-50 rounded-2xl border border-transparent hover:border-slate-200 transition-colors">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                        <Phone size={10} /> Teléfono móvil
                                    </p>
                                    <p className="text-sm font-bold text-slate-700">{client.phone || 'No registrado'}</p>
                                </div>

                                <div className="p-4 bg-slate-50 rounded-2xl border border-transparent hover:border-slate-200 transition-colors shrink-0 overflow-hidden">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                        <Mail size={10} /> Correo Electrónico
                                    </p>
                                    <p className="text-sm font-bold text-slate-700 truncate">{client.email || 'No registrado'}</p>
                                </div>
                            </div>

                            <div className="pt-6 border-t-2 border-dashed border-slate-100 flex justify-between items-center mt-auto">
                                <div className="shrink-0">
                                    <p className="text-[10px] uppercase font-black text-slate-400 tracking-[0.1em] mb-1">Inversión Total</p>
                                    <p className="text-xl font-black text-slate-900">${client.total_spent || '0.00'}</p>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-[10px] uppercase font-black text-slate-400 tracking-[0.1em] mb-1">Visitas</p>
                                    <div className="flex items-center justify-end gap-1.5 font-black text-slate-700">
                                        <span className="text-lg leading-none">12</span>
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal - Unified Design */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-scaleIn border border-slate-200">
                        <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
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
                                    className="w-full px-4 py-3 bg-slate-50 border border-rb-border rounded-xl focus:ring-2 focus:ring-slate-900 outline-none font-bold text-slate-700"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Ej. Juan Pérez"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Teléfono</label>
                                    <input
                                        type="tel"
                                        className="w-full px-4 py-3 bg-slate-50 border border-rb-border rounded-xl focus:ring-2 focus:ring-slate-900 outline-none font-bold text-slate-700"
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="998 123 4567"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Email</label>
                                    <input
                                        type="email"
                                        className="w-full px-4 py-3 bg-slate-50 border border-rb-border rounded-xl focus:ring-2 focus:ring-slate-900 outline-none font-bold text-slate-700"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="juan@ejemplo.com"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Dirección / Notas</label>
                                <textarea
                                    className="w-full px-4 py-3 bg-slate-50 border border-rb-border rounded-xl focus:ring-2 focus:ring-slate-900 outline-none font-medium text-slate-700 h-24 resize-none"
                                    value={formData.address}
                                    onChange={e => setFormData({ ...formData, address: e.target.value })}
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
                                    className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black shadow-lg hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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
