import React, { useState } from 'react'
import { Product } from '@/types/index'
import { X, Printer, QrCode, Barcode, Package, Tag, Layers, Check } from 'lucide-react'
import printService from '@/services/printService'
import { useAppStore } from '@/store/appStore'

interface LabelPrintModalProps {
  product: Product | any
  onClose: () => void
}

export default function LabelPrintModal({ product, onClose }: LabelPrintModalProps) {
  const { organizationSettings } = useAppStore()
  
  // Extraer datos del paquete si vienen formateados como JSON en description
  let parsedDesc: any = {}
  if (product.description && typeof product.description === 'string' && product.description.startsWith('{')) {
    try {
      parsedDesc = JSON.parse(product.description)
    } catch (e) {}
  }

  const pieceCode = product.barcode || product.sku || `750${Math.floor(1000000000 + Math.random() * 9000000000)}`
  const packCode = product.barcode_pack || (product as any).barcodePack || `${pieceCode}-PAQ`

  let packQty = Number(
    parsedDesc.packQty ||
    parsedDesc.pack_quantity ||
    (product as any).packQty ||
    (product as any).pack_qty ||
    (product.packQuantity && Number(product.packQuantity) > 1 ? product.packQuantity : null) ||
    (product.pack_quantity && Number(product.pack_quantity) > 1 ? product.pack_quantity : null) ||
    (product.wholesale_min_qty && Number(product.wholesale_min_qty) > 1 ? product.wholesale_min_qty : null) ||
    10
  )

  if (packQty <= 1) {
    const upperName = (product.name || '').toUpperCase()
    if (upperName.includes('PQT') || upperName.includes('PAQ') || upperName.includes('CONJUNTO')) {
      packQty = 10
    } else {
      packQty = 6
    }
  }

  const piecePrice = Number(product.price || 0)
  const wholesalePrice = Number(product.wholesalePrice || product.wholesale_price || parsedDesc.wholesalePrice || (piecePrice * 0.88))
  
  let rawPackPrice = Number(product.packPrice || product.pack_price || parsedDesc.packPrice || (piecePrice * packQty * 0.75))
  let unitPackPrice = rawPackPrice
  if (rawPackPrice > piecePrice * 2 && packQty > 1) {
    unitPackPrice = rawPackPrice / packQty
  } else if (rawPackPrice <= piecePrice) {
    rawPackPrice = piecePrice * packQty
    unitPackPrice = piecePrice
  }

  // Configuración de impresión
  const [codeType, setCodeType] = useState<'qrcode' | 'code128'>('qrcode')
  const [targetType, setTargetType] = useState<'piece' | 'pack'>('piece')
  const [stylePreset, setStylePreset] = useState<'minimal' | 'full'>('minimal')
  const [copies, setCopies] = useState<number>(1)
  const [isPrinting, setIsPrinting] = useState<boolean>(false)

  const activeCode = targetType === 'piece' ? pieceCode : packCode
  const bwipBcid = codeType === 'qrcode' ? 'qrcode' : 'code128'
  const codeImgUrl = `https://bwipjs-api.metafloor.com/?bcid=${bwipBcid}&text=${encodeURIComponent(activeCode)}&scale=3${codeType === 'code128' ? '&height=10&includetext=false' : ''}`

  const handlePrint = async () => {
    setIsPrinting(true)
    try {
      const labelWidth = organizationSettings?.labelPrinterWidth || 50
      let printHTML = `<div style="display: flex; flex-direction: column; gap: 15px; font-family: system-ui, -apple-system, sans-serif; text-align: center; width: ${labelWidth}mm; margin: 0 auto;">`

      for (let i = 0; i < copies; i++) {
        if (stylePreset === 'minimal') {
          // ⚡ MODO MINIMALISTA (Optimizado Nimbot B1 - Papel 50x30mm con márgenes de seguridad de 3mm)
          printHTML += `
            <div style="width: ${labelWidth - 4}mm; height: 26mm; padding: 2mm; margin: 0 auto; box-sizing: border-box; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: space-between; page-break-after: always; background: #fff; border: 1px dashed #ccc;">
              <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.1; color: #000;">
                ${product.name.trim()}
              </div>

              ${targetType === 'pack' ? `
                <div style="font-size: 8px; font-weight: 900; background: #000; color: #fff; padding: 1px 5px; border-radius: 3px; text-transform: uppercase; margin: 1px 0;">
                  PAQUETE DE ${packQty} PZAS
                </div>
              ` : ''}

              <div style="display: flex; align-items: center; justify-content: center; width: 100%; margin: 1mm 0;">
                <img src="${codeImgUrl}" style="${codeType === 'qrcode' ? 'width: 17mm; height: 17mm;' : 'max-width: 42mm; height: 9mm;'}" alt="code">
              </div>

              <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; font-size: 9px; font-weight: 900; color: #000; border-top: 1px solid #000; padding-top: 1mm;">
                ${targetType === 'piece' ? `
                  <span>SKU: ${product.sku || 'PZA'}</span>
                  <span style="font-size: 11px; font-weight: 900;">$${piecePrice.toFixed(2)}</span>
                ` : `
                  <span>$${unitPackPrice.toFixed(2)}/pza</span>
                  <span style="font-size: 11px; font-weight: 900;">TOT: $${rawPackPrice.toFixed(2)}</span>
                `}
              </div>
            </div>
          `
        } else {
          // 📄 MODO COMPLETO (Con desglose y precios de mayoreo)
          printHTML += `
            <div style="width: ${labelWidth - 4}mm; padding: 2.5mm; margin: 0 auto; box-sizing: border-box; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: space-between; page-break-after: always; background: #fff; border: 1px dashed #000;">
              <div style="font-size: 8px; font-weight: 900; text-transform: uppercase; color: #555;">MODA MIEL MX</div>
              <div style="font-size: 11px; font-weight: 900; text-transform: uppercase; margin: 2px 0; line-height: 1.1;">${product.name.trim()}</div>
              
              ${targetType === 'piece' ? `
                <div style="font-size: 9px; font-weight: 800; color: #000; margin: 2px 0;">
                  Menudeo: <strong>$${piecePrice.toFixed(2)}</strong> | Mayoreo (3+): <strong>$${wholesalePrice.toFixed(2)}</strong>
                </div>
              ` : `
                <div style="font-size: 9px; font-weight: 800; color: #000; margin: 2px 0;">
                  PAQUETE DE ${packQty} PZAS · Total: <strong>$${rawPackPrice.toFixed(2)}</strong> ($${unitPackPrice.toFixed(2)}/c.u)
                </div>
              `}

              <div style="display: flex; justify-content: center; align-items: center; width: 100%; margin: 2mm 0;">
                <img src="${codeImgUrl}" style="${codeType === 'qrcode' ? 'width: 20mm; height: 20mm;' : 'max-width: 44mm; height: 11mm;'}" alt="code">
              </div>

              <div style="font-size: 8px; font-weight: bold; color: #333;">COD: ${activeCode}</div>
            </div>
          `
        }
      }

      printHTML += '</div>'
      await printService.printHTML(printHTML, { title: `Etiqueta_${product.name}`, width: labelWidth })
      onClose()
    } catch (error) {
      console.error('Error al imprimir etiqueta:', error)
      alert('Error al enviar orden de impresión.')
    } finally {
      setIsPrinting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 overflow-hidden space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Printer size={24} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Impresor de Etiquetas Nimbot B1</h2>
              <p className="text-xs text-slate-500 font-medium">Diseño optimizado para papel de 50x30mm con márgenes de seguridad</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Layout Grid: Controls (Left) + Visual Preview (Right) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Controls */}
          <div className="space-y-4">
            
            {/* 1. Formato del Código */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">1. Formato del Código</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCodeType('qrcode')}
                  className={`p-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 border transition-all ${
                    codeType === 'qrcode' 
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200' 
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <QrCode size={16} />
                  <span>📱 QR 2D (Recomendado)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCodeType('code128')}
                  className={`p-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 border transition-all ${
                    codeType === 'code128' 
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200' 
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Barcode size={16} />
                  <span>🏷️ Barras 1D</span>
                </button>
              </div>
            </div>

            {/* 2. Contenido del Código */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">2. Unidad a Identificar</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTargetType('piece')}
                  className={`p-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 border transition-all ${
                    targetType === 'piece' 
                      ? 'bg-slate-900 text-white border-slate-900 shadow-md' 
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Tag size={16} />
                  <span>👤 Pieza Individual</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTargetType('pack')}
                  className={`p-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 border transition-all ${
                    targetType === 'pack' 
                      ? 'bg-slate-900 text-white border-slate-900 shadow-md' 
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Package size={16} />
                  <span>📦 Paquete ({packQty} pzas)</span>
                </button>
              </div>
            </div>

            {/* 3. Estilo de Etiqueta */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">3. Estilo de Diseño</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setStylePreset('minimal')}
                  className={`p-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 border transition-all ${
                    stylePreset === 'minimal' 
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-200' 
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Check size={16} />
                  <span>⚡ Minimal Nimbot B1</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStylePreset('full')}
                  className={`p-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 border transition-all ${
                    stylePreset === 'full' 
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-200' 
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Layers size={16} />
                  <span>📄 Detallada</span>
                </button>
              </div>
            </div>

            {/* 4. Número de Copias */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">4. Cantidad de Etiquetas</label>
              <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setCopies(prev => Math.max(1, prev - 1))}
                  className="w-10 h-10 bg-white hover:bg-slate-100 rounded-xl font-black text-slate-800 border border-slate-200 shadow-sm"
                >
                  -
                </button>
                <input
                  type="number"
                  value={copies}
                  onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full text-center font-black text-slate-900 bg-transparent outline-none text-base"
                  min="1"
                  max="100"
                />
                <button
                  type="button"
                  onClick={() => setCopies(prev => prev + 1)}
                  className="w-10 h-10 bg-white hover:bg-slate-100 rounded-xl font-black text-slate-800 border border-slate-200 shadow-sm"
                >
                  +
                </button>
              </div>
            </div>

          </div>

          {/* Live Visual Preview (Scaled 50x30mm label representation) */}
          <div className="bg-slate-100 rounded-3xl p-5 flex flex-col items-center justify-center border border-slate-200/80">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3">
              Vista Previa Fidedigna (50x30mm)
            </span>

            {/* Representation of 50mm x 30mm thermal label */}
            <div className="w-[240px] h-[144px] bg-white rounded-xl shadow-lg border border-slate-300 p-2 flex flex-col justify-between items-center text-center relative overflow-hidden select-none">
              
              {/* Top product name */}
              <div className="font-extrabold text-[11px] text-slate-900 uppercase leading-tight tracking-tight line-clamp-1 w-full">
                {product.name}
              </div>

              {targetType === 'pack' && stylePreset === 'minimal' && (
                <span className="text-[9px] font-black bg-black text-white px-2 py-0.5 rounded uppercase tracking-wider">
                  PAQUETE DE {packQty} PZAS
                </span>
              )}

              {/* Code Image */}
              <div className="flex items-center justify-center w-full my-0.5">
                <img
                  src={codeImgUrl}
                  alt="preview-code"
                  className={`object-contain ${codeType === 'qrcode' ? 'h-16 w-16' : 'h-10 max-w-[190px]'}`}
                />
              </div>

              {/* Footer info */}
              <div className="w-full flex justify-between items-center border-t border-slate-800 pt-1 font-black text-[10px] text-slate-900">
                {targetType === 'piece' ? (
                  <>
                    <span className="text-slate-500 font-bold">SKU: {product.sku || 'PZA'}</span>
                    <span className="text-xs">${piecePrice.toFixed(2)}</span>
                  </>
                ) : (
                  <>
                    <span className="text-slate-600 font-bold">${unitPackPrice.toFixed(2)}/pza</span>
                    <span className="text-xs font-black">TOT: ${rawPackPrice.toFixed(2)}</span>
                  </>
                )}
              </div>
            </div>

            <p className="text-[10px] text-slate-400 font-medium text-center mt-4">
              ✨ Diseñado con márgenes libres de 3mm para evitar que la Nimbot B1 recorte o muerda bordes.
            </p>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-3 rounded-2xl text-slate-600 font-bold hover:bg-slate-100 transition-colors text-sm"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handlePrint}
            disabled={isPrinting}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black flex items-center gap-2 shadow-lg shadow-indigo-200 transition-all text-sm disabled:opacity-50"
          >
            <Printer size={18} />
            <span>{isPrinting ? 'Imprimiendo...' : `Imprimir ${copies} ${copies === 1 ? 'Etiqueta' : 'Etiquetas'}`}</span>
          </button>
        </div>

      </div>
    </div>
  )
}
