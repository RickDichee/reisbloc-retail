import { Product } from '@/types'
import { Package, AlertTriangle, CheckCircle } from 'lucide-react'

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
  const isOutOfStock = (product: Product): boolean => {
    return product.hasInventory && (product.currentStock ?? 0) <= 0
  }

  const isLowStock = (product: Product): boolean => {
    return product.hasInventory && (product.currentStock ?? 0) > 0 && (product.currentStock ?? 0) <= (product.minimumStock ?? 5)
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="text-indigo-600" size={24} />
            Productos y Servicios
          </h2>
          <p className="text-sm text-gray-500 mt-1">Selecciona para agregar a la venta</p>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12">
          <Package className="text-gray-300 mb-4" size={48} />
          <p className="text-gray-500 font-medium">No hay productos disponibles</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pr-2 custom-scrollbar flex-1 content-start">
          {products.map(product => (
            <button
              key={product.id}
              onClick={() => !disableAdd && onAdd(product)}
              disabled={disableAdd}
              className={`group relative text-left rounded-xl border p-4 shadow-sm transition-all duration-200 ${isOutOfStock(product) || disableAdd
                ? 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                : 'border-gray-200 bg-white hover:shadow-md hover:border-indigo-300 hover:-translate-y-0.5'
                }`}
            >
              {/* Product Image / Placeholder */}
              {product.image ? (
                <div className="w-full h-28 overflow-hidden rounded-t-xl">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    onError={(e) => { (e.target as HTMLImageElement).parentElement!.className = 'w-full h-28 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center' }}
                  />
                </div>
              ) : (
                <div className={`w-full h-20 bg-gradient-to-br ${categoryColors[product.category || 'Otros'] || 'from-gray-400 to-gray-500'} flex items-center justify-center rounded-t-xl opacity-80`}>
                  <Package size={28} className="text-white/80" />
                </div>
              )}

              <div className="p-3">
                <div className="flex justify-between items-start mb-1.5">
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 uppercase tracking-wide">
                    {product.category || 'General'}
                  </span>

                  {product.hasInventory && (
                    <div className="text-xs">
                      {isOutOfStock(product) ? (
                        <span className="text-red-600 font-bold flex items-center gap-1"><AlertTriangle size={10} /> Agotado</span>
                      ) : isLowStock(product) ? (
                        <span className="text-amber-600 font-bold flex items-center gap-1"><AlertTriangle size={10} /> Bajo: {product.currentStock}</span>
                      ) : (
                        <span className="text-green-600 font-medium flex items-center gap-1"><CheckCircle size={10} /> {product.currentStock}</span>
                      )}
                    </div>
                  )}
                </div>

                <h3 className="font-bold text-gray-900 leading-tight mb-1 truncate text-sm">{product.name}</h3>
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
