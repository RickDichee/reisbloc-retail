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
  if (!hasAnyRole(['admin', 'manager', 'supervisor'])) return <Navigate to="/pos" replace />

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

  const handlePrintLabel = async (product: any) => {
    try {
      const pieceCode = product.barcode || product.sku
      if (!pieceCode) {
        alert('Este producto no tiene un Código de Barras o SKU configurado.');
        return;
      }

      const packCode = product.barcode_pack || `${pieceCode}-PAQ`
      const packQty = product.packQuantity || 6
      const packPrice = product.packPrice || (product.price * packQty * 0.85)

      // Generate barcode images using bwip-js
      const pieceBarcodeImg = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(pieceCode)}&scale=3&height=10&includetext`;
      const packBarcodeImg = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(packCode)}&scale=3&height=10&includetext`;

      const htmlContent = `
        <div style="width: 58mm; padding: 2px; font-family: sans-serif; text-align: center;">
          <!-- 📦 ETIQUETA 1: PIEZA INDIVIDUAL -->
          <div style="border-bottom: 2px dashed #ccc; padding-bottom: 10px; margin-bottom: 10px;">
            <span style="font-size: 8px; font-weight: 900; background: #1A1A1A; color: white; padding: 1px 4px; border-radius: 3px; uppercase">PIEZA INDIVIDUAL</span>
            <h2 style="font-size: 12px; margin: 4px 0 2px 0; font-weight: 900;">${product.name}</h2>
            <p style="font-size: 16px; font-weight: 900; color: #E62E6B; margin: 0 0 4px 0;">$${Number(product.price || 0).toFixed(2)} c/u</p>
            <div style="display: flex; justify-content: center; width: 100%;">
              <img src="${pieceBarcodeImg}" style="max-width: 95%; height: auto;" alt="barcode-piece">
            </div>
          </div>

          <!-- 📦 ETIQUETA 2: PAQUETE DE MAYOREO -->
          <div style="padding-bottom: 5px;">
            <span style="font-size: 8px; font-weight: 900; background: #E62E6B; color: white; padding: 1px 4px; border-radius: 3px; uppercase">PAQUETE DE ${packQty} PIEZAS</span>
            <h2 style="font-size: 12px; margin: 4px 0 2px 0; font-weight: 900;">${product.name} (PAQ)</h2>
            <p style="font-size: 16px; font-weight: 900; color: #1A1A1A; margin: 0 0 4px 0;">$${Number(packPrice).toFixed(2)} / Paq</p>
            <div style="display: flex; justify-content: center; width: 100%;">
              <img src="${packBarcodeImg}" style="max-width: 95%; height: auto;" alt="barcode-pack">
            </div>
            <p style="font-size: 8px; margin-top: 4px; color: #666; font-weight: bold;">Descuenta ${packQty} piezas de inventario</p>
          </div>

          <p style="font-size: 8px; margin-top: 8px; color: #888; font-weight: bold; border-top: 1px solid #eee; pt-1">MODA MIEL MX · Powered by REISBLOC</p>
        </div>
      `;

      await printService.printHTML(htmlContent, { width: 58, title: `Labels-${pieceCode}` });

    } catch (error) {
      console.error('Error printing labels:', error);
      alert('Error al mandar impresión de etiquetas térmicas.');
    }
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
      <div className="relative space-y-8 p-4 sm:p-0">
        {/* Header - Widget Premium Carbon Look */}
        <div className="bg-slate-900 text-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.2)] overflow-hidden border border-white/5 relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full -mr-32 -mt-32"></div>
          <div className="px-6 py-6 sm:px-8 flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-white/5 rounded-2xl backdrop-blur-md border border-white/10 shadow-inner">
                <Package size={28} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-[10px] text-emerald-400 uppercase tracking-[0.2em] font-black mb-0.5">Stock Central</p>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tighter uppercase leading-none">Inventario</h1>
                <p className="text-slate-400 mt-2 font-bold tracking-tight opacity-80 uppercase text-xs">Gestión profesional de suministros y productos</p>
              </div>
            </div>
            {isAdminOrManager && (
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-8 py-4 rounded-2xl font-black flex items-center gap-3 transition-all active:scale-95 shadow-[0_10px_20px_rgba(16,185,129,0.3)] group"
                >
                  <Plus size={24} className="group-hover:rotate-90 transition-transform duration-300" />
                  NUEVO PRODUCTO
                </button>
                <button
                  onClick={() => setShowImportModal(true)}
                  className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-4 rounded-2xl font-black flex items-center gap-2 transition-all active:scale-95"
                >
                  IMPORTAR
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Search & Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 bg-white rounded-3xl shadow-sm border border-slate-200 p-2 flex items-center gap-2">
            <div className="relative flex-1 group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" size={20} />
              <input
                type="text"
                placeholder="Buscar por Nombre, Categoría, SKU o Código..."
                className="w-full pl-14 pr-6 py-3 bg-slate-50/50 border-none rounded-2xl focus:ring-0 outline-none font-bold text-slate-900"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              onClick={() => setFilterLowStock(!filterLowStock)}
              className={`p-4 rounded-2xl transition-all border flex items-center gap-2 font-bold text-xs ${filterLowStock
                ? 'bg-red-50 border-red-200 text-red-600 shadow-inner'
                : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'
                }`}
            >
              <AlertTriangle size={18} />
              <span className="hidden sm:inline">STOCK BAJO</span>
            </button>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total</p>
              <div className="text-3xl font-black text-slate-900">{filteredProducts.length}</div>
            </div>
            <div className="p-3 bg-slate-900 text-white rounded-2xl">
              <Package size={20} />
            </div>
          </div>
        </div>

        {/* Product Grid - Retail Optimized */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
          {filteredProducts.map(product => (
            <div
              key={product.id}
              className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group overflow-hidden flex flex-col"
            >
              <div className="p-5 flex-1 space-y-4">
                {/* Product Image */}
                {product.image ? (
                  <div className="w-full h-36 rounded-2xl overflow-hidden bg-slate-100 -mx-0 -mt-0">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none' }}
                    />
                  </div>
                ) : (
                  <div className="w-full h-24 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                    <Package size={32} className="text-slate-300" />
                  </div>
                )}

                {/* 1. Product Name (Top Priority) */}
                <h3 className="text-lg font-black text-slate-900 group-hover:text-emerald-600 transition-colors line-clamp-2 uppercase tracking-tight leading-tight">
                  {product.name}
                </h3>

                {/* 2. Meta Info (Category, SKU, Stock Status) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-indigo-600">
                      {product.category || 'General'}
                    </p>
                    <div className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest ${product.hasInventory ? 'bg-slate-100 text-slate-600' : 'bg-slate-50 text-slate-400'}`}>
                      {product.hasInventory ? 'Stock' : 'N/A'}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {product.sku && (
                      <div className="text-[10px] font-bold text-slate-400 font-mono bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                        SKU: {product.sku}
                      </div>
                    )}
                    {product.barcode && (
                      <div className="text-[10px] font-bold text-slate-400 font-mono bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                        {product.barcode}
                      </div>
                    )}
                  </div>
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
                            <div className="text-[9px] font-black text-indigo-950/80 bg-indigo-50 border border-indigo-100/50 px-2 py-1 rounded-xl flex items-center gap-1 mt-2">
                              <span className="uppercase text-[8px] text-indigo-400 font-extrabold tracking-wider">Tallas:</span>
                              <span className="font-mono">{sizesText}</span>
                            </div>
                          )
                        }
                      } catch (e) {}
                    }
                    return null
                  })()}
                </div>

                <div className="flex items-end justify-between pt-2 border-t border-slate-50 mt-2">
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                      {isModaMiel ? 'Precio Unitario x Paquete' : 'Precio'}
                    </p>
                    {(() => {
                      if (isModaMiel && product.packPrice && product.packPrice > 0) {
                        const packQty = product.packQty || product.packQuantity || 10
                        const packUnitPrice = product.packPrice / packQty
                        return (
                          <div>
                            <div className="text-2xl font-black text-[#E62E6B] tracking-tighter">
                              ${packUnitPrice.toFixed(2)} <span className="text-[10px] text-slate-500 font-bold">/ pza</span>
                            </div>
                            <span className="text-[9px] font-black bg-pink-100 text-[#E62E6B] px-1.5 py-0.5 rounded border border-pink-200 uppercase">
                              Paquete (${product.packPrice} x {packQty} pcs)
                            </span>
                          </div>
                        )
                      }
                      return (
                        <div className="text-2xl font-black text-slate-900 tracking-tighter">
                          ${Number(product.price).toFixed(2)}
                        </div>
                      )
                    })()}
                  </div>
                  {product.hasInventory && (
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Existencia</p>
                      <p className={`text-2xl font-black ${Number(product.currentStock) <= Number(product.minimumStock) ? 'text-red-500' : 'text-slate-950'}`}>
                        {product.currentStock}
                      </p>
                      {Number(product.currentStock) <= Number(product.minimumStock) && (
                        <div className="flex items-center gap-1 text-[8px] font-black text-red-500 uppercase mt-1 animate-pulse">
                          <AlertTriangle size={8} /> Stock Bajo
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="px-5 py-4 bg-slate-50/50 border-t border-slate-100 flex gap-2">
                <button
                  onClick={() => handlePrintLabel(product)}
                  className="p-3 bg-purple-100 text-purple-700 hover:bg-purple-200 transition-all rounded-xl shadow-sm text-xs font-black flex items-center justify-center group/print"
                  title="Imprimir Etiqueta Térmica"
                >
                  <Printer size={16} className="group-hover/print:scale-110 transition-transform" />
                </button>
                <button
                  onClick={() => handleShareProduct(product)}
                  className="flex-1 bg-white border border-slate-200 p-3 rounded-xl text-slate-600 hover:text-slate-900 hover:shadow-md transition-all flex items-center justify-center gap-2 text-xs font-black group/btn"
                >
                  <Share2 size={16} className="group-hover/btn:scale-110 transition-transform" />
                  <span className="hidden xs:inline">SHARE</span>
                </button>
                <button
                  onClick={() => setEditingProduct(product)}
                  className="p-3 bg-slate-900 text-white rounded-xl hover:bg-emerald-500 hover:text-slate-950 transition-all shadow-lg shadow-slate-900/10 group/edit"
                >
                  <Edit2 size={16} className="group-edit:rotate-12 transition-transform" />
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

      </div>
    </DashboardLayout>
  )
}