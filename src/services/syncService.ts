/**
 * Reisbloc POS - Background Sync Engine
 * Orquesta el envío garantizado de transacciones (Órdenes, Productos) guardadas offline
 * hacia Supabase cuando el internet se restablece.
 */
import { offlineStorage, SyncOperation } from './offlineStorage'
import supabaseService from './supabaseService'
import logger from '@/utils/logger'

class SyncService {
    private isSyncing = false

    // ⛑️ FIX EGRESS: límite de reintentos por operación. Sin esto, una op
    // fallida queda pendiente para SIEMPRE y dispara syncs eternos cada 15s.
    private static readonly MAX_RETRIES = 5

    /**
     * Agrega una operación a la cola. Si hay internet, intenta sincronizar de inmediato.
     */
    async queueOperation(
        action: SyncOperation['action'],
        payload: any,
        options: { processImmediately?: boolean } = {}
    ): Promise<string> {
        logger.info('sync', `[Offline Queue] Formando operación: ${action}`)
        // Persist before a network attempt. This is the durable outbox: a browser
        // crash or a lost HTTP response cannot make a confirmed sale disappear.
        const operationId = await offlineStorage.addToSyncQueue({
            action,
            payload
        })
        if (options.processImmediately !== false && navigator.onLine) {
            void this.processQueue()
        }
        return operationId
    }

    /**
     * Ejecuta en ráfaga todas las operaciones pendientes de IndexedDB.
     */
    async processQueue(): Promise<void> {
        if (this.isSyncing) return
        if (!navigator.onLine) {
            logger.info('sync', '[Sync] Se intentó sincronizar pero seguimos sin internet.')
            return
        }

        this.isSyncing = true
        logger.info('sync', '🚀 [Background Sync] Iniciando sincronización...')

        try {
            const pendingOps = await offlineStorage.getPendingSyncOperations()

            if (pendingOps.length === 0) {
                logger.info('sync', '✅ [Background Sync] Nada pendiente que sincronizar.')
                return
            }

            let syncedCount = 0

            for (const op of pendingOps) {
                logger.info('sync', `⏳ [Background Sync] Procesando ${op.action} (ID: ${op.id})`)
                try {
                    // Despachador de acciones (Router)
                    await this.executeOperation(op)

                    // Marcar como exitoso borrándolo de la cola
                    await offlineStorage.removeSyncOperation(op.id)
                    syncedCount++
                    logger.info('sync', `✔️ [Background Sync] Éxito: ${op.action}`)

                } catch (error: any) {
                    logger.error('sync', `❌ [Background Sync] Error ejecutando ${op.action}:`, error)

                    const errorMsg = error?.message || 'Error desconocido'
                    if (op.retryCount + 1 >= SyncService.MAX_RETRIES) {
                        // ⛑️ Cuarentena: marca la op como 'failed'. Sale del índice
                        // 'pending' (el contador de UI baja) y deja de disparar
                        // syncs eternos. La op NO se borra: queda auditable en IDB.
                        await offlineStorage.updateSyncOperation(op.id, {
                            status: 'failed',
                            retryCount: op.retryCount + 1,
                            error: `En cuarentena tras ${SyncService.MAX_RETRIES} intentos. Último error: ${errorMsg}`
                        })
                        logger.error('sync', `⛔ [Background Sync] Operación ${op.id} puesta en cuarentena tras ${SyncService.MAX_RETRIES} intentos. Revisar manualmente.`)
                    } else {
                        await offlineStorage.updateSyncOperation(op.id, {
                            retryCount: op.retryCount + 1,
                            error: errorMsg
                        })
                    }
                }
            }

            // Al terminar de enviar datos, forzamos la descarga de catálogos frescos
            // solo si REALMENTE se sincronizó algo (FIX EGRESS: antes se refetchaba
            // el catálogo completo en cada ciclo de sync, incluso con 0 éxitos,
            // lo que generaba un storm de descargas cuando había ops en stuck)
            if (syncedCount > 0) {
                logger.info('sync', '🔄 [Background Sync] Refrescando inventario post-sincronización...')
                await supabaseService.getAllProducts()

                // Lanzar evento global para que la UI sepa que se sincronizó la nube
                window.dispatchEvent(new Event('reisbloc-sync-completed'))
            }

        } finally {
            this.isSyncing = false
        }
    }

    /**
     * Router interno que mapea la acción del string guardado a la función real de Supabase.
     */
    private async executeOperation(op: SyncOperation): Promise<void> {
        switch (op.action) {
            case 'CREATE_RETAIL_SALE':
                await supabaseService.createRetailSale(op.payload.sale, op.payload.items, {
                    ...op.payload.options,
                    // The mutation id belongs to the business intent, not to a
                    // particular sync attempt. Older queued records use op.id.
                    clientMutationId: op.payload.sale?.clientMutationId || op.id
                })
                break
            case 'CREATE_ORDER':
                await supabaseService.createOrder(op.payload.order)
                break
            case 'UPDATE_ORDER':
                await supabaseService.updateOrder(op.payload.orderId, op.payload.updates)
                break
            case 'CLOSE_ORDER':
                await supabaseService.createSale(op.payload.saleData)
                if (op.payload.orderId) {
                    await supabaseService.updateOrderStatus(op.payload.orderId, op.payload.status)
                }
                break
            case 'CANCEL_ORDER':
                // Cancel reason is the 2nd param, userId is the 3rd param
                // Assuming payload contains `reason` and `userId`
                await supabaseService.cancelOrder(op.payload.orderId, op.payload.reason || '', op.payload.userId || '')
                break
            case 'SYNC_PRODUCTS':
                // Reservado para futuras actualizaciones automáticas
                break
            default:
                throw new Error(`Acción desconocida en cola de sincronización: ${op.action}`)
        }
    }
}

export const syncService = new SyncService()
