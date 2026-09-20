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

            for (const op of pendingOps) {
                logger.info('sync', `⏳ [Background Sync] Procesando ${op.action} (ID: ${op.id})`)
                try {
                    // Despachador de acciones (Router)
                    await this.executeOperation(op)

                    // Marcar como exitoso borrándolo de la cola
                    await offlineStorage.removeSyncOperation(op.id)
                    logger.info('sync', `✔️ [Background Sync] Éxito: ${op.action}`)

                } catch (error: any) {
                    logger.error('sync', `❌ [Background Sync] Error ejecutando ${op.action}:`, error)

                    // Reintentos agresivos: Mantenemos el error y aumentamos contador
                    await offlineStorage.updateSyncOperation(op.id, {
                        retryCount: op.retryCount + 1,
                        error: error.message || 'Error desconocido'
                    })
                }
            }

            // Al terminar de enviar datos, forzamos la descarga de catálogos frescos 
            // para asegurar que las ventas offline que afectaron el inventario se reflejen en la interfaz actual
            logger.info('sync', '🔄 [Background Sync] Refrescando inventario post-sincronización...')
            await supabaseService.getAllProducts()

            // Lanzar evento global para que la UI sepa que se sincronizó la nube
            window.dispatchEvent(new Event('reisbloc-sync-completed'))

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
