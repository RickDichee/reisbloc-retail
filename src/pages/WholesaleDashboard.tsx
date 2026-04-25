import { useState, useEffect } from 'react'
import { supabase } from '@/config/supabase'
import { useAppStore } from '@/store/appStore'
import { Package, Plus, Upload, DollarSign, TrendingUp, Users, Search, Edit, Trash2, Loader2, BarChart3, Store } from 'lucide-react'

interface WholesalerProduct {
  id: string
  product_name: string
  description: string | null
  wholesale_price: number
  min_order_quantity: number
  category: string | null
  image_url: string | null
  created_at: string
}

interface StoreAnalytics {
  store_id: string
  store_name: string
  products_added: number
  last_order: string | null
}

export default function WholesaleDashboard() {
  const { currentUser } = useAppStore()
  const [products, setProducts] = useState<WholesalerProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [search, setSearch] = useState('')
  const [editingProduct, setEditingProduct] = useState<WholesalerProduct | null>(null)
  const [analytics, setAnalytics] = useState<StoreAnalytics[]>([])
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [activeTab, setActiveTab] = useState<'products' | 'analytics'>('products')

  useEffect(() => {
    loadProducts()
    loadAnalytics()
  }, [])

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('wholesale_catalog')
        .select('*')
        .eq('wholesaler_id', currentUser?.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setProducts(data || [])
    } catch (err) {
      console.error('Error loading products:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadAnalytics = async () => {
    try {
      // Get stores that have added this wholesaler's products
      const { data: inventoryData, error } = await supabase
        .from('store_inventory')
        .select(`
          store_id,
          stores!inner(id, name),
          wholesale_catalog!inner(wholesaler_id)
        `)
        .eq('wholesale_catalog.wholesaler_id', currentUser?.id)

      if (error) throw error

      // Aggregate by store
      const storeMap = new Map<string, StoreAnalytics>()
      
      inventoryData?.forEach((item: any) => {
        const storeId = item.stores?.id
        if (!storeId) return
        
        if (!storeMap.has(storeId)) {
          storeMap.set(storeId, {
            store_id: storeId,
            store_name: item.stores?.name || 'Unknown',
            products_added: 0,
            last_order: null
          })
        }
        
        const store = storeMap.get(storeId)!
        store.products_added++
      })

      setAnalytics(Array.from(storeMap.values()))
    } catch (err) {
      console.error('Error loading analytics:', err)
    }
  }

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim())
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())

      const newProducts = []
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim())
        const product: any = { wholesaler_id: currentUser?.id }

        headers.forEach((header, index) => {
          const value = values[index]
          if (header.includes('name')) product.product_name = value
          if (header.includes('description') || header.includes('desc')) product.description = value
          if (header.includes('price') || header.includes('costo')) product.wholesale_price = parseFloat(value) || 0
          if (header.includes('min') || header.includes('quantity')) product.min_order_quantity = parseInt(value) || 1
          if (header.includes('category') || header.includes('cat')) product.category = value
          if (header.includes('image') || header.includes('url')) product.image_url = value
        })

        if (product.product_name && product.wholesale_price > 0) {
          newProducts.push(product)
        }
      }

      if (newProducts.length > 0) {
        const { error } = await supabase.from('wholesale_catalog').insert(newProducts)
        if (error) throw error
        await loadProducts()
        alert(`Se importaron ${newProducts.length} productos`)
      } else {
        alert('No se encontraron productos validos en el CSV')
      }
    } catch (err: any) {
      console.error('Error uploading CSV:', err)
      alert('Error al importar: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Estas seguro de eliminar este producto?')) return

    try {
      const { error } = await supabase.from('wholesale_catalog').delete().eq('id', productId)
      if (error) throw error
      setProducts(products.filter(p => p.id !== productId))
    } catch (err) {
      console.error('Error deleting product:', err)
    }
  }

  const handleUpdateProduct = async () => {
    if (!editingProduct) return

    try {
      const { error } = await supabase
        .from('wholesale_catalog')
        .update({
          product_name: editingProduct.product_name,
          description: editingProduct.description,
          wholesale_price: editingProduct.wholesale_price,
          min_order_quantity: editingProduct.min_order_quantity,
          category: editingProduct.category,
        })
        .eq('id', editingProduct.id)

      if (error) throw error
      await loadProducts()
      setEditingProduct(null)
    } catch (err) {
      console.error('Error updating product:', err)
    }
  }

  const filtered = products.filter(p => 
    !search || p.product_name.toLowerCase().includes(search.toLowerCase())
  )

  const totalRevenue = products.reduce((sum, p) => sum + (p.wholesale_price * p.min_order_quantity), 0)

  return (
    <div className="min-h-screen bg-[#0B0B0B] text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black flex items-center gap-3">
              <Store className="w-8 h-8 text-amber-400" />
              Panel Mayorista
            </h1>
            <p className="text-gray-400 mt-2">Gestiona tu catalogo y能看到 quienes añaden tus productos</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowAnalytics(!showAnalytics)}
              className={`px-4 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${
                showAnalytics ? 'bg-amber-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              <BarChart3 className="w-5 h-5" />
              Analytics
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Package className="w-6 h-6 text-emerald-400" />
              <span className="text-gray-400">Productos</span>
            </div>
            <p className="text-3xl font-black">{products.length}</p>
          </div>
          
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-6 h-6 text-emerald-400" />
              <span className="text-gray-400">Valor Total</span>
            </div>
            <p className="text-3xl font-black">${totalRevenue.toLocaleString()}</p>
          </div>
          
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Store className="w-6 h-6 text-emerald-400" />
              <span className="text-gray-400">Tiendas Activas</span>
            </div>
            <p className="text-3xl font-black">{analytics.length}</p>
          </div>
          
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-6 h-6 text-emerald-400" />
              <span className="text-gray-400">Visitas</span>
            </div>
            <p className="text-3xl font-black">{analytics.reduce((s, a) => s + a.products_added, 0)}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('products')}
            className={`px-6 py-3 rounded-xl font-bold transition-all ${
              activeTab === 'products' ? 'bg-emerald-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            Mis Productos
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-6 py-3 rounded-xl font-bold transition-all ${
              activeTab === 'analytics' ? 'bg-amber-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            Analytics
          </button>
        </div>

        {activeTab === 'products' && (
          <>
            {/* Search & Upload */}
            <div className="flex items-center gap-4 mb-6">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                <input
                  type="text"
                  placeholder="Buscar productos..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl py-3 pl-12 pr-4 text-white"
                />
              </div>

              <label className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 rounded-xl font-bold cursor-pointer transition-all">
                {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                <span>Importar CSV</span>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCSVUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </div>

            {/* Products Grid */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map(product => (
                  <div key={product.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                    {product.image_url && (
                      <img
                        src={product.image_url}
                        alt={product.product_name}
                        className="w-full h-40 object-cover rounded-xl mb-4"
                      />
                    )}
                    
                    <h3 className="font-bold text-lg mb-1">{product.product_name}</h3>
                    <p className="text-gray-400 text-sm mb-3 line-clamp-2">{product.description || 'Sin descripcion'}</p>
                    
                    <div className="flex items-center justify-between text-sm mb-3">
                      <span className="text-gray-400">Categoria:</span>
                      <span className="bg-gray-800 px-2 py-1 rounded-lg">{product.category || 'N/A'}</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-gray-800 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-400">Precio</p>
                        <p className="text-xl font-black text-emerald-400">${product.wholesale_price}</p>
                      </div>
                      <div className="bg-gray-800 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-400">Min. Orden</p>
                        <p className="text-xl font-black text-amber-400">{product.min_order_quantity}</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingProduct(product)}
                        className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg font-bold text-sm flex items-center justify-center gap-2"
                      >
                        <Edit className="w-4 h-4" />
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && filtered.length === 0 && (
              <div className="text-center py-20">
                <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No tienes productos aun</p>
                <p className="text-gray-500 text-sm">Importa un CSV para empezar</p>
              </div>
            )}
          </>
        )}

        {activeTab === 'analytics' && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
              <Users className="w-6 h-6 text-amber-400" />
              Tiendas que han anadido tus productos
            </h2>

            {analytics.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <Store className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                <p>Aun ninguna tienda ha anadido tus productos</p>
              </div>
            ) : (
              <div className="space-y-3">
                {analytics.map(store => (
                  <div key={store.store_id} className="flex items-center justify-between p-4 bg-gray-800 rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                        <Store className="w-6 h-6 text-emerald-400" />
                      </div>
                      <div>
                        <p className="font-bold">{store.store_name}</p>
                        <p className="text-sm text-gray-400">ID: {store.store_id.slice(0, 8)}...</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-emerald-400">{store.products_added}</p>
                      <p className="text-sm text-gray-400">productos anadidos</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold mb-6">Editar Producto</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Nombre del producto</label>
                <input
                  type="text"
                  value={editingProduct.product_name}
                  onChange={(e) => setEditingProduct({...editingProduct, product_name: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl py-3 px-4 text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-2">Descripcion</label>
                <textarea
                  value={editingProduct.description || ''}
                  onChange={(e) => setEditingProduct({...editingProduct, description: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl py-3 px-4 text-white h-24"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Precio mayorista ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingProduct.wholesale_price}
                    onChange={(e) => setEditingProduct({...editingProduct, wholesale_price: parseFloat(e.target.value)})}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl py-3 px-4 text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Minimo orden</label>
                  <input
                    type="number"
                    value={editingProduct.min_order_quantity}
                    onChange={(e) => setEditingProduct({...editingProduct, min_order_quantity: parseInt(e.target.value)})}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl py-3 px-4 text-white"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-2">Categoria</label>
                <input
                  type="text"
                  value={editingProduct.category || ''}
                  onChange={(e) => setEditingProduct({...editingProduct, category: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl py-3 px-4 text-white"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditingProduct(null)}
                className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl font-bold"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdateProduct}
                className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 rounded-xl font-bold"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}