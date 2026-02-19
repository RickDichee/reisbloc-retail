import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, X, CheckCheck, AlertCircle, Package, Info } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Notification } from '../../services/notificationService'

interface NotificationCenterProps {
  notifications: Notification[]
  unreadCount: number
  onMarkAsRead: (notificationId: string) => void
  onMarkAllAsRead: () => void
}

export default function NotificationCenter({
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead
}: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const navigate = useNavigate()
  const [flash, setFlash] = useState<Notification | null>(null)
  const prevCountRef = useRef(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    // Sonido de campana tipo restaurante (Mixkit Bell)
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3')
  }, [])

  // Mostrar aviso breve cuando llega una nueva notificación
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined

    if (notifications.length > prevCountRef.current && prevCountRef.current !== 0) {
      const newest = notifications[0]
      setFlash(newest)

      // 🔊 Reproducir sonido
      audioRef.current?.play().catch(() => { })

      // 📳 Vibración (Haptic feedback para móviles)
      if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100])
      }

      timer = setTimeout(() => setFlash(null), 4000)
    }

    prevCountRef.current = notifications.length

    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [notifications])

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'order':
        return <Package className="w-5 h-5 text-blue-400" />
      case 'inventory':
        return <AlertCircle className="w-5 h-5 text-amber-400" />
      case 'alert':
        return <AlertCircle className="w-5 h-5 text-red-400" />
      default:
        return <Info className="w-5 h-5 text-slate-400" />
    }
  }

  const getPriorityColor = (priority: Notification['priority']) => {
    switch (priority) {
      case 'high':
        return 'border-l-4 border-red-500 bg-red-500/10'
      case 'normal':
        return 'border-l-4 border-emerald-500 bg-emerald-500/10'
      case 'low':
        return 'border-l-4 border-slate-500 bg-slate-500/5'
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    // Marcar como leída
    if (notification.id && !notification.read) {
      onMarkAsRead(notification.id)
    }

    // Cerrar panel
    setIsOpen(false)

    // Navegación inteligente
    if (notification.title.includes('Orden lista') || notification.body.includes('listo')) {
      navigate('/ready') // Mesero: ir a recoger
    } else if (notification.title.includes('Nueva orden') && notification.body.includes('cocina')) {
      navigate('/kitchen') // Cocina: ver nueva orden
    } else if (notification.title.includes('Nueva orden') && notification.body.includes('bar')) {
      navigate('/bar') // Bar: ver nueva orden
    }
  }

  return (
    <div className="relative">
      {/* Bell Icon with Badge (completely circular) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-full bg-white/5 hover:bg-white/10 transition-all duration-300 shadow-md border border-white/10 hover:border-emerald-500/30 group"
        aria-label="Notificaciones"
      >
        <Bell className="w-6 h-6 text-gray-400 group-hover:text-emerald-400 transition-colors" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-black rounded-full min-w-[18px] h-[18px] flex items-center justify-center shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-pulse ring-2 ring-slate-900">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="absolute right-0 mt-3 w-[calc(100vw-2rem)] xs:w-80 sm:w-96 bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 z-50 max-h-[40vh] sm:max-h-[70vh] flex flex-col overflow-hidden ring-1 ring-black/5 animate-slide-in">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/5 bg-white/5">
              <h3 className="text-sm font-black uppercase tracking-widest text-white">
                Notificaciones
                {unreadCount > 0 && (
                  <span className="ml-2 text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    {unreadCount} NUEVA{unreadCount !== 1 ? 'S' : ''}
                  </span>
                )}
              </h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={onMarkAllAsRead}
                    className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-white/5 rounded-lg transition-all"
                    title="Marcar todas como leídas"
                  >
                    <CheckCheck className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto flex-1 custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5">
                    <Bell className="w-8 h-8 text-slate-700" />
                  </div>
                  <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Bandeja vacía</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 sm:p-4 hover:bg-white/5 transition-all cursor-pointer ${!notification.read ? getPriorityColor(notification.priority) : ''
                        }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          {getIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm font-bold truncate ${!notification.read ? 'text-white' : 'text-gray-400'}`}>
                              {notification.title}
                            </p>
                            {!notification.read && (
                              <span className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-1 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                            )}
                          </div>
                          <p className={`text-sm mt-1 leading-relaxed ${!notification.read ? 'text-gray-200' : 'text-gray-500'}`}>
                            {notification.body}
                          </p>
                          <p className="text-[10px] uppercase tracking-wider text-gray-500 mt-3 font-semibold">
                            {formatDistanceToNow(new Date(notification.createdAt || (notification as any).created_at || Date.now()), {
                              addSuffix: true,
                              locale: es
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 border-t border-white/5 bg-white/5 text-center">
                <button
                  className="text-sm text-blue-400 hover:text-blue-300 font-bold transition-colors"
                  onClick={() => {
                    setIsOpen(false)
                    // Aquí podrías navegar a una página de notificaciones completa
                  }}
                >
                  Ver todas las notificaciones
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Aviso flotante rápido cuando llega una nueva notificación */}
      {flash && !isOpen && (
        <div
          className="fixed bottom-6 left-4 right-4 sm:absolute sm:bottom-auto sm:top-full sm:left-auto sm:right-0 mt-3 w-auto sm:w-80 bg-gray-900/90 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/10 z-[100] animate-slide-in overflow-hidden cursor-pointer"
          onClick={() => setIsOpen(true)}
        >
          <div className="flex items-center gap-4 p-4">
            <div className="bg-blue-500/20 p-2 rounded-xl">
              <Bell className="w-6 h-6 text-blue-400 animate-bounce" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{flash.title}</p>
              <p className="text-xs text-gray-300 line-clamp-1">{flash.body}</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setFlash(null)
              }}
              className="p-1 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
