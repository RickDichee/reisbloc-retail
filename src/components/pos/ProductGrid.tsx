import { useState } from 'react'
import { Product } from '@/types'
import { Package, AlertTriangle, User, Check } from 'lucide-react'
import { parseProductDescription } from '@/utils/priceParser'

interface ProductGridProps {
  products: Product[]
  onAdd: (product: Product, isPackageMode: boolean) => void
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
  const [isPackageMode, setIsPackageMode] = useState<boolean>(false)

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
      
      {/* 📦 Selector de Modo de Venta: PIEZA vs PAQUETE COMPLETO (Visibilidad Garantizada 100%) */}
      <div className="p-3 bg-slate-900 text-white rounded-t-xl shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Package size={20} className="text-amber-400 animate-bounce shrink-0" />
          <div>
            <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest leading-none">Modo de Venta en Caja</p>
            <p className="text-xs font-black uppercase text-white tracking-tight">
              {isPackageMode ? '📦 Vender Paquete Completo' : '👤 Venta por Pieza'}
            </p>
          </div>
        </div>

        <div className="flex bg-slate-800 p-1 rounded-2xl border border-slate-700 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setIsPackageMode(false)}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-black uppercase transition-all flex items-center justify-center gap-1.5 ${
              !isPackageMode 
                ? 'bg-white text-slate-900 shadow-md' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <User size={14} />
            <span>👤 Pieza</span>
          </button>

          <button
            type="button"
            onClick={() => setIsPackageMode(true)}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-black uppercase transition-all flex items-center justify-center gap-1.5 ${
              isPackageMode 
                ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/30 font-black' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Package size={14} />
            <span>📦 PAQUETE</span>
            {isPackageMode && <Check size={14} className="text-slate-950" />}
          </button>
        </div>
      </div>

      {/* Category Tabs - Horizontal Scroll */}
      <div className="shrink-0 p-3 border-b border-gray-100">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
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
              const disabled = isOutOfStock(product) || disableAdd
              const parsedDesc = parseProductDescription(product.description || '')

              // PRECIO POR PIEZA EN PAQUETE (Requerimiento estricto para Moda Miel)
              let namePrice: number | null = null
              if (product.name && product.name.includes('$')) {
                const afterDollar = product.name.split('$')[1] || ''
                const pNum = parseFloat(afterDollar)
                if (!isNaN(pNum) && pNum > 0) namePrice = pNum
              }

              const rawPrice = Number(product.price || 0)
              const wholesalePrice = Number(product.wholesalePrice || (product as any).wholesale_price || parsedDesc.wholesalePrice || 0)
              const packPrice = Number((product as any).packPrice || (product as any).pack_price || parsedDesc.packPrice || 0)

              const unitPackPrice = namePrice || (packPrice > 0 ? (packPrice > rawPrice * 2 ? packPrice / 10 : packPrice) : (wholesalePrice > 0 ? wholesalePrice : rawPrice))
              const packQty = Number(product.packQuantity || (product as any).pack_quantity || (product as any).wholesale_min_qty || parsedDesc.packQty || 10)

              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => !disabled && onAdd(product, isPackageMode)}
                  disabled={disabled}
                  className={`group relative text-left rounded-2xl border overflow-hidden transition-all duration-200 active:scale-95 flex flex-col justify-between ${
                    disabled
                      ? 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                      : isPackageMode
                        ? 'border-amber-400 bg-amber-50/30 hover:border-amber-500 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-indigo-400 hover:shadow-md'
                  }`}
                >
                  {/* Badge de Paquete si está en modo paquete */}
                  {isPackageMode && (
                    <div className="bg-amber-400 text-slate-950 font-black text-[9px] uppercase px-2 py-0.5 text-center tracking-wider">
                      📦 Paquete ({packQty} pzas)
                    </div>
                  )}

                  {/* Product Image / Placeholder */}
                  {product.image ? (
                    <div className="w-full h-20 sm:h-24 bg-slate-50 flex items-center justify-center p-1 border-b border-slate-100 overflow-hidden">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-contain"
                        onError={(e) => { (e.target as HTMLImageElement).parentElement!.className = `w-full h-16 sm:h-20 bg-gradient-to-br ${categoryColors[product.category || 'Otros'] || 'from-gray-400 to-gray-500'} flex items-center justify-center` }}
                      />
                    </div>
                  ) : (
                    <div className={`w-full h-16 sm:h-20 bg-gradient-to-br ${categoryColors[product.category || 'Otros'] || 'from-gray-400 to-gray-500'} flex items-center justify-center`}>
                      <Package size={20} className="text-white/80" />
                    </div>
                  )}

                  <div className="p-2.5">
                    <h3 className="font-extrabold text-slate-900 leading-tight truncate text-xs sm:text-sm">
                      {product.name}
                    </h3>
                    
                    {/* Muestra únicamente el PRECIO POR PIEZA EN PAQUETE */}
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-sm sm:text-base font-black text-indigo-600">
                        {currency.format(unitPackPrice)}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase">/ pz paq</span>
                    </div>

                    {/* Stock Indicator */}
                    {product.hasInventory && (
                      <div className="mt-1">
                        {isOutOfStock(product) ? (
                          <span className="text-[10px] text-red-600 font-bold flex items-center gap-0.5">
                            <AlertTriangle size={8} /> Agotado
                          </span>
                        ) : isLowStock(product) ? (
                          <span className="text-[10px] text-amber-600 font-bold flex items-center gap-0.5">
                            <AlertTriangle size={8} /> Stock: {product.currentStock}
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-600 font-medium">
                            Stock: {product.currentStock} pzas
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default ProductGrid