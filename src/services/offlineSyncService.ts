/**
 * Reisbloc POS - Sistema POS Profesional
 * Copyright (C) 2026 Reisbloc Lab
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 */

import { indexedDBService } from './indexedDBService'

import logger from '@/utils/logger'

interface SyncStatus {
  isSyncing: boolean
  pending: number
  lastSync: number
  nextSync?: number
}

type SyncStatusCallback = (status: SyncStatus) => void

class OfflineSyncService {
  private isSyncing = false
  private pendingCount = 0
  private lastSyncTime = 0
  private statusCallbacks: SyncStatusCallback[] = []
  private syncInterval: NodeJS.Timeout | null = null
  private retryCount = 0
  private maxRetries = 3

  // ==================== INITIALIZATION ====================

  async init(): Promise<void> {
    // Inicializar IndexedDB
    await indexedDBService.init()

    // Escuchar cambios de conexión
    window.addEventListener('online', () => this.onOnline())
    window.addEventListener('offline', () => this.onOffline())

    // Comenzar sincronización automática
    this.startAutoSync()

    logger.info('✅ Offline Sync Service initialized')
  }

  // ==================== CONNECTION DETECTION ====================

  private onOnline(): void {
    logger.info('🟢 ONLINE - Sincronizando cambios...')
    this.notifyStatusChange()
    this.syncQueue()
  }

  private onOffline(): void {
    logger.warn('🔴 OFFLINE - Guardando cambios localmente')
    this.notifyStatusChange()
  }

  isOnline(): boolean {
    return navigator.onLine
  }

  // ==================== SYNC OPERATIONS ====================

  async addOrderOffline(order: any): Promise<void> {
    if (!this.isOnline()) {
      await indexedDBService.set('orders', order)
      await indexedDBService.addToSyncQueue('CREATE', 'orders', order)
      logger.info('📝 Orden guardada localmente:', order.id)
    } else {
      // ...enviar a Supabase (implementación pendiente o migrada)
    }

    this.updatePendingCount()
  }

  async updateOrderOffline(orderId: string, updates: any): Promise<void> {
    const order = await indexedDBService.get('orders', orderId)

    if (order) {
      const updated = { ...order, ...updates }
      await indexedDBService.set('orders', updated)
      await indexedDBService.addToSyncQueue('UPDATE', 'orders', updated)
    }

    if (this.isOnline()) {
      this.syncQueue()
    }

    this.updatePendingCount()
  }

  async addSaleOffline(sale: any): Promise<void> {
    if (!this.isOnline()) {
      await indexedDBService.set('sales', sale)
      await indexedDBService.addToSyncQueue('CREATE', 'sales', sale)
      logger.info('💰 Venta guardada localmente:', sale.id)
    } else {
      // ...enviar venta a Supabase (implementación pendiente o migrada)
    }

    this.updatePendingCount()
  }

  // ==================== SYNC QUEUE PROCESSING ====================

  async syncQueue(): Promise<void> {
    if (this.isSyncing || !this.isOnline()) {
      logger.warn('⏸️ Sync skipped (already syncing or offline)')
      return
    }

    this.isSyncing = true
    this.notifyStatusChange()

    try {
      const queue = await indexedDBService.getSyncQueue()
      const total = queue.length

      if (total === 0) {
        logger.info('✅ Sync queue empty')
        this.isSyncing = false
        this.lastSyncTime = Date.now()
        this.retryCount = 0
        this.notifyStatusChange()
        return
      }

      logger.info(`🔄 Sincronizando ${total} elementos...`)

      let synced = 0
      let failed = 0

      for (const item of queue) {
        try {
          await this.syncItem(item)
          synced++
        } catch (error) {
          logger.error('❌ Sync failed for item:', item.id, error)
          failed++
        }
      }

      logger.info(`✅ Sync complete: ${synced} OK, ${failed} FAILED`)
      this.lastSyncTime = Date.now()
      this.retryCount = 0

    } catch (error) {
      logger.error('❌ Sync queue processing failed:', error)
      this.retryCount++

      // Reintentar si no hemos excedido el máximo
      if (this.retryCount < this.maxRetries) {
        logger.info(`🔁 Retrying sync (${this.retryCount}/${this.maxRetries})`)
        setTimeout(() => this.syncQueue(), 5000)
      }

    } finally {
      this.isSyncing = false
      this.updatePendingCount()
      this.notifyStatusChange()
    }
  }

  private async syncItem(item: any): Promise<void> {
    const { action, collection, data, id } = item

    try {
      switch (action) {
        case 'CREATE':
          if (collection === 'orders') {
            // ...migrado a Supabase
          } else if (collection === 'sales') {
            // ...migrado a Supabase
          }
          break

        case 'UPDATE':
          if (collection === 'orders') {
            // ...migrado a Supabase
          } else if (collection === 'sales') {
            // ...migrado a Supabase
          }
          break

        case 'DELETE':
          if (collection === 'orders') {
            // ...migrado a Supabase
          } else if (collection === 'sales') {

          }
          break
      }

      // Marcar como sincronizado
      await indexedDBService.markAsSynced(id)
      logger.info(`✅ Synced ${collection} item:`, data.id)

    } catch (error) {
      logger.error(`❌ Failed to sync ${action} on ${collection}:`, error)
      throw error
    }
  }

  // ==================== AUTO SYNC ====================

  private startAutoSync(): void {
    // Sincronizar cada 30 segundos si hay items pendientes
    this.syncInterval = setInterval(async () => {
      if (this.isOnline() && !this.isSyncing) {
        const queue = await indexedDBService.getSyncQueue()
        if (queue.length > 0) {
          await this.syncQueue()
        }
      }
    }, 30000)

    logger.info('⏱️ Auto-sync started (every 30s)')
  }

  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
      logger.info('⏹️ Auto-sync stopped')
    }
  }

  // ==================== STATUS MANAGEMENT ====================

  private async updatePendingCount(): Promise<void> {
    const queue = await indexedDBService.getSyncQueue()
    this.pendingCount = queue.length
  }

  private notifyStatusChange(): void {
    const status: SyncStatus = {
      isSyncing: this.isSyncing,
      pending: this.pendingCount,
      lastSync: this.lastSyncTime,
      nextSync: this.syncInterval ? Date.now() + 30000 : undefined
    }

    this.statusCallbacks.forEach(cb => cb(status))
  }

  onStatusChange(callback: SyncStatusCallback): () => void {
    this.statusCallbacks.push(callback)

    // Retornar función para unsubscribe
    return () => {
      this.statusCallbacks = this.statusCallbacks.filter(cb => cb !== callback)
    }
  }

  getStatus(): SyncStatus {
    return {
      isSyncing: this.isSyncing,
      pending: this.pendingCount,
      lastSync: this.lastSyncTime,
      nextSync: this.syncInterval ? Date.now() + 30000 : undefined
    }
  }

  // ==================== CLEANUP ====================

  async clearSyncQueue(): Promise<void> {
    await indexedDBService.clear('sync_queue')
    this.pendingCount = 0
    logger.info('🗑️ Sync queue cleared')
  }

  async clearOldData(daysOld: number = 7): Promise<void> {
    await indexedDBService.clearOldData(daysOld)
    logger.info(`🗑️ Cleared data older than ${daysOld} days`)
  }

  destroy(): void {
    this.stopAutoSync()
    window.removeEventListener('online', () => this.onOnline())
    window.removeEventListener('offline', () => this.onOffline())
    logger.info('🛑 Offline Sync Service destroyed')
  }
}

export const offlineSyncService = new OfflineSyncService()
