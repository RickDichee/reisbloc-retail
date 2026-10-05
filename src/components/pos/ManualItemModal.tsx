import { useState, useEffect, useRef } from 'react'
import { X, DollarSign, Tag, Package, User, Check, Scissors } from 'lucide-react'
import { useTenantTheme } from '@/hooks/useTenantTheme'

interface ManualItemModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (description: string, price: number, packQty?: number) => void
}

export default function ManualItemModal({ isOpen, onClose, onAdd }: ManualItemModalProps) {
  const { isModaMiel: isThemeMM } = useTenantTheme()
  const isModaMiel = isThemeMM || (typeof window !== 'undefined' && (
    window.location.hostname.includes('modamiel') ||
    window.location.search.includes('modamiel') ||
    window.location.hash.includes('modamiel') ||
    (localStorage.getItem('current_org_id') || '').includes('1b498fa6-aca5-428c-9bdd-01e6fea30316')
  ))
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [isPackage, setIsPackage] = useState(false)
  const [packQty, setPackQty] = useState<number>(10)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setDescription('')
      setPrice('')
      setIsPackage(isModaMiel ? true : false)
      setPackQty(10)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen, isModaMiel])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const numPrice = parseFloat(price)
    if (!description.trim() || isNaN(numPrice)) return
    
    if (isModaMiel) {
      if (isPackage) {
        // Paquete completo Moda Miel
        const finalDesc = description.toUpperCase().includes('PAQUETE') ? description : `PAQUETE - ${description}`
        onAdd(finalDesc, numPrice, packQty > 1 ? packQty : 10)
      } else {
        // Medio paquete Moda Miel
        const finalDesc = description.toUpperCase().includes('MEDIO') ? description : `MEDIO PAQUETE - ${description}`
        onAdd(finalDesc, numPrice, packQty > 1 ? packQty : 5)
      }
    } else {
      if (isPackage) {
        // Agregar como paquete (packQty piezas a numPrice cada una)
        const finalDesc = description.toUpperCase().includes('PAQUETE') ? description : `PAQUETE - ${description}`
        onAdd(finalDesc, numPrice, packQty)
      } else {
        // Agregar como pieza individual
        onAdd(description, numPrice, 1)
      }
    }
    
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-scaleIn border border-slate-100 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <Tag size={18} className="text-amber-400" />
            <h3 className="font-black text-base uppercase tracking-tight">Agregar Producto Manual / Paquete</h3>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
          {/* Selector de Modo: Medio Paquete vs Paquete Completo (Moda Miel) / Pieza vs Paquete (Otros) */}
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
              1. Selecciona Tipo de Venta
            </label>
            {isModaMiel ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsPackage(false)
                    setPackQty(5)
                  }}
                  className={`py-3 px-3 rounded-2xl text-xs font-black uppercase flex items-center justify-center gap-2 border transition-all ${
                    !isPackage
                      ? 'bg-sky-500 text-slate-950 border-sky-500 shadow-md font-black'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Scissors size={14} />
                  <span>✂️ 1/2 Paquete</span>
                  {!isPackage && <Check size={14} className="text-slate-950" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsPackage(true)
                    setPackQty(10)
                  }}
                  className={`py-3 px-3 rounded-2xl text-xs font-black uppercase flex items-center justify-center gap-2 border transition-all ${
                    isPackage
                      ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-lg shadow-amber-200 font-black'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Package size={14} />
                  <span>📦 Paquete Completo</span>
                  {isPackage && <Check size={14} className="text-slate-950" />}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsPackage(false)}
                  className={`py-3 px-3 rounded-2xl text-xs font-black uppercase flex items-center justify-center gap-2 border transition-all ${
                    !isPackage
                      ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <User size={14} />
                  <span>👤 Pieza</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPackage(true)}
                  className={`py-3 px-3 rounded-2xl text-xs font-black uppercase flex items-center justify-center gap-2 border transition-all ${
                    isPackage
                      ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-lg shadow-amber-200'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Package size={14} />
                  <span>📦 PAQUETE</span>
                  {isPackage && <Check size={14} />}
                </button>
              </div>
            )}
          </div>

          {/* Cantidad de Piezas */}
          {(isPackage || isModaMiel) && (
            <div className={`p-3 rounded-2xl border space-y-2 animate-fadeIn ${
              isModaMiel && !isPackage ? 'bg-sky-50 border-sky-200' : 'bg-amber-50 border-amber-200'
            }`}>
              <label className={`block text-[10px] font-black uppercase tracking-widest ${
                isModaMiel && !isPackage ? 'text-sky-900' : 'text-amber-800'
              }`}>
                Piezas por lote ({isModaMiel ? (isPackage ? 'Paquete Completo' : 'Medio Paquete') : 'Paquete'}):
              </label>
              <div className="flex gap-2">
                {(isModaMiel && !isPackage ? [5, 6, 4, 3] : [10, 12, 6, 24]).map(qty => (
                  <button
                    key={qty}
                    type="button"
                    onClick={() => setPackQty(qty)}
                    className={`flex-1 py-2 rounded-xl text-xs font-black border transition-all ${
                      packQty === qty
                        ? (isModaMiel && !isPackage ? 'bg-sky-400 text-slate-950 border-sky-500 shadow-sm' : 'bg-amber-400 text-slate-950 border-amber-500 shadow-sm')
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {qty} pzas
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Descripción */}
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
              Descripción del Producto
            </label>
            <div className="relative">
              <Tag size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 pl-10 pr-3.5 py-3 rounded-2xl font-bold text-sm text-slate-900 focus:border-indigo-500 focus:bg-white transition-all outline-none"
                placeholder={isPackage ? "Ej. PAQUETE BLUSA MIEL" : "Ej. Prenda Varios, Ajuste..."}
                required
              />
            </div>
          </div>

          {/* Precio Unitario */}
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
              {isPackage ? 'Precio por Pieza en Paquete ($)' : 'Precio Unitario ($)'}
            </label>
            <div className="relative">
              <DollarSign size={18} className="absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 pl-10 pr-3.5 py-3 rounded-2xl font-black text-xl text-slate-900 focus:border-indigo-500 focus:bg-white transition-all outline-none"
                placeholder="0.00"
                required
              />
            </div>
            {isPackage && parseFloat(price) > 0 && (
              <p className="text-[11px] font-black text-amber-700 mt-1 ml-1">
                Total Paquete ({packQty} pzas): ${ (parseFloat(price) * packQty).toFixed(2) }
              </p>
            )}
          </div>

          {/* Footer buttons */}
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-slate-100 text-slate-600 font-bold rounded-2xl text-xs hover:bg-slate-200 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={`flex-1 py-3 px-4 font-black rounded-2xl text-xs uppercase tracking-wider transition-all shadow-lg ${
                isPackage
                  ? 'bg-amber-400 text-slate-950 shadow-amber-200 hover:bg-amber-500'
                  : isModaMiel
                    ? 'bg-sky-500 text-slate-950 shadow-sky-200 hover:bg-sky-600'
                    : 'bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-700'
              }`}
            >
              {isPackage 
                ? `Agregar Paquete (${packQty} pzas)` 
                : (isModaMiel ? `Agregar 1/2 Paquete (${packQty} pzas)` : 'Agregar Pieza')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}