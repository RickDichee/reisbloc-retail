import { useState, useEffect } from 'react'
import { usePermissions } from '@/hooks/usePermissions'
import { AuditLog } from '@/types/index'
import supabaseService from '@/services/supabaseService'
import logger from '@/utils/logger'
import { 
  FileText, 
  Filter,
  Calendar,
  User,
  Eye,
  Search,
  AlertCircle
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function AuditLogsPanel() {
  const { canViewLogs, isReadOnly } = usePermissions()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState({
    action: 'all',
    entityType: 'all',
    dateFrom: '',
    dateTo: '',
    search: '',
  })

  useEffect(() => {
    loadLogs()
  }, [])

  const loadLogs = async () => {
    setLoading(true)
    try {
      const data = await supabaseService.getAuditLogs()
      setLogs(data || [])
    } catch (error) {
      logger.error('audit-panel', 'Error loading logs', error as any)
    } finally {
      setLoading(false)
    }
  }

  const filteredLogs = logs.filter(log => {
    if (filter.action !== 'all' && log.action !== filter.action) return false
    if (filter.entityType !== 'all' && log.entityType !== filter.entityType) return false
    if (filter.search && !JSON.stringify(log).toLowerCase().includes(filter.search.toLowerCase())) return false
    if (filter.dateFrom && new Date(log.timestamp) < new Date(filter.dateFrom)) return false
    if (filter.dateTo && new Date(log.timestamp) > new Date(filter.dateTo)) return false
    return true
  })

  const actionLabels: Record<string, { label: string; color: string }> = {
    LOGIN_SUCCESS: { label: 'Login exitoso', color: 'text-green-700 bg-green-100' },
    LOGIN_FAILED: { label: 'Login fallido', color: 'text-red-700 bg-red-100' },
    LOGOUT: { label: 'Cierre de sesión', color: 'text-gray-700 bg-gray-100' },
    PRODUCT_CREATED: { label: 'Producto creado', color: 'text-blue-700 bg-blue-100' },
    PRODUCT_UPDATED: { label: 'Producto actualizado', color: 'text-indigo-700 bg-indigo-100' },
    PRODUCT_DELETED: { label: 'Producto eliminado', color: 'text-red-700 bg-red-100' },
    INVENTORY_CHANGE: { label: 'Cambio de inventario', color: 'text-purple-700 bg-purple-100' },
    USER_CREATED: { label: 'Usuario creado', color: 'text-green-700 bg-green-100' },
    USER_MODIFIED: { label: 'Usuario modificado', color: 'text-amber-700 bg-amber-100' },
    USER_DELETED: { label: 'Usuario eliminado', color: 'text-red-700 bg-red-100' },
    VIEW_REPORT: { label: 'Reporte visto', color: 'text-cyan-700 bg-cyan-100' },
    SALE_COMPLETED: { label: 'Venta completada', color: 'text-emerald-700 bg-emerald-100' },
    DELETE_PRODUCT_FROM_ORDER: { label: 'Producto eliminado de orden', color: 'text-orange-700 bg-orange-100' },
  }

  const entityTypeIcons: Record<string, any> = {
    AUTH: User,
    PRODUCT: FileText,
    USER: User,
    REPORT: FileText,
    ORDER: FileText,
    SALE: FileText,
  }

  if (!canViewLogs) {
    return (
      <div className="card-gradient text-center py-12">
        <AlertCircle size={48} className="mx-auto text-red-600 mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">Acceso Denegado</h3>
        <p className="text-gray-600">No tienes permisos para ver los logs de auditoría</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Logs de Auditoría</h2>
        <p className="text-gray-600 mt-1">
          Historial completo de acciones del sistema · {filteredLogs.length} registro{filteredLogs.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Read-only info */}
      {isReadOnly && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 flex items-center gap-3">
          <Eye className="text-blue-600" size={24} />
          <div>
            <p className="font-bold text-blue-900">Acceso Solo Lectura</p>
            <p className="text-sm text-blue-700">Puedes ver el historial pero no exportar o modificar</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card-gradient">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={20} className="text-gray-600" />
          <h3 className="font-bold text-gray-900">Filtros</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Buscar
            </label>
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={filter.search}
                onChange={(e) => setFilter({ ...filter, search: e.target.value })}
                placeholder="ID, usuario, acción..."
                className="input-field pl-10"
              />
            </div>
          </div>

          {/* Action filter */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Acción
            </label>
            <select
              value={filter.action}
              onChange={(e) => setFilter({ ...filter, action: e.target.value })}
              className="input-field"
            >
              <option value="all">Todas</option>
              {Object.keys(actionLabels).map(action => (
                <option key={action} value={action}>
                  {actionLabels[action].label}
                </option>
              ))}
            </select>
          </div>

          {/* Entity type filter */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Tipo
            </label>
            <select
              value={filter.entityType}
              onChange={(e) => setFilter({ ...filter, entityType: e.target.value })}
              className="input-field"
            >
              <option value="all">Todos</option>
              <option value="AUTH">Autenticación</option>
              <option value="PRODUCT">Productos</option>
              <option value="USER">Usuarios</option>
              <option value="REPORT">Reportes</option>
              <option value="ORDER">Órdenes</option>
              <option value="SALE">Ventas</option>
            </select>
          </div>

          {/* Date range */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Fecha
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                value={filter.dateFrom}
                onChange={(e) => setFilter({ ...filter, dateFrom: e.target.value })}
                className="input-field flex-1"
              />
            </div>
          </div>
        </div>

        <button
          onClick={() => setFilter({ action: 'all', entityType: 'all', dateFrom: '', dateTo: '', search: '' })}
          className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-semibold"
        >
          Limpiar filtros
        </button>
      </div>

      {/* Logs Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="spinner mx-auto mb-4" />
          <p className="text-gray-600">Cargando logs...</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="card-gradient text-center py-12">
          <FileText size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">No hay logs que coincidan con los filtros</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map(log => {
            const actionInfo = actionLabels[log.action] || { label: log.action, color: 'text-gray-700 bg-gray-100' }
            const EntityIcon = entityTypeIcons[log.entityType] || FileText

            return (
              <div key={log.id} className="card-gradient hover-lift">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`p-3 rounded-xl ${actionInfo.color}`}>
                    <EntityIcon size={24} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div>
                        <h4 className="font-bold text-gray-900">{actionInfo.label}</h4>
                        <p className="text-sm text-gray-600">
                          por <span className="font-semibold">{log.userId}</span>
                        </p>
                      </div>
                      <div className="text-right text-sm text-gray-600">
                        <div className="font-semibold">
                          {format(new Date(log.timestamp), 'dd MMM yyyy', { locale: es })}
                        </div>
                        <div className="text-xs">
                          {format(new Date(log.timestamp), 'HH:mm:ss')}
                        </div>
                      </div>
                    </div>

                    {/* Entity details */}
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-600">Tipo:</span>{' '}
                        <span className="font-semibold text-gray-900">{log.entityType}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">ID:</span>{' '}
                        <span className="font-mono text-xs text-gray-900">{log.entityId}</span>
                      </div>
                      {log.deviceId && (
                        <div className="col-span-2">
                          <span className="text-gray-600">Dispositivo:</span>{' '}
                          <span className="font-mono text-xs text-gray-900">{log.deviceId}</span>
                        </div>
                      )}
                    </div>

                    {/* Changes */}
                    {(log.oldValue || log.newValue) && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          {log.oldValue && (
                            <div>
                              <p className="font-semibold text-gray-700 mb-1">Valor anterior:</p>
                              <pre className="bg-gray-100 p-2 rounded overflow-x-auto">
                                {JSON.stringify(log.oldValue, null, 2)}
                              </pre>
                            </div>
                          )}
                          {log.newValue && (
                            <div>
                              <p className="font-semibold text-gray-700 mb-1">Valor nuevo:</p>
                              <pre className="bg-green-50 p-2 rounded overflow-x-auto border border-green-200">
                                {JSON.stringify(log.newValue, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
