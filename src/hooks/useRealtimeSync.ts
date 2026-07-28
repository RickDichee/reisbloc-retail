import { useEffect } from 'react'
import { supabase } from '@/config/supabase'
import logger from '@/utils/logger'
import { useAppStore } from '@/store/appStore'

interface RealtimeSyncOptions {
  onOrdersChange?: (payload: any) => void
  onCashRegisterChange?: (payload: any) => void
  onAuditLogsChange?: (payload: any) => void
}

/**
 * Hook para la sincronización y actualización reactiva en tiempo real
 * entre usuarios activos de la misma organización.
 */
export function useRealtimeSync(options: RealtimeSyncOptions = {}) {
  const currentUser = useAppStore(state => state.currentUser)
  const organizationId = currentUser?.organizationId

  useEffect(() => {
    if (!organizationId) return

    logger.info('realtime', `Iniciando suscripción Realtime para org: ${organizationId}`)

    const channel = supabase.channel(`org-sync-${organizationId}`)

    channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `organization_id=eq.${organizationId}`
        },
        payload => {
          logger.info('realtime', 'Cambio en órdenes recibido en tiempo real', payload)
          if (options.onOrdersChange) {
            options.onOrdersChange(payload)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cash_register_sessions',
          filter: `organization_id=eq.${organizationId}`
        },
        payload => {
          logger.info('realtime', 'Cambio en caja recibido en tiempo real', payload)
          if (options.onCashRegisterChange) {
            options.onCashRegisterChange(payload)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'audit_logs',
          filter: `organization_id=eq.${organizationId}`
        },
        payload => {
          logger.info('realtime', 'Nuevo log de auditoría recibido en tiempo real', payload)
          if (options.onAuditLogsChange) {
            options.onAuditLogsChange(payload)
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logger.info('realtime', `Suscrito con éxito a cambios de la organización ${organizationId}`)
        }
      })

    return () => {
      logger.info('realtime', `Cancelando suscripción Realtime para org: ${organizationId}`)
      supabase.removeChannel(channel)
    }
  }, [organizationId, options.onOrdersChange, options.onCashRegisterChange, options.onAuditLogsChange])
}
