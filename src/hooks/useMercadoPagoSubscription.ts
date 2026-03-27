import { useState, useCallback } from 'react'
import { supabase } from '@/config/supabase'
import { PlanType } from '@/config/plans'
import logger from '@/utils/logger'

const PLAN_PRICES: Record<PlanType, number> = {
  free: 0,
  starter: 149,
  growth: 399,
  scale: 799,
  enterprise: 0
}

const PLAN_NAMES: Record<PlanType, string> = {
  free: 'Free',
  starter: 'Launch',
  growth: 'Growth',
  scale: 'Scale',
  enterprise: 'Enterprise'
}

interface SubscriptionResult {
  init_point: string
  preference_id: string
}

export function useMercadoPagoSubscription() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createSubscription = useCallback(async (plan: PlanType): Promise<SubscriptionResult | null> => {
    if (plan === 'free' || plan === 'enterprise') {
      setError('Este plan no está disponible para compra online')
      return null
    }

    setLoading(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('Debes iniciar sesión para suscribirte')
      }

      const price = PLAN_PRICES[plan]
      const planName = PLAN_NAMES[plan]

      logger.info('subscription', `Creating MercadoPago subscription for ${planName} at $${price}/mes`)

      const { data, error: funcError } = await supabase.functions.invoke('create-subscription', {
        body: {
          plan,
          price,
          userId: session.user.id,
          email: session.user.email
        }
      })

      if (funcError) {
        logger.error('subscription', 'Error creating subscription', funcError)
        throw new Error(funcError.message || 'Error al crear la suscripción')
      }

      if (data?.error) {
        throw new Error(data.error)
      }

      return data as SubscriptionResult
    } catch (err: any) {
      const errorMessage = err.message || 'Error desconocido'
      setError(errorMessage)
      logger.error('subscription', 'Subscription failed', err)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const checkSubscriptionStatus = useCallback(async (): Promise<{
    active: boolean
    plan: PlanType
    currentPeriodEnd?: Date
  } | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return null

      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('status', 'active')
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (!data) {
        return { active: false, plan: 'free' }
      }

      return {
        active: true,
        plan: data.plan as PlanType,
        currentPeriodEnd: new Date(data.current_period_end)
      }
    } catch (err) {
      logger.error('subscription', 'Error checking subscription status', err)
      return null
    }
  }, [])

  const cancelSubscription = useCallback(async (): Promise<boolean> => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) throw new Error('No autenticado')

      const { error } = await supabase.functions.invoke('cancel-subscription', {
        body: { userId: session.user.id }
      })

      if (error) throw error
      return true
    } catch (err: any) {
      setError(err.message)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    createSubscription,
    checkSubscriptionStatus,
    cancelSubscription,
    loading,
    error
  }
}
