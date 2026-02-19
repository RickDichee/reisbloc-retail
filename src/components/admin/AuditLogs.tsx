import { useState, useEffect } from 'react'
import supabaseService from '@/services/supabaseService'
import { AuditLog } from '@/types/index'
import logger from '@/utils/logger'
import {
    History,
    Search,
    AlertCircle,
    User,
    Tag as EntityIcon,
    Clock,
    Filter,
    Trash2,
    ShieldAlert,
    Edit3
} from 'lucide-react'

export default function AuditLogs() {
    const [logs, setLogs] = useState<AuditLog[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [filter, setFilter] = useState<'all' | 'delete' | 'security' | 'update'>('all')

    useEffect(() => {
        loadLogs()
    }, [])

    const loadLogs = async () => {
        setLoading(true)
        try {
            const data = await supabaseService.getAuditLogs(100)
            setLogs(data)
        } catch (e) {
            logger.error('audit', 'Error loading logs', e as any)
        } finally {
            setLoading(false)
        }
    }

    const filteredLogs = logs.filter((log: AuditLog) => {
        const matchesSearch =
            log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.entityType.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.userId.toLowerCase().includes(searchTerm.toLowerCase())

        if (filter === 'all') return matchesSearch
        if (filter === 'delete') return matchesSearch && log.action.toLowerCase().includes('delete')
        if (filter === 'security') return matchesSearch && (log.action.toLowerCase().includes('login') || log.action.toLowerCase().includes('auth'))
        if (filter === 'update') return matchesSearch && log.action.toLowerCase().includes('update')

        return matchesSearch
    })

    const getActionIcon = (action: string) => {
        const lower = action.toLowerCase()
        if (lower.includes('delete')) return <Trash2 className="text-red-500" size={18} />
        if (lower.includes('create')) return <Edit3 className="text-emerald-500" size={18} />
        if (lower.includes('update')) return <Edit3 className="text-blue-500" size={18} />
        if (lower.includes('auth') || lower.includes('login')) return <ShieldAlert className="text-amber-500" size={18} />
        return <EntityIcon className="text-slate-400" size={18} />
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 uppercase">Bitácora de Auditoría</h2>
                    <p className="text-slate-500 font-medium text-sm">Registro detallado de acciones sensibles del sistema</p>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar acción o entidad..."
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                        />
                    </div>
                    <button
                        onClick={loadLogs}
                        className="p-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all"
                    >
                        <History size={20} />
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {[
                    { id: 'all', label: 'Todos', icon: Filter },
                    { id: 'delete', label: 'Eliminaciones', icon: Trash2 },
                    { id: 'update', label: 'Cambios', icon: Edit3 },
                    { id: 'security', label: 'Seguridad', icon: ShieldAlert },
                ].map((f) => (
                    <button
                        key={f.id}
                        onClick={() => setFilter(f.id as any)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all border ${filter === f.id
                            ? 'bg-slate-900 text-white border-slate-900 shadow-lg'
                            : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                            }`}
                    >
                        <f.icon size={14} />
                        {f.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                    <Loader2 className="animate-spin mb-4" size={32} />
                    <p className="font-bold uppercase tracking-widest text-xs">Sincronizando registros...</p>
                </div>
            ) : filteredLogs.length === 0 ? (
                <div className="py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-300 text-center">
                    <AlertCircle className="mx-auto text-slate-300 mb-4" size={48} />
                    <h3 className="text-lg font-bold text-slate-900 uppercase">Sin Actividad</h3>
                    <p className="text-slate-500 font-medium">No se encontraron registros que coincidan con los filtros.</p>
                </div>
            ) : (
                <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50">
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha y Hora</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Usuario</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Acción</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Entidad</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Detalles</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredLogs.map((log: AuditLog) => (
                                    <tr key={log.id} className="hover:bg-slate-50/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Clock size={14} className="text-slate-300" />
                                                <span className="text-sm font-bold text-slate-700">
                                                    {log.timestamp.toLocaleString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                </span>
                                                <span className="text-[10px] font-medium text-slate-400">
                                                    {log.timestamp.toLocaleDateString('es-MX')}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500">
                                                    <User size={14} />
                                                </div>
                                                <span className="text-sm font-bold text-slate-900">{log.userId}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                {getActionIcon(log.action)}
                                                <span className="text-sm font-medium text-slate-600 capitalize">
                                                    {log.action.replace('_', ' ')}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest">
                                                {log.entityType}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="p-2 text-slate-400 hover:text-indigo-600 transition-all opacity-0 group-hover:opacity-100">
                                                <History size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}

function Loader2({ className, size }: { className?: string, size?: number }) {
    return <div className={`animate-spin rounded-full border-2 border-slate-900 border-t-transparent ${className}`} style={{ width: size, height: size }} />
}
