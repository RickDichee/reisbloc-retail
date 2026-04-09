import { useState } from 'react'
import { Product } from '@/types'
import { Package, AlertTriangle } from 'lucide-react'

interface ProductGridProps {
  products: Product[]
  onAdd: (product: Product) => void
  disableAdd?: boolean
}

const currency = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
})

const categoryColors: Record<string, string> = {
  'General': 'from-blue-500 to-cyan-500',
  'Electrónicos': 'from-orange-400 to-amber-500',
  'Hogar': 'from-teal-500 to-emerald-600',
  'Accesorio': 'from-lime-500 to-green-600',
  'Oferta': 'from-pink-400 to-rose-500',
  'Otros': 'from-gray-500 to-gray-600',
}

export function ProductGrid({ products, onAdd, disableAdd = false }: ProductGridProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const categories = Array.from(new Set(products.map(p => p.category || 'General')))
  
  const filteredProducts = selectedCategory 
    ? products.filter(p => (p.category || 'General') === selectedCategory)
    : products

  const isOutOfStock = (product: Product): boolean => {
    return product.hasInventory && (product.currentStock ?? 0) <= 0
  }

  const isLowStock = (product: Product): boolean => {
    return product.hasInventory && (product.currentStock ?? 0) > 0 && (product.currentStock ?? 0) <= (product.minimumStock ?? 5)
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-full flex flex-col">
      {/* Category Tabs - Horizontal Scroll */}
      <div className="shrink-0 p-3 border-b border-gray-100">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
              selectedCategory === null 
                ? 'bg-indigo-600 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Todo ({products.length})
          </button>
          {categories.map(cat => {
            const count = products.filter(p => (p.category || 'General') === cat).length
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategory === cat 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat} ({count})
              </button>
            )
          })}
        </div>
      </div>

      {/* Products Grid */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3">
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Package className="text-gray-300 mb-4" size={48} />
            <p className="text-gray-500 font-medium">No hay productos disponibles</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-2">
            {filteredProducts.map(product => (
              <button
                key={product.id}
                onClick={() => !disableAdd && onAdd(product)}
                disabled={disableAdd}
                className={`group relative text-left rounded-lg border overflow-hidden transition-all duration-150 active:scale-95 ${
                  isOutOfStock(product) || disableAdd
                    ? 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                    : 'border-gray-200 bg-white hover:border-indigo-300 active:bg-indigo-50'
                }`}
              >
                {/* Product Image / Placeholder - Compact */}
                {product.image ? (
                  <div className="w-full h-16 sm:h-20 overflow-hidden bg-gray-100">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).parentElement!.className = `w-full h-16 sm:h-20 bg-gradient-to-br ${categoryColors[product.category || 'Otros'] || 'from-gray-400 to-gray-500'} flex items-center justify-center` }}
                    />
                  </div>
                ) : (
                  <div className={`w-full h-16 sm:h-20 bg-gradient-to-br ${categoryColors[product.category || 'Otros'] || 'from-gray-400 to-gray-500'} flex items-center justify-center`}>
                    <Package size={20} className="text-white/80" />
                  </div>
                )}

                <div className="p-1.5 sm:p-2">
                  <h3 className="font-bold text-gray-900 leading-tight truncate text-xs sm:text-sm">
                    {product.name}
                  </h3>
                  <p className="text-sm sm:text-base font-black text-indigo-600 mt-0.5">
                    {currency.format(product.price)}
                  </p>
                  
                  {/* Stock indicator - only on mobile if low/out */}
                  {product.hasInventory && (
                    <div className="mt-1">
                      {isOutOfStock(product) ? (
                        <span className="text-[10px] text-red-600 font-bold flex items-center gap-0.5">
                          <AlertTriangle size={8} /> Agotado
                        </span>
                      ) : isLowStock(product) ? (
                        <span className="text-[10px] text-amber-600 font-bold flex items-center gap-0.5">
                          <AlertTriangle size={8} /> {product.currentStock}
                        </span>
                      ) : (
                        <span className="text-[10px] text-green-600 font-medium">
                          {product.currentStock}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default ProductGrid