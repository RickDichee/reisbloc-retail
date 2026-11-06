import React, { useState, useEffect } from 'react'
import { Product } from '@/types/index'
import { X, Printer, QrCode, Barcode, Tag, Building2, DollarSign, SlidersHorizontal, Check } from 'lucide-react'
import printService from '@/services/printService'
import { useAppStore } from '@/store/appStore'
import { BRANDING } from '@/config/branding'

interface LabelPrintModalProps {
  product: Product | any
  onClose: () => void
}

type LabelPreset = '50x30' | '40x30' | '30x20' | '58x40' | '80x50' | 'custom'

interface PresetDimensions {
  label: string
  sub: string
  width: number
  height: number
}

const PRESETS: Record<Exclude<LabelPreset, 'custom'>, PresetDimensions> = {
  '50x30': { label: '50 × 30 mm', sub: 'Niimbot / Estándar', width: 50, height: 30 },
  '40x30': { label: '40 × 30 mm', sub: 'Compacta', width: 40, height: 30 },
  '30x20': { label: '30 × 20 mm', sub: 'Mini joyero', width: 30, height: 20 },
  '58x40': { label: '58 × 40 mm', sub: 'Térmica 58mm', width: 58, height: 40 },
  '80x50': { label: '80 × 50 mm', sub: 'Térmica 80mm', width: 80, height: 50 }
}

export default function LabelPrintModal({ product, onClose }: LabelPrintModalProps) {
  const { organizationSettings } = useAppStore()

  // Nombre de la tienda
  const defaultStoreName = organizationSettings?.businessName || organizationSettings?.name || BRANDING.appName || 'Mi Negocio'

  // Código base (código de barras o SKU)
  const defaultCode = product.barcode || product.sku || `750${Math.floor(1000000000 + Math.random() * 9000000000)}`

  // Precio base del producto
  const rawPrice = Number(product.price || 0)
  const systemPriceFormatted = `$${rawPrice.toFixed(2)}`

  // Estado de tamaño y formato de etiqueta
  const [preset, setPreset] = useState<LabelPreset>('50x30')
  const [customWidth, setCustomWidth] = useState<number>(50)
  const [customHeight, setCustomHeight] = useState<number>(30)

  // Calibración y alineación horizontal (Offset X en mm) para corregir el margen físico del cabezal térmico
  const [offsetX, setOffsetX] = useState<number>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('label_printer_offset_x') : null
    return saved !== null ? parseFloat(saved) : -1.5 // Predeterminado a -1.5mm para eliminar el desfase hacia la derecha
  })

  // Módulos / Toggles de contenido
  const [showStoreName, setShowStoreName] = useState<boolean>(false)
  const [storeNameText, setStoreNameText] = useState<string>(defaultStoreName)

  const [showProductName, setShowProductName] = useState<boolean>(true)
  const [productNameText, setProductNameText] = useState<string>(product.name || '')

  const [showPrice, setShowPrice] = useState<boolean>(true)
  const [priceMode, setPriceMode] = useState<'system' | 'manual'>('system')
  const [manualPriceText, setManualPriceText] = useState<string>(systemPriceFormatted)

  const [showCode, setShowCode] = useState<boolean>(true)
  const [codeType, setCodeType] = useState<'code128' | 'qrcode'>('code128')
  const [codeValue, setCodeValue] = useState<string>(defaultCode)

  const [showCodeText, setShowCodeText] = useState<boolean>(true)

  // Copias e impresión
  const [copies, setCopies] = useState<number>(1)
  const [isPrinting, setIsPrinting] = useState<boolean>(false)
  const [localBarcodeUrl, setLocalBarcodeUrl] = useState<string>('')

  // Dimensiones efectivas
  const effectiveWidth = preset === 'custom' ? customWidth : PRESETS[preset].width
  const effectiveHeight = preset === 'custom' ? customHeight : PRESETS[preset].height

  // Texto del precio activo
  const activePriceText = priceMode === 'system' ? systemPriceFormatted : manualPriceText

  // Guardar calibración de impresora
  const handleOffsetXChange = (val: number) => {
    const rounded = Math.round(val * 10) / 10
    setOffsetX(rounded)
    if (typeof window !== 'undefined') {
      localStorage.setItem('label_printer_offset_x', String(rounded))
    }
  }

  // Generar código de barras localmente con canvas (cero márgenes parásitos)
  useEffect(() => {
    if (codeType === 'code128' && codeValue) {
      try {
        const canvas = document.createElement('canvas')
        // @ts-ignore
        import('jsbarcode').then((module) => {
          const JsBarcode = module.default || module
          JsBarcode(canvas, codeValue.trim(), {
            format: 'CODE128',
            width: 2,
            height: 42,
            displayValue: false,
            margin: 0
          })
          setLocalBarcodeUrl(canvas.toDataURL('image/png'))
        }).catch(() => {})
      } catch (e) {
        console.warn('JsBarcode canvas error:', e)
      }
    } else {
      setLocalBarcodeUrl('')
    }
  }, [codeValue, codeType])

  // URL fallback con bwip-js sin márgenes (paddingwidth=0)
  const bwipBcid = codeType === 'qrcode' ? 'qrcode' : 'code128'
  const fallbackImgUrl = `https://bwipjs-api.metafloor.com/?bcid=${bwipBcid}&text=${encodeURIComponent(codeValue)}&scale=3&paddingwidth=0&paddingheight=0${
    codeType === 'code128' ? '&height=10&includetext=false' : ''
  }`
  const codeImgUrl = (codeType === 'code128' && localBarcodeUrl) ? localBarcodeUrl : fallbackImgUrl

  const handlePrint = async () => {
    setIsPrinting(true)
    try {
      let printHTML = ''

      // Ajustes de escala según el alto de la etiqueta
      const isSmall = effectiveHeight <= 25
      const isTiny = effectiveHeight <= 20
      const titleFontSize = isTiny ? '7px' : isSmall ? '8.5px' : '10px'
      const priceFontSize = isTiny ? '9px' : isSmall ? '11px' : '13px'
      const storeFontSize = isTiny ? '6.5px' : '7.5px'
      const skuFontSize = isTiny ? '6.5px' : '7.5px'
      const qrSizeMm = isTiny ? 10 : isSmall ? 13 : 16
      const barHeightMm = isTiny ? 6 : isSmall ? 7.5 : 9.5

      for (let i = 0; i < copies; i++) {
        printHTML += `
          <div class="label-page" style="position: relative; left: ${offsetX}mm;">
            ${
              showStoreName && storeNameText.trim()
                ? `<div style="font-size: ${storeFontSize}; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.75; line-height: 1; max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${storeNameText.trim()}
                  </div>`
                : ''
            }

            ${
              showProductName && productNameText.trim()
                ? `<div style="font-size: ${titleFontSize}; font-weight: 900; text-transform: uppercase; line-height: 1.15; max-width: 100%; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; padding: 0 0.5mm;">
                    ${productNameText.trim()}
                  </div>`
                : ''
            }

            ${
              showCode && codeValue.trim()
                ? `<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; margin: 0.5mm 0;">
                    <img src="${codeImgUrl}" style="${
                    codeType === 'qrcode'
                      ? `width: ${qrSizeMm}mm; height: ${qrSizeMm}mm; object-contain: contain;`
                      : `max-width: ${effectiveWidth - 4}mm; height: ${barHeightMm}mm; object-contain: contain;`
                  }" alt="code">
                    ${
                      showCodeText
                        ? `<span style="font-family: monospace; font-size: ${skuFontSize}; font-weight: 800; letter-spacing: 0.5px; margin-top: 0.5mm; line-height: 1;">${codeValue.trim()}</span>`
                        : ''
                    }
                  </div>`
                : ''
            }

            ${
              showPrice && activePriceText.trim()
                ? `<div style="font-size: ${priceFontSize}; font-weight: 900; line-height: 1; padding: 0.5mm 1mm; border-radius: 2px; letter-spacing: -0.2px;">
                    ${activePriceText.trim()}
                  </div>`
                : ''
            }
          </div>
        `
      }

      await printService.printHTML(printHTML, {
        title: `Etiqueta_${productNameText || 'Producto'}`,
        width: effectiveWidth,
        height: effectiveHeight,
        isLabel: true
      })
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
      <div className="bg-white rounded-3xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl border border-slate-100 max-h-[92vh] flex flex-col my-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-100 pb-3.5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 sm:p-3 bg-[var(--primary)]/10 text-[var(--primary)] rounded-2xl shrink-0">
              <Printer size={22} className="sm:w-6 sm:h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight leading-snug">
                Personalizar e Imprimir Etiqueta
              </h2>
              <p className="text-[10px] sm:text-xs text-slate-500 font-medium">
                Calibración de centrado milimétrico y módulos configurables
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body: Controles (Izquierda) + Vista Previa Centrada (Derecha) */}
        <div className="flex-1 overflow-y-auto py-4 pr-1 space-y-6 custom-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Controles Modulares (7 columnas) */}
            <div className="lg:col-span-7 space-y-5">
              
              {/* 1. Selector de Tamaño de Etiqueta */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <SlidersHorizontal size={13} className="text-[var(--primary)]" />
                    <span>1. Tamaño de Etiqueta</span>
                  </label>
                  <span className="text-[10px] font-mono font-bold text-slate-400">
                    {effectiveWidth} × {effectiveHeight} mm
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(PRESETS) as Array<Exclude<LabelPreset, 'custom'>>).map((key) => {
                    const p = PRESETS[key]
                    const isSelected = preset === key
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setPreset(key)}
                        className={`p-2.5 rounded-2xl text-left border transition-all ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/10'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <div className="font-black text-xs">{p.label}</div>
                        <div className={`text-[9px] font-medium truncate ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                          {p.sub}
                        </div>
                      </button>
                    )
                  })}

                  {/* Opción Personalizada */}
                  <button
                    type="button"
                    onClick={() => setPreset('custom')}
                    className={`p-2.5 rounded-2xl text-left border transition-all ${
                      preset === 'custom'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/10'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="font-black text-xs">Ajuste Libre</div>
                    <div className={`text-[9px] font-medium truncate ${preset === 'custom' ? 'text-slate-300' : 'text-slate-400'}`}>
                      Ancho × Alto
                    </div>
                  </button>
                </div>

                {/* Inputs de Tamaño Personalizado */}
                {preset === 'custom' && (
                  <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200 animate-fadeIn">
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Ancho (mm):
                      </label>
                      <input
                        type="number"
                        min="20"
                        max="120"
                        value={customWidth}
                        onChange={(e) => setCustomWidth(Math.max(15, parseInt(e.target.value) || 20))}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 font-bold text-xs text-slate-900 outline-none focus:border-[var(--primary)]"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Alto (mm):
                      </label>
                      <input
                        type="number"
                        min="15"
                        max="150"
                        value={customHeight}
                        onChange={(e) => setCustomHeight(Math.max(10, parseInt(e.target.value) || 15))}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 font-bold text-xs text-slate-900 outline-none focus:border-[var(--primary)]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Calibración y Centrado Fino (Offset Horizontal) */}
              <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <SlidersHorizontal size={13} className="text-[var(--primary)]" />
                    <span>2. Calibración de Centrado (Offset Horizontal)</span>
                  </label>
                  <span className="text-xs font-mono font-black text-slate-900 bg-white border border-slate-200 px-2 py-0.5 rounded-lg shadow-xs">
                    {offsetX > 0 ? `+${offsetX}` : offsetX} mm
                  </span>
                </div>
                
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Si tu impresora térmica inicia con margen a la izquierda y desplaza la impresión a la derecha, usa un valor negativo (ej. <strong>-1.5 mm</strong>) para centrarla perfectamente.
                </p>

                {/* Botones de selección rápida */}
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {[-2.5, -2.0, -1.5, -1.0, -0.5, 0, 0.5, 1.0].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleOffsetXChange(val)}
                      className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border transition-all ${
                        offsetX === val
                          ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {val === 0 ? '0 mm (Centro)' : `${val > 0 ? `+${val}` : val} mm`}
                    </button>
                  ))}
                </div>

                {/* Botones de ajuste paso a paso */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleOffsetXChange(offsetX - 0.5)}
                    className="flex-1 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl font-bold text-[11px] text-slate-700 transition-all active:scale-95"
                  >
                    ◀ Mover más a la Izq (-0.5 mm)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOffsetXChange(offsetX + 0.5)}
                    className="flex-1 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl font-bold text-[11px] text-slate-700 transition-all active:scale-95"
                  >
                    Mover a la Der (+0.5 mm) ▶
                  </button>
                </div>
              </div>

              {/* 3. Módulos de Contenido (Toggles Personalizables) */}
              <div className="space-y-3">
                <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block">
                  3. ¿Qué deseas incluir en la etiqueta?
                </label>

                {/* Módulo: Nombre de Tienda */}
                <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showStoreName}
                        onChange={(e) => setShowStoreName(e.target.checked)}
                        className="w-4 h-4 rounded text-[var(--primary)] focus:ring-[var(--primary)]/30 border-slate-300"
                      />
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Building2 size={13} className="text-slate-500" />
                        <span>Nombre de la Tienda / Negocio</span>
                      </span>
                    </label>
                  </div>
                  {showStoreName && (
                    <input
                      type="text"
                      value={storeNameText}
                      onChange={(e) => setStoreNameText(e.target.value)}
                      placeholder="Ej. Los Chunches de Cons"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-[var(--primary)]"
                    />
                  )}
                </div>

                {/* Módulo: Nombre del Producto */}
                <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showProductName}
                        onChange={(e) => setShowProductName(e.target.checked)}
                        className="w-4 h-4 rounded text-[var(--primary)] focus:ring-[var(--primary)]/30 border-slate-300"
                      />
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Tag size={13} className="text-slate-500" />
                        <span>Nombre del Producto</span>
                      </span>
                    </label>
                  </div>
                  {showProductName && (
                    <input
                      type="text"
                      value={productNameText}
                      onChange={(e) => setProductNameText(e.target.value)}
                      placeholder="Título que saldrá en la etiqueta"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-[var(--primary)]"
                    />
                  )}
                </div>

                {/* Módulo: Precio */}
                <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showPrice}
                        onChange={(e) => setShowPrice(e.target.checked)}
                        className="w-4 h-4 rounded text-[var(--primary)] focus:ring-[var(--primary)]/30 border-slate-300"
                      />
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <DollarSign size={13} className="text-emerald-600" />
                        <span>Precio en Etiqueta</span>
                      </span>
                    </label>
                  </div>

                  {showPrice && (
                    <div className="space-y-2 pt-1 border-t border-slate-200/70">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setPriceMode('system')}
                          className={`py-1.5 px-2.5 rounded-xl text-xs font-bold border transition-all ${
                            priceMode === 'system'
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          Catálogo: {systemPriceFormatted}
                        </button>
                        <button
                          type="button"
                          onClick={() => setPriceMode('manual')}
                          className={`py-1.5 px-2.5 rounded-xl text-xs font-bold border transition-all ${
                            priceMode === 'manual'
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          ✏️ Precio Manual
                        </button>
                      </div>

                      {priceMode === 'manual' && (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={manualPriceText}
                            onChange={(e) => setManualPriceText(e.target.value)}
                            placeholder="Ej. $150.00 ó 2x$250"
                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-black text-slate-900 outline-none focus:border-emerald-500"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Módulo: Código Gráfico (Barras / QR) */}
                <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showCode}
                        onChange={(e) => setShowCode(e.target.checked)}
                        className="w-4 h-4 rounded text-[var(--primary)] focus:ring-[var(--primary)]/30 border-slate-300"
                      />
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        {codeType === 'qrcode' ? <QrCode size={13} className="text-slate-500" /> : <Barcode size={13} className="text-slate-500" />}
                        <span>Código Gráfico Escaneable</span>
                      </span>
                    </label>
                  </div>

                  {showCode && (
                    <div className="space-y-2 pt-1 border-t border-slate-200/70">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setCodeType('code128')}
                          className={`py-1.5 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                            codeType === 'code128'
                              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <Barcode size={14} />
                          <span>Barras 1D</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setCodeType('qrcode')}
                          className={`py-1.5 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                            codeType === 'qrcode'
                              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <QrCode size={14} />
                          <span>QR 2D</span>
                        </button>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                          Contenido del código:
                        </label>
                        <input
                          type="text"
                          value={codeValue}
                          onChange={(e) => setCodeValue(e.target.value)}
                          placeholder="Código numérico o alfanumérico"
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-slate-800 outline-none focus:border-[var(--primary)]"
                        />
                      </div>

                      <label className="flex items-center gap-2 cursor-pointer pt-1">
                        <input
                          type="checkbox"
                          checked={showCodeText}
                          onChange={(e) => setShowCodeText(e.target.checked)}
                          className="w-3.5 h-3.5 rounded text-[var(--primary)] border-slate-300"
                        />
                        <span className="text-[11px] font-semibold text-slate-600">
                          Mostrar texto del código debajo
                        </span>
                      </label>
                    </div>
                  )}
                </div>

              </div>

              {/* 4. Número de Copias */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block">
                  4. Cantidad de Etiquetas a Imprimir
                </label>
                <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-200 max-w-xs">
                  <button
                    type="button"
                    onClick={() => setCopies((prev) => Math.max(1, prev - 1))}
                    className="w-10 h-10 bg-white hover:bg-slate-100 rounded-xl font-black text-slate-800 border border-slate-200 shadow-xs flex items-center justify-center text-lg transition-all active:scale-95"
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
                    onClick={() => setCopies((prev) => prev + 1)}
                    className="w-10 h-10 bg-white hover:bg-slate-100 rounded-xl font-black text-slate-800 border border-slate-200 shadow-xs flex items-center justify-center text-lg transition-all active:scale-95"
                  >
                    +
                  </button>
                </div>
              </div>

            </div>

            {/* Vista Previa Fidedigna Centrada (5 columnas) */}
            <div className="lg:col-span-5 bg-slate-100/80 rounded-3xl p-5 flex flex-col items-center justify-center border border-slate-200/80 sticky top-2">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-3">
                Vista Previa Centrada ({effectiveWidth} × {effectiveHeight} mm)
              </span>

              {/* Marco de etiqueta escalado proporcionalmente */}
              <div
                style={{
                  width: `${Math.min(260, Math.max(180, effectiveWidth * 4.2))}px`,
                  minHeight: `${Math.min(220, Math.max(120, effectiveHeight * 4.2))}px`
                }}
                className="bg-white rounded-xl shadow-lg border-2 border-dashed border-slate-300 p-2.5 flex flex-col justify-between items-center text-center relative select-none transition-all duration-200"
              >
                {/* Nombre de Tienda */}
                {showStoreName && storeNameText.trim() && (
                  <div className="font-bold text-[9px] uppercase tracking-wider text-slate-400 line-clamp-1 w-full text-center">
                    {storeNameText.trim()}
                  </div>
                )}

                {/* Nombre del Producto */}
                {showProductName && productNameText.trim() && (
                  <div className="font-extrabold text-[11px] text-slate-900 uppercase leading-snug line-clamp-2 w-full text-center mt-0.5">
                    {productNameText.trim()}
                  </div>
                )}

                {/* Código */}
                {showCode && codeValue.trim() && (
                  <div className="flex flex-col items-center justify-center w-full my-1">
                    <img
                      src={codeImgUrl}
                      alt="preview-code"
                      className={`object-contain ${
                        codeType === 'qrcode' ? 'h-14 w-14' : 'h-8 max-w-[90%]'
                      }`}
                    />
                    {showCodeText && (
                      <span className="font-mono text-[8.5px] font-bold text-slate-600 tracking-wider mt-0.5">
                        {codeValue.trim()}
                      </span>
                    )}
                  </div>
                )}

                {/* Precio */}
                {showPrice && activePriceText.trim() && (
                  <div className="font-black text-sm text-slate-900 tracking-tight mt-0.5">
                    {activePriceText.trim()}
                  </div>
                )}

                {/* Si no hay nada seleccionado */}
                {!showStoreName && !showProductName && !showPrice && !showCode && (
                  <div className="flex-1 flex items-center justify-center text-slate-400 text-xs font-bold">
                    Selecciona al menos un elemento
                  </div>
                )}
              </div>

              <div className="mt-3.5 space-y-1 text-center">
                <p className="text-[10px] text-slate-700 font-bold flex items-center justify-center gap-1">
                  <Check size={12} className="text-emerald-500" />
                  <span>Calibración: {offsetX > 0 ? `+${offsetX}` : offsetX} mm ({offsetX < 0 ? 'ajustada a la izquierda' : offsetX === 0 ? 'centrada' : 'ajustada a la derecha'})</span>
                </p>
                <p className="text-[9px] text-slate-400">
                  Guardado en este equipo para todas tus impresiones térmicas.
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-3.5 border-t border-slate-100 shrink-0 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-2xl text-slate-600 font-bold hover:bg-slate-100 transition-colors text-xs sm:text-sm"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handlePrint}
            disabled={isPrinting}
            className="px-6 py-2.5 bg-[var(--primary)] hover:brightness-110 text-white rounded-2xl font-black flex items-center gap-2 shadow-lg shadow-[var(--primary)]/20 transition-all text-xs sm:text-sm disabled:opacity-50 active:scale-95"
          >
            <Printer size={18} />
            <span>{isPrinting ? 'Imprimiendo...' : `Imprimir ${copies} ${copies === 1 ? 'Etiqueta' : 'Etiquetas'}`}</span>
          </button>
        </div>

      </div>
    </div>
  )
}
