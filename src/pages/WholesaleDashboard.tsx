import { useState, useEffect } from 'react'
import { supabase } from '@/config/supabase'
import { useAppStore } from '@/store/appStore'
import ecosystemService from '@/services/ecosystemService'
import WholesaleAnalytics from '@/components/wholesale/WholesaleAnalytics'
import { Package, Upload, DollarSign, TrendingUp, Users, Search, Edit, Trash2, Loader2, BarChart3, Store, Flame } from 'lucide-react'

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
  const [insights, setInsights] = useState<any>(null)

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
    if (!currentUser?.id) return
    
    try {
      const data = await ecosystemService.getWholesalerInsights(currentUser.id)
      setInsights(data)
      
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
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black flex items-center gap-3 text-[#035CAB]">
              <Store className="w-8 h-8" />
              Panel Mayorista
            </h1>
            <p className="text-slate-500 mt-2">Gestiona tu catalogo y mira quienes anaden tus productos</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowAnalytics(!showAnalytics)}
              className={`px-4 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${
                showAnalytics ? 'bg-[#035CAB] text-white' : 'bg-white text-slate-600 border border-slate-200 hover:text-[#035CAB]'
              }`}
            >
              <BarChart3 className="w-5 h-5" />
              Analytics
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <Package className="w-6 h-6 text-emerald-500" />
              <span className="text-slate-500">Productos</span>
            </div>
            <p className="text-3xl font-black text-emerald-600">{products.length}</p>
          </div>
          
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-6 h-6 text-emerald-500" />
              <span className="text-slate-500">Valor Total</span>
            </div>
            <p className="text-3xl font-black text-emerald-600">${totalRevenue.toLocaleString()}</p>
          </div>
          
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <Store className="w-6 h-6 text-emerald-500" />
              <span className="text-slate-500">Tiendas Activas</span>
            </div>
            <p className="text-3xl font-black text-emerald-600">{analytics.length}</p>
          </div>
          
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-6 h-6 text-emerald-500" />
              <span className="text-slate-500">Visitas</span>
            </div>
            <p className="text-3xl font-black text-emerald-600">{analytics.reduce((s, a) => s + a.products_added, 0)}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('products')}
            className={`px-6 py-3 rounded-xl font-bold transition-all ${
              activeTab === 'products' ? 'bg-[#035CAB] text-white' : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            Mis Productos
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-6 py-3 rounded-xl font-bold transition-all ${
              activeTab === 'analytics' ? 'bg-[#035CAB] text-white' : 'bg-white text-slate-600 border border-slate-200'
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
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  placeholder="Buscar productos..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-12 pr-4 text-slate-800"
                />
              </div>

              <label className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 rounded-xl font-bold cursor-pointer transition-all text-white">
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
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map(product => (
                  <div key={product.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                    {product.image_url && (
                      <img
                        src={product.image_url}
                        alt={product.product_name}
                        className="w-full h-40 object-cover rounded-xl mb-4"
                      />
                    )}
                    
                    <h3 className="font-bold text-lg mb-1 text-slate-800">{product.product_name}</h3>
                    <p className="text-slate-500 text-sm mb-3 line-clamp-2">{product.description || 'Sin descripcion'}</p>
                    
                    <div className="flex items-center justify-between text-sm mb-3">
                      <span className="text-slate-500">Categoria:</span>
                      <span className="bg-slate-100 px-2 py-1 rounded-lg text-slate-600">{product.category || 'N/A'}</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-slate-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-slate-500">Precio</p>
                        <p className="text-xl font-black text-emerald-600">${product.wholesale_price}</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-3 text-center">
                        <p className="text-xs text-slate-500">Min. Orden</p>
                        <p className="text-xl font-black text-[#035CAB]">{product.min_order_quantity}</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingProduct(product)}
                        className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg font-bold text-sm flex items-center justify-center gap-2 text-slate-700"
                      >
                        <Edit className="w-4 h-4" />
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg"
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
                <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No tienes productos aun</p>
                <p className="text-slate-400 text-sm">Importa un CSV para empezar</p>
              </div>
            )}
          </>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* New Analytics Component */}
            <WholesaleAnalytics data={insights || {
              adoptionTrend: [],
              totalMarketPenetration: 0,
              weeklyGrowth: 0,
              topProducts: [],
              categoryVelocity: [],
              totalStoresWithProducts: 0,
              totalStockDistributed: 0
            }} />
            {/* Insights Stats */}
            {insights && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Reach Heatmap */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-[#035CAB]">
                      <Flame className="w-5 h-5" />
                      Alcance por Zona
                    </h3>
                    <div className="space-y-3">
                      {insights.marketPenetration?.slice(0, 8).map((store: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${
                              idx === 0 ? 'bg-[#E31836] text-white' :
                              idx === 1 ? 'bg-[#76A5BA] text-white' :
                              idx === 2 ? 'bg-slate-400 text-white' :
                              'bg-slate-200 text-slate-600'
                            }`}>
                              {idx + 1}
                            </div>
                            <div>
                              <p className="font-bold text-slate-800">{store.store_name}</p>
                              <p className="text-xs text-slate-500">{store.address || 'Sin direccion'}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-black text-[#E31836]">{store.product_count}</p>
                            <p className="text-xs text-slate-500">productos</p>
                          </div>
                        </div>
                      ))}
                      {(!insights.marketPenetration || insights.marketPenetration.length === 0) && (
                        <p className="text-slate-400 text-center py-4">No hay datos de penetracion</p>
                      )}
                    </div>
                  </div>

                  {/* Top Products */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-[#035CAB]">
                      <TrendingUp className="w-5 h-5" />
                      Productos mas Distribuidos
                    </h3>
                    <div className="space-y-3">
                      {insights.topProducts?.slice(0, 8).map((product: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                          <div className="flex-1">
                            <p className="font-bold text-sm truncate text-slate-800">{product.product_name}</p>
                            <p className="text-xs text-slate-500">{product.store_count} tiendas</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-black text-emerald-600">{product.total_stock}</p>
                            <p className="text-xs text-slate-500">unidades</p>
                          </div>
                        </div>
                      ))}
                      {(!insights.topProducts || insights.topProducts.length === 0) && (
                        <p className="text-slate-400 text-center py-4">No hay productos distribuidos</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Category Velocity */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-[#035CAB]">
                    <BarChart3 className="w-5 h-5" />
                    Velocidad por Categoria
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {insights.categoryVelocity?.map((cat: any, idx: number) => (
                      <div key={idx} className="bg-slate-50 rounded-xl p-4 text-center">
                        <p className="text-xs text-slate-500 mb-1">{cat.category}</p>
                        <p className="text-2xl font-black text-emerald-600">{cat.stores_count}</p>
                        <p className="text-xs text-slate-400">tiendas</p>
                        <div className="mt-2 h-1 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-emerald-500"
                            style={{ width: `${Math.min(100, (cat.stores_count / (insights.totalStoresWithProducts || 1)) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Stores List */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-3 text-[#035CAB]">
                <Users className="w-6 h-6" />
                Tiendas que han anadido tus productos
              </h2>

              {analytics.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <Store className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  <p>Aun ninguna tienda ha anadido tus productos</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {analytics.map(store => (
                    <div key={store.store_id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                          <Store className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{store.store_name}</p>
                          <p className="text-sm text-slate-500">ID: {store.store_id.slice(0, 8)}...</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-emerald-600">{store.products_added}</p>
                        <p className="text-sm text-slate-500">productos anadidos</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-lg shadow-xl">
            <h2 className="text-xl font-bold mb-6 text-slate-800">Editar Producto</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-500 mb-2">Nombre del producto</label>
                <input
                  type="text"
                  value={editingProduct.product_name}
                  onChange={(e) => setEditingProduct({...editingProduct, product_name: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-slate-800"
                />
              </div>
              
              <div>
                <label className="block text-sm text-slate-500 mb-2">Descripcion</label>
                <textarea
                  value={editingProduct.description || ''}
                  onChange={(e) => setEditingProduct({...editingProduct, description: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-slate-800 h-24"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-500 mb-2">Precio mayorista ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingProduct.wholesale_price}
                    onChange={(e) => setEditingProduct({...editingProduct, wholesale_price: parseFloat(e.target.value)})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-slate-800"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-slate-500 mb-2">Minimo orden</label>
                  <input
                    type="number"
                    value={editingProduct.min_order_quantity}
                    onChange={(e) => setEditingProduct({...editingProduct, min_order_quantity: parseInt(e.target.value)})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-slate-800"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm text-slate-500 mb-2">Categoria</label>
                <input
                  type="text"
                  value={editingProduct.category || ''}
                  onChange={(e) => setEditingProduct({...editingProduct, category: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-slate-800"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditingProduct(null)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-slate-600"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdateProduct}
                className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 rounded-xl font-bold text-white"
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