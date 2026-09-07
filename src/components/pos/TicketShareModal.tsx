import { useState } from 'react'
import { X, MessageCircle, Mail, Loader2, Check, AlertCircle, FileText, Image as ImageIcon, Copy } from 'lucide-react'
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
  const [downloadingFormat, setDownloadingFormat] = useState<'jpg' | 'pdf' | null>(null)
  const [copiedText, setCopiedText] = useState(false)
  const [whatsappConfigured] = useState(whatsappService.isConfigured())

  if (!isOpen) return null

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numeric = e.target.value.replace(/\D/g, '').slice(0, 10)
    setPhone(numeric)
    if (errorMessage) setErrorMessage('')
  }

  const handleShare = async () => {
    setStatus('sending')
    setErrorMessage('')

    try {
      if (shareMethod === 'whatsapp') {
        if (!phone || phone.length !== 10) {
          setStatus('error')
          setErrorMessage('Ingresa exactamente 10 dígitos numéricos (ej. 55 1234 5678)')
          return
        }

        const formattedPhone = ticketService.formatPhoneNumber(phone)
        const ticketText = ticketService.formatTicketAsText(ticketData)
        const folio = (ticketData.orderId || '').slice(0, 8).toUpperCase()
        const fileName = `Ticket_${folio || 'VENTA'}.jpg`

        // 1. Generar imagen JPG del ticket
        let imageBlob: Blob | null = null
        try {
          const res = await ticketService.generateImageFromHTML(ticketHtml)
          imageBlob = res.blob
        } catch (e) {
          console.warn('⚠️ No se pudo renderizar imagen canvas:', e)
        }

        let sharedNatively = false
        if (imageBlob && typeof navigator !== 'undefined' && navigator.canShare) {
          try {
            const imageFile = new File([imageBlob], fileName, { type: 'image/jpeg' })
            if (navigator.canShare({ files: [imageFile] })) {
              await navigator.share({
                files: [imageFile],
                title: `Ticket de compra - ${ticketData.businessName}`,
                text: ticketText,
              })
              sharedNatively = true
            }
          } catch (shareErr: any) {
            if (shareErr.name === 'AbortError') {
              setStatus('idle')
              return
            }
          }
        }

        if (!sharedNatively) {
          // Descargar la imagen del ticket automáticamente
          if (imageBlob) {
            ticketService.downloadBlob(imageBlob, fileName)
          }

          // Copiar el texto completo al portapapeles
          try {
            if (navigator.clipboard) {
              await navigator.clipboard.writeText(ticketText)
              setCopiedText(true)
            }
          } catch (e) {}

          // Abrir WhatsApp Web / App
          const whatsappUrl = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(ticketText)}`
          window.open(whatsappUrl, '_blank')
        }

        setStatus('success')
        setTimeout(() => {
          onClose()
          setStatus('idle')
          setPhone('')
          setCopiedText(false)
        }, 1800)
      } else {
        if (!email) {
          setStatus('error')
          setErrorMessage('Ingresa un correo electrónico válido')
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
          setErrorMessage(result.error || 'Error al enviar por email')
        }
      }
    } catch (error: any) {
      setStatus('error')
      setErrorMessage(error.message || 'Error inesperado al compartir')
    }
  }

  const handleDownloadJPG = async () => {
    setDownloadingFormat('jpg')
    try {
      const folio = (ticketData.orderId || '').slice(0, 8).toUpperCase()
      const { blob } = await ticketService.generateImageFromHTML(ticketHtml)
      ticketService.downloadBlob(blob, `Ticket_${folio || 'VENTA'}.jpg`)
    } catch (e: any) {
      alert('Error descargando imagen: ' + (e.message || e))
    } finally {
      setDownloadingFormat(null)
    }
  }

  const handleDownloadPDF = async () => {
    setDownloadingFormat('pdf')
    try {
      const folio = (ticketData.orderId || '').slice(0, 8).toUpperCase()
      const blob = await ticketService.generatePDFFromHTML(ticketHtml)
      ticketService.downloadBlob(blob, `Ticket_${folio || 'VENTA'}.pdf`)
    } catch (e: any) {
      alert('Error descargando PDF: ' + (e.message || e))
    } finally {
      setDownloadingFormat(null)
    }
  }

  const handleCopyTicketText = async () => {
    try {
      const text = ticketService.formatTicketAsText(ticketData)
      await navigator.clipboard.writeText(text)
      setCopiedText(true)
      setTimeout(() => setCopiedText(false), 2500)
    } catch (e) {}
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

  const isPhoneValid = phone.length === 10

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100">
        {/* Modal Header */}
        <div className="p-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex justify-between items-center">
          <div>
            <h3 className="font-black text-lg tracking-tight">Compartir Ticket</h3>
            <p className="text-emerald-100 text-xs font-medium">Envía por WhatsApp en imagen JPG o descarga en PDF</p>
          </div>
          <button
            onClick={handleClose}
            disabled={status === 'sending'}
            className="p-2 hover:bg-white/20 rounded-full transition-colors disabled:opacity-50"
          >
            <X size={20} className="text-white" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Sale Summary Card */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Total del Ticket</p>
              <p className="text-2xl font-black text-slate-900">${ticketData.total.toFixed(2)} MXN</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Folio #{ticketData.orderId.slice(0, 8).toUpperCase()} • {ticketData.items.length} prendas
              </p>
            </div>
            <button
              onClick={handleCopyTicketText}
              title="Copiar texto del ticket"
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 shadow-xs transition-all"
            >
              {copiedText ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              {copiedText ? '¡Copiado!' : 'Copiar'}
            </button>
          </div>

          {/* Quick Format Downloads */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Descargas directas</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleDownloadJPG}
                disabled={downloadingFormat !== null}
                className="flex items-center justify-center gap-2 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-all disabled:opacity-50"
              >
                {downloadingFormat === 'jpg' ? (
                  <Loader2 size={14} className="animate-spin text-slate-500" />
                ) : (
                  <ImageIcon size={14} className="text-pink-600" />
                )}
                Descargar JPG
              </button>
              <button
                onClick={handleDownloadPDF}
                disabled={downloadingFormat !== null}
                className="flex items-center justify-center gap-2 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-all disabled:opacity-50"
              >
                {downloadingFormat === 'pdf' ? (
                  <Loader2 size={14} className="animate-spin text-slate-500" />
                ) : (
                  <FileText size={14} className="text-indigo-600" />
                )}
                Descargar PDF
              </button>
            </div>
          </div>

          {/* Channel Selector */}
          <div className="flex gap-2 pt-1 border-t border-slate-100">
            <button
              onClick={() => setShareMethod('whatsapp')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${
                shareMethod === 'whatsapp'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <MessageCircle size={18} />
              WhatsApp
            </button>
            <button
              onClick={() => setShareMethod('email')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${
                shareMethod === 'email'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Mail size={18} />
              Email
            </button>
          </div>

          {/* WhatsApp Form */}
          {shareMethod === 'whatsapp' ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-tight">
                  Número de WhatsApp
                </label>
                <span className={`text-[11px] font-bold ${isPhoneValid ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {isPhoneValid ? '✓ 10 dígitos listo' : `${phone.length}/10 dígitos`}
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-sm font-bold text-slate-400">🇲🇽 +52</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={handlePhoneChange}
                  maxLength={10}
                  placeholder="5512345678"
                  className="w-full pl-16 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-600 outline-none font-mono font-bold text-slate-900"
                  disabled={status === 'sending'}
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Se generará el ticket en imagen JPG y se abrirá WhatsApp con el cliente para enviárselo.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-tight">
                Correo Electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cliente@ejemplo.com"
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-indigo-600 outline-none font-bold text-slate-900"
                disabled={status === 'sending'}
              />
              <p className="text-[11px] text-slate-500">
                Se abrirá tu cliente de correo con el ticket detallado.
              </p>
            </div>
          )}

          {/* Status Notifications */}
          {errorMessage && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-xl text-xs font-bold">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {status === 'success' && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold animate-fadeIn">
              <Check size={16} className="shrink-0" />
              <span>¡Ticket preparado y compartido exitosamente!</span>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button
            onClick={handleClose}
            disabled={status === 'sending'}
            className="px-5 py-2.5 text-slate-600 hover:bg-slate-200 rounded-xl font-bold text-sm transition-colors disabled:opacity-50"
          >
            Cerrar
          </button>
          <button
            onClick={handleShare}
            disabled={status === 'sending' || status === 'success' || (shareMethod === 'whatsapp' && !isPhoneValid)}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all disabled:opacity-50 ${
              shareMethod === 'whatsapp'
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/25'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/25'
            }`}
          >
            {status === 'sending' ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Procesando...
              </>
            ) : status === 'success' ? (
              <>
                <Check size={16} />
                ¡Listo!
              </>
            ) : (
              <>
                {shareMethod === 'whatsapp' ? <MessageCircle size={16} /> : <Mail size={16} />}
                Enviar {shareMethod === 'whatsapp' ? 'por WhatsApp' : 'por Email'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
