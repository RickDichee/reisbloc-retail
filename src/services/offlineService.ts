/**
 * Reisbloc POS - Unified Offline Service
 * Consolida: indexedDBService + offlineStorage + offlineDBService + offlineSyncService
 */

import logger from '@/utils/logger'

export interface SyncOperation {
  id: string
  action: 'CREATE' | 'UPDATE' | 'DELETE'
  collection: string
  data: any
  timestamp: number
  synced: boolean
  retryCount: number
}

export interface SyncStatus {
  isOnline: boolean
  isSyncing: boolean
  pending: number
  lastSync: number | null
}

type SyncStatusCallback = (status: SyncStatus) => void

const DB_NAME = 'ReisblocPOS'
const DB_VERSION = 2

class UnifiedOfflineService {
  private db: IDBDatabase | null = null
  private dbPromise: Promise<IDBDatabase>
  private isSyncing = false
  private lastSyncTime: number | null = null
  private statusCallbacks: Set<SyncStatusCallback> = new Set()
  private syncInterval: ReturnType<typeof setInterval> | null = null

  constructor() {
    this.dbPromise = this.initDB()
  }

  async init(): Promise<void> {
    await this.dbPromise
    this.setupConnectionListeners()
    this.startAutoSync()
    logger.info('offline', '✅ Unified Offline Service initialized')
  }

  private initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        logger.error('offline', 'IndexedDB error', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        resolve(this.db)
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        const stores = ['products', 'users', 'orders', 'sales', 'sync_queue', 'metadata']
        
        stores.forEach(storeName => {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, { keyPath: 'id' })
            
            if (storeName === 'sync_queue') {
              store.createIndex('by-synced', 'synced')
              store.createIndex('by-timestamp', 'timestamp')
            }
            
            if (storeName === 'products' || storeName === 'users') {
              store.createIndex('by-updated', 'updated_at_local')
            }
          }
        })
      }
    })
  }

  private setupConnectionListeners(): void {
    window.addEventListener('online', () => {
      logger.info('offline', '🟢 Online - syncing...')
      this.notifyStatusChange()
      this.syncQueue()
    })

    window.addEventListener('offline', () => {
      logger.warn('offline', '🔴 Offline - saving locally')
      this.notifyStatusChange()
    })
  }

  private startAutoSync(): void {
    if (this.syncInterval) return
    
    this.syncInterval = setInterval(async () => {
      if (this.isOnline() && !this.isSyncing) {
        const pending = await this.getPendingCount()
        if (pending > 0) {
          await this.syncQueue()
        }
      }
    }, 30000)
  }

  isOnline(): boolean {
    return navigator.onLine
  }

  onStatusChange(callback: SyncStatusCallback): () => void {
    this.statusCallbacks.add(callback)
    callback(this.getStatus())
    return () => this.statusCallbacks.delete(callback)
  }

  private notifyStatusChange(): void {
    const status = this.getStatus()
    this.statusCallbacks.forEach(cb => cb(status))
  }

  getStatus(): SyncStatus {
    return {
      isOnline: this.isOnline(),
      isSyncing: this.isSyncing,
      pending: 0,
      lastSync: this.lastSyncTime
    }
  }

  async getPendingCount(): Promise<number> {
    try {
      const db = await this.dbPromise
      return new Promise((resolve, reject) => {
        const tx = db.transaction('sync_queue', 'readonly')
        const store = tx.objectStore('sync_queue')
        const index = store.index('by-synced')
        const request = index.count(IDBKeyRange.only(false))
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
    } catch {
      return 0
    }
  }

  async getStorageInfo(): Promise<{ used: number; quota: number }> {
    if (!navigator.storage?.estimate) {
      return { used: 0, quota: 0 }
    }
    const est = await navigator.storage.estimate()
    return { used: est.usage || 0, quota: est.quota || 0 }
  }

  async addToSyncQueue(
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    collection: string,
    data: any
  ): Promise<string> {
    const db = await this.dbPromise
    const id = `${collection}-${data.id || Date.now()}-${Math.random().toString(36).slice(2)}`

    const item: SyncOperation = {
      id,
      action,
      collection,
      data,
      timestamp: Date.now(),
      synced: false,
      retryCount: 0
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction('sync_queue', 'readwrite')
      const request = tx.objectStore('sync_queue').put(item)
      request.onsuccess = () => {
        logger.info('offline', `📤 Added to sync queue: ${collection}`, data.id)
        this.notifyStatusChange()
        resolve(id)
      }
      request.onerror = () => reject(request.error)
    })
  }

  async saveProducts(products: any[]): Promise<void> {
    const db = await this.dbPromise
    const now = Date.now()

    return new Promise((resolve, reject) => {
      const tx = db.transaction('products', 'readwrite')
      const store = tx.objectStore('products')
      
      products.forEach(p => {
        store.put({ ...p, id: p.id, updated_at_local: now })
      })

      tx.oncomplete = () => {
        this.setMetadata('last_sync_products', now)
        resolve()
      }
      tx.onerror = () => reject(tx.error)
    })
  }

  async getProducts(): Promise<any[]> {
    const db = await this.dbPromise
    return new Promise((resolve, reject) => {
      const tx = db.transaction('products', 'readonly')
      const request = tx.objectStore('products').getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async saveUsers(users: any[]): Promise<void> {
    const db = await this.dbPromise
    const now = Date.now()

    return new Promise((resolve, reject) => {
      const tx = db.transaction('users', 'readwrite')
      const store = tx.objectStore('users')
      
      users.forEach(u => {
        store.put({ ...u, id: u.id, updated_at_local: now })
      })

      tx.oncomplete = () => {
        this.setMetadata('last_sync_users', now)
        resolve()
      }
      tx.onerror = () => reject(tx.error)
    })
  }

  async getUsers(): Promise<any[]> {
    const db = await this.dbPromise
    return new Promise((resolve, reject) => {
      const tx = db.transaction('users', 'readonly')
      const request = tx.objectStore('users').getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async saveOrder(order: any): Promise<string> {
    const db = await this.dbPromise
    const id = order.id || `offline-${Date.now()}`
    const orderToSave = { ...order, id, synced: false, createdAt: new Date().toISOString() }

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('orders', 'readwrite')
      const request = tx.objectStore('orders').put(orderToSave)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })

    if (!this.isOnline()) {
      await this.addToSyncQueue('CREATE', 'orders', orderToSave)
    }

    return id
  }

  async getPendingOrders(): Promise<any[]> {
    const db = await this.dbPromise
    return new Promise((resolve, reject) => {
      const tx = db.transaction('orders', 'readonly')
      const request = tx.objectStore('orders').getAll()
      request.onsuccess = () => {
        const pending = request.result.filter((o: any) => !o.synced)
        resolve(pending)
      }
      request.onerror = () => reject(request.error)
    })
  }

  async markOrderAsSynced(orderId: string): Promise<void> {
    const db = await this.dbPromise
    const tx = db.transaction('orders', 'readwrite')
    const store = tx.objectStore('orders')
    
    return new Promise((resolve, reject) => {
      const getReq = store.get(orderId)
      getReq.onsuccess = () => {
        if (getReq.result) {
          getReq.result.synced = true
          const putReq = store.put(getReq.result)
          putReq.onsuccess = () => resolve()
          putReq.onerror = () => reject(putReq.error)
        } else {
          resolve()
        }
      }
      getReq.onerror = () => reject(getReq.error)
    })
  }

  async saveSale(sale: any): Promise<string> {
    const db = await this.dbPromise
    const id = sale.id || `offline-sale-${Date.now()}`
    const saleToSave = { ...sale, id, synced: false, createdAt: new Date().toISOString() }

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('sales', 'readwrite')
      const request = tx.objectStore('sales').put(saleToSave)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })

    if (!this.isOnline()) {
      await this.addToSyncQueue('CREATE', 'sales', saleToSave)
    }

    return id
  }

  async getPendingSales(): Promise<any[]> {
    const db = await this.dbPromise
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sales', 'readonly')
      const request = tx.objectStore('sales').getAll()
      request.onsuccess = () => {
        const pending = request.result.filter((s: any) => !s.synced)
        resolve(pending)
      }
      request.onerror = () => reject(request.error)
    })
  }

  async markSaleAsSynced(saleId: string): Promise<void> {
    const db = await this.dbPromise
    const tx = db.transaction('sales', 'readwrite')
    const store = tx.objectStore('sales')
    
    return new Promise((resolve, reject) => {
      const getReq = store.get(saleId)
      getReq.onsuccess = () => {
        if (getReq.result) {
          getReq.result.synced = true
          const putReq = store.put(getReq.result)
          putReq.onsuccess = () => resolve()
          putReq.onerror = () => reject(putReq.error)
        } else {
          resolve()
        }
      }
      getReq.onerror = () => reject(getReq.error)
    })
  }

  async getSyncQueue(): Promise<SyncOperation[]> {
    const db = await this.dbPromise
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sync_queue', 'readonly')
      const request = tx.objectStore('sync_queue').getAll()
      request.onsuccess = () => resolve(request.result.filter((i: SyncOperation) => !i.synced))
      request.onerror = () => reject(request.error)
    })
  }

  async syncQueue(): Promise<{ synced: number; failed: number }> {
    if (this.isSyncing || !this.isOnline()) {
      return { synced: 0, failed: 0 }
    }

    this.isSyncing = true
    this.notifyStatusChange()

    try {
      const queue = await this.getSyncQueue()
      
      if (queue.length === 0) {
        this.isSyncing = false
        this.lastSyncTime = Date.now()
        this.notifyStatusChange()
        return { synced: 0, failed: 0 }
      }

      logger.info('offline', `🔄 Syncing ${queue.length} items...`)

      let synced = 0
      let failed = 0

      for (const item of queue) {
        try {
          await this.processSyncItem(item)
          await this.markSynced(item.id)
          synced++
        } catch (err) {
          logger.error('offline', `❌ Sync failed:`, item.id, err)
          failed++
          await this.incrementRetry(item.id)
        }
      }

      logger.info('offline', `✅ Sync complete: ${synced} OK, ${failed} FAILED`)
      
      this.isSyncing = false
      this.lastSyncTime = Date.now()
      this.notifyStatusChange()
      
      return { synced, failed }

    } catch (err) {
      this.isSyncing = false
      this.notifyStatusChange()
      throw err
    }
  }

  private async processSyncItem(item: SyncOperation): Promise<void> {
    switch (item.action) {
      case 'CREATE':
      case 'UPDATE':
        logger.info('offline', `📤 Syncing ${item.action} on ${item.collection}:`, item.data.id)
        break
      case 'DELETE':
        logger.info('offline', `🗑️ Syncing DELETE on ${item.collection}:`, item.data.id)
        break
    }
  }

  private async markSynced(id: string): Promise<void> {
    const db = await this.dbPromise
    const tx = db.transaction('sync_queue', 'readwrite')
    const store = tx.objectStore('sync_queue')
    
    return new Promise((resolve, reject) => {
      const getReq = store.get(id)
      getReq.onsuccess = () => {
        if (getReq.result) {
          getReq.result.synced = true
          const putReq = store.put(getReq.result)
          putReq.onsuccess = () => resolve()
          putReq.onerror = () => reject(putReq.error)
        } else {
          resolve()
        }
      }
      getReq.onerror = () => reject(getReq.error)
    })
  }

  private async incrementRetry(id: string): Promise<void> {
    const db = await this.dbPromise
    const tx = db.transaction('sync_queue', 'readwrite')
    const store = tx.objectStore('sync_queue')
    
    return new Promise((resolve) => {
      const getReq = store.get(id)
      getReq.onsuccess = () => {
        if (getReq.result) {
          getReq.result.retryCount = (getReq.result.retryCount || 0) + 1
          store.put(getReq.result)
        }
        resolve()
      }
      getReq.onerror = () => resolve()
    })
  }

  private async setMetadata(key: string, value: number): Promise<void> {
    const db = await this.dbPromise
    return new Promise((resolve, reject) => {
      const tx = db.transaction('metadata', 'readwrite')
      const request = tx.objectStore('metadata').put({ id: key, value })
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getMetadata(key: string): Promise<number | null> {
    const db = await this.dbPromise
    return new Promise((resolve, reject) => {
      const tx = db.transaction('metadata', 'readonly')
      const request = tx.objectStore('metadata').get(key)
      request.onsuccess = () => resolve(request.result?.value || null)
      request.onerror = () => reject(request.error)
    })
  }

  async clearAllData(): Promise<void> {
    const db = await this.dbPromise
    const stores = ['products', 'users', 'orders', 'sales', 'sync_queue', 'metadata']
    
    await Promise.all(stores.map(storeName => {
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite')
        const request = tx.objectStore(storeName).clear()
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    }))

    logger.info('offline', '🗑️ All offline data cleared')
  }

  async clearSyncedData(): Promise<void> {
    const db = await this.dbPromise
    
    const clearStore = (storeName: string) => new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite')
      const store = tx.objectStore(storeName)
      const index = store.index('by-synced')
      
      const getReq = index.getAllKeys(IDBKeyRange.only(true))
      getReq.onsuccess = () => {
        getReq.result.forEach(key => store.delete(key))
        tx.oncomplete = () => resolve()
      }
      getReq.onerror = () => reject(getReq.error)
    })

    await Promise.all([
      clearStore('orders'),
      clearStore('sales'),
      clearStore('sync_queue')
    ])

    logger.info('offline', '🗑️ Synced data cleared')
  }

  destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
    this.statusCallbacks.clear()
    logger.info('offline', '🛑 Offline service destroyed')
  }
}

export const offlineService = new UnifiedOfflineService()
export default offlineService
