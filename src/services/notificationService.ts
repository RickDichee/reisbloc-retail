import { supabase } from '../config/supabase'
import logger from '../utils/logger'
import { UserRole } from '../types'

export const NOTIFICATIONS_ENABLED = true

export interface Notification {
  id: string
  userId: string
  title: string
  body: string
  type: 'info' | 'success' | 'warning' | 'error' | 'order' | 'kitchen' | 'shift'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  read: boolean
  createdAt: string
  data?: Record<string, any>
}

// Local Storage Fallback Key
const LOCAL_NOTIFS_KEY = 'reisbloc_local_notifications'

function getLocalNotificationsStore(): Notification[] {
  try {
    const raw = localStorage.getItem(LOCAL_NOTIFS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch (e) {
    return []
  }
}

function saveLocalNotification(payload: any) {
  try {
    const existing = getLocalNotificationsStore()
    const newNotif: Notification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      userId: payload.user_id,
      title: payload.title,
      body: payload.body,
      type: payload.type || 'info',
      priority: payload.priority || 'normal',
      read: false,
      createdAt: new Date().toISOString(),
      data: payload.data || undefined
    }
    existing.unshift(newNotif)
    localStorage.setItem(LOCAL_NOTIFS_KEY, JSON.stringify(existing.slice(0, 100)))
  } catch (e) {}
}

/**
 * Pedir permiso para notificaciones nativas del navegador
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!NOTIFICATIONS_ENABLED || typeof Notification === 'undefined') return false
  try {
    if (Notification.permission === 'granted') return true
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission()
      return permission === 'granted'
    }
    return false
  } catch (error) {
    logger.error('notification', 'Error al solicitar permisos de notificación', error as any)
    return false
  }
}

/**
 * Escuchar mensajes en primer plano
 */
export function listenToForegroundMessages(_callback: (payload: any) => void) {
  return () => {}
}

/**
 * Crear una notificación en Supabase DB o Respaldo Local (Sin errores RLS)
 */
export async function createNotification(
  userId: string,
  title: string,
  body: string,
  type: Notification['type'] = 'info',
  priority: Notification['priority'] = 'normal',
  data?: Record<string, any>
): Promise<void> {
  if (!NOTIFICATIONS_ENABLED) return
  const payload = {
    user_id: userId,
    title,
    body,
    type,
    priority,
    read: false,
    data: data || null,
  }

  try {
    const { error } = await supabase.from('notifications').insert([payload])
    if (error) {
      logger.warn('notification', `⚠️ RLS / DB en notificaciones (guardado local): ${error.message}`)
      saveLocalNotification(payload)
      return
    }
    logger.info('notification', `Notificación creada para ${userId}`)
  } catch (error: any) {
    logger.warn('notification', 'Catch en creación de notificación (guardado local):', error?.message)
    saveLocalNotification(payload)
  }
}

/**
 * Crear notificaciones para múltiples usuarios (por rol) sin errores RLS
 */
export async function notifyUsersByRole(
  role: UserRole | UserRole[],
  title: string,
  body: string,
  type: Notification['type'] = 'info',
  priority: Notification['priority'] = 'normal',
  data?: Record<string, any>
): Promise<void> {
  if (!NOTIFICATIONS_ENABLED) return
  try {
    const roles = Array.isArray(role) ? role : [role]
    const { data: users, error } = await supabase
      .from('users')
      .select('id, role')
      .in('role', roles)

    if (error || !users) {
      saveLocalNotification({ user_id: 'all', title, body, type, priority, data })
      return
    }

    const payloads = users.map(u => ({
      user_id: u.id,
      title,
      body,
      type,
      priority,
      read: false,
      data: data || null,
    }))

    if (payloads.length === 0) return
    const { error: insertError } = await supabase.from('notifications').insert(payloads)
    if (insertError) {
      logger.warn('notification', `⚠️ RLS en notificaciones por rol: ${insertError.message}`)
      payloads.forEach(p => saveLocalNotification(p))
      return
    }
    logger.info('notification', `Notificaciones enviadas a roles: ${roles.join(',')}`)
  } catch (error: any) {
    logger.warn('notification', 'Catch al notificar por rol:', error?.message)
    saveLocalNotification({ user_id: 'all', title, body, type, priority, data })
  }
}

/**
 * Escuchar notificaciones del usuario en tiempo real con respaldo resiliente
 */
export function subscribeToNotifications(
  userId: string,
  callback: (notifications: Notification[]) => void,
  maxNotifications: number = 50
) {
  if (!NOTIFICATIONS_ENABLED) {
    callback([])
    return () => {}
  }

  let current: Notification[] = []

  const loadInitial = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(maxNotifications)

      if (error) {
        logger.warn('notification', `⚠️ RLS en consulta de notificaciones, usando fallback local: ${error.message}`)
        const local = getLocalNotificationsStore().filter(n => n.userId === userId || n.userId === 'all')
        callback(local)
        return
      }

      const remoteNotifs = (data || []).map(mapFromDb)
      const localNotifs = getLocalNotificationsStore().filter(n => n.userId === userId || n.userId === 'all')
      const merged = [...remoteNotifs, ...localNotifs].slice(0, maxNotifications)
      current = merged
      callback(merged)
    } catch (e: any) {
      const local = getLocalNotificationsStore().filter(n => n.userId === userId || n.userId === 'all')
      callback(local)
    }
  }

  void loadInitial()

  const channel = supabase
    .channel(`notifications-${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
      payload => {
        if (payload.eventType === 'INSERT' && payload.new) {
          const next = [mapFromDb(payload.new as any), ...current].slice(0, maxNotifications)
          current = next
          callback(next)
        }
        if (payload.eventType === 'UPDATE' && payload.new) {
          const updated = mapFromDb(payload.new as any)
          current = current.map(n => (n.id === updated.id ? updated : n))
          callback(current)
        }
      }
    )
    .subscribe()

  return () => {
    void supabase.removeChannel(channel)
  }
}

/**
 * Marcar notificación como leída
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  if (!NOTIFICATIONS_ENABLED) return
  try {
    await supabase.from('notifications').update({ read: true }).eq('id', notificationId)
  } catch (e) {}

  try {
    const local = getLocalNotificationsStore().map(n => n.id === notificationId ? { ...n, read: true } : n)
    localStorage.setItem(LOCAL_NOTIFS_KEY, JSON.stringify(local))
  } catch (e) {}
}

/**
 * Marcar todas las notificaciones del usuario como leídas
 */
export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  if (!NOTIFICATIONS_ENABLED) return
  try {
    await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false)
  } catch (e) {}

  try {
    const local = getLocalNotificationsStore().map(n => n.userId === userId ? { ...n, read: true } : n)
    localStorage.setItem(LOCAL_NOTIFS_KEY, JSON.stringify(local))
  } catch (e) {}
}

function mapFromDb(row: any): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    body: row.body,
    type: row.type,
    priority: row.priority,
    read: row.read,
    createdAt: row.created_at,
    data: row.data || undefined,
  }
}
