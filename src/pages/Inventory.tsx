import { useState, useEffect } from 'react'
import { Package, Search, Plus, AlertTriangle, ArrowUpDown, Filter, Share2, Edit2 } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import supabaseService from '@/services/supabaseService'
import logger from '@/utils/logger'

export default function Inventory() {
  const { products, setProducts, currentUser } = useAppStore()
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterLowStock, setFilterLowStock] = useState(false)

  useEffect(() => {
    loadInventory()
  }, [])

  const loadInventory = async () => {
    setLoading(true)
    try {
      const data = await supabaseService.getAllProducts()
      setProducts(data)
    } catch (e) {
      logger.error('inventory', 'Error loading inventory', e as any)
    } finally {
      setLoading(false)
    }
  }

  const handleShareProduct = async (product: any) => {
    const text = `
🔥 *¡PROMO DEL DÍA!* 🔥

🌮 *${product.name}*
💰 Solo: $${Number(product.price).toFixed(2)}

📍 ¡Ven a probarlo en ${currentUser?.businessName || 'nuestro local'}!
    `.trim()

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Promo: ${product.name}`,
          text: text,
        })
      } catch (err) {
        // Usuario canceló o error
      }
    } else {
      navigator.clipboard.writeText(text)
      alert('📋 Promo copiada al portapapeles')
    }
  }

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase())
    const isLowStock = p.hasInventory && (p.currentStock || 0) <= (p.minimumStock || 0)
    return matchesSearch && (filterLowStock ? isLowStock : true)
  })

  return (
    <div className="min-h-screen relative bg-rb-canvas text-rb-text pb-12">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Header - Widget Premium */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-3xl shadow-xl overflow-hidden">
          <div className="px-6 py-8 sm:px-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                <Package size={32} />
              </div>
              <div>
                <p className="text-sm text-blue-100 uppercase tracking-tighter font-black">Almacén</p>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight uppercase">Inventario</h1>
                <p className="text-blue-100 mt-1 font-bold opacity-80">CONTROL DE EXISTENCIAS Y COSTOS</p>
              </div>
            </div>
            <button className="bg-white text-indigo-700 px-6 py-3 rounded-2xl font-black flex items-center gap-2 shadow-lg hover:scale-105 transition-all active:scale-95">
              <Plus size={20} />
              NUEVO PRODUCTO
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-rb-border p-4 flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="text"
                placeholder="Buscar por nombre o categoría..."
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-rb-border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button 
              onClick={() => setFilterLowStock(!filterLowStock)}
              className={`p-3 rounded-xl border transition-all flex items-center gap-2 font-bold text-sm ${
                filterLowStock ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-white border-rb-border text-slate-500'
              }`}
            >
              <AlertTriangle size={18} />
              <span className="hidden sm:inline">Stock Bajo</span>
            </button>
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm border border-rb-border p-4 flex items-center justify-around">
            <div className="text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase">Total Items</p>
              <p className="text-2xl font-black text-slate-800">{products.length}</p>
            </div>
            <div className="w-px h-8 bg-slate-100" />
            <div className="text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase">Alertas</p>
              <p className="text-2xl font-black text-orange-500">
                {products.filter(p => p.hasInventory && (p.currentStock || 0) <= (p.minimumStock || 0)).length}
              </p>
            </div>
          </div>
        </div>

        {/* Inventory Table */}
        <div className="bg-white rounded-3xl shadow-sm border border-rb-border overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-rb-border">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Producto</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoría</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Stock</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Precio</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map(product => (
                <tr key={product.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-800">{product.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{product.id.slice(0,8)}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold uppercase">
                      {product.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className={`inline-flex items-center gap-2 font-black ${
                      product.hasInventory && (product.currentStock || 0) <= (product.minimumStock || 0)
                        ? 'text-orange-500'
                        : 'text-slate-700'
                    }`}>
                      {product.currentStock || 0}
                      {product.hasInventory && (product.currentStock || 0) <= (product.minimumStock || 0) && <AlertTriangle size={14} />}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-black text-slate-900">
                    ${Number(product.price).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button onClick={() => handleShareProduct(product)} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors mr-2" title="Compartir Promo">
                      <Share2 size={18} />
                    </button>
                    <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
                      <Edit2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}