import React, { useState } from 'react'
import { Product } from '@/types/index'
import { useAppStore } from '@/store/appStore'
import supabaseService from '@/services/supabaseService'
import { X, Save, Loader2 } from 'lucide-react'

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
    const { currentUser } = useAppStore()
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
    })
    const [loading, setLoading] = useState(false)

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
            if (product) {
                await supabaseService.updateRetailProduct(product.id, formData)
                await supabaseService.createAuditLog({
                    userId: currentUser?.id || 'unknown',
                    action: 'PRODUCT_UPDATED',
                    entityType: 'PRODUCT',
                    entityId: product.id,
                    newValue: formData,
                    timestamp: new Date()
                })
            } else {
                const newId = await supabaseService.createRetailProduct({
                    ...formData,
                    createdAt: new Date(),
                })

                await supabaseService.createAuditLog({
                    userId: currentUser?.id || 'unknown',
                    action: 'PRODUCT_CREATED',
                    entityType: 'PRODUCT',
                    entityId: newId,
                    newValue: formData,
                    timestamp: new Date()
                })
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

                        <div>
                            <label className="block text-sm font-black text-slate-400 mb-2 uppercase tracking-widest text-[10px]">
                                Código de Barras / QR
                            </label>
                            <input
                                type="text"
                                value={formData.barcode}
                                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-slate-900/5 outline-none font-bold"
                                placeholder="Escanear o Escribir"
                            />
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
