import { useState } from 'react'
import { Product } from '@/types'
import { Package, AlertTriangle, Plus, Sparkles, User } from 'lucide-react'
import { parseProductDescription } from '@/utils/priceParser'

interface ProductGridProps {
  products: Product[]
  onAdd: (product: Product) => void
  onAddPackage?: (product: Product) => void
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

export function ProductGrid({ products, onAdd, onAddPackage, disableAdd = false }: ProductGridProps) {
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filteredProducts.map(product => {
              const parsedDesc = parseProductDescription(product.description || '')
              const packQty = Number(product.packQuantity || (product as any).pack_quantity || (product as any).wholesale_min_qty || parsedDesc.packQty || 10)
              
              // Extraer precio por pieza en paquete
              let namePrice: number | null = null
              if (product.name && product.name.includes('$')) {
                const afterDollar = product.name.split('$')[1] || ''
                const pNum = parseFloat(afterDollar)
                if (!isNaN(pNum) && pNum > 0) namePrice = pNum
              }

              const rawPrice = Number(product.price || 0)
              let unitPackPrice = namePrice || Number(product.wholesalePrice || (product as any).wholesale_price || parsedDesc.wholesalePrice || rawPrice)

              const disabled = isOutOfStock(product) || disableAdd

              return (
                <div
                  key={product.id}
                  className={`group relative text-left rounded-2xl border overflow-hidden transition-all duration-200 flex flex-col justify-between ${
                    disabled
                      ? 'border-gray-200 bg-gray-50 opacity-60'
                      : 'border-slate-200 bg-white hover:border-indigo-400 hover:shadow-lg'
                  }`}
                >
                  {/* Badge de PAQUETE Siempre Visible arriba */}
                  <div className="bg-slate-900 text-amber-300 text-[9px] font-black uppercase tracking-wider px-2 py-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Package size={11} className="text-amber-400" />
                      <span>PAQUETE</span>
                    </span>
                    <span className="font-mono text-white text-[9.5px]">x{packQty} pzas</span>
                  </div>

                  {/* Product Image / Placeholder */}
                  {product.image ? (
                    <div className="w-full h-20 sm:h-24 bg-slate-50 flex items-center justify-center p-1 border-b border-slate-100 overflow-hidden relative">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-contain"
                        onError={(e) => { (e.target as HTMLImageElement).parentElement!.className = `w-full h-16 sm:h-20 bg-gradient-to-br ${categoryColors[product.category || 'Otros'] || 'from-gray-400 to-gray-500'} flex items-center justify-center` }}
                      />
                    </div>
                  ) : (
                    <div className={`w-full h-16 sm:h-20 bg-gradient-to-br ${categoryColors[product.category || 'Otros'] || 'from-gray-400 to-gray-500'} flex items-center justify-center relative`}>
                      <Package size={22} className="text-white/80" />
                    </div>
                  )}

                  {/* Product Body */}
                  <div className="p-2 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-extrabold text-slate-900 leading-tight text-xs sm:text-sm line-clamp-2">
                        {product.name}
                      </h3>
                      <div className="mt-1 flex items-baseline justify-between text-xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Pieza:</span>
                        <span className="font-black text-slate-800">{currency.format(rawPrice)}</span>
                      </div>
                      <div className="flex items-baseline justify-between text-xs text-indigo-600 font-extrabold">
                        <span className="text-[10px] uppercase font-bold">En Paq:</span>
                        <span>{currency.format(unitPackPrice)}/pz</span>
                      </div>
                    </div>

                    {/* Stock Indicator */}
                    {product.hasInventory && (
                      <div className="mt-1.5">
                        {isOutOfStock(product) ? (
                          <span className="text-[9px] text-red-600 font-black flex items-center gap-0.5 uppercase">
                            <AlertTriangle size={9} /> Agotado
                          </span>
                        ) : isLowStock(product) ? (
                          <span className="text-[9px] text-amber-600 font-black flex items-center gap-0.5 uppercase">
                            <AlertTriangle size={9} /> Stock: {product.currentStock}
                          </span>
                        ) : (
                          <span className="text-[9px] text-emerald-600 font-bold">
                            Stock: {product.currentStock} pzas
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Dual Quick Action Buttons: Pieza vs Paquete Completo */}
                  <div className="p-1.5 bg-slate-50 border-t border-slate-100 grid grid-cols-2 gap-1">
                    <button
                      type="button"
                      onClick={() => !disabled && onAdd(product)}
                      disabled={disabled}
                      className="py-1.5 px-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-[10px] font-black text-slate-700 flex items-center justify-center gap-0.5 active:scale-95 transition-all shadow-sm"
                      title="Agregar 1 pieza individual"
                    >
                      <User size={11} className="text-slate-500 shrink-0" />
                      <span>+1 Pieza</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => !disabled && (onAddPackage ? onAddPackage(product) : onAdd(product))}
                      disabled={disabled}
                      className="py-1.5 px-1 bg-amber-400 hover:bg-amber-500 text-slate-950 rounded-xl text-[10px] font-black flex items-center justify-center gap-0.5 active:scale-95 transition-all shadow-md shadow-amber-200 border border-amber-300"
                      title={`Agregar 1 paquete completo (${packQty} pzas @ ${currency.format(unitPackPrice)}/pz)`}
                    >
                      <Package size={11} className="shrink-0" />
                      <span>PAQUETE</span>
                    </button>
                  </div>

                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default ProductGrid