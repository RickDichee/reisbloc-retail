// IndexedDB para almacenar datos offline
// Almacena: órdenes, ventas, productos, usuarios
import logger from '@/utils/logger'

const DB_NAME = 'TPVSolutions'
const DB_VERSION = 1

export interface CachedOrder {
  id?: string
  tableNumber: number
  items: any[]
  status: string
  createdBy: string
  createdAt: string
  synced: boolean
}

export interface CachedSale {
  id?: string
  tableNumber: number
  items: any[]
  total: number
  paymentMethod: string
  createdAt: string
  synced: boolean
}

class OfflineDBService {
  private db: IDBDatabase | null = null
  private dbPromise: Promise<IDBDatabase>

  constructor() {
    this.dbPromise = this.initDB()
  }

  /**
   * Inicializar IndexedDB
   */
  private initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        logger.error('offline-db', 'Error opening IndexedDB', request.error as any)
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        logger.info('offline-db', 'IndexedDB inicializado')
        resolve(this.db)
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Crear object stores si no existen
        if (!db.objectStoreNames.contains('orders')) {
          const orderStore = db.createObjectStore('orders', { keyPath: 'id' })
          orderStore.createIndex('synced', 'synced', { unique: false })
          orderStore.createIndex('createdAt', 'createdAt', { unique: false })
        }

        if (!db.objectStoreNames.contains('sales')) {
          const saleStore = db.createObjectStore('sales', { keyPath: 'id' })
          saleStore.createIndex('synced', 'synced', { unique: false })
          saleStore.createIndex('createdAt', 'createdAt', { unique: false })
        }

        if (!db.objectStoreNames.contains('products')) {
          db.createObjectStore('products', { keyPath: 'id' })
        }

        if (!db.objectStoreNames.contains('users')) {
          db.createObjectStore('users', { keyPath: 'id' })
        }

        logger.info('offline-db', 'IndexedDB schema initialized')
      }
    })
  }

  /**
   * Guardar orden offline
   */
  async saveOrderOffline(order: CachedOrder): Promise<void> {
    const db = await this.dbPromise
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['orders'], 'readwrite')
      const store = transaction.objectStore('orders')
      const request = store.add({
        ...order,
        id: order.id || `offline-${Date.now()}-${Math.random()}`,
        synced: false,
        createdAt: new Date().toISOString()
      })

      request.onerror = () => {
        logger.error('offline-db', 'Error saving order offline', request.error as any)
        reject(request.error)
      }
      request.onsuccess = () => {
        logger.info('offline-db', 'Orden guardada offline', request.result)
        resolve()
      }
    })
  }

  /**
   * Obtener órdenes pendientes de sincronizar
   */
  async getPendingOrders(): Promise<CachedOrder[]> {
    const db = await this.dbPromise
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['orders'], 'readonly')
      const store = transaction.objectStore('orders')
      const request = store.getAll()

      request.onerror = () => {
        logger.error('offline-db', 'Error getting pending orders', request.error as any)
        reject(request.error)
      }
      request.onsuccess = () => {
        const pendingOrders = request.result.filter((order: CachedOrder) => !order.synced)
        logger.info('offline-db', `${pendingOrders.length} órdenes pendientes`)
        resolve(pendingOrders)
      }
    })
  }

  /**
   * Marcar orden como sincronizada
   */
  async markOrderAsSynced(orderId: string): Promise<void> {
    const db = await this.dbPromise
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['orders'], 'readwrite')
      const store = transaction.objectStore('orders')
      const request = store.get(orderId)

      request.onerror = () => {
        logger.error('offline-db', 'Error reading order to mark as synced', request.error as any)
        reject(request.error)
      }
      request.onsuccess = () => {
        if (request.result) {
          request.result.synced = true
          const updateRequest = store.put(request.result)
          updateRequest.onerror = () => {
            logger.error('offline-db', 'Error updating order as synced', updateRequest.error as any)
            reject(updateRequest.error)
          }
          updateRequest.onsuccess = () => {
            logger.info('offline-db', 'Orden marcada como sincronizada', orderId)
            resolve()
          }
        }
      }
    })
  }

  /**
   * Guardar venta offline
   */
  async saveSaleOffline(sale: CachedSale): Promise<void> {
    const db = await this.dbPromise
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['sales'], 'readwrite')
      const store = transaction.objectStore('sales')
      const request = store.add({
        ...sale,
        id: sale.id || `offline-sale-${Date.now()}-${Math.random()}`,
        synced: false,
        createdAt: new Date().toISOString()
      })

      request.onerror = () => {
        logger.error('offline-db', 'Error saving sale offline', request.error as any)
        reject(request.error)
      }
      request.onsuccess = () => {
        logger.info('offline-db', 'Venta guardada offline', request.result)
        resolve()
      }
    })
  }

  /**
   * Obtener ventas pendientes de sincronizar
   */
  async getPendingSales(): Promise<CachedSale[]> {
    const db = await this.dbPromise
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['sales'], 'readonly')
      const store = transaction.objectStore('sales')
      const request = store.getAll()

      request.onerror = () => {
        logger.error('offline-db', 'Error getting pending sales', request.error as any)
        reject(request.error)
      }
      request.onsuccess = () => {
        const pendingSales = request.result.filter((sale: CachedSale) => !sale.synced)
        logger.info('offline-db', `${pendingSales.length} ventas pendientes`)
        resolve(pendingSales)
      }
    })
  }

  /**
   * Marcar venta como sincronizada
   */
  async markSaleAsSynced(saleId: string): Promise<void> {
    const db = await this.dbPromise
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['sales'], 'readwrite')
      const store = transaction.objectStore('sales')
      const request = store.get(saleId)

      request.onerror = () => {
        logger.error('offline-db', 'Error reading sale to mark as synced', request.error as any)
        reject(request.error)
      }
      request.onsuccess = () => {
        if (request.result) {
          request.result.synced = true
          const updateRequest = store.put(request.result)
          updateRequest.onerror = () => {
            logger.error('offline-db', 'Error updating sale as synced', updateRequest.error as any)
            reject(updateRequest.error)
          }
          updateRequest.onsuccess = () => {
            logger.info('offline-db', 'Venta marcada como sincronizada', saleId)
            resolve()
          }
        }
      }
    })
  }

  /**
   * Guardar productos en cache (para búsqueda offline)
   */
  async cacheProducts(products: any[]): Promise<void> {
    const db = await this.dbPromise
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['products'], 'readwrite')
      const store = transaction.objectStore('products')
      
      // Limpiar cache anterior
      store.clear()
      
      // Agregar nuevos productos
      products.forEach(product => {
        store.add(product)
      })

      transaction.onerror = () => {
        logger.error('offline-db', 'Error caching products', transaction.error as any)
        reject(transaction.error)
      }
      transaction.oncomplete = () => {
        logger.info('offline-db', `${products.length} productos en cache`)
        resolve()
      }
    })
  }

  /**
   * Obtener productos en cache
   */
  async getCachedProducts(): Promise<any[]> {
    const db = await this.dbPromise
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['products'], 'readonly')
      const store = transaction.objectStore('products')
      const request = store.getAll()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        resolve(request.result)
      }
    })
  }

  /**
   * Limpiar datos offline después de sincronizar
   */
  async clearSyncedData(): Promise<void> {
    const db = await this.dbPromise
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['orders', 'sales'], 'readwrite')
      
      // Eliminar órdenes sincronizadas
      const ordersStore = transaction.objectStore('orders')
      const ordersIndex = ordersStore.index('synced')
      ordersIndex.getAll().onsuccess = (e) => {
        (e.target as IDBRequest).result.forEach((order: any) => {
          ordersStore.delete(order.id)
        })
      }

      // Eliminar ventas sincronizadas
      const salesStore = transaction.objectStore('sales')
      const salesIndex = salesStore.index('synced')
      salesIndex.getAll().onsuccess = (e) => {
        (e.target as IDBRequest).result.forEach((sale: any) => {
          salesStore.delete(sale.id)
        })
      }

      transaction.onerror = () => {
        logger.error('offline-db', 'Error clearing synced data', transaction.error as any)
        reject(transaction.error)
      }
      transaction.oncomplete = () => {
        logger.info('offline-db', 'Datos sincronizados eliminados')
        resolve()
      }
    })
  }
}

export default new OfflineDBService()
