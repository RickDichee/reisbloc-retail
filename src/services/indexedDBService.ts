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

/**
 * IndexedDB Service para almacenamiento local offline
 * 
 * Estructura:
 * - orders: órdenes pendientes
 * - sales: ventas completadas
 * - products: productos (cache)
 * - users: usuarios (cache)
 * - sync_queue: cola de sincronización
 */

interface StorageObject {
  id: string
  data: any
  timestamp: number
  synced?: boolean
}

class IndexedDBService {
  private dbName = 'ReisblocPOS'
  private version = 1
  private db: IDBDatabase | null = null

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        console.log('✅ IndexedDB initialized')
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Object Stores
        const stores = ['orders', 'sales', 'products', 'users', 'sync_queue']
        stores.forEach(store => {
          if (!db.objectStoreNames.contains(store)) {
            db.createObjectStore(store, { keyPath: 'id' })
          }
        })

        console.log('📦 IndexedDB schema created')
      }
    })
  }

  // ==================== CRUD OPERATIONS ====================

  async set(storeName: string, data: any): Promise<void> {
    if (!this.db) throw new Error('IndexedDB not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)

      const obj: StorageObject = {
        id: data.id || `${Date.now()}`,
        data,
        timestamp: Date.now(),
        synced: false
      }

      const request = store.put(obj)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async get(storeName: string, id: string): Promise<any> {
    if (!this.db) throw new Error('IndexedDB not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.get(id)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result?.data)
    })
  }

  async getAll(storeName: string): Promise<any[]> {
    if (!this.db) throw new Error('IndexedDB not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.getAll()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const results = request.result.map((item: StorageObject) => item.data)
        resolve(results)
      }
    })
  }

  async delete(storeName: string, id: string): Promise<void> {
    if (!this.db) throw new Error('IndexedDB not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.delete(id)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async clear(storeName: string): Promise<void> {
    if (!this.db) throw new Error('IndexedDB not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.clear()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  // ==================== SYNC QUEUE ====================

  async addToSyncQueue(
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    collection: string,
    data: any
  ): Promise<void> {
    const queueItem = {
      id: `${collection}-${data.id}-${Date.now()}`,
      action,
      collection,
      data,
      timestamp: Date.now(),
      synced: false
    }

    await this.set('sync_queue', queueItem)
    console.log('📤 Item added to sync queue:', collection, data.id)
  }

  async getSyncQueue(): Promise<any[]> {
    const queue = await this.getAll('sync_queue')
    return queue.filter((item: any) => !item.synced)
  }

  async markAsSynced(id: string): Promise<void> {
    if (!this.db) throw new Error('IndexedDB not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sync_queue'], 'readwrite')
      const store = transaction.objectStore('sync_queue')
      const request = store.get(id)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const item = request.result
        if (item) {
          item.synced = true
          const updateRequest = store.put(item)
          updateRequest.onerror = () => reject(updateRequest.error)
          updateRequest.onsuccess = () => resolve()
        } else {
          resolve()
        }
      }
    })
  }

  // ==================== STORAGE SIZE ====================

  async getStorageSize(): Promise<{ used: number; quota: number }> {
    if (!navigator.storage?.estimate) {
      console.warn('Storage API not available')
      return { used: 0, quota: 0 }
    }

    const estimate = await navigator.storage.estimate()
    return {
      used: estimate.usage || 0,
      quota: estimate.quota || 0
    }
  }

  async clearOldData(daysOld: number = 7): Promise<void> {
    const cutoffTime = Date.now() - daysOld * 24 * 60 * 60 * 1000

    const stores = ['orders', 'sales', 'products', 'users']
    for (const store of stores) {
      const items = await this.getAll(store)
      for (const item of items) {
        if (item.timestamp < cutoffTime) {
          await this.delete(store, item.id)
        }
      }
    }

    console.log(`🗑️ Cleared data older than ${daysOld} days`)
  }
}

export const indexedDBService = new IndexedDBService()
