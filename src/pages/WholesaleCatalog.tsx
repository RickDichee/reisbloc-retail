import { useState, useEffect } from 'react'
import ecosystemService, { type WholesaleProduct } from '@/services/ecosystemService'
import { Package, Plus, Search, Loader2 } from 'lucide-react'
import { supabase } from '@/config/supabase'

export default function WholesaleCatalog() {
  const [products, setProducts] = useState<WholesaleProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selectedStore, setSelectedStore] = useState('')
  const [stores, setStores] = useState<{ id: string; name: string }[]>([])
  const [category, setCategory] = useState('all')

  useEffect(() => {
    loadCatalog()
    loadStores()
  }, [])

  const loadCatalog = async () => {
    try {
      const data = await ecosystemService.getWholesaleCatalog()
      setProducts(data)
    } catch (err) {
      console.error('Error loading catalog:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadStores = async () => {
    try {
      const { data } = await supabase.from('stores').select('id, name')
      if (data) setStores(data)
    } catch (err) {
      console.error('Error loading stores:', err)
    }
  }

  const handleAddToStore = async (productId: string) => {
    if (!selectedStore) {
      alert('Selecciona una tienda primero')
      return
    }
    
    setAdding(productId)
    try {
      await ecosystemService.addProductToStore(selectedStore, productId)
      alert('Producto anadido a tu tienda!')
    } catch (err: any) {
      alert(err.message)
    } finally {
      setAdding(null)
    }
  }

  const categories = ['all', ...new Set(products.map(p => p.category).filter(Boolean))]
  const filtered = products.filter(p => {
    const matchesSearch = !search || p.product_name.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = category === 'all' || p.category === category
    return matchesSearch && matchesCategory
  })

  return (
    <div className="min-h-screen bg-[#0B0B0B] text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black flex items-center gap-3">
              <Package className="w-8 h-8 text-emerald-400" />
              Catalogo Mayorista
            </h1>
            <p className="text-gray-400 mt-2">Anade productos a tu tienda</p>
          </div>
          
          <div className="flex items-center gap-4">
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white"
            >
              <option value="">Selecciona tienda...</option>
              {stores.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

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
          
          <div className="flex gap-2">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  category === cat
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                {cat === 'all' ? 'Todos' : cat}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(product => (
              <div
                key={product.id}
                className="bg-gray-900 border border-gray-800 rounded-2xl p-4 hover:border-emerald-500/50 transition-all"
              >
                {product.image_url && (
                  <img 
                    src={product.image_url} 
                    alt={product.product_name}
                    className="w-full h-40 object-cover rounded-xl mb-4"
                  />
                )}
                
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-lg">{product.product_name}</h3>
                  <span className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded-lg">
                    {product.category || 'Sin categoria'}
                  </span>
                </div>
                
                {product.description && (
                  <p className="text-gray-400 text-sm mb-4 line-clamp-2">{product.description}</p>
                )}
                
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-800">
                  <div>
                    <p className="text-xs text-gray-500">Precio mayorista</p>
                    <p className="text-xl font-black text-emerald-400">${product.wholesale_price}</p>
                  </div>
                  
                  {product.min_order_quantity > 1 && (
                    <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded-lg">
                      Min: {product.min_order_quantity}
                    </span>
                  )}
                </div>
                
                <button
                  onClick={() => handleAddToStore(product.id)}
                  disabled={adding === product.id || !selectedStore}
                  className="w-full mt-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
                >
                  {adding === product.id ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Anadiendo...
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      Anadir a mi tienda
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
        
        {!loading && filtered.length === 0 && (
          <div className="text-center py-20">
            <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No se encontraron productos</p>
          </div>
        )}
      </div>
    </div>
  )
}