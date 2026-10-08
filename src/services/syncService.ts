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
    private lastSyncTime = 0

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
        if (options.processImmediately !== false && (typeof navigator !== 'undefined' ? navigator.onLine : true)) {
            void this.processQueue()
        }
        return operationId
    }

    /**
     * Identifica errores que no tienen posibilidad de resolverse con un reintento inmediato
     */
    private isFatalError(msg: string): boolean {
        const lower = (msg || '').toLowerCase()
        // Errores de schema cache o columnas no son fatales permanentes
        if (lower.includes('schema cache') || lower.includes('client_mutation_id') || lower.includes('network')) {
            return false
        }
        return (
            lower.includes('cross-tenant') ||
            lower.includes('item quantities must be positive') ||
            lower.includes('sale totals must be positive')
        )
    }

    /**
     * Ejecuta en ráfaga todas las operaciones pendientes de IndexedDB.
     */
    async processQueue(forceAll: boolean = false): Promise<{ success: number; failed: number }> {
        const now = Date.now()
        if (this.isSyncing) return { success: 0, failed: 0 }
        if (!forceAll && now - this.lastSyncTime < 3000) {
            logger.info('sync', '[Sync] Petición ignorada: enfriamiento activo entre sincronizaciones.')
            return { success: 0, failed: 0 }
        }
        if (typeof window !== 'undefined' && !window.navigator.onLine) {
            logger.info('sync', '[Sync] Se intentó sincronizar pero seguimos sin internet.')
            return { success: 0, failed: 0 }
        }

        this.isSyncing = true
        this.lastSyncTime = now
        logger.info('sync', '🚀 [Background Sync] Iniciando sincronización...')

        let successCount = 0
        let failedCount = 0

        try {
            if (forceAll) {
                await offlineStorage.resetFailedSyncOperations()
            }

            const pendingOps = await offlineStorage.getPendingSyncOperations()

            if (pendingOps.length === 0) {
                logger.info('sync', '✅ [Background Sync] Nada pendiente que sincronizar.')
                return { success: 0, failed: 0 }
            }

            for (const op of pendingOps) {
                logger.info('sync', `⏳ [Background Sync] Procesando ${op.action} (ID: ${op.id})`)
                try {
                    // Despachador de acciones (Router)
                    await this.executeOperation(op)

                    // Marcar como exitoso borrándolo de la cola
                    await offlineStorage.removeSyncOperation(op.id)
                    successCount++
                    logger.info('sync', `✔️ [Background Sync] Éxito: ${op.action}`)

                } catch (error: any) {
                    logger.error('sync', `❌ [Background Sync] Error ejecutando ${op.action}:`, error)
                    failedCount++

                    const retryCount = (op.retryCount || 0) + 1
                    const errorMsg = error?.message || 'Error desconocido'
                    const isFatal = retryCount >= 5 || this.isFatalError(errorMsg)

                    // Si excede 5 intentos o es fatal, marcar como 'failed' para detener loops continuos
                    await offlineStorage.updateSyncOperation(op.id, {
                        retryCount,
                        status: isFatal ? 'failed' : 'pending',
                        error: errorMsg
                    })
                }
            }

            // Al terminar con éxito al menos una operación, refrescamos inventario y avisamos a la UI
            if (successCount > 0) {
                try {
                    logger.info('sync', '🔄 [Background Sync] Refrescando inventario post-sincronización...')
                    await supabaseService.getAllProducts()
                } catch (err) {
                    logger.warn('sync', 'No se pudo actualizar inventario tras sync exitoso:', err)
                }

                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new Event('reisbloc-sync-completed'))
                }
            }

            return { success: successCount, failed: failedCount }

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
export default syncService
