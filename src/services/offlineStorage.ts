/**
 * Reisbloc POS - Offline Storage Engine
 * Utiliza IndexedDB (vía idb) para almacenar catálogos y colas de sincronización
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb'
import { Product, User } from '@/types'
import logger from '@/utils/logger'

export interface SyncOperation {
    id: string
    action: 'CREATE_ORDER' | 'UPDATE_ORDER' | 'CLOSE_ORDER' | 'CANCEL_ORDER' | 'SYNC_PRODUCTS'
    payload: any
    timestamp: number
    status: 'pending' | 'failed'
    retryCount: number
    error?: string
}

interface ReisblocDB extends DBSchema {
    products: {
        key: string
        value: Product & { updated_at_local?: number }
    }
    users: {
        key: string
        value: User & { updated_at_local?: number }
    }
    sync_queue: {
        key: string
        value: SyncOperation
        indexes: { 'by-status': string; 'by-timestamp': number }
    }
    metadata: {
        key: string
        value: { id: string; lastSync: number }
    }
}

import { useAppStore } from '@/store/appStore'

const DB_BASE_NAME = 'reisbloc_offline_db'
const DB_VERSION = 1

const dbPromises = new Map<string, Promise<IDBPDatabase<ReisblocDB>>>()

export const initOfflineDB = (orgId?: string) => {
    const dbName = orgId ? `${DB_BASE_NAME}_${orgId}` : DB_BASE_NAME
    if (!dbPromises.has(dbName)) {
        const promise = openDB<ReisblocDB>(dbName, DB_VERSION, {
            upgrade(db) {
                // Products Store
                if (!db.objectStoreNames.contains('products')) {
                    db.createObjectStore('products', { keyPath: 'id' })
                }

                // Users Store
                if (!db.objectStoreNames.contains('users')) {
                    db.createObjectStore('users', { keyPath: 'id' })
                }

                // Sync Queue Store
                if (!db.objectStoreNames.contains('sync_queue')) {
                    const syncStore = db.createObjectStore('sync_queue', { keyPath: 'id' })
                    syncStore.createIndex('by-status', 'status')
                    syncStore.createIndex('by-timestamp', 'timestamp')
                }

                // Metadata Store (for sync timestamps)
                if (!db.objectStoreNames.contains('metadata')) {
                    db.createObjectStore('metadata', { keyPath: 'id' })
                }
            },
        })
        dbPromises.set(dbName, promise)
    }
    return dbPromises.get(dbName)!
}

class OfflineStorageService {
    private resolveOrgId(explicitOrgId?: string): string {
        if (explicitOrgId) return explicitOrgId
        try {
            return useAppStore.getState().currentUser?.organizationId || ''
        } catch {
            return ''
        }
    }

    // === PRODUCTS ===
    async saveProducts(products: Product[], explicitOrgId?: string): Promise<void> {
        try {
            const orgId = this.resolveOrgId(explicitOrgId)
            const db = await initOfflineDB(orgId)
            const tx = db.transaction('products', 'readwrite')
            const now = Date.now()

            // Limpiar productos previos de este tenant para evitar artefactos eliminados
            await tx.store.clear()

            await Promise.all([
                ...products.map(p => tx.store.put({ ...p, updated_at_local: now })),
                tx.done
            ])

            await this.setLastSync('products', now, orgId)
        } catch (error) {
            logger.error('offline', 'Error saving products to IDB', error)
        }
    }

    async getProducts(explicitOrgId?: string): Promise<Product[]> {
        try {
            const orgId = this.resolveOrgId(explicitOrgId)
            const db = await initOfflineDB(orgId)
            return await db.getAll('products')
        } catch (error) {
            logger.error('offline', 'Error getting products from IDB', error)
            return []
        }
    }

    // === USERS ===
    async saveUsers(users: User[], explicitOrgId?: string): Promise<void> {
        try {
            const orgId = this.resolveOrgId(explicitOrgId)
            const db = await initOfflineDB(orgId)
            const tx = db.transaction('users', 'readwrite')
            const now = Date.now()

            await tx.store.clear()

            await Promise.all([
                ...users.map(u => tx.store.put({ ...u, updated_at_local: now })),
                tx.done
            ])

            await this.setLastSync('users', now, orgId)
        } catch (error) {
            logger.error('offline', 'Error saving users to IDB', error)
        }
    }

    async getUsers(explicitOrgId?: string): Promise<User[]> {
        try {
            const orgId = this.resolveOrgId(explicitOrgId)
            const db = await initOfflineDB(orgId)
            return await db.getAll('users')
        } catch (error) {
            logger.error('offline', 'Error getting users from IDB', error)
            return []
        }
    }

    // === SYNC QUEUE ===
    async addToSyncQueue(operation: Omit<SyncOperation, 'id' | 'timestamp' | 'status' | 'retryCount'>, explicitOrgId?: string): Promise<string> {
        try {
            const orgId = this.resolveOrgId(explicitOrgId)
            const db = await initOfflineDB(orgId)
            const id = crypto.randomUUID()
            const syncOp: SyncOperation = {
                ...operation,
                id,
                timestamp: Date.now(),
                status: 'pending',
                retryCount: 0
            }

            await db.put('sync_queue', syncOp)

            // Intentar forzar un procesado del service worker si es posible
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({ type: 'NEW_SYNC_ITEM' })
            }

            return id
        } catch (error) {
            logger.error('offline', 'Error adding to sync queue', error)
            throw error
        }
    }

    async getPendingSyncOperations(explicitOrgId?: string): Promise<SyncOperation[]> {
        try {
            const orgId = this.resolveOrgId(explicitOrgId)
            const db = await initOfflineDB(orgId)
            return await db.getAllFromIndex('sync_queue', 'by-status', 'pending')
        } catch (error) {
            logger.error('offline', 'Error getting sync queue', error)
            return []
        }
    }

    async updateSyncOperation(id: string, updates: Partial<SyncOperation>, explicitOrgId?: string): Promise<void> {
        try {
            const orgId = this.resolveOrgId(explicitOrgId)
            const db = await initOfflineDB(orgId)
            const tx = db.transaction('sync_queue', 'readwrite')
            const item = await tx.store.get(id)

            if (item) {
                await tx.store.put({ ...item, ...updates })
            }
            await tx.done
        } catch (error) {
            logger.error('offline', 'Error updating sync operation', error)
        }
    }

    async removeSyncOperation(id: string, explicitOrgId?: string): Promise<void> {
        try {
            const orgId = this.resolveOrgId(explicitOrgId)
            const db = await initOfflineDB(orgId)
            await db.delete('sync_queue', id)
        } catch (error) {
            logger.error('offline', 'Error removing sync operation', error)
        }
    }

    // === METADATA ===
    async setLastSync(entity: string, timestamp: number, explicitOrgId?: string): Promise<void> {
        try {
            const orgId = this.resolveOrgId(explicitOrgId)
            const db = await initOfflineDB(orgId)
            await db.put('metadata', { id: `last_sync_${entity}`, lastSync: timestamp })
        } catch (error) {
            console.warn('Could not save sync metadata', error)
        }
    }

    async getLastSync(entity: string, explicitOrgId?: string): Promise<number | null> {
        try {
            const orgId = this.resolveOrgId(explicitOrgId)
            const db = await initOfflineDB(orgId)
            const data = await db.get('metadata', `last_sync_${entity}`)
            return data ? data.lastSync : null
        } catch (error) {
            return null
        }
    }

    async clearAllData(explicitOrgId?: string): Promise<void> {
        try {
            const orgId = this.resolveOrgId(explicitOrgId)
            
            // 1. Limpiar base de datos del tenant actual
            const db = await initOfflineDB(orgId)
            const tx = db.transaction(['products', 'users', 'metadata', 'sync_queue'], 'readwrite')
            await Promise.all([
                tx.objectStore('products').clear(),
                tx.objectStore('users').clear(),
                tx.objectStore('metadata').clear(),
                tx.objectStore('sync_queue').clear(),
                tx.done
            ])

            // 2. Limpiar base de datos legacy general si existe
            if (orgId) {
                try {
                    const legacyDb = await initOfflineDB('')
                    const legacyTx = legacyDb.transaction(['products', 'users', 'metadata', 'sync_queue'], 'readwrite')
                    await Promise.all([
                        legacyTx.objectStore('products').clear(),
                        legacyTx.objectStore('users').clear(),
                        legacyTx.objectStore('metadata').clear(),
                        legacyTx.objectStore('sync_queue').clear(),
                        legacyTx.done
                    ])
                } catch (e) {}
            }

            // 3. Resetear mapa de promesas de DBs
            dbPromises.clear()
        } catch (error) {
            logger.error('offline', 'Error clearing offline data', error)
        }
    }
}

export const offlineStorage = new OfflineStorageService()
