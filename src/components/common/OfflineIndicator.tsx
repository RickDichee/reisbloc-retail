import { AlertCircle, Wifi, WifiOff, Loader, CheckCircle2 } from 'lucide-react'
import { useOfflineSync } from '../../hooks/useOfflineSync'

export default function OfflineIndicator() {
  const {
    isOnline,
    isSyncing,
    pendingOrdersCount,
    pendingSalesCount,
    lastSyncTime,
    syncPendingData
  } = useOfflineSync()

  const totalPending = pendingOrdersCount + pendingSalesCount
  const showPending = totalPending > 0 && !isOnline

  // Si está online y sin datos pendientes, no mostrar nada
  if (isOnline && totalPending === 0) {
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 max-w-sm z-40">
      {/* Indicador de conexión */}
      <div
        className={`rounded-lg shadow-lg p-3 flex items-center gap-3 transition-all ${
          isOnline
            ? 'bg-green-50 border border-green-200'
            : 'bg-red-50 border border-red-200 animate-pulse'
        }`}
      >
        <div className="flex-shrink-0">
          {isOnline ? (
            <Wifi className="w-5 h-5 text-green-600" />
          ) : (
            <WifiOff className="w-5 h-5 text-red-600" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${isOnline ? 'text-green-900' : 'text-red-900'}`}>
            {isOnline ? 'Conectado' : 'Sin conexión'}
          </p>

          {/* Info de sincronización */}
          {!isOnline && totalPending > 0 && (
            <p className="text-xs text-red-700 mt-1">
              {pendingOrdersCount > 0 && `${pendingOrdersCount} orden(es)`}
              {pendingOrdersCount > 0 && pendingSalesCount > 0 && ', '}
              {pendingSalesCount > 0 && `${pendingSalesCount} venta(s)`}
              {' '}pendiente(s)
            </p>
          )}

          {isOnline && lastSyncTime && (
            <p className="text-xs text-green-700 mt-1">
              Última sincronización hace {getTimeAgo(lastSyncTime)}
            </p>
          )}

          {isSyncing && (
            <p className="text-xs text-blue-700 mt-1 flex items-center gap-1">
              <Loader className="w-3 h-3 animate-spin" />
              Sincronizando...
            </p>
          )}
        </div>

        {/* Botón de sincronización */}
        {!isOnline && totalPending > 0 && (
          <button
            onClick={syncPendingData}
            disabled={isSyncing}
            className="flex-shrink-0 p-2 rounded-lg bg-red-100 hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Sincronizar datos"
          >
            {isSyncing ? (
              <Loader className="w-4 h-4 text-red-600 animate-spin" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600" />
            )}
          </button>
        )}

        {isOnline && lastSyncTime && (
          <div className="flex-shrink-0">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          </div>
        )}
      </div>

      {/* Banner de offline mode */}
      {!isOnline && (
        <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-800">
            <strong>Modo offline:</strong> Los datos se guardarán localmente y se sincronizarán cuando
            vuelva la conexión.
          </p>
        </div>
      )}
    </div>
  )
}

/**
 * Obtener tiempo en formato amigable
 */
function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)

  if (seconds < 60) return 'hace unos segundos'
  if (seconds < 3600) return `hace ${Math.floor(seconds / 60)} min`
  if (seconds < 86400) return `hace ${Math.floor(seconds / 3600)} horas`

  return 'hace más de un día'
}
