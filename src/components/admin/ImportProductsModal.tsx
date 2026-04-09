import { useState, useCallback } from 'react'
import { Upload, FileSpreadsheet, X, Check, AlertCircle, Loader2 } from 'lucide-react'
import { usePlanLimits } from '@/hooks/usePlanLimits'
import supabaseService from '@/services/supabaseService'
import { Product } from '@/types'

interface ParsedProduct {
  name: string
  price: number
  category: string
  hasInventory: boolean
  currentStock?: number
  minimumStock?: number
  sku?: string
  barcode?: string
  description?: string
}

interface ImportProductsModalProps {
  onClose: () => void
  onSuccess: () => void
  currentProductsCount: number
}

export default function ImportProductsModal({ onClose, onSuccess, currentProductsCount }: ImportProductsModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [parsedProducts, setParsedProducts] = useState<ParsedProduct[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const { getLimit, plan } = usePlanLimits()

  const parseCSV = (text: string): ParsedProduct[] => {
    const lines = text.split('\n').filter(line => line.trim())
    if (lines.length < 2) return []

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    const products: ParsedProduct[] = []

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim())
      const product: any = {}

      headers.forEach((header, index) => {
        const value = values[index] || ''
        switch (header) {
          case 'name':
            product.name = value
            break
          case 'price':
            product.price = parseFloat(value) || 0
            break
          case 'category':
            product.category = value || 'General'
            break
          case 'hasinventory':
            product.hasInventory = value.toLowerCase() === 'true' || value === '1'
            break
          case 'currentstock':
            product.currentStock = parseInt(value) || 0
            break
          case 'minimumstock':
            product.minimumStock = parseInt(value) || 0
            break
          case 'sku':
            product.sku = value
            break
          case 'barcode':
            product.barcode = value
            break
          case 'description':
            product.description = value
            break
        }
      })

      if (product.name) {
        products.push(product)
      }
    }

    return products
  }

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setErrors([])
    setParsedProducts([])

    try {
      const text = await selectedFile.text()
      const products = parseCSV(text)

      if (products.length === 0) {
        setErrors(['No se pudieron importar productos. Verifica el formato del archivo.'])
        return
      }

      setParsedProducts(products)
    } catch (err) {
      setErrors(['Error al leer el archivo. Asegúrate de que es un CSV válido.'])
    }
  }, [])

  const handleImport = async () => {
    if (parsedProducts.length === 0) return

    const availableSlots = getLimit('products') - currentProductsCount
    const toImport = parsedProducts.slice(0, availableSlots)

    if (toImport.length < parsedProducts.length) {
      setErrors([`Tu plan ${plan === 'free' ? 'Free' : plan} permite máximo ${getLimit('products')} productos. Se importarán ${toImport.length} de ${parsedProducts.length}.`])
    }

    if (toImport.length === 0) {
      setErrors(['Has alcanzado el límite de productos de tu plan.'])
      return
    }

    setImporting(true)
    setImportProgress(0)

    let imported = 0
    const errors: string[] = []

    for (const product of toImport) {
      try {
        await supabaseService.createProduct({
          ...product,
          active: true,
          createdAt: new Date()
        } as Product)
        imported++
        setImportProgress(Math.round((imported / toImport.length) * 100))
      } catch (err) {
        errors.push(`Error importando: ${product.name}`)
      }
    }

    setImporting(false)

    if (errors.length > 0) {
      setErrors(errors)
    } else {
      onSuccess()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-100 rounded-xl">
              <Upload size={24} className="text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">Importar Productos</h2>
              <p className="text-sm text-slate-500">Desde archivo CSV</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {!file && (
            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
              <FileSpreadsheet size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-600 font-medium mb-2">Arrastra tu archivo CSV aquí</p>
              <p className="text-slate-400 text-sm mb-6">o selecciona un archivo de tu computadora</p>
              <label className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white font-bold rounded-xl cursor-pointer hover:bg-slate-800 transition-colors">
                <Upload size={18} />
                Seleccionar Archivo
                <input type="file" accept=".csv" onChange={handleFileSelect} className="hidden" />
              </label>
            </div>
          )}

          {file && parsedProducts.length === 0 && errors.length > 0 && (
            <div className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-red-700">Error al procesar archivo</p>
                  {errors.map((err, i) => (
                    <p key={i} className="text-sm text-red-600">{err}</p>
                  ))}
                </div>
              </div>
              <button
                onClick={() => { setFile(null); setErrors([]); setParsedProducts([]) }}
                className="w-full py-3 bg-slate-100 text-slate-700 font-bold rounded-xl"
              >
                Intentar de nuevo
              </button>
            </div>
          )}

          {parsedProducts.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <div className="flex items-center gap-3">
                  <Check size={20} className="text-emerald-600" />
                  <div>
                    <p className="font-bold text-emerald-700">{parsedProducts.length} productos detectados</p>
                    <p className="text-sm text-emerald-600">Listos para importar</p>
                  </div>
                </div>
                <button onClick={() => { setFile(null); setParsedProducts([]) }} className="text-sm text-emerald-600 font-medium hover:underline">
                  Cambiar archivo
                </button>
              </div>

              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-sm font-bold text-slate-700 mb-2">Vista previa (primeros 5)</p>
                <div className="space-y-2">
                  {parsedProducts.slice(0, 5).map((p, i) => (
                    <div key={i} className="flex items-center justify-between text-sm bg-white p-2 rounded-lg border border-slate-100">
                      <span className="font-medium text-slate-900">{p.name}</span>
                      <span className="text-slate-500">${p.price} • {p.category}</span>
                    </div>
                  ))}
                  {parsedProducts.length > 5 && (
                    <p className="text-sm text-slate-400 text-center">...y {parsedProducts.length - 5} más</p>
                  )}
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-sm font-bold text-amber-800 mb-2">Formato esperado del CSV</p>
                <p className="text-xs text-amber-700">name, price, category, hasInventory, currentStock, minimumStock, sku, barcode, description</p>
                <p className="text-xs text-amber-600 mt-2">• hasInventory: true/false o 1/0<br/>• price: número (sin símbolo $)<br/>• category: nombre de categoría</p>
              </div>

              {errors.length > 0 && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  {errors.map((err, i) => (
                    <p key={i} className="text-sm text-amber-700">{err}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {parsedProducts.length > 0 && !importing && (
          <div className="p-6 border-t border-slate-200 flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleImport}
              className="flex-1 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
            >
              <Upload size={18} />
              Importar {parsedProducts.length} productos
            </button>
          </div>
        )}

        {importing && (
          <div className="p-6 border-t border-slate-200">
            <div className="flex items-center gap-3 mb-2">
              <Loader2 size={20} className="text-emerald-600 animate-spin" />
              <span className="font-bold text-slate-700">Importando productos...</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${importProgress}%` }}
              />
            </div>
            <p className="text-sm text-slate-500 mt-2">{importProgress}% completado</p>
          </div>
        )}
      </div>
    </div>
  )
}