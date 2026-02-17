import { useState, useEffect } from 'react'
import {
  requestNotificationPermission,
  listenToForegroundMessages,
  subscribeToNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  NOTIFICATIONS_ENABLED,
  type Notification
} from '../services/notificationService'

export function useNotifications(userId: string | null) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isLoading, setIsLoading] = useState(false)

  // Inicializar permisos y listeners
  useEffect(() => {
    if (!userId || !NOTIFICATIONS_ENABLED) return

    // Verificar permiso actual
    if (typeof Notification !== 'undefined') {
      setPermission(Notification.permission)
    }

    // Escuchar notificaciones en tiempo real
    const unsubscribe = subscribeToNotifications(userId, (newNotifications) => {
      setNotifications(newNotifications)
      setUnreadCount(newNotifications.filter(n => !n.read).length)
    })

    // Escuchar mensajes en foreground
    const unsubscribeForeground = listenToForegroundMessages((payload) => {
      // El listener de Firestore ya actualizará el estado
      console.log('Mensaje recibido en foreground:', payload)
    })

    return () => {
      unsubscribe()
      unsubscribeForeground()
    }
  }, [userId])

  // Solicitar permiso de notificaciones
  const requestPermission = async () => {
    if (!userId || !NOTIFICATIONS_ENABLED) return

    setIsLoading(true)
    try {
      const token = await requestNotificationPermission(userId)
      if (token) {
        setPermission('granted')
        console.log('✅ Notificaciones habilitadas')
      } else {
        setPermission('denied')
      }
    } catch (error) {
      console.error('Error al solicitar permiso:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Marcar notificación como leída
  const handleMarkAsRead = async (notificationId: string) => {
    await markNotificationAsRead(notificationId)
  }

  // Marcar todas como leídas
  const handleMarkAllAsRead = async () => {
    if (!userId) return
    await markAllNotificationsAsRead(userId)
  }

  return {
    notifications,
    unreadCount,
    permission,
    isLoading,
    requestPermission,
    markAsRead: handleMarkAsRead,
    markAllAsRead: handleMarkAllAsRead
  }
}
