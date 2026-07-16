import React, { useState } from 'react'
import { Product } from '@/types/index'
import { useAppStore } from '@/store/appStore'
import supabaseService from '@/services/supabaseService'
import { storageService } from '@/services/storageService'
import { compressImage } from '@/utils/imageCompression'
import { X, Save, Loader2, Image as ImageIcon, Camera, Plus, Printer } from 'lucide-react'
import PlanGate from '@/components/common/PlanGate'
import printService from '@/services/printService'

function parseProductDescription(descriptionText: string | null) {
  if (!descriptionText) return { description: '', packPrice: undefined, bulkPrice: undefined, packQty: 10, packagesPerBulk: 10 }
  try {
    if (descriptionText.startsWith('{') && descriptionText.endsWith('}')) {
      const parsed = JSON.parse(descriptionText)
      return {
        description: parsed.description || '',
        packPrice: parsed.packPrice,
        bulkPrice: parsed.bulkPrice,
        packQty: parsed.packQty || 10,
        packagesPerBulk: parsed.packagesPerBulk || 10
      }
    }
  } catch (e) {
    // ignore
  }
  return { description: descriptionText, packPrice: undefined, bulkPrice: undefined, packQty: 10, packagesPerBulk: 10 }
}

function serializeProductDescription(description: string, packPrice?: number, bulkPrice?: number, packQty?: number, packagesPerBulk?: number) {
  if (packPrice !== undefined || bulkPrice !== undefined || packQty !== undefined || packagesPerBulk !== undefined) {
    const finalPackQty = packQty || 10
    const finalPackagesPerBulk = packagesPerBulk || 10
    const calculatedBulkQty = finalPackQty * finalPackagesPerBulk

    return JSON.stringify({
      description,
      packPrice,
      bulkPrice,
      packQty: finalPackQty,
      packagesPerBulk: finalPackagesPerBulk,
      bulkQty: calculatedBulkQty
    })
  }
  return description
}

interface ProductModalProps {
    product?: Product
    initialBarcode?: string
    onClose: () => void
    onSuccess: () => void
}

export default function ProductModal({
    product,
    initialBarcode,
    onClose,
    onSuccess
}: ProductModalProps) {
    const { currentUser, products, organizationSettings } = useAppStore()
    const parsedDesc = parseProductDescription(product?.description || '')
    const [formData, setFormData] = useState({
        name: product?.name || '',
        price: product?.price || 0,
        category: product?.category || 'General',
        sku: product?.sku || '',
        barcode: product?.barcode || initialBarcode || '',
        description: parsedDesc.description,
        hasInventory: product?.hasInventory || false,
        currentStock: product?.currentStock || 0,
        minimumStock: product?.minimumStock || 10,
        active: product?.active ?? true,
        image: product?.image || '',
        parentId: product?.parentId || '',
        packQuantity: product?.packQuantity || 1,
        wholesalePrice: product?.wholesalePrice ?? (product as any)?.wholesale_price ?? undefined,
        wholesaleMinQty: product?.wholesaleMinQty ?? (product as any)?.wholesale_min_qty ?? 3,
        packPrice: parsedDesc.packPrice,
        packQty: parsedDesc.packQty || 10,
        bulkPrice: parsedDesc.bulkPrice,
        packagesPerBulk: parsedDesc.packagesPerBulk || 10
    })
    const [loading, setLoading] = useState(false)
    const [isBulk, setIsBulk] = useState(false)
    const [packagesCount, setPackagesCount] = useState(1)
    const [sizeQuantities, setSizeQuantities] = useState<Record<string, number>>({
        'CH': 0,
        'M': 0,
        'G': 0,
        'XG': 0,
    })
    const [customSize, setCustomSize] = useState('')
    const [shouldPrint, setShouldPrint] = useState(true)
    const [printMode, setPrintMode] = useState<'bulto' | 'talla' | 'prenda'>('bulto')
    const [isWholesale, setIsWholesale] = useState(!!product?.parentId)

    const handleQtyChange = (sz: string, val: number) => {
        setSizeQuantities(prev => ({
            ...prev,
            [sz]: Math.max(0, val)
        }))
    }

    const handleAddCustomSize = () => {
        const trimmed = customSize.trim().toUpperCase()
        if (trimmed && !(trimmed in sizeQuantities)) {
            setSizeQuantities(prev => ({
                ...prev,
                [trimmed]: 0
            }))
            setCustomSize('')
        }
    }

    const handleRemoveSize = (sz: string) => {
        setSizeQuantities(prev => {
            const next = { ...prev }
            delete next[sz]
            return next
        })
    }

    // Image Upload states
    const [imageFile, setImageFile] = useState<File | null>(null)
    const [imagePreview, setImagePreview] = useState<string | null>(product?.image || null)

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (file.size > 5 * 1024 * 1024) {
            alert('El archivo es demasiado grande. El máximo permitido es 5MB.')
            return
        }
        setImageFile(file)
        setImagePreview(URL.createObjectURL(file))
    }

    const generateBarcode = () => {
        // Generates a 12 digit string starting with 750 (Mexico prefix)
        const prefix = "750"
        const random = Math.floor(100000000 + Math.random() * 900000000).toString()
        setFormData(prev => ({ ...prev, barcode: prefix + random }))
    }

    const categories = [
        'General',
        'Electrónica',
        'Ropa y Accesorios',
        'Hogar',
        'Alimentos',
        'Bebidas',
        'Limpieza',
        'Ferretería',
        'Papelería',
        'Otros'
    ]

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            let finalImageUrl = formData.image

            // Si hay un archivo nuevo, lo comprimimos y lo subimos
            if (imageFile) {
                // Comprimir a max 800x800, calidad 0.7
                const compressedBlob = await compressImage(imageFile, 800, 800, 0.7)
                // Usamos un ID temporal o el real si ya existe al subir a storage
                const storageId = product ? product.id : `draft_${Date.now()}`
                finalImageUrl = await storageService.uploadProductImage(storageId, compressedBlob)
            }

            const finalDescription = serializeProductDescription(
                formData.description || '',
                formData.packPrice,
                formData.bulkPrice,
                formData.packQty,
                formData.packagesPerBulk
            )

            const payload = { 
                ...formData, 
                image: finalImageUrl,
                description: finalDescription,
                wholesalePrice: formData.wholesalePrice,
                wholesaleMinQty: formData.wholesaleMinQty,
                parentId: isWholesale && formData.parentId ? formData.parentId : undefined,
                packQuantity: isWholesale ? Number(formData.packQuantity) : 1
            }

            if (product) {
                await supabaseService.updateRetailProduct(product.id, payload)
                await supabaseService.createAuditLog({
                    userId: currentUser?.id || 'unknown',
                    action: 'PRODUCT_UPDATED',
                    entityType: 'PRODUCT',
                    entityId: product.id,
                    newValue: payload
                })
            } else {
                if (isBulk) {
                    const totalPiecesPerPackage = Object.values(sizeQuantities).reduce((a, b) => a + b, 0)
                    const totalPiecesReceived = totalPiecesPerPackage * packagesCount

                    if (totalPiecesReceived <= 0) {
                        alert('Debes agregar al menos 1 pieza en el desglose de tallas')
                        setLoading(false)
                        return
                    }

                    const resultsToPrint: { name: string; barcode: string; price: number; size: string; count: number }[] = []

                    for (const [size, qtyPerPack] of Object.entries(sizeQuantities)) {
                        if (qtyPerPack <= 0) continue

                        const totalQtyForSize = qtyPerPack * packagesCount
                        const variantName = `${formData.name.trim()} (${size})`
                        
                        // Buscar si la variante ya existe
                        const existing = products.find(p => p.name.toLowerCase() === variantName.toLowerCase())

                        let barcode = ''
                        if (existing) {
                            barcode = existing.barcode || ''
                            const newStock = (existing.currentStock || 0) + totalQtyForSize
                            await supabaseService.updateRetailProduct(existing.id, {
                                ...payload,
                                sku: formData.sku ? `${formData.sku.trim()}-${size}` : undefined,
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
                            barcode = `750${Math.floor(1000000000 + Math.random() * 9000000000)}`
                            
                            const newId = await supabaseService.createRetailProduct({
                                ...payload,
                                name: variantName,
                                barcode: barcode,
                                sku: formData.sku ? `${formData.sku.trim()}-${size}` : undefined,
                                hasInventory: true,
                                currentStock: totalQtyForSize,
                                active: true,
                                createdAt: new Date(),
                            })
                            await supabaseService.createAuditLog({
                                userId: currentUser?.id || 'unknown',
                                action: 'PRODUCT_CREATED',
                                entityType: 'PRODUCT',
                                entityId: newId,
                                newValue: { ...payload, name: variantName, barcode: barcode, sku: formData.sku ? `${formData.sku.trim()}-${size}` : undefined, currentStock: totalQtyForSize }
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
                        const labelWidth = organizationSettings?.labelPrinterWidth || 50
                        let printHTML = `<div style="display: flex; flex-direction: column; gap: 20px; font-family: monospace; text-align: center; width: ${labelWidth}mm; margin: 0 auto;">`

                        if (printMode === 'bulto') {
                            const sizeBreakdownText = Object.entries(sizeQuantities)
                                .filter(([_, qty]) => qty > 0)
                                .map(([sz, qty]) => `${qty} ${sz}`)
                                .join(', ')

                            const bulkBarcode = `750B${Math.floor(100000000 + Math.random() * 900000000)}`

                            for (let i = 0; i < packagesCount; i++) {
                                printHTML += `
                                  <div style="border: 2px solid #000; padding: 12px; width: ${labelWidth}mm; margin: 0 auto; page-break-after: always; display: flex; flex-direction: column; align-items: center; justify-content: center; box-sizing: border-box; background: #fff;">
                                    <div style="font-size: 10px; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #000; width: 100%; padding-bottom: 4px; margin-bottom: 6px;">REISBLOC MAYOREO</div>
                                    <div style="font-size: 13px; font-weight: bold; margin: 2px 0; text-transform: uppercase;">${formData.name.trim()}</div>
                                    <div style="font-size: 11px; font-weight: bold; color: #333; margin: 4px 0;">PAQUETE COMPLETO: ${totalPiecesPerPackage} PZAS</div>
                                    <div style="font-size: 10px; margin: 4px 0; padding: 4px; border: 1px solid #ddd; width: 100%; border-radius: 4px; text-align: left;">
                                      <strong>Desglose:</strong> ${sizeBreakdownText}
                                    </div>
                                    <div style="font-size: 16px; font-weight: 900; margin: 6px 0;">$${(formData.price * totalPiecesPerPackage).toFixed(2)}</div>
                                    
                                    <!-- Código de Barras Bulto -->
                                    <div style="font-size: 20px; font-family: 'Libre Barcode 39', 'Courier New', monospace; letter-spacing: 2px; margin: 6px 0;">
                                      *${bulkBarcode}*
                                    </div>
                                    <div style="font-size: 9px; color: #555;">${bulkBarcode}</div>
                                  </div>
                                `
                            }
                        } else {
                            resultsToPrint.forEach(item => {
                                const quantityToPrint = printMode === 'talla' ? 1 : item.count
                                for (let i = 0; i < quantityToPrint; i++) {
                                    printHTML += `
                                      <div style="border: 1px dashed #000; padding: 10px; width: ${labelWidth}mm; margin: 0 auto; page-break-after: always; display: flex; flex-direction: column; align-items: center; justify-content: center; box-sizing: border-box; background: #fff;">
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
                        }

                        printHTML += '</div>'
                        await printService.printHTML(printHTML, { title: 'Etiquetas de Códigos', width: labelWidth })
                    }
                } else {
                    const newId = await supabaseService.createRetailProduct({
                        ...payload,
                        createdAt: new Date(),
                    })

                    await supabaseService.createAuditLog({
                        userId: currentUser?.id || 'unknown',
                        action: 'PRODUCT_CREATED',
                        entityType: 'PRODUCT',
                        entityId: newId,
                        newValue: payload
                    })
                }
            }
            onSuccess()
            onClose()
        } catch (error) {
            console.error('Error saving product:', error)
            alert('Error al guardar producto')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-8 animate-scaleIn max-h-[90vh] overflow-y-auto custom-scrollbar border border-slate-200">
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-slate-900 text-white rounded-2xl">
                            <Save size={24} />
                        </div>
                        <h2 className="text-3xl font-black tracking-tight">
                            {product ? 'EDITAR' : 'NUEVO'} PRODUCTO
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                        <X size={28} className="text-slate-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Image Upload Area */}
                    <div className="flex justify-center mb-6">
                        <PlanGate feature="product_images" upgradeLabel="Fotos de Productos">
                            <div className="relative group">
                                <div className="w-40 h-40 rounded-3xl overflow-hidden bg-slate-50 border-2 border-dashed border-slate-300 flex items-center justify-center relative shadow-inner">
                                    {imagePreview ? (
                                        <img src={imagePreview} alt="Product Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="flex flex-col items-center text-slate-400">
                                            <ImageIcon size={48} className="mb-2 opacity-50" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-center px-4">Agregar Foto<br />(Recomendado)</span>
                                        </div>
                                    )}
                                </div>
                                <label className="absolute -bottom-3 -right-3 p-3 bg-slate-900 text-white rounded-2xl shadow-xl cursor-pointer hover:bg-slate-800 transition-all hover:scale-110">
                                    <Camera size={20} />
                                    <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                                </label>
                            </div>
                        </PlanGate>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-black text-slate-400 mb-2 uppercase tracking-widest text-[10px]">
                                Nombre del Producto / Servicio
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-slate-900/5 outline-none font-bold text-lg"
                                placeholder="Ej. Smart TV 55', Tacos de Pastor, etc."
                                required
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-black text-slate-400 mb-2 uppercase tracking-widest text-[10px]">
                                Descripción / Notas
                            </label>
                            <textarea
                                value={formData.description || ''}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-slate-900/5 outline-none font-bold"
                                placeholder="Detalles adicionales, especificaciones, etc."
                                rows={2}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-black text-slate-400 mb-2 uppercase tracking-widest text-[10px]">
                                Identificación (SKU)
                            </label>
                            <input
                                type="text"
                                value={formData.sku}
                                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-slate-900/5 outline-none font-bold"
                                placeholder="ID Interno"
                            />
                        </div>

                        {!product && (
                            <div className="md:col-span-2 bg-indigo-50 border border-indigo-100 p-5 rounded-3xl flex flex-col gap-4">
                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        id="isBulk"
                                        checked={isBulk}
                                        onChange={(e) => setIsBulk(e.target.checked)}
                                        className="w-5 h-5 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
                                    />
                                    <label htmlFor="isBulk" className="text-sm font-black text-indigo-950 cursor-pointer uppercase tracking-tight flex items-center gap-1">
                                        📦 INGRESAR EN LOTE (Tallas y cantidades)
                                    </label>
                                </div>
                                {isBulk && (
                                    <div className="animate-scaleIn space-y-4">
                                        <div className="bg-white p-4 rounded-2xl border border-indigo-100 flex items-center justify-between gap-4">
                                            <div>
                                                <span className="block text-xs font-black text-indigo-950 uppercase tracking-tight">Cantidad de Lotes / Paquetes</span>
                                                <span className="text-[10px] text-slate-400 font-bold">Multiplica la cantidad de cada prenda</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setPackagesCount(prev => Math.max(1, prev - 1))}
                                                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all active:scale-95"
                                                >
                                                    -
                                                </button>
                                                <input
                                                    type="number"
                                                    value={packagesCount}
                                                    onChange={(e) => setPackagesCount(Math.max(1, parseInt(e.target.value) || 1))}
                                                    className="w-16 text-center font-black text-sm outline-none text-slate-900 border border-slate-200 py-1.5 rounded-xl bg-slate-50"
                                                    min="1"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setPackagesCount(prev => prev + 1)}
                                                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all active:scale-95"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <span className="block text-xs font-black text-indigo-950 uppercase tracking-tight">Cantidad por Lote / Paquete</span>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                {Object.entries(sizeQuantities).map(([sz, qty]) => (
                                                    <div key={sz} className="bg-white p-3 rounded-2xl border border-slate-100 flex flex-col items-center justify-center gap-2">
                                                        <span className="text-xs font-black text-slate-800">{sz}</span>
                                                        <div className="flex items-center gap-1.5">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleQtyChange(sz, qty - 1)}
                                                                className="w-6 h-6 flex items-center justify-center bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100 font-black text-xs"
                                                            >
                                                                -
                                                            </button>
                                                            <input
                                                                type="number"
                                                                value={qty || ''}
                                                                onChange={(e) => handleQtyChange(sz, parseInt(e.target.value) || 0)}
                                                                className="w-8 text-center font-bold text-xs bg-transparent outline-none border-b border-slate-200 focus:border-slate-800"
                                                                min="0"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => handleQtyChange(sz, qty + 1)}
                                                                className="w-6 h-6 flex items-center justify-center bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100 font-black text-xs"
                                                            >
                                                                +
                                                            </button>
                                                            {['CH', 'M', 'G', 'XG'].indexOf(sz) === -1 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRemoveSize(sz)}
                                                                    className="text-[10px] text-red-500 font-black ml-1 hover:text-red-700 uppercase"
                                                                >
                                                                    x
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    placeholder="Ej: XXL, 38..."
                                                    value={customSize}
                                                    onChange={(e) => setCustomSize(e.target.value)}
                                                    className="flex-1 px-4 py-2 border border-indigo-200 rounded-xl outline-none font-bold text-xs bg-white text-indigo-900"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleAddCustomSize}
                                                    className="px-4 py-2 bg-indigo-900 text-white font-bold text-xs rounded-xl hover:bg-indigo-850 transition-all shrink-0"
                                                >
                                                    + Agregar Talla
                                                </button>
                                            </div>
                                        </div>

                                        <div className="border-t border-indigo-100/50 pt-3 space-y-2">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    id="shouldPrint"
                                                    checked={shouldPrint}
                                                    onChange={(e) => setShouldPrint(e.target.checked)}
                                                    className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                                                />
                                                <label htmlFor="shouldPrint" className="text-xs font-black text-slate-700 cursor-pointer uppercase tracking-tight flex items-center gap-1">
                                                    Imprimir etiquetas de código de barras
                                                </label>
                                            </div>

                                            {shouldPrint && (
                                                <div className="ml-6 flex flex-col gap-1.5 animate-scaleIn">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Modo de Impresión</label>
                                                    <select
                                                        value={printMode}
                                                        onChange={(e) => setPrintMode(e.target.value as any)}
                                                        className="px-3 py-1.5 border border-slate-200 rounded-xl bg-white outline-none font-bold text-[11px] text-slate-800"
                                                    >
                                                        <option value="bulto">📦 Impresora Nimbot: 1 Etiqueta por Paquete Completo (Con Desglose)</option>
                                                        <option value="talla">🏷️ Impresora Nimbot: 1 Etiqueta por Talla</option>
                                                        <option value="prenda">👕 Impresora Nimbot: 1 Etiqueta por cada Prenda individual</option>
                                                    </select>
                                                </div>
                                            )}
                                        </div>

                                        <div className="bg-indigo-100/50 p-3 rounded-2xl flex justify-between items-center text-xs">
                                            <span className="font-bold text-indigo-950">TOTAL A INGRESAR:</span>
                                            <span className="font-black text-indigo-900">
                                                {Object.values(sizeQuantities).reduce((a, b) => a + b, 0) * packagesCount} prendas
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-sm font-black text-slate-400 uppercase tracking-widest text-[10px]">
                                    Código de Barras / QR
                                </label>
                                <button
                                    type="button"
                                    onClick={generateBarcode}
                                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-1 rounded-md transition-colors"
                                >
                                    Auto-Generar EAN
                                </button>
                            </div>
                            <input
                                type="text"
                                value={formData.barcode}
                                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-slate-900/5 outline-none font-bold"
                                placeholder="Escanear o Escribir"
                                disabled={isBulk}
                            />
                            {isBulk && <p className="text-[10px] text-gray-400 mt-1">Los códigos se autogenerarán para cada variante.</p>}
                        </div>

                        <div className="md:col-span-2 bg-indigo-50/40 p-5 rounded-3xl grid grid-cols-1 md:grid-cols-2 gap-4 border border-indigo-100/50 animate-scaleIn">
                            <div className="md:col-span-2 text-xs font-black text-indigo-950 uppercase tracking-tight">⚙️ Configuración de Precios y Lotes</div>
                            
                            {/* Fila 1: Precio Venta + Presentación */}
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">PRECIO DE VENTA *</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-slate-400 text-xs">$</span>
                                    <input
                                        type="number"
                                        value={formData.price || ''}
                                        onChange={(e) => setFormData({ ...formData, price: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                                        className="w-full pl-7 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl outline-none font-bold text-xs"
                                        step="0.01"
                                        min="0"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Presentación</label>
                                <input
                                    type="text"
                                    value="POR PIEZA"
                                    readOnly
                                    disabled
                                    className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl outline-none font-black text-xs text-slate-400 text-center select-none"
                                />
                            </div>
                            
                            {/* Fila 2: Precio Mayoreo + Piezas por Mayoreo */}
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Precio Mayoreo *</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-slate-400 text-xs">$</span>
                                    <input
                                        type="number"
                                        value={formData.wholesalePrice || ''}
                                        onChange={(e) => setFormData({ ...formData, wholesalePrice: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                                        className="w-full pl-7 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl outline-none font-bold text-xs"
                                        step="0.01"
                                        min="0"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Piezas por Mayoreo *</label>
                                <input
                                    type="number"
                                    value={formData.wholesaleMinQty}
                                    onChange={(e) => setFormData({ ...formData, wholesaleMinQty: parseInt(e.target.value) || 3 })}
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none font-bold text-xs"
                                    min="1"
                                    required
                                />
                            </div>

                            {/* Fila 3: Precio Paquete + Piezas por Paquete */}
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">PRECIO PAQUETE *</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-slate-400 text-xs">$</span>
                                    <input
                                        type="number"
                                        value={formData.packPrice || ''}
                                        onChange={(e) => setFormData({ ...formData, packPrice: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                                        className="w-full pl-7 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl outline-none font-bold text-xs"
                                        step="0.01"
                                        min="0"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">PIEZAS POR PAQUETE *</label>
                                <input
                                    type="number"
                                    value={formData.packQty}
                                    onChange={(e) => setFormData({ ...formData, packQty: parseInt(e.target.value) || 10 })}
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none font-bold text-xs"
                                    min="1"
                                    required
                                />
                            </div>

                            {/* Fila 4: Precio Bulto + Paquetes por Bulto */}
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">PRECIO BULTO *</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-slate-400 text-xs">$</span>
                                    <input
                                        type="number"
                                        value={formData.bulkPrice || ''}
                                        onChange={(e) => setFormData({ ...formData, bulkPrice: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                                        className="w-full pl-7 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl outline-none font-bold text-xs"
                                        step="0.01"
                                        min="0"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">PAQUETES POR BULTO *</label>
                                <input
                                    type="number"
                                    value={formData.packagesPerBulk}
                                    onChange={(e) => setFormData({ ...formData, packagesPerBulk: parseInt(e.target.value) || 10 })}
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none font-bold text-xs"
                                    min="1"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-black text-slate-400 mb-2 uppercase tracking-widest text-[10px]">
                                Categoría
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    list="category-list"
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-slate-900/5 outline-none font-bold"
                                    placeholder="Selecciona o escribe..."
                                />
                                <datalist id="category-list">
                                    {categories.map(cat => <option key={cat} value={cat} />)}
                                </datalist>
                            </div>
                        </div>
                </div>

                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4">
                        <div className="flex items-center gap-4">
                            <input
                                type="checkbox"
                                id="hasInventory"
                                checked={formData.hasInventory}
                                onChange={(e) => setFormData({ ...formData, hasInventory: e.target.checked })}
                                className="w-6 h-6 rounded-lg border-slate-300 text-slate-900 focus:ring-slate-900 transition-all cursor-pointer"
                            />
                            <label htmlFor="hasInventory" className="text-sm font-black text-slate-700 cursor-pointer uppercase tracking-tight">
                                Controlar Inventario (Existencias)
                            </label>
                        </div>

                        {formData.hasInventory && (
                            <div className="grid grid-cols-2 gap-4 animate-scaleIn pt-2">
                                <div>
                                    <label className="block text-sm font-black text-slate-400 mb-2 uppercase tracking-widest text-[10px]">
                                        Stock Actual
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.currentStock || ''}
                                        onChange={(e) => setFormData({ ...formData, currentStock: e.target.value === '' ? 0 : parseInt(e.target.value) || 0 })}
                                        className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-slate-900/5 outline-none font-black text-center"
                                        min="0"
                                        required />
                                </div>

                                <div>
                                    <label className="block text-sm font-black text-slate-400 mb-2 uppercase tracking-widest text-[10px]">
                                        Stock Mínimo
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.minimumStock || ''}
                                        onChange={(e) => setFormData({ ...formData, minimumStock: e.target.value === '' ? 0 : parseInt(e.target.value) || 0 })}
                                        className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-slate-900/5 outline-none font-black text-center"
                                        min="0"
                                        required
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <input
                            type="checkbox"
                            id="active"
                            checked={formData.active}
                            onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                            className="w-5 h-5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                        />
                        <label htmlFor="active" className="text-sm font-bold text-gray-700 cursor-pointer">
                            Producto Activo y Visible
                        </label>
                    </div>

                    <div className="flex gap-3 pt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black hover:bg-slate-200 transition-all uppercase tracking-tighter"
                            disabled={loading}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black shadow-lg hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-50 uppercase tracking-tighter"
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                            {product ? 'Actualizar' : 'Crear Producto'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
