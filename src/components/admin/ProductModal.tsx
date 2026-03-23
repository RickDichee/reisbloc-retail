import React, { useState } from 'react'
import { Product } from '@/types/index'
import { useAppStore } from '@/store/appStore'
import supabaseService from '@/services/supabaseService'
import { storageService } from '@/services/storageService'
import { compressImage } from '@/utils/imageCompression'
import { X, Save, Loader2, Image as ImageIcon, Camera } from 'lucide-react'
import PlanGate from '@/components/common/PlanGate'

interface ProductModalProps {
    product?: Product
    onClose: () => void
    onSuccess: () => void
}

export default function ProductModal({
    product,
    onClose,
    onSuccess
}: ProductModalProps) {
    const { currentUser, products } = useAppStore()
    const [formData, setFormData] = useState({
        name: product?.name || '',
        price: product?.price || 0,
        category: product?.category || 'General',
        sku: product?.sku || '',
        barcode: product?.barcode || '',
        description: product?.description || '',
        hasInventory: product?.hasInventory || false,
        currentStock: product?.currentStock || 0,
        minimumStock: product?.minimumStock || 10,
        active: product?.active ?? true,
        image: product?.image || '',
        parentId: product?.parentId || '',
        packQuantity: product?.packQuantity || 1,
    })
    const [loading, setLoading] = useState(false)
    const [isBulk, setIsBulk] = useState(false)
    const [bulkSizes, setBulkSizes] = useState('')
    const [isWholesale, setIsWholesale] = useState(!!product?.parentId)

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

            const payload = { 
                ...formData, 
                image: finalImageUrl,
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
                if (isBulk && bulkSizes.trim() !== '') {
                    // Split sizes by comma
                    const sizes = bulkSizes.split(',').map(s => s.trim()).filter(s => s)

                    for (const size of sizes) {
                        const variantName = `${formData.name} (${size})`
                        const variantBarcode = `750${Math.floor(100000000 + Math.random() * 900000000)}`

                        const newId = await supabaseService.createRetailProduct({
                            ...payload,
                            name: variantName,
                            barcode: variantBarcode,
                            createdAt: new Date(),
                        })

                        await supabaseService.createAuditLog({
                            userId: currentUser?.id || 'unknown',
                            action: 'PRODUCT_CREATED',
                            entityType: 'PRODUCT',
                            entityId: newId,
                            newValue: { ...payload, name: variantName, barcode: variantBarcode }
                        })
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
                            <div className="md:col-span-2 bg-indigo-50 border border-indigo-100 p-4 rounded-2xl flex flex-col gap-3">
                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        id="isBulk"
                                        checked={isBulk}
                                        onChange={(e) => setIsBulk(e.target.checked)}
                                        className="w-5 h-5 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
                                    />
                                    <label htmlFor="isBulk" className="text-sm font-black text-indigo-900 cursor-pointer uppercase tracking-tight">
                                        Generar Múltiples Variantes (Ej. Tallas S, M, L)
                                    </label>
                                </div>
                                {isBulk && (
                                    <div className="animate-scaleIn">
                                        <label className="block text-xs font-bold text-indigo-700 mb-2">
                                            Escribe las variaciones separadas por coma:
                                        </label>
                                        <input
                                            type="text"
                                            value={bulkSizes}
                                            onChange={(e) => setBulkSizes(e.target.value)}
                                            className="w-full px-4 py-3 bg-white border border-indigo-200 rounded-xl focus:ring-4 focus:ring-indigo-600/10 outline-none font-bold text-indigo-900"
                                            placeholder="S, M, L, XL, Paquete 10 pz..."
                                        />
                                        <p className="text-[10px] text-indigo-500 mt-2">
                                            Se crearán {bulkSizes.split(',').filter(s => s.trim()).length} productos individuales automáticamente.
                                        </p>
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

                        <div>
                            <label className="block text-sm font-black text-slate-400 mb-2 uppercase tracking-widest text-[10px]">
                                Precio de Venta
                            </label>
                            <div className="relative">
                                <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-slate-400">$</span>
                                <input
                                    type="number"
                                    value={formData.price || ''}
                                    onChange={(e) => setFormData({ ...formData, price: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                                    className="w-full pl-10 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-slate-900/5 outline-none font-black text-xl"
                                    step="0.01"
                                    min="0"
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

                    <div className="md:col-span-2 bg-amber-50 border border-amber-100 p-4 rounded-2xl flex flex-col gap-3">
                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="isWholesale"
                                checked={isWholesale}
                                onChange={(e) => setIsWholesale(e.target.checked)}
                                className="w-5 h-5 rounded border-amber-300 text-amber-600 focus:ring-amber-600 cursor-pointer"
                            />
                            <label htmlFor="isWholesale" className="text-sm font-black text-amber-900 cursor-pointer uppercase tracking-tight">
                                Producto Mayorista (Ej. Bulto que descuenta cajas)
                            </label>
                        </div>
                        {isWholesale && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-scaleIn">
                                <div>
                                    <label className="block text-xs font-bold text-amber-700 mb-2">Producto Padre (El que pierde Stock)</label>
                                    <select
                                        value={formData.parentId}
                                        onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
                                        className="w-full px-4 py-3 bg-white border border-amber-200 rounded-xl focus:ring-4 focus:ring-amber-600/10 outline-none font-bold text-amber-900"
                                    >
                                        <option value="">-- Seleccionar Producto --</option>
                                        {products.filter(p => p.id !== product?.id && p.hasInventory).map(p => (
                                            <option key={p.id} value={p.id}>{p.name} - Stock: {p.currentStock}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-amber-700 mb-2">Unidades a descontar por Venta</label>
                                    <input
                                        type="number"
                                        value={formData.packQuantity}
                                        onChange={(e) => setFormData({ ...formData, packQuantity: parseInt(e.target.value) || 1 })}
                                        className="w-full px-4 py-3 bg-white border border-amber-200 rounded-xl focus:ring-4 focus:ring-amber-600/10 outline-none font-bold text-amber-900"
                                        min="1"
                                    />
                                </div>
                            </div>
                        )}
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
