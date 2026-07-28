import React, { useState } from 'react'
import { Product } from '@/types/index'
import { X, Printer, QrCode, Barcode, Package, Tag, DollarSign, Layers, Check, Monitor } from 'lucide-react'
import printService from '@/services/printService'
import { useAppStore } from '@/store/appStore'

interface LabelPrintModalProps {
  product: Product | any
  onClose: () => void
}

export default function LabelPrintModal({ product, onClose }: LabelPrintModalProps) {
  const { organizationSettings } = useAppStore()
  
  // Extraer datos de precios y paquetes infaliblemente (sincronizado con Moda Miel MX)
  let parsedDesc: any = {}
  if (product.description && typeof product.description === 'string' && product.description.startsWith('{')) {
    try {
      parsedDesc = JSON.parse(product.description)
    } catch (e) {}
  }

  const pieceCode = product.barcode || product.sku || `750${Math.floor(1000000000 + Math.random() * 9000000000)}`
  const packCode = product.barcode_pack || (product as any).barcodePack || `${pieceCode}-PAQ`

  let explicitPackQty = Number(
    parsedDesc.packQty ||
    parsedDesc.pack_quantity ||
    (product as any).packQty ||
    (product as any).pack_qty ||
    (product.packQuantity && Number(product.packQuantity) > 1 ? product.packQuantity : null) ||
    (product.pack_quantity && Number(product.pack_quantity) > 1 ? product.pack_quantity : null) ||
    (product.wholesale_min_qty && Number(product.wholesale_min_qty) > 1 ? product.wholesale_min_qty : null) ||
    10
  )

  let packQty = explicitPackQty > 1 ? explicitPackQty : 10
  const upperName = (product.name || '').toUpperCase()
  if (explicitPackQty <= 1) {
    if (upperName.includes('PQT') || upperName.includes('PAQ') || upperName.includes('CONJUNTO')) {
      packQty = 10
    } else {
      packQty = 6
    }
  }

  const rawPrice = Number(product.price || 0)
  let wholesalePrice = Number(product.wholesalePrice || (product as any).wholesale_price || parsedDesc.wholesalePrice || 0)
  let packPrice = Number((product as any).packPrice || (product as any).pack_price || parsedDesc.packPrice || 0)

  // Extraer precio del título de Moda Miel MX si viene formateado con $ (Ej: $45 - Blusa Miel)
  let extractedPriceFromName: number | null = null
  const nameStr = product.name || ''
  if (nameStr.includes('$')) {
    const afterDollar = nameStr.split('$')[1] || ''
    const parsedNum = parseFloat(afterDollar)
    if (!isNaN(parsedNum) && parsedNum > 0) {
      extractedPriceFromName = parsedNum
    }
  }

  // 1. PRECIO POR PIEZA EN PAQUETE (unitPackPrice) - Lo que este cliente maneja por defecto
  let unitPackPrice = rawPrice
  if (extractedPriceFromName !== null && extractedPriceFromName > 0) {
    unitPackPrice = extractedPriceFromName
  } else if (packPrice > 0) {
    unitPackPrice = packPrice > rawPrice * 2 && explicitPackQty > 1 ? packPrice / packQty : packPrice
  } else if (wholesalePrice > 0) {
    unitPackPrice = wholesalePrice
  }

  // 2. PRECIO TOTAL DEL PAQUETE (rawPackPrice)
  let rawPackPrice = packPrice > 0 ? packPrice : unitPackPrice * packQty
  if (rawPrice > 500 && rawPrice > unitPackPrice * 2) {
    rawPackPrice = Math.round(rawPrice)
  }

  // 3. PRECIO MENUDEO INDIVIDUAL (retailPiecePrice)
  let retailPiecePrice = rawPrice > unitPackPrice ? rawPrice : Math.round(unitPackPrice * 1.3)
  if (wholesalePrice === 0) {
    wholesalePrice = Math.round(unitPackPrice * 1.15)
  }

  // Configuración interactiva de impresión
  const [codeType, setCodeType] = useState<'qrcode' | 'code128'>('qrcode')
  const [targetType, setTargetType] = useState<'piece' | 'pack'>('piece')
  const [priceContent, setPriceContent] = useState<'unitPack' | 'retail' | 'wholesale' | 'totalPack'>('unitPack')
  const [printerFormat, setPrinterFormat] = useState<'nimbot50x30' | 'thermal58' | 'thermal80'>('nimbot50x30')
  const [copies, setCopies] = useState<number>(1)
  const [isPrinting, setIsPrinting] = useState<boolean>(false)

  const activeCode = targetType === 'piece' ? pieceCode : packCode
  const bwipBcid = codeType === 'qrcode' ? 'qrcode' : 'code128'
  const codeImgUrl = `https://bwipjs-api.metafloor.com/?bcid=${bwipBcid}&text=${encodeURIComponent(activeCode)}&scale=3${codeType === 'code128' ? '&height=10&includetext=false' : ''}`

  // Determinación dinámica del texto del precio seleccionado
  const getSelectedPriceText = () => {
    switch (priceContent) {
      case 'unitPack':
        return `$${unitPackPrice.toFixed(2)}/pza`
      case 'retail':
        return `$${retailPiecePrice.toFixed(2)} c/u`
      case 'wholesale':
        return `$${wholesalePrice.toFixed(2)} (3+)`
      case 'totalPack':
        return `TOT: $${rawPackPrice.toFixed(2)}`
      default:
        return `$${unitPackPrice.toFixed(2)}/pza`
    }
  }

  const handlePrint = async () => {
    setIsPrinting(true)
    try {
      const labelWidth = printerFormat === 'thermal80' ? 80 : (printerFormat === 'thermal58' ? 58 : 50)
      let printHTML = `<div style="display: flex; flex-direction: column; gap: 15px; font-family: system-ui, -apple-system, sans-serif; text-align: center; width: ${labelWidth}mm; margin: 0 auto;">`

      const activePriceText = getSelectedPriceText()

      for (let i = 0; i < copies; i++) {
        printHTML += `
          <div style="width: ${labelWidth - 4}mm; min-height: 26mm; padding: 2mm; margin: 0 auto; box-sizing: border-box; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: space-between; page-break-after: always; background: #fff; border: 1px dashed #ccc;">
            <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.1; color: #000;">
              ${product.name.trim()}
            </div>

            <div style="display: flex; align-items: center; justify-content: center; width: 100%; margin: 1mm 0;">
              <img src="${codeImgUrl}" style="${codeType === 'qrcode' ? 'width: 18mm; height: 18mm;' : 'max-width: 42mm; height: 9.5mm;'}" alt="code">
            </div>

            <div style="display: flex; justify-content: space-between; align-items: flex-end; width: 100%; font-size: 9px; font-weight: 900; color: #000; border-top: 1px solid #000; padding-top: 1mm;">
              <div style="text-align: left; line-height: 1.1;">
                <div style="font-size: 7.5px; font-weight: 800; color: #555;">SKU: ${product.sku || (targetType === 'piece' ? 'PZA' : 'PAQ')}</div>
                <div style="font-size: 10px; font-weight: 900;">${activePriceText}</div>
              </div>
              <span style="font-size: 8.5px; font-weight: 900; background: ${targetType === 'pack' ? '#000' : '#f1f5f9'}; color: ${targetType === 'pack' ? '#fff' : '#000'}; padding: 1px 4px; border-radius: 2px;">
                ${targetType === 'piece' ? 'PZA' : `PAQ ${packQty} PZAS`}
              </span>
            </div>
          </div>
        `
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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-4 animate-fadeIn overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col my-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-100 pb-3 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="p-2.5 sm:p-3 bg-indigo-50 text-indigo-600 rounded-2xl shrink-0">
              <Printer size={22} className="sm:w-6 sm:h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight leading-snug">Personalizar e Imprimir Etiqueta</h2>
              <p className="text-[10px] sm:text-xs text-slate-500 font-medium">Configura precios, formatos de código y tamaños de impresora térmica</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body: Controls (Left) + Visual Preview (Right) */}
        <div className="flex-1 overflow-y-auto py-4 pr-1 space-y-6 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Controls (7 cols) */}
            <div className="md:col-span-7 space-y-4">
              
              {/* 1. Formato del Código */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">1. Formato del Código</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCodeType('qrcode')}
                    className={`p-2.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 border transition-all ${
                      codeType === 'qrcode' 
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200' 
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <QrCode size={15} />
                    <span>📱 QR (2D)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCodeType('code128')}
                    className={`p-2.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 border transition-all ${
                      codeType === 'code128' 
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200' 
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Barcode size={15} />
                    <span>🏷️ Barras (1D)</span>
                  </button>
                </div>
              </div>

              {/* 2. Unidad a Identificar */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">2. Unidad a Identificar</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTargetType('piece')}
                    className={`p-2.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 border transition-all ${
                      targetType === 'piece' 
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md' 
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Tag size={15} />
                    <span>👤 Pieza Individual</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetType('pack')}
                    className={`p-2.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 border transition-all ${
                      targetType === 'pack' 
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md' 
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Package size={15} />
                    <span>📦 Paquete ({packQty} pzas)</span>
                  </button>
                </div>
              </div>

              {/* 3. Selección del Precio a Mostrar (Personalizable) */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">3. Precio a Mostrar en Etiqueta</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPriceContent('unitPack')}
                    className={`p-2.5 rounded-2xl font-bold text-[11px] flex flex-col items-center justify-center border transition-all ${
                      priceContent === 'unitPack' 
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-200' 
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className="font-extrabold">📦 Pza en Paquete (Predeterminado)</span>
                    <span className="text-[9px] opacity-80">${unitPackPrice.toFixed(2)}/pza</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriceContent('retail')}
                    className={`p-2.5 rounded-2xl font-bold text-[11px] flex flex-col items-center justify-center border transition-all ${
                      priceContent === 'retail' 
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-200' 
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className="font-extrabold">🏷️ Precio Menudeo</span>
                    <span className="text-[9px] opacity-80">${retailPiecePrice.toFixed(2)} c/u</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriceContent('wholesale')}
                    className={`p-2.5 rounded-2xl font-bold text-[11px] flex flex-col items-center justify-center border transition-all ${
                      priceContent === 'wholesale' 
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-200' 
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className="font-extrabold">💙 Precio Mayoreo (3+)</span>
                    <span className="text-[9px] opacity-80">${wholesalePrice.toFixed(2)} c/u</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriceContent('totalPack')}
                    className={`p-2.5 rounded-2xl font-bold text-[11px] flex flex-col items-center justify-center border transition-all ${
                      priceContent === 'totalPack' 
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-200' 
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className="font-extrabold">💰 Precio Total Paquete</span>
                    <span className="text-[9px] opacity-80">${rawPackPrice.toFixed(2)}</span>
                  </button>
                </div>
              </div>

              {/* 4. Tamaño e Impresora Térmica */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">4. Formato e Impresora Térmica</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPrinterFormat('nimbot50x30')}
                    className={`p-2 rounded-2xl font-bold text-[10px] flex flex-col items-center justify-center border transition-all ${
                      printerFormat === 'nimbot50x30' 
                        ? 'bg-indigo-900 text-white border-indigo-900 shadow-md' 
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className="font-black">⚡ Nimbot B1</span>
                    <span className="text-[8px] opacity-80">50 x 30 mm</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrinterFormat('thermal58')}
                    className={`p-2 rounded-2xl font-bold text-[10px] flex flex-col items-center justify-center border transition-all ${
                      printerFormat === 'thermal58' 
                        ? 'bg-indigo-900 text-white border-indigo-900 shadow-md' 
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className="font-black">🖨️ Térmica 58mm</span>
                    <span className="text-[8px] opacity-80">Rollo 58 mm</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrinterFormat('thermal80')}
                    className={`p-2 rounded-2xl font-bold text-[10px] flex flex-col items-center justify-center border transition-all ${
                      printerFormat === 'thermal80' 
                        ? 'bg-indigo-900 text-white border-indigo-900 shadow-md' 
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className="font-black">🏭 Térmica 80mm</span>
                    <span className="text-[8px] opacity-80">Rollo 80 mm</span>
                  </button>
                </div>
              </div>

              {/* 5. Número de Copias */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">5. Cantidad de Etiquetas</label>
                <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setCopies(prev => Math.max(1, prev - 1))}
                    className="w-9 h-9 sm:w-10 sm:h-10 bg-white hover:bg-slate-100 rounded-xl font-black text-slate-800 border border-slate-200 shadow-sm"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={copies}
                    onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full text-center font-black text-slate-900 bg-transparent outline-none text-sm sm:text-base"
                    min="1"
                    max="100"
                  />
                  <button
                    type="button"
                    onClick={() => setCopies(prev => prev + 1)}
                    className="w-9 h-9 sm:w-10 sm:h-10 bg-white hover:bg-slate-100 rounded-xl font-black text-slate-800 border border-slate-200 shadow-sm"
                  >
                    +
                  </button>
                </div>
              </div>

            </div>

            {/* Live Visual Preview (5 cols) */}
            <div className="md:col-span-5 bg-slate-100 rounded-3xl p-4 sm:p-5 flex flex-col items-center justify-center border border-slate-200/80">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3">
                Vista Previa Fidedigna ({printerFormat === 'thermal80' ? '80mm' : (printerFormat === 'thermal58' ? '58mm' : '50x30mm')})
              </span>

              {/* Representation of label */}
              <div className="w-[220px] sm:w-[240px] h-[132px] sm:h-[144px] bg-white rounded-xl shadow-lg border border-slate-300 p-2 flex flex-col justify-between items-center text-center relative overflow-hidden select-none">
                
                {/* Top product name */}
                <div className="font-extrabold text-[11px] text-slate-900 uppercase leading-tight tracking-tight line-clamp-1 w-full">
                  {product.name}
                </div>

                {/* Code Image */}
                <div className="flex items-center justify-center w-full my-0.5">
                  <img
                    src={codeImgUrl}
                    alt="preview-code"
                    className={`object-contain ${codeType === 'qrcode' ? 'h-14 sm:h-16 w-14 sm:w-16' : 'h-9 sm:h-10 max-w-[170px] sm:max-w-[190px]'}`}
                  />
                </div>

                {/* Footer info */}
                <div className="w-full flex justify-between items-end border-t border-slate-800 pt-1 font-black text-[10px] text-slate-900">
                  <div className="text-left leading-tight">
                    <div className="text-[8px] text-slate-500 font-bold">SKU: {product.sku || (targetType === 'piece' ? 'PZA' : 'PAQ')}</div>
                    <div className="text-[11px] font-black">{getSelectedPriceText()}</div>
                  </div>
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${targetType === 'pack' ? 'bg-black text-white' : 'bg-slate-100 text-slate-800'}`}>
                    {targetType === 'piece' ? 'PZA' : `PAQ ${packQty} PZAS`}
                  </span>
                </div>
              </div>

              <p className="text-[10px] text-slate-400 font-medium text-center mt-3">
                ✨ {printerFormat === 'nimbot50x30' ? 'Margen de 3mm anti-recortes para Nimbot B1.' : 'Diseño responsivo para impresora térmica.'}
              </p>
            </div>

          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-2.5 sm:gap-3 pt-3.5 border-t border-slate-100 shrink-0 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 sm:px-5 sm:py-3 rounded-2xl text-slate-600 font-bold hover:bg-slate-100 transition-colors text-xs sm:text-sm"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handlePrint}
            disabled={isPrinting}
            className="px-5 py-2.5 sm:px-6 sm:py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black flex items-center gap-2 shadow-lg shadow-indigo-200 transition-all text-xs sm:text-sm disabled:opacity-50"
          >
            <Printer size={18} />
            <span>{isPrinting ? 'Imprimiendo...' : `Imprimir ${copies} ${copies === 1 ? 'Etiqueta' : 'Etiquetas'}`}</span>
          </button>
        </div>

      </div>
    </div>
  )
}
