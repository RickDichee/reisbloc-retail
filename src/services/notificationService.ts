import { supabase } from '@/config/supabase'
import logger from '@/utils/logger'
import type { UserRole } from '../types'

// Feature flag (activar en Supabase)
export const NOTIFICATIONS_ENABLED = true

export interface Notification {
  id?: string
  userId: string
  title: string
  body: string
  type: 'order' | 'inventory' | 'alert' | 'info'
  priority: 'low' | 'normal' | 'high'
  read: boolean
  createdAt: string
  data?: Record<string, any>
}

/**
 * Solicitar permiso de notificaciones del navegador
 */
export async function requestNotificationPermission(_userId: string): Promise<string | null> {
  if (!NOTIFICATIONS_ENABLED || typeof Notification === 'undefined') return null
  const permission = await Notification.requestPermission()
  return permission === 'granted' ? 'granted' : null
}

/**
 * Stub de mensajes foreground (no usamos FCM)
 */
export function listenToForegroundMessages(_callback: (payload: any) => void) {
  return () => {}
}

/**
 * Crear notificación in-app en Firestore
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
  try {
    const payload = {
      user_id: userId,
      title,
      body,
      type,
      priority,
      read: false,
      data: data || null,
    }

    const { error } = await supabase.from('notifications').insert([payload])
    if (error) throw error
    logger.info('notification', `Notificación creada para ${userId}`)
  } catch (error) {
    logger.error('notification', 'Error al crear notificación', error as any)
  }
}

/**
 * Crear notificaciones para múltiples usuarios (por rol)
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

    if (error) throw error
    const payloads = (users || []).map(u => ({
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
    if (insertError) throw insertError
    logger.info('notification', `Notificaciones enviadas a roles: ${roles.join(',')}`)
  } catch (error) {
    logger.error('notification', 'Error al notificar por rol', error as any)
  }
}

/**
 * Escuchar notificaciones del usuario en tiempo real
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
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(maxNotifications)

    if (error) {
      const err = error as any
      logger.error('notification', `Error cargando notificaciones: ${err?.message || 'unknown'}`, err)
      callback([])
      return
    }

    current = (data || []).map(mapFromDb)
    callback(current)
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
  await supabase.from('notifications').update({ read: true }).eq('id', notificationId)
}

/**
 * Marcar todas las notificaciones del usuario como leídas
 */
export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  if (!NOTIFICATIONS_ENABLED) return
  await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false)
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
