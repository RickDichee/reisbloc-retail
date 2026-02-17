import logger from '@/utils/logger'
import type { UserRole } from '../types'
import { createNotification, notifyUsersByRole, NOTIFICATIONS_ENABLED } from './notificationService'

interface SendNotificationParams {
  userIds?: string[]
  roles?: UserRole[]
  title: string
  body: string
  type?: 'order' | 'inventory' | 'alert' | 'info'
  priority?: 'low' | 'normal' | 'high'
  data?: Record<string, any>
}

/**
 * Enviar notificación mediante Cloud Function
 */
export async function sendNotificationToUsers(params: SendNotificationParams): Promise<void> {
  try {
    if (!NOTIFICATIONS_ENABLED) {
      logger.warn('notification', 'Notificaciones deshabilitadas (feature flag)')
      return
    }

    const type = params.type || 'info'
    const priority = params.priority || 'normal'

    if (params.userIds?.length) {
      await Promise.all(
        params.userIds.map(userId =>
          createNotification(userId, params.title, params.body, type, priority, params.data)
        )
      )
    }

    if (params.roles?.length) {
      await notifyUsersByRole(params.roles, params.title, params.body, type, priority, params.data)
    }

    logger.info('notification', 'Notificación enviada via Supabase')
  } catch (error) {
    logger.error('notification', 'Error enviando notificación', error as any)
  }
}
