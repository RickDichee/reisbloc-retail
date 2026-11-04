import { useState } from 'react'
import { Product } from '@/types'
import { Package, AlertTriangle, ShoppingBag } from 'lucide-react'
import { parseProductDescription } from '@/utils/priceParser'
import { BRANDING } from '@/config/branding'

interface ProductGridProps {
  products: Product[]
  onAdd: (product: Product, isPackageMode: boolean) => void
  disableAdd?: boolean
  isPackageMode?: boolean
  showPackageOption?: boolean
  onTogglePackageMode?: (isPack: boolean) => void
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

export function ProductGrid({
  products,
  onAdd,
  disableAdd = false,
  isPackageMode: externalIsPackageMode,
  showPackageOption = false,
  onTogglePackageMode
}: ProductGridProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const isBrandedTenant = BRANDING.isModaMiel || BRANDING.isJuguetes || BRANDING.isLosChunches

  const isPackageMode = showPackageOption && (externalIsPackageMode !== undefined ? externalIsPackageMode : false)

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

      {/* 📦 / 🛍️ Modo de Venta: Paquete (exclusivo para tenants mayoristas con paquetes) */}
      {showPackageOption && (
        <div className="p-3 bg-slate-900 text-white rounded-t-xl shrink-0 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            {isPackageMode ? (
              <Package size={20} className="text-amber-400 shrink-0" />
            ) : (
              <ShoppingBag size={20} className={isBrandedTenant ? 'text-[var(--primary)] shrink-0' : 'text-emerald-400 shrink-0'} />
            )}
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Venta en Mostrador</p>
              <p className="text-xs font-black uppercase text-white tracking-tight mt-0.5">
                {isPackageMode ? '📦 Venta por Paquete Completo' : '🛍️ Venta por Pieza Individual'}
              </p>
            </div>
          </div>

          {onTogglePackageMode ? (
            <div className="flex items-center bg-slate-800 p-0.5 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => onTogglePackageMode(false)}
                className={`px-2.5 py-1 rounded-lg font-black text-[10px] uppercase tracking-wider transition-all flex items-center gap-1 ${
                  !isPackageMode
                    ? (isBrandedTenant ? 'bg-[var(--primary)] text-white shadow-xs' : 'bg-emerald-500 text-slate-950 shadow-xs')
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ShoppingBag size={12} />
                <span>Pieza</span>
              </button>
              <button
                type="button"
                onClick={() => onTogglePackageMode(true)}
                className={`px-2.5 py-1 rounded-lg font-black text-[10px] uppercase tracking-wider transition-all flex items-center gap-1 ${
                  isPackageMode
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Package size={12} />
                <span>Paquete</span>
              </button>
            </div>
          ) : (
            <div className="px-3 py-1 bg-amber-400 text-slate-950 font-black text-[11px] uppercase tracking-wider rounded-xl shadow-sm flex items-center gap-1.5">
              <Package size={14} />
              <span>Paquete</span>
            </div>
          )}
        </div>
      )}

      {/* Category Tabs - Horizontal Scroll */}
      <div className="shrink-0 p-2.5 border-b border-slate-100 bg-slate-50/50">
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide -mx-1 px-1">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1.5 rounded-md text-[11px] font-black uppercase tracking-wider whitespace-nowrap transition-all border ${
              selectedCategory === null
                ? (isBrandedTenant ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-xs' : 'bg-slate-900 text-white border-slate-900 shadow-xs')
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
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
                className={`px-3 py-1.5 rounded-md text-[11px] font-black uppercase tracking-wider whitespace-nowrap transition-all border ${
                  selectedCategory === cat
                    ? (isBrandedTenant ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-xs' : 'bg-slate-900 text-white border-slate-900 shadow-xs')
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3 pb-28 lg:pb-6">
            {filteredProducts.map(product => {
              const disabled = isOutOfStock(product) || disableAdd
              const parsedDesc = parseProductDescription(product.description || '')

              // PRECIO POR PIEZA EN PAQUETE (Requerimiento para Moda Miel)
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

              const imgSrc = product.image || product.imageUrl

              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => !disabled && onAdd(product, isPackageMode)}
                  disabled={disabled}
                  className={`group relative text-left rounded-xl border overflow-hidden transition-all duration-200 active:scale-[0.98] flex flex-col justify-between ${
                    disabled
                      ? 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                      : isPackageMode
                        ? 'border-amber-400 bg-amber-50/30 hover:border-amber-500 shadow-xs'
                        : 'border-slate-200/90 bg-white hover:border-[var(--primary)]/50 hover:shadow-md'
                  }`}
                >
                  {/* Badge de Paquete si está en modo paquete */}
                  {isPackageMode && (
                    <div className="bg-amber-400 text-slate-950 font-black text-[9px] uppercase px-2 py-0.5 text-center tracking-wider">
                      📦 Paquete ({packQty} pzas)
                    </div>
                  )}

                  {/* Product Image / Placeholder */}
                  {imgSrc ? (
                    <div className="w-full h-28 sm:h-32 bg-white flex items-center justify-center p-2 border-b border-slate-100 overflow-hidden">
                      <img
                        src={imgSrc}
                        alt={product.name}
                        className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => { (e.target as HTMLImageElement).parentElement!.className = `w-full h-24 sm:h-28 bg-gradient-to-br ${categoryColors[product.category || 'Otros'] || 'from-gray-400 to-gray-500'} flex items-center justify-center` }}
                      />
                    </div>
                  ) : (
                    <div className={`w-full h-24 sm:h-28 bg-gradient-to-br ${categoryColors[product.category || 'Otros'] || 'from-gray-400 to-gray-500'} flex items-center justify-center`}>
                      <Package size={22} className="text-white/80" />
                    </div>
                  )}

                  <div className="p-2.5 flex-1 flex flex-col justify-between">
                    <div>
                      {/* SKU Tag destacado */}
                      {(product.sku || product.barcode) && (
                        <div className="mb-1 flex items-center justify-between gap-1">
                          <span className="inline-flex items-center text-[9.5px] font-mono font-black bg-slate-900 text-amber-300 px-1.5 py-0.5 rounded uppercase tracking-wider shadow-2xs truncate">
                            {product.sku || product.barcode}
                          </span>
                          {product.category && (
                            <span className="text-[9px] font-bold text-slate-400 uppercase truncate">
                              {product.category}
                            </span>
                          )}
                        </div>
                      )}

                      <h3 className="font-extrabold text-slate-900 leading-tight line-clamp-2 text-xs sm:text-sm" title={product.name}>
                        {product.name}
                      </h3>
                    </div>

                    <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex items-baseline justify-between gap-1">
                      {/* Precio: regular o por pieza en paquete */}
                      <div className="flex items-baseline gap-1">
                        <span className="text-sm sm:text-base font-black text-slate-900">
                          {currency.format(isPackageMode ? unitPackPrice : rawPrice)}
                        </span>
                        {isPackageMode ? (
                          <span className="text-[9px] font-bold text-slate-400 uppercase">/ pz paq</span>
                        ) : (
                          <span className="text-[9px] font-bold text-slate-400 uppercase">c/u</span>
                        )}
                      </div>

                      {/* Stock Indicator */}
                      {product.hasInventory && (
                        <div>
                          {isOutOfStock(product) ? (
                            <span className="text-[10px] text-red-600 font-bold flex items-center gap-0.5">
                              <AlertTriangle size={8} /> Agotado
                            </span>
                          ) : isLowStock(product) ? (
                            <span className="text-[10px] text-amber-600 font-bold flex items-center gap-0.5">
                              <AlertTriangle size={8} /> {product.currentStock}
                            </span>
                          ) : (
                            <span className="text-[10px] text-emerald-600 font-bold">
                              {product.currentStock} pzas
                            </span>
                          )}
                        </div>
                      )}
                    </div>
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
