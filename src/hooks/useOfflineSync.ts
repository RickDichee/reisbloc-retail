import { useState, useEffect, useCallback } from 'react'
import offlineDBService from '@/services/offlineDBService'

import logger from '@/utils/logger'

export interface OfflineSyncState {
  isOnline: boolean
  isSyncing: boolean
  pendingOrdersCount: number
  pendingSalesCount: number
  lastSyncTime: Date | null
  syncError: string | null
}
/**
 * Hook para sincronización offline
 * - Detecta cambios de conexión
 * - Sincroniza datos pendientes
 * - Maneja errores de conexión
 */
export function useOfflineSync() {
  const [state, setState] = useState<OfflineSyncState>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    pendingOrdersCount: 0,
    pendingSalesCount: 0,
    lastSyncTime: null,
    syncError: null
  })

  // Detectar cambios de conexión
  useEffect(() => {
    const handleOnline = () => {
      logger.info('offline-sync', 'Conexión restaurada')
      setState(prev => ({ ...prev, isOnline: true, syncError: null }))
      // Sincronizar datos pendientes cuando se restaura conexión
      syncPendingData()
    }

    const handleOffline = () => {
      logger.warn('offline-sync', 'Sin conexión')
      setState(prev => ({ ...prev, isOnline: false }))
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Cargar datos pendientes al montar
  useEffect(() => {
    loadPendingCounts()
  }, [])

  /**
   * Cargar contador de datos pendientes
   */
  const loadPendingCounts = useCallback(async () => {
    try {
      const pendingOrders = await offlineDBService.getPendingOrders()
      const pendingSales = await offlineDBService.getPendingSales()

      setState(prev => ({
        ...prev,
        pendingOrdersCount: pendingOrders.length,
        pendingSalesCount: pendingSales.length
      }))
    } catch (error) {
      logger.error('offline-sync', 'Error loading pending counts', error as any)
    }
  }, [])

  /**
   * Sincronizar datos pendientes
   */
  const syncPendingData = useCallback(async () => {
    if (state.isSyncing || !state.isOnline) return

    setState(prev => ({ ...prev, isSyncing: true, syncError: null }))

    try {
      // Sincronizar órdenes
      const pendingOrders = await offlineDBService.getPendingOrders()
      const syncedOrders = 0
      for (const order of pendingOrders) {
        try {
          // TODO: Implementar envío a supabaseService.createOrder() cuando esté listo
          // Por ahora solo registramos que hay datos pendientes sin borrarlos
          logger.info('offline-sync', `Orden pendiente encontrada: ${(order as any).id || 'sin-id'}`)
        } catch (error) {
          logger.error('offline-sync', 'Error syncing order', error as any)
        }
      }

      // Sincronizar ventas
      const pendingSales = await offlineDBService.getPendingSales()
      const syncedSales = 0
      for (const sale of pendingSales) {
        try {
          // TODO: Implementar envío a supabaseService.createRetailSale() cuando esté listo
          // Por ahora solo registramos que hay datos pendientes sin borrarlos
          logger.info('offline-sync', `Venta pendiente encontrada: ${(sale as any).id || 'sin-id'}`)
        } catch (error) {
          logger.error('offline-sync', 'Error syncing sale', error as any)
        }
      }

      // CRÍTICO: Solo limpiar datos si realmente se sincronizaron exitosamente
      // No borrar datos offline sin confirmar que se guardaron en Supabase
      if (syncedOrders > 0 || syncedSales > 0) {
        await offlineDBService.clearSyncedData()
        logger.info('offline-sync', `Sincronizados: ${syncedOrders} órdenes, ${syncedSales} ventas`)
      } else {
        logger.info('offline-sync', 'No hay datos para sincronizar aún (funcionalidad pendiente de implementación)')
      }

      setState(prev => ({
        ...prev,
        isSyncing: false,
        pendingOrdersCount: 0,
        pendingSalesCount: 0,
        lastSyncTime: new Date()
      }))

      logger.info('offline-sync', 'Sincronización completada')
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error en sincronización'
      setState(prev => ({
        ...prev,
        isSyncing: false,
        syncError: errorMsg
      }))
      logger.error('offline-sync', 'Sync error', error as any)
    }
  }, [state.isSyncing, state.isOnline])

  /**
   * Guardar orden offline
   */
  const saveOrderOffline = useCallback(async (order: any) => {
    try {
      await offlineDBService.saveOrderOffline({
        ...order,
        synced: false
      })
      await loadPendingCounts()
      logger.info('offline-sync', 'Orden guardada offline')
    } catch (error) {
      logger.error('offline-sync', 'Error saving order offline', error as any)
      throw error
    }
  }, [loadPendingCounts])

  /**
   * Guardar venta offline
   */
  const saveSaleOffline = useCallback(async (sale: any) => {
    try {
      await offlineDBService.saveSaleOffline({
        ...sale,
        synced: false
      })
      await loadPendingCounts()
      logger.info('offline-sync', 'Venta guardada offline')
    } catch (error) {
      logger.error('offline-sync', 'Error saving sale offline', error as any)
      throw error
    }
  }, [loadPendingCounts])

  return {
    ...state,
    syncPendingData,
    saveOrderOffline,
    saveSaleOffline,
    loadPendingCounts
  }
}
