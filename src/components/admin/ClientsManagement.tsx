import { useState, useEffect, useCallback } from 'react'
import { Users, Search, Plus, Edit2, Trash2, Phone, Mail, X, Save, Loader2, Calendar, Upload, FileText, Check, AlertCircle, FileSpreadsheet, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/config/supabase'
import { useAppStore } from '@/store/appStore'
import logger from '@/utils/logger'
import { withOrg } from '@/utils/queryHelpers'
import supabaseService from '@/services/supabaseService'

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

    // 📦 Importación por Lote (Bulk Import) State
    const [showImportModal, setShowImportModal] = useState(false)
    const [importText, setImportText] = useState('')
    const [isImporting, setIsImporting] = useState(false)
    const [importSuccessCount, setImportSuccessCount] = useState<number | null>(null)

    const parseImportText = (text: string) => {
        const lines = text.split('\n').filter(line => line.trim() !== '')
        const parsed: any[] = []

        lines.forEach(line => {
          if (line.toLowerCase().includes('nombre') && (line.toLowerCase().includes('telefono') || line.toLowerCase().includes('phone'))) {
            return
          }

          const parts = line.split(/[,;\t]/).map(p => p.trim())
          if (parts.length === 0 || !parts[0]) return

          const name = parts[0]
          const phone = parts[1] || ''
          const email = parts[2] || ''
          const address = parts[3] || ''

          const cleanPhone = phone.replace(/\D/g, '')
          const isDup = clients.some(c => 
            (c.phone && cleanPhone && c.phone.replace(/\D/g, '') === cleanPhone) ||
            (c.name.toLowerCase().trim() === name.toLowerCase().trim())
          )

          parsed.push({ name, phone, email, address, isDuplicate: isDup })
        })

        return parsed
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (event) => {
        const content = event.target?.result as string
        if (content) {
          setImportText(content)
        }
      }
      reader.readAsText(file)
    }

    const handleExecuteImport = async () => {
      if (!currentUser?.organizationId) return
      const parsedItems = parseImportText(importText)
      const itemsToImport = parsedItems.filter(item => !item.isDuplicate)
      
      if (itemsToImport.length === 0) {
        alert('No hay contactos nuevos para importar (todos son duplicados o líneas vacías).')
        return
      }

      setIsImporting(true)
      try {
        const payload = itemsToImport.map(item => ({
          name: item.name,
          phone: item.phone,
          email: item.email,
          address: item.address,
          organization_id: currentUser.organizationId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }))

        const { error } = await supabase.from('clients').insert(payload)
        if (error) throw error

        supabaseService.createAuditLog({
          userId: currentUser.id,
          action: 'CLIENTS_BULK_IMPORTED',
          entityType: 'CLIENTS',
          newValue: { count: itemsToImport.length, totalParsed: parsedItems.length }
        }).catch(err => console.error('Error logging bulk import:', err))

        setImportSuccessCount(itemsToImport.length)
        await loadClients()
      } catch (e) {
        logger.error('clients', 'Error importing clients in bulk', e as any)
        alert('Error al importar la lista de clientes')
      } finally {
        setIsImporting(false)
      }
    }

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
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <button
                        onClick={() => {
                          setImportText('')
                          setImportSuccessCount(null)
                          setShowImportModal(true)
                        }}
                        className="w-full sm:w-auto bg-slate-900 text-white px-6 py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-slate-850 transition-all active:scale-95 shadow-md uppercase tracking-tight text-xs"
                    >
                        <Upload size={18} />
                        Importar por Lote (CSV)
                    </button>
                    <button
                        onClick={() => handleOpenModal()}
                        className="w-full sm:w-auto bg-emerald-500 text-slate-950 px-6 py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-emerald-400 transition-all active:scale-95 shadow-[0_10px_20px_rgba(16,185,129,0.3)] uppercase tracking-tight text-xs"
                    >
                        <Plus size={20} />
                        Nuevo Cliente
                    </button>
                </div>
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
            {/* 📦 BATCH IMPORT CLIENTS MODAL (CSV / TEXT PASTE) */}
            {showImportModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-scaleIn border border-slate-200 flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="bg-slate-900 p-6 text-white flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
                                    <FileSpreadsheet size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black uppercase tracking-tight">Importar Clientes por Lote</h2>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Carga desde CSV o pega tu lista de contactos</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowImportModal(false)}
                                className="p-2 hover:bg-white/20 rounded-xl transition-colors text-slate-400 hover:text-white"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                            {importSuccessCount !== null ? (
                                <div className="py-8 text-center space-y-4">
                                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-md">
                                        <CheckCircle2 size={36} />
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-900">¡Importación Exitosa!</h3>
                                    <p className="text-sm text-slate-600 font-medium max-w-md mx-auto">
                                        Se agregaron <strong>{importSuccessCount} nuevos clientes</strong> correctamente a tu base de datos de CRM & Loyalty.
                                    </p>
                                    <button
                                        onClick={() => setShowImportModal(false)}
                                        className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-wider hover:bg-slate-800 transition-all"
                                    >
                                        Entendido / Cerrar
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {/* Upload Controls */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                                                <Upload size={16} className="text-emerald-500" />
                                                Opción 1: Cargar Archivo CSV (.csv)
                                            </label>
                                            <input
                                                type="file"
                                                accept=".csv,.txt"
                                                onChange={handleFileUpload}
                                                className="hidden"
                                                id="csv-file-input"
                                            />
                                            <label
                                                htmlFor="csv-file-input"
                                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs cursor-pointer transition-colors"
                                            >
                                                Seleccionar Archivo
                                            </label>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                                                <FileText size={16} className="text-indigo-500" />
                                                Opción 2: Pegar Lista de Contactos (Línea por línea)
                                            </label>
                                            <p className="text-[11px] text-slate-400 font-semibold">
                                                Formato sugerido: <code>Nombre, Teléfono, Email, Dirección</code> (un contacto por línea).
                                            </p>
                                            <textarea
                                                value={importText}
                                                onChange={(e) => setImportText(e.target.value)}
                                                placeholder={`Juan Pérez, 5512345678, juan@ejemplo.com, CDMX\nMaría Gómez, 5598765432, maria@ejemplo.com, Guadalajara\nCarlos López, 9981234567`}
                                                className="w-full h-36 p-4 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-xs focus:ring-2 focus:ring-slate-900 outline-none resize-none"
                                            />
                                        </div>
                                    </div>

                                    {/* Live Preview Table */}
                                    {importText.trim() !== '' && (
                                        <div className="space-y-3 pt-4 border-t border-slate-100">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider">
                                                    Vista Previa ({parseImportText(importText).length} detectados)
                                                </h4>
                                                <span className="text-[10px] font-bold text-slate-400">
                                                    {parseImportText(importText).filter(i => i.isDuplicate).length} duplicados omitidos
                                                </span>
                                            </div>

                                            <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-2xl divide-y divide-slate-100 text-xs font-medium">
                                                {parseImportText(importText).map((item, idx) => (
                                                    <div key={idx} className={`p-3 flex items-center justify-between ${item.isDuplicate ? 'bg-amber-50/60' : 'bg-white'}`}>
                                                        <div>
                                                            <span className="font-bold text-slate-900 block">{item.name}</span>
                                                            <span className="text-[11px] text-slate-500">{item.phone || 'Sin teléfono'} · {item.email || 'Sin email'}</span>
                                                        </div>
                                                        {item.isDuplicate ? (
                                                            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-black text-[9px] uppercase tracking-wider">
                                                                Duplicado (Omitir)
                                                            </span>
                                                        ) : (
                                                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-black text-[9px] uppercase tracking-wider flex items-center gap-1">
                                                                <Check size={10} /> Listo para importar
                                                            </span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Modal Footer */}
                        {importSuccessCount === null && (
                            <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3 shrink-0">
                                <button
                                    onClick={() => setShowImportModal(false)}
                                    className="flex-1 py-3.5 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold text-xs uppercase tracking-wider hover:bg-slate-100 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleExecuteImport}
                                    disabled={isImporting || importText.trim() === ''}
                                    className="flex-1 py-3.5 bg-emerald-500 text-slate-950 rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-emerald-400 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-md"
                                >
                                    {isImporting ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                                    Confirmar e Importar Lote
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
