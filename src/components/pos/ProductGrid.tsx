import { useMemo, useState } from 'react'
import { Product } from '@/types'
import { Package, AlertTriangle, CheckCircle, Utensils, Wine } from 'lucide-react'

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
  'Bebidas': 'from-blue-500 to-cyan-500',
  'Desayuno': 'from-orange-400 to-amber-500',
  'Especialidades': 'from-teal-500 to-emerald-600',
  'Entradas': 'from-lime-500 to-green-600',
  'Postres': 'from-pink-400 to-rose-500',
  'Otros': 'from-gray-500 to-gray-600',
}

export function ProductGrid({ products, onAdd, disableAdd = false }: ProductGridProps) {
  const [filter, setFilter] = useState<'all' | 'food' | 'drinks'>('all')
  const isOutOfStock = (product: Product): boolean => {
    return product.hasInventory && (product.currentStock ?? 0) <= 0
  }

  const isLowStock = (product: Product): boolean => {
    return product.hasInventory && (product.currentStock ?? 0) > 0 && (product.currentStock ?? 0) <= (product.minimumStock ?? 5)
  }

  const getCategoryGradient = (category: string): string => {
    return categoryColors[category] || 'from-gray-500 to-gray-600'
  }

  const filteredProducts = useMemo(() => {
    if (filter === 'drinks') return products.filter(p => p.category === 'Bebidas')
    if (filter === 'food') return products.filter(p => p.category !== 'Bebidas' && p.category !== 'Postres')
    return products
  }, [products, filter])

  const totalDrinks = useMemo(() => products.filter(p => p.category === 'Bebidas').length, [products])
  const totalFood = useMemo(() => products.filter(p => p.category !== 'Bebidas' && p.category !== 'Postres').length, [products])

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="text-indigo-600" size={24} />
            Productos
          </h2>
          <p className="text-sm text-gray-500 mt-1">Selecciona para agregar al pedido</p>
        </div>
        <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold border border-indigo-100">
          {filteredProducts.length} ítems
        </span>
      </div>

      {/* Filtros por categoría - Clean Style */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${filter === 'all'
            ? 'bg-gray-900 text-white border-gray-900'
            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
        >
          Todos ({products.length})
        </button>
        <button
          onClick={() => setFilter('food')}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 border ${filter === 'food'
            ? 'bg-emerald-600 text-white border-emerald-600'
            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
        >
          <Utensils size={16} /> Alimentos ({totalFood})
        </button>
        <button
          onClick={() => setFilter('drinks')}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 border ${filter === 'drinks'
            ? 'bg-blue-600 text-white border-blue-600'
            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
        >
          <Wine size={16} /> Bebidas ({totalDrinks})
        </button>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12">
          <Package className="text-gray-300 mb-4" size={48} />
          <p className="text-gray-500 font-medium">No hay productos disponibles</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pr-2 custom-scrollbar flex-1 content-start">
          {filteredProducts.map(product => (
            <button
              key={product.id}
              onClick={() => !disableAdd && onAdd(product)}
              disabled={disableAdd}
              className={`group relative text-left rounded-xl border p-4 shadow-sm transition-all duration-200 ${isOutOfStock(product) || disableAdd
                ? 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                : 'border-gray-200 bg-white hover:shadow-md hover:border-indigo-300 hover:-translate-y-0.5'
                }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide border ${product.category === 'Bebidas'
                  ? 'bg-blue-50 text-blue-700 border-blue-100'
                  : product.category === 'Alimentos'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                    : 'bg-gray-50 text-gray-600 border-gray-100'
                  }`}>
                  {product.category}
                </span>

                {product.hasInventory && (
                  <div className="text-xs">
                    {isOutOfStock(product) ? (
                      <span className="text-red-600 font-bold flex items-center gap-1"><AlertTriangle size={10} /> Agotado</span>
                    ) : isLowStock(product) ? (
                      <span className="text-amber-600 font-bold flex items-center gap-1"><AlertTriangle size={10} /> Bajo: {product.currentStock}</span>
                    ) : (
                      <span className="text-green-600 font-medium flex items-center gap-1"><CheckCircle size={10} /> Stock: {product.currentStock}</span>
                    )}
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-bold text-gray-900 leading-tight mb-1 truncate">{product.name}</h3>
                <p className="text-lg font-black text-indigo-600">
                  {currency.format(product.price)}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default ProductGrid
