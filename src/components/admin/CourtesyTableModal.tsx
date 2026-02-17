import { useState } from 'react'
import logger from '@/utils/logger'
import { X, Gift } from 'lucide-react'

interface CourtesyTableModalProps {
  tableNumber: number
  onClose: () => void
  onConfirm: (reason: string) => void
}

export default function CourtesyTableModal({ tableNumber, onClose, onConfirm }: CourtesyTableModalProps) {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason.trim()) {
      alert('Por favor ingresa un motivo para la cortesía')
      return
    }

    setLoading(true)
    try {
      await onConfirm(reason)
      onClose()
    } catch (error) {
      logger.error('courtesy-table', 'Error al marcar como cortesía', error as any)
      alert('Error al marcar como cortesía')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl">
              <Gift className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Mesa Cortesía</h2>
              <p className="text-sm text-gray-600">Mesa {tableNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Info */}
        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-green-800">
            <strong>⚠️ Atención:</strong> Esta mesa no generará costo y será marcada como cortesía.
            Solo usuarios con rol de <strong>Administrador</strong> pueden autorizar mesas de cortesía.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Motivo de cortesía
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-green-500 focus:ring-4 focus:ring-green-200 transition-all"
              placeholder="Ej: Promoción especial, cliente VIP, compensación..."
              rows={4}
              required
              autoFocus
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl transition-all"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                  Procesando...
                </>
              ) : (
                <>
                  <Gift size={20} />
                  Autorizar Cortesía
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
