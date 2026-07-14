import { useState, useMemo } from 'react'
import { X, Archive, Printer, Plus, Minus } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import supabaseService from '@/services/supabaseService'
import printService from '@/services/printService'

interface BulkDeconstructModalProps {
  onClose: () => void
  onSuccess: () => void
}

export default function BulkDeconstructModal({ onClose, onSuccess }: BulkDeconstructModalProps) {
  const { currentUser, products } = useAppStore()
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    price: 0,
    category: 'Ropa',
    packagesCount: 1, // Cantidad de bultos/paquetes
  })

  // Listado de tallas y cantidad por paquete
  const [sizeQuantities, setSizeQuantities] = useState<Record<string, number>>({
    'CH': 0,
    'M': 0,
    'G': 0,
    'XG': 0,
  })

  const [customSize, setCustomSize] = useState('')
  const [shouldPrint, setShouldPrint] = useState(true)
  const [printOnePerSize, setPrintOnePerSize] = useState(false)

  const handleAddCustomSize = () => {
    const trimmed = customSize.trim().toUpperCase()
    if (trimmed && !(trimmed in sizeQuantities)) {
      setSizeQuantities({
        ...sizeQuantities,
        [trimmed]: 0
      })
      setCustomSize('')
    }
  }

  const handleRemoveSize = (sz: string) => {
    const next = { ...sizeQuantities }
    delete next[sz]
    setSizeQuantities(next)
  }

  const handleQtyChange = (sz: string, val: number) => {
    setSizeQuantities({
      ...sizeQuantities,
      [sz]: Math.max(0, val)
    })
  }

  const totalPiecesPerPackage = useMemo(() => {
    return Object.values(sizeQuantities).reduce((a, b) => a + b, 0)
  }, [sizeQuantities])

  const totalPiecesReceived = useMemo(() => {
    return totalPiecesPerPackage * formData.packagesCount
  }, [totalPiecesPerPackage, formData.packagesCount])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return alert('Por favor, ingresa el nombre del producto')
    if (totalPiecesReceived <= 0) return alert('Debes agregar al menos 1 pieza en el desglose de tallas')

    setLoading(true)
    try {
      const resultsToPrint: { name: string; barcode: string; price: number; size: string; count: number }[] = []

      for (const [size, qtyPerPack] of Object.entries(sizeQuantities)) {
        if (qtyPerPack <= 0) continue

        const totalQtyForSize = qtyPerPack * formData.packagesCount
        const variantName = `${formData.name.trim()} (${size})`
        
        // Buscar si la variante ya existe
        const existing = products.find(p => p.name.toLowerCase() === variantName.toLowerCase())

        let barcode = ''
        if (existing) {
          barcode = existing.barcode || ''
          const newStock = (existing.currentStock || 0) + totalQtyForSize
          await supabaseService.updateRetailProduct(existing.id, {
            currentStock: newStock,
            hasInventory: true
          })
          await supabaseService.createAuditLog({
            userId: currentUser?.id || 'unknown',
            action: 'PRODUCT_UPDATED',
            entityType: 'PRODUCT',
            entityId: existing.id,
            newValue: { name: variantName, currentStock: newStock, stockAdded: totalQtyForSize }
          })
        } else {
          // Generar código de barra EAN-13 ficticio único
          barcode = `750${Math.floor(1000000000 + Math.random() * 9000000000)}`
          
          const payload = {
            name: variantName,
            price: formData.price,
            category: formData.category,
            barcode: barcode,
            hasInventory: true,
            currentStock: totalQtyForSize,
            minimumStock: 2,
            active: true,
            createdAt: new Date(),
          }

          const newId = await supabaseService.createRetailProduct(payload)
          await supabaseService.createAuditLog({
            userId: currentUser?.id || 'unknown',
            action: 'PRODUCT_CREATED',
            entityType: 'PRODUCT',
            entityId: newId,
            newValue: payload
          })
        }

        resultsToPrint.push({
          name: formData.name.trim(),
          barcode,
          price: formData.price,
          size,
          count: totalQtyForSize
        })
      }

      // Impresión de etiquetas automatizada
      if (shouldPrint && resultsToPrint.length > 0) {
        let printHTML = '<div style="display: flex; flex-direction: column; gap: 20px; font-family: monospace; text-align: center;">'
        
        resultsToPrint.forEach(item => {
          const quantityToPrint = printOnePerSize ? 1 : item.count
          for (let i = 0; i < quantityToPrint; i++) {
            printHTML += `
              <div style="border: 1px dashed #000; padding: 10px; width: 50mm; margin: 0 auto; page-break-after: always; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                <div style="font-size: 10px; font-weight: bold; text-transform: uppercase;">Reisbloc Retail</div>
                <div style="font-size: 12px; font-weight: bold; margin: 4px 0;">${item.name}</div>
                <div style="font-size: 14px; font-weight: 900;">TALLA: ${item.size}</div>
                <div style="font-size: 16px; font-weight: bold; margin: 4px 0;">$${item.price.toFixed(2)}</div>
                
                <!-- Código de Barras Renderizado -->
                <div style="font-size: 20px; font-family: 'Libre Barcode 39', 'Courier New', monospace; letter-spacing: 2px; margin: 6px 0;">
                  *${item.barcode}*
                </div>
                <div style="font-size: 9px; color: #555;">${item.barcode}</div>
              </div>
            `
          }
        })
        
        printHTML += '</div>'
        await printService.printHTML(printHTML, { title: 'Etiquetas de Códigos', width: 50 })
      }

      onSuccess()
      onClose()
    } catch (e) {
      console.error('Error desglosando bulto:', e)
      alert('Ocurrió un error al procesar el bulto/lote.')
    } finally {
      setLoading(false)
    }
  }

  // Las categorías predeterminadas
  const categories = ['Ropa', 'Calzado', 'Accesorios', 'General']

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-8 animate-scaleIn max-h-[90vh] overflow-y-auto custom-scrollbar border border-slate-200">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-600 text-white rounded-2xl">
              <Archive size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight">INGRESAR BULTO / LOTE</h2>
              <p className="text-xs text-slate-500 font-bold uppercase mt-0.5">Desglose de stock automático por tallas</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <X size={28} className="text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest">
                Nombre Base del Producto (Ej. Playera Modelo Polo)
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-slate-900/5 outline-none font-bold text-base"
                placeholder="Nombre sin la talla"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest">
                Precio de Venta Unitario ($)
              </label>
              <input
                type="number"
                value={formData.price || ''}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-slate-900/5 outline-none font-bold text-base"
                placeholder="0.00"
                min="0"
                step="0.01"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-widest">
                Categoría
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-slate-900/5 outline-none font-bold text-base"
              >
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>

            <div className="md:col-span-2 bg-amber-50 border border-amber-100 p-5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-black text-amber-900 uppercase tracking-tight">
                  1. Cantidad de Bultos / Paquetes Recibidos
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, packagesCount: Math.max(1, formData.packagesCount - 1) })}
                    className="p-2 bg-white border border-amber-200 text-amber-800 rounded-xl hover:bg-amber-100 transition-colors"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="font-black text-amber-950 px-3 text-lg">{formData.packagesCount}</span>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, packagesCount: formData.packagesCount + 1 })}
                    className="p-2 bg-white border border-amber-200 text-amber-800 rounded-xl hover:bg-amber-100 transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 border-t border-slate-100 pt-5">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                2. Desglose de Tallas (Unidades por Paquete)
              </label>
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                Suma: {totalPiecesPerPackage} pzas/paq
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 max-h-40 overflow-y-auto pr-1">
              {Object.entries(sizeQuantities).map(([sz, qty]) => (
                <div key={sz} className="flex items-center justify-between bg-slate-50 border border-slate-100 p-2.5 rounded-xl">
                  <span className="font-black text-sm text-slate-700">{sz}</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleQtyChange(sz, qty - 1)}
                      className="p-1 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      <Minus size={12} />
                    </button>
                    <input
                      type="number"
                      value={qty || ''}
                      onChange={(e) => handleQtyChange(sz, parseInt(e.target.value) || 0)}
                      className="w-12 text-center font-bold bg-transparent outline-none text-slate-900 border-b border-slate-200 focus:border-slate-800"
                      min="0"
                    />
                    <button
                      type="button"
                      onClick={() => handleQtyChange(sz, qty + 1)}
                      className="p-1 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      <Plus size={12} />
                    </button>
                    {['CH', 'M', 'G', 'XG'].indexOf(sz) === -1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSize(sz)}
                        className="text-xs text-red-500 font-bold ml-1 hover:text-red-700"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ej: XXL, 32, 34..."
                value={customSize}
                onChange={(e) => setCustomSize(e.target.value)}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-xl outline-none font-bold text-xs"
              />
              <button
                type="button"
                onClick={handleAddCustomSize}
                className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition-all"
              >
                Agregar Talla
              </button>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-5 space-y-3">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="shouldPrint"
                checked={shouldPrint}
                onChange={(e) => setShouldPrint(e.target.checked)}
                className="w-5 h-5 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
              />
              <label htmlFor="shouldPrint" className="text-xs font-black text-slate-700 cursor-pointer uppercase tracking-tight flex items-center gap-1.5">
                <Printer size={16} /> Imprimir etiquetas de código de barras
              </label>
            </div>

            {shouldPrint && (
              <div className="ml-8 flex items-center gap-3 animate-scaleIn">
                <input
                  type="checkbox"
                  id="printOnePerSize"
                  checked={printOnePerSize}
                  onChange={(e) => setPrintOnePerSize(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                />
                <label htmlFor="printOnePerSize" className="text-[11px] font-bold text-slate-500 cursor-pointer uppercase tracking-tight">
                  Imprimir solo 1 etiqueta por Talla (en vez del total de prendas: {totalPiecesReceived})
                </label>
              </div>
            )}
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl flex justify-between items-center">
            <span className="text-xs font-bold text-slate-500">TOTAL A INGRESAR:</span>
            <span className="text-lg font-black text-slate-900">{totalPiecesReceived} prendas</span>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 border border-slate-200 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold transition-all shadow-lg shadow-slate-900/10 flex items-center justify-center gap-2"
            >
              {loading ? 'Procesando...' : 'Guardar y Generar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
