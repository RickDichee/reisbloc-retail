import logger from '@/utils/logger'

const CACHE_NAME = 'reisbloc-product-images-v1'
const DB_NAME = 'reisbloc_offline_db'
const DB_VERSION = 1
const STORE_PRODUCTS = 'products_cache'

/**
 * Servicio de Almacenamiento Caching de Imágenes y Datos Offline
 * Garantiza carga a 0ms de productos e imágenes en conexiones lentas o sin internet.
 */
class ImageCacheService {
  private dbPromise: Promise<IDBDatabase | null> | null = null

  constructor() {
    if (typeof window !== 'undefined' && 'indexedDB' in window) {
      this.dbPromise = this.initDB()
    }
  }

  private initDB(): Promise<IDBDatabase | null> {
    return new Promise((resolve) => {
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION)
        request.onupgradeneeded = (e: any) => {
          const db = e.target.result
          if (!db.objectStoreNames.contains(STORE_PRODUCTS)) {
            db.createObjectStore(STORE_PRODUCTS, { keyPath: 'id' })
          }
        }
        request.onsuccess = (e: any) => resolve(e.target.result)
        request.onerror = () => resolve(null)
      } catch (err) {
        resolve(null)
      }
    })
  }

  /**
   * Pre-carga y almacena en caché de navegador las imágenes del catálogo en segundo plano.
   */
  async preloadProductImages(imageUrls: string[]): Promise<void> {
    if (!('caches' in window) || !imageUrls || imageUrls.length === 0) return

    try {
      const cache = await caches.open(CACHE_NAME)
      const validUrls = Array.from(new Set(imageUrls.filter(url => url && url.startsWith('http'))))

      // Pre-cargar hasta 50 imágenes en paralelo con prioridad baja
      const fetchPromises = validUrls.slice(0, 50).map(async (url) => {
        try {
          const match = await cache.match(url)
          if (!match) {
            const response = await fetch(url, { mode: 'cors', cache: 'force-cache' })
            if (response.ok) {
              await cache.put(url, response.clone())
            }
          }
        } catch (e) {
          // Ignorar errores individuales de imágenes externas
        }
      })

      await Promise.allSettled(fetchPromises)
      logger.info('cache', `✅ ${validUrls.length} imágenes del catálogo sincronizadas en caché local.`)
    } catch (err) {
      logger.warn('cache', 'Error en precarga de imágenes:', err as any)
    }
  }

  /**
   * Guarda el catálogo entero de productos en IndexedDB y localStorage para acceso instantáneo (0ms).
   */
  async saveCachedProducts(products: any[]): Promise<void> {
    if (!products || products.length === 0) return

    // 1. Guardar copia en localStorage para fallback inmediato
    try {
      localStorage.setItem('cached_retail_products', JSON.stringify(products))
    } catch (e) {}

    // 2. Guardar en IndexedDB
    try {
      const db = await this.dbPromise
      if (db) {
        const tx = db.transaction(STORE_PRODUCTS, 'readwrite')
        const store = tx.objectStore(STORE_PRODUCTS)
        store.clear()
        products.forEach(prod => store.put(prod))
      }
    } catch (err) {
      logger.warn('cache', 'Error guardando productos en IndexedDB:', err as any)
    }

    // 3. Disparar precarga de imágenes asociadas
    const imageUrls = products.map(p => p.image).filter(Boolean)
    this.preloadProductImages(imageUrls)
  }

  /**
   * Obtiene los productos cacheados localmente si no hay conexión o mientras carga Supabase.
   */
  async getCachedProducts(): Promise<any[]> {
    // 1. Intentar desde IndexedDB
    try {
      const db = await this.dbPromise
      if (db) {
        const tx = db.transaction(STORE_PRODUCTS, 'readonly')
        const store = tx.objectStore(STORE_PRODUCTS)
        const all = await new Promise<any[]>((resolve) => {
          const req = store.getAll()
          req.onsuccess = () => resolve(req.result || [])
          req.onerror = () => resolve([])
        })

        if (all && all.length > 0) return all
      }
    } catch (e) {}

    // 2. Fallback a localStorage
    try {
      const raw = localStorage.getItem('cached_retail_products')
      if (raw) return JSON.parse(raw)
    } catch (e) {}

    return []
  }
}

export const imageCacheService = new ImageCacheService()
export default imageCacheService
