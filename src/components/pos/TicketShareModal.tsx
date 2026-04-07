import { useState } from 'react'
import { X, MessageCircle, Mail, Loader2, Check, AlertCircle } from 'lucide-react'
import { ticketService, TicketData } from '@/services/ticketService'
import { whatsappService } from '@/services/whatsappService'

interface TicketShareModalProps {
  isOpen: boolean
  onClose: () => void
  ticketHtml: string
  ticketData: TicketData
}

type ShareMethod = 'whatsapp' | 'email'
type SendStatus = 'idle' | 'sending' | 'success' | 'error'

export default function TicketShareModal({ isOpen, onClose, ticketHtml, ticketData }: TicketShareModalProps) {
  const [shareMethod, setShareMethod] = useState<ShareMethod>('whatsapp')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<SendStatus>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [whatsappConfigured] = useState(whatsappService.isConfigured())

  if (!isOpen) return null

  const handleShare = async () => {
    setStatus('sending')
    setErrorMessage('')

    try {
      if (shareMethod === 'whatsapp') {
        if (!phone) {
          setStatus('error')
          setErrorMessage('Ingresa un número de teléfono')
          return
        }
        const formattedPhone = ticketService.formatPhoneNumber(phone)
        const result = await ticketService.shareByWhatsApp(formattedPhone, ticketHtml, ticketData)
        if (result.success) {
          setStatus('success')
          setTimeout(() => {
            onClose()
            setStatus('idle')
            setPhone('')
          }, 1500)
        } else {
          setStatus('error')
          setErrorMessage(result.error || 'Error al enviar')
        }
      } else {
        if (!email) {
          setStatus('error')
          setErrorMessage('Ingresa un correo electrónico')
          return
        }
        const result = await ticketService.shareByEmail(email, ticketHtml, ticketData)
        if (result.success) {
          setStatus('success')
          setTimeout(() => {
            onClose()
            setStatus('idle')
            setEmail('')
          }, 1500)
        } else {
          setStatus('error')
          setErrorMessage(result.error || 'Error al enviar')
        }
      }
    } catch (error: any) {
      setStatus('error')
      setErrorMessage(error.message || 'Error inesperado')
    }
  }

  const handleClose = () => {
    if (status !== 'sending') {
      onClose()
      setStatus('idle')
      setPhone('')
      setEmail('')
      setErrorMessage('')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-5 bg-gradient-to-r from-emerald-500 to-teal-600 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-white text-lg">Compartir Ticket</h3>
            <p className="text-emerald-100 text-sm">Envía el ticket por WhatsApp o email</p>
          </div>
          <button
            onClick={handleClose}
            disabled={status === 'sending'}
            className="p-2 hover:bg-white/20 rounded-full transition-colors disabled:opacity-50"
          >
            <X size={20} className="text-white" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-sm text-slate-600 mb-1">Total a enviar:</p>
            <p className="text-2xl font-bold text-slate-900">${ticketData.total.toFixed(2)} MXN</p>
            <p className="text-xs text-slate-500 mt-1">
              Ticket #{ticketData.orderId.slice(0, 8)} • {ticketData.items.length} productos
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShareMethod('whatsapp')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all ${
                shareMethod === 'whatsapp'
                  ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <MessageCircle size={20} />
              WhatsApp
            </button>
            <button
              onClick={() => setShareMethod('email')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all ${
                shareMethod === 'email'
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Mail size={20} />
              Email
            </button>
          </div>

          {shareMethod === 'whatsapp' ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Número de WhatsApp
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="5512345678"
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                disabled={status === 'sending'}
              />
              {!whatsappConfigured && (
                <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                  <AlertCircle size={14} />
                  Se abrirá WhatsApp Web para enviar
                </p>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cliente@ejemplo.com"
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={status === 'sending'}
              />
              <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                <Mail size={14} />
                Se abrirá el cliente de correo con el ticket adjunto
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-xl text-sm">
              <AlertCircle size={18} />
              {errorMessage}
            </div>
          )}

          {status === 'success' && (
            <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-xl text-sm">
              <Check size={18} />
              ¡Ticket enviado exitosamente!
            </div>
          )}
        </div>

        <div className="p-5 border-t bg-slate-50 flex justify-end gap-3">
          <button
            onClick={handleClose}
            disabled={status === 'sending'}
            className="px-5 py-2.5 text-slate-600 hover:bg-slate-200 rounded-xl font-medium transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleShare}
            disabled={status === 'sending' || status === 'success'}
            className={`px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all disabled:opacity-50 ${
              shareMethod === 'whatsapp'
                ? 'bg-green-500 hover:bg-green-600 text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            {status === 'sending' ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Enviando...
              </>
            ) : status === 'success' ? (
              <>
                <Check size={18} />
                Enviado
              </>
            ) : (
              <>
                {shareMethod === 'whatsapp' ? <MessageCircle size={18} /> : <Mail size={18} />}
                Enviar por {shareMethod === 'whatsapp' ? 'WhatsApp' : 'Email'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
