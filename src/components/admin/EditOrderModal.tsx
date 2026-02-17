import React, { useState, useEffect } from 'react'
import { X, Plus, Minus, Trash2, Save, AlertCircle } from 'lucide-react'
import { Order, OrderItem } from '@/types'

interface EditOrderModalProps {
  order: Order
  onClose: () => void
  onSave: (updatedItems: OrderItem[], notes: string) => Promise<void>
  onCancel: (reason: string) => Promise<void>
}

export default function EditOrderModal({ order, onClose, onSave, onCancel }: EditOrderModalProps) {
  const [items, setItems] = useState<OrderItem[]>([])
  const [notes, setNotes] = useState(order.notes || '')
  const [cancelReason, setCancelReason] = useState('')
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    // Clonar items para edición
    setItems(order.items.filter(item => !item.deletedAt).map(item => ({ ...item })))
  }, [order])

  const updateQuantity = (itemId: string, delta: number) => {
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const newQuantity = Math.max(0, item.quantity + delta)
        return { ...item, quantity: newQuantity }
      }
      return item
    }))
  }

  const removeItem = (itemId: string) => {
    setItems(prev => prev.filter(item => item.id !== itemId))
  }

  const canEdit = order.status === 'open' || order.status === 'sent'
  const hasChanges = JSON.stringify(items) !== JSON.stringify(order.items.filter(item => !item.deletedAt)) || notes !== (order.notes || '')

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0)
  }

  const handleSave = async () => {
    if (!hasChanges) {
      onClose()
      return
    }

    // Filtrar items con cantidad 0
    const validItems = items.filter(item => item.quantity > 0)
    
    if (validItems.length === 0) {
      alert('⚠️ La orden debe tener al menos un item')
      return
    }

    setIsSaving(true)
    try {
      await onSave(validItems, notes)
      onClose()
    } catch (error) {
      alert('❌ Error al guardar cambios')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelOrder = async () => {
    if (!cancelReason.trim()) {
      alert('⚠️ Debes proporcionar una razón para cancelar')
      return
    }

    setIsSaving(true)
    try {
      await onCancel(cancelReason)
      onClose()
    } catch (error) {
      alert('❌ Error al cancelar orden')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Editar Orden - Mesa {order.tableNumber}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Estado: <span className="font-semibold">{order.status}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Alert si no se puede editar */}
          {!canEdit && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
              <div className="text-sm text-amber-800">
                <p className="font-semibold">Edición limitada</p>
                <p className="mt-1">Esta orden ya fue procesada. Solo puedes agregar notas.</p>
              </div>
            </div>
          )}

          {/* Items */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 text-lg">Items de la orden</h3>
            {items.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No hay items en esta orden
              </div>
            ) : (
              items.map(item => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.productName}</p>
                    <p className="text-sm text-gray-600">${item.unitPrice.toFixed(2)} c/u</p>
                  </div>

                  {canEdit ? (
                    <div className="flex items-center gap-2">
                      {/* Quantity controls */}
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        disabled={item.quantity <= 1}
                        className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <Minus size={16} className="text-gray-700" />
                      </button>

                      <span className="w-12 text-center font-bold text-gray-900">
                        {item.quantity}
                      </span>

                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
                      >
                        <Plus size={16} className="text-gray-700" />
                      </button>

                      {/* Remove button */}
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-2 rounded-lg bg-red-50 border border-red-200 hover:bg-red-100 transition-colors ml-2"
                      >
                        <Trash2 size={16} className="text-red-600" />
                      </button>
                    </div>
                  ) : (
                    <div className="text-right">
                      <p className="font-bold text-gray-900">x{item.quantity}</p>
                    </div>
                  )}

                  {/* Subtotal */}
                  <div className="text-right w-24">
                    <p className="font-bold text-gray-900">
                      ${(item.unitPrice * item.quantity).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Total */}
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
            <span className="font-bold text-blue-900 text-lg">Total</span>
            <span className="font-bold text-blue-900 text-2xl">
              ${calculateTotal().toFixed(2)}
            </span>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="block font-semibold text-gray-900 text-lg">
              Notas especiales
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ej: Sin cebolla, extra picante, cliente en silla de ruedas..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Cancel Order Section */}
          {canEdit && (
            <div className="pt-4 border-t border-gray-200">
              {!showCancelConfirm ? (
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="w-full py-3 px-4 bg-red-50 text-red-700 border border-red-200 rounded-lg font-semibold hover:bg-red-100 transition-colors"
                >
                  Cancelar Orden Completa
                </button>
              ) : (
                <div className="space-y-3 p-4 bg-red-50 rounded-lg border border-red-200">
                  <p className="font-semibold text-red-900">
                    ⚠️ ¿Estás seguro de cancelar esta orden?
                  </p>
                  <textarea
                    value={cancelReason}
                    onChange={e => setCancelReason(e.target.value)}
                    placeholder="Razón de cancelación (requerido)"
                    rows={2}
                    className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleCancelOrder}
                      disabled={isSaving || !cancelReason.trim()}
                      className="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Sí, Cancelar Orden
                    </button>
                    <button
                      onClick={() => {
                        setShowCancelConfirm(false)
                        setCancelReason('')
                      }}
                      disabled={isSaving}
                      className="flex-1 py-2 px-4 bg-white text-gray-700 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 disabled:opacity-50 transition-colors"
                    >
                      No, Mantener
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-4 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Cerrar
          </button>
          
          <button
            onClick={handleSave}
            disabled={isSaving || !hasChanges || items.filter(i => i.quantity > 0).length === 0}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save size={20} />
            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}
