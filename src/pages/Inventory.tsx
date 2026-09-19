import { useState, useEffect, useCallback } from 'react'
import { Navigate } from 'react-router-dom'
import { Package, Plus, Search, AlertTriangle, Share2, Edit2, Printer } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { usePermissions } from '@/hooks/usePermissions'
import logger from '@/utils/logger'
import supabaseService from '@/services/supabaseService'
import printService from '@/services/printService'
import ProductModal from '@/components/admin/ProductModal'
import ImportProductsModal from '@/components/admin/ImportProductsModal'
import LabelPrintModal from '@/components/admin/LabelPrintModal'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner'
import { useTenantTheme } from '@/hooks/useTenantTheme'

export default function Inventory() {
  const { products, setProducts, currentUser } = useAppStore()
  const { isModaMiel } = useTenantTheme()
  const { hasAnyRole } = usePermissions()
  const isAdminOrManager = currentUser?.role === 'admin' || currentUser?.role === 'manager'
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterLowStock, setFilterLowStock] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<any>(null)
  const [printingProduct, setPrintingProduct] = useState<any>(null)
  const [scannedBarcode, setScannedBarcode] = useState('')

  useBarcodeScanner((code) => {
    const product = products.find(p => p.barcode === code || p.sku === code)
    if (product) {
      setEditingProduct(product)
    } else {
      setScannedBarcode(code)
      setShowCreateModal(true)
    }
  })

  const loadInventory = useCallback(async () => {
    setLoading(true)
    try {
      await supabaseService.consolidateLegacyVariants()
      const data = await supabaseService.getAllRetailProducts()
      setProducts(data)
    } catch (e) {
      logger.error('inventory', 'Error loading inventory', e as any)
    } finally {
      setLoading(false)
    }
  }, [setProducts])

  useEffect(() => {
    loadInventory()
  }, [loadInventory])

  if (!currentUser) return <Navigate to="/login" replace />
  if (!hasAnyRole(['admin', 'manager', 'supervisor', 'employee', 'cashier'])) return <Navigate to="/pos" replace />

  const canCreateProduct = ['admin', 'manager', 'employee', 'cashier'].includes(currentUser?.role || '')

  const handleShareProduct = async (product: any) => {
    const text = `
🔥 *¡PROMO DEL DÍA!* 🔥

 taco *${product.name}*
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

  const handlePrintLabel = (product: any) => {
    setPrintingProduct(product)
  }

  const filteredProducts = products.filter(p => {
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch =
      p.name.toLowerCase().includes(searchLower) ||
      p.category.toLowerCase().includes(searchLower) ||
      (p.sku && p.sku.toLowerCase().includes(searchLower)) ||
      (p.barcode && p.barcode.toLowerCase().includes(searchLower))

    const isLowStock = p.hasInventory && (p.currentStock || 0) <= (p.minimumStock || 0)
    return matchesSearch && (filterLowStock ? isLowStock : true)
  })

  return (
    <DashboardLayout>
      <div className="relative space-y-4 sm:space-y-5 p-2 sm:p-0">
        {/* Header - Compact, Modern Fintech Look */}
        <div className="bg-slate-900 text-white rounded-xl shadow-sm border border-slate-800 p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg border flex items-center justify-center shrink-0 ${
              isModaMiel 
                ? 'bg-[#D4386C]/15 border-[#D4386C]/30 text-[#D4386C]' 
                : 'bg-teal-500/15 border-teal-500/30 text-teal-400'
            }`}>
              <Package size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black tracking-tight text-white uppercase leading-none">Inventario</h1>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                  Stock Central
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-1">Gestión de existencias, precios y códigos de barra</p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {canCreateProduct && (
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm ${
                  isModaMiel 
                    ? 'bg-[#D4386C] hover:bg-[#b82d5b] text-white' 
                    : 'bg-teal-500 hover:bg-teal-400 text-slate-950 font-black'
                }`}
              >
                <Plus size={16} />
                <span>NUEVO PRODUCTO</span>
              </button>
            )}
            {isAdminOrManager && (
              <button
                type="button"
                onClick={() => setShowImportModal(true)}
                className="px-3 py-2 rounded-lg font-bold text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center gap-1.5 transition-all"
              >
                IMPORTAR
              </button>
            )}
          </div>
        </div>

        {/* Search & Stats */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="flex-1 bg-white dark:bg-slate-900 rounded-lg shadow-2xs border border-slate-200 dark:border-slate-800 p-1 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Buscar por Nombre, Categoría, SKU o Código..."
                className="w-full pl-9 pr-3 py-1.5 bg-transparent border-none rounded-md focus:ring-0 outline-none font-medium text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              type="button"
              onClick={() => setFilterLowStock(!filterLowStock)}
              className={`px-2.5 py-1.5 rounded-md transition-all border flex items-center gap-1.5 font-bold text-xs shrink-0 ${filterLowStock
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 text-rose-600 dark:text-rose-400 shadow-inner'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50'
                }`}
            >
              <AlertTriangle size={14} />
              <span className="hidden xs:inline">Stock Bajo</span>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-2xs border border-slate-200 dark:border-slate-800 px-3.5 py-1.5 flex items-center justify-between sm:justify-end gap-2.5 shrink-0">
            <span className="text-xs text-slate-500 font-medium">Total productos:</span>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-black text-slate-900 dark:text-white font-mono leading-none">
                {filteredProducts.length}
              </span>
              <Package size={15} className="text-slate-400" />
            </div>
          </div>
        </div>

        {/* Product Grid - Retail Optimized */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 pb-20">
          {filteredProducts.map(product => (
            <div
              key={product.id}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 group overflow-hidden flex flex-col"
            >
              <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                {/* Product Image */}
                {product.image ? (
                  <div className="w-full h-36 sm:h-40 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-center p-1.5 relative">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200 drop-shadow-xs"
                      onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none' }}
                    />
                    {/* Floating Low Stock Badge */}
                    {product.hasInventory && Number(product.currentStock) <= Number(product.minimumStock) && (
                      <div className="absolute top-1.5 right-1.5 bg-rose-500 text-white text-[8.5px] font-black px-1.5 py-0.5 rounded shadow-xs flex items-center gap-0.5">
                        <AlertTriangle size={9} />
                        <span>BAJO</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-24 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <Package size={24} className="text-slate-300 dark:text-slate-600" />
                  </div>
                )}

                {/* SKU & Category Row */}
                <div className="flex items-center justify-between gap-1 min-w-0">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate uppercase tracking-wider">
                    {product.category || 'General'}
                  </span>
                  {(product.sku || product.barcode) && (
                    <span className="inline-flex items-center font-mono font-bold text-[9.5px] bg-amber-500/10 text-amber-700 dark:text-amber-400 px-1.5 py-0.2 rounded border border-amber-500/20 truncate">
                      {product.sku || product.barcode}
                    </span>
                  )}
                </div>

                {/* Product Name */}
                <h3 className="text-xs sm:text-[13px] font-bold text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors line-clamp-2 uppercase tracking-tight leading-tight min-h-[2rem]">
                  {product.name}
                </h3>

                {/* Sizes pill if available */}
                {(() => {
                  if (!product.description) return null
                  if (product.description.startsWith('{') && product.description.endsWith('}')) {
                    try {
                      const parsed = JSON.parse(product.description)
                      if (parsed.sizes && Object.keys(parsed.sizes).length > 0) {
                        const sizesText = Object.entries(parsed.sizes)
                          .filter(([_, qty]) => (qty as number) > 0)
                          .map(([sz, qty]) => `${sz}: ${qty}`)
                          .join(' | ')
                        if (!sizesText) return null
                        return (
                          <div className="text-[9px] font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded truncate">
                            {sizesText}
                          </div>
                        )
                      }
                    } catch (e) {}
                  }
                  return null
                })()}

                {/* Price & Stock Row */}
                <div className="flex items-baseline justify-between pt-2 border-t border-slate-100 dark:border-slate-800 mt-auto">
                  <div>
                    <p className="text-[9px] text-slate-400 font-mono font-bold uppercase tracking-wider">
                      {isModaMiel ? 'Pqte' : 'Precio'}
                    </p>
                    <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono tracking-tight">
                      ${Number(product.packPrice || product.price || 0).toFixed(2)}
                    </div>
                  </div>
                  {product.hasInventory && (
                    <div className="text-right">
                      <p className="text-[9px] text-slate-400 font-mono font-bold uppercase tracking-wider">Stock</p>
                      <p className={`text-base sm:text-lg font-black font-mono leading-none ${
                        Number(product.currentStock) <= Number(product.minimumStock) 
                          ? 'text-rose-500' 
                          : 'text-slate-900 dark:text-white'
                      }`}>
                        {product.currentStock}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="px-2.5 py-2 bg-slate-50/80 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex gap-1.5">
                <button
                  type="button"
                  onClick={() => handlePrintLabel(product)}
                  className="p-1.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 transition-all rounded-md text-xs font-bold flex items-center justify-center shrink-0 border border-purple-500/20"
                  title="Imprimir Etiqueta Térmica"
                >
                  <Printer size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => handleShareProduct(product)}
                  className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-1.5 px-2 rounded-md text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-50 transition-all flex items-center justify-center gap-1 text-[11px] font-bold"
                >
                  <Share2 size={13} />
                  <span className="hidden xs:inline">Compartir</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditingProduct(product)}
                  className="p-1.5 bg-slate-900 dark:bg-slate-700 text-white rounded-md hover:bg-teal-500 hover:text-slate-950 transition-all text-xs font-bold flex items-center justify-center shrink-0"
                  title="Editar Producto"
                >
                  <Edit2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {loading && (
          <div className="p-12 text-center text-slate-400 animate-pulse font-bold uppercase tracking-widest">
            Sincronizando inventario...
          </div>
        )}

        {!loading && filteredProducts.length === 0 && (
          <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-20 text-center space-y-4">
            <Package size={64} className="mx-auto text-slate-200" />
            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-900 uppercase">Sin resultados</h3>
              <p className="text-slate-400 font-medium">No encontramos productos que coincidan con tu búsqueda.</p>
            </div>
          </div>
        )}

        {(showCreateModal || editingProduct) && (
          <ProductModal
            product={editingProduct || undefined}
            initialBarcode={scannedBarcode || undefined}
            onClose={() => {
              setShowCreateModal(false)
              setEditingProduct(null)
              setScannedBarcode('')
            }}
            onSuccess={() => {
              setShowCreateModal(false)
              setEditingProduct(null)
              setScannedBarcode('')
              loadInventory()
            }}
          />
        )}

        {showImportModal && (
          <ImportProductsModal
            onClose={() => setShowImportModal(false)}
            onSuccess={() => {
              setShowImportModal(false)
              loadInventory()
            }}
            currentProductsCount={products.length}
          />
        )}

        {printingProduct && (
          <LabelPrintModal
            product={printingProduct}
            onClose={() => setPrintingProduct(null)}
          />
        )}

      </div>
    </DashboardLayout>
  )
}