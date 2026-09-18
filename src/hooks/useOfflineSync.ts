import { useState, useEffect, useCallback } from 'react'
import { offlineStorage } from '@/services/offlineStorage'
import { syncService } from '@/services/syncService'
import logger from '@/utils/logger'

export interface OfflineSyncState {
  isOnline: boolean
  isSyncing: boolean
  pendingOperationsCount: number
  lastSyncTime: Date | null
  syncError: string | null
}

/**
 * Hook centralizado para sincronización offline
 * - Monitorea conectividad de red
 * - Reporta operaciones pendientes en la cola IndexedDB
 * - Despacha la cola de operaciones vía syncService
 */
export function useOfflineSync() {
  const [state, setState] = useState<OfflineSyncState>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    pendingOperationsCount: 0,
    lastSyncTime: null,
    syncError: null
  })

  const loadPendingCounts = useCallback(async () => {
    try {
      const pendingOps = await offlineStorage.getPendingSyncOperations()
      setState(prev => ({
        ...prev,
        pendingOperationsCount: pendingOps.length
      }))
    } catch (error) {
      logger.error('offline-sync', 'Error loading pending operations count', error as any)
    }
  }, [])

  const syncPendingData = useCallback(async () => {
    if (state.isSyncing || !navigator.onLine) return

    setState(prev => ({ ...prev, isSyncing: true, syncError: null }))

    try {
      await syncService.processQueue()
      await loadPendingCounts()
      setState(prev => ({
        ...prev,
        isSyncing: false,
        lastSyncTime: new Date(),
        syncError: null
      }))
      logger.info('offline-sync', 'Sincronización completada con éxito')
    } catch (error: any) {
      const errorMsg = error instanceof Error ? error.message : 'Error en sincronización'
      setState(prev => ({
        ...prev,
        isSyncing: false,
        syncError: errorMsg
      }))
      logger.error('offline-sync', 'Error en sincronización offline', error)
    }
  }, [state.isSyncing, loadPendingCounts])

  // Detectar cambios de conexión y eventos de sincronización
  useEffect(() => {
    const handleOnline = () => {
      logger.info('offline-sync', 'Conexión restaurada')
      setState(prev => ({ ...prev, isOnline: true, syncError: null }))
      syncPendingData()
    }

    const handleOffline = () => {
      logger.warn('offline-sync', 'Conexión perdida (modo offline activo)')
      setState(prev => ({ ...prev, isOnline: false }))
    }

    const handleSyncCompleted = () => {
      loadPendingCounts()
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('reisbloc-sync-completed', handleSyncCompleted)

    loadPendingCounts()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('reisbloc-sync-completed', handleSyncCompleted)
    }
  }, [syncPendingData, loadPendingCounts])

  return {
    ...state,
    loadPendingCounts,
    syncPendingData
  }
}
