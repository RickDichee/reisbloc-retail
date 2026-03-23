// src/hooks/useSubscriptionLimits.ts

import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/store/appStore'
import { supabase } from '@/config/supabase'
import { PLANS, PlanType, PlanLimits, isUnlimited } from '@/config/plans'
import logger from '@/utils/logger'

interface UsageStats {
  products: number
  employees: number
  registers: number
  storageUsedMB: number
  clients: number
  purchases: number
  branches: number
  aiTokensUsedToday: number
  aiTokensUsedMonth: number
}

interface LimitCheck {
  allowed: boolean
  current: number
  limit: number
  percentage: number
  message: string
}

export function useSubscriptionLimits() {
  const { currentUser } = useAppStore()
  const organizationId = currentUser?.organizationId
  const [loading, setLoading] = useState(true)
  const [plan, setPlan] = useState<PlanType>('free')
  const [usage, setUsage] = useState<UsageStats>({
    products: 0,
    employees: 0,
    registers: 0,
    storageUsedMB: 0,
    clients: 0,
    purchases: 0,
    branches: 1,
    aiTokensUsedToday: 0,
    aiTokensUsedMonth: 0,
  })

  const limits = PLANS[plan]

  // Fetch subscription and usage data
  const fetchSubscriptionData = useCallback(async () => {
    if (!organizationId) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      // Get subscription
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .single()

      if (subscription?.plan) {
        setPlan(subscription.plan as PlanType)
      }

      // Get usage stats in parallel
      const [
        productsCount,
        usersCount,
        registersCount,
        clientsCount,
        purchasesCount,
        aiUsage
      ] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('users').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
        supabase.from('registers').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
        supabase.from('clients').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
        supabase.from('purchases').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
        supabase.rpc('get_ai_usage_today', { p_org_id: organizationId }).select('*').single()
      ])

      setUsage({
        products: productsCount.count || 0,
        employees: usersCount.count || 0,
        registers: registersCount.count || 0,
        storageUsedMB: 0, // Would need storage query
        clients: clientsCount.count || 0,
        purchases: purchasesCount.count || 0,
        branches: 1,
        aiTokensUsedToday: (aiUsage?.data as any)?.tokens_used || 0,
        aiTokensUsedMonth: (aiUsage?.data as any)?.monthly_tokens || 0,
      })
    } catch (error) {
      logger.error('subscription', 'Error fetching subscription data', error as any)
      // Default to free plan on error
      setPlan('free')
    } finally {
      setLoading(false)
    }
  }, [organizationId])

  useEffect(() => {
    fetchSubscriptionData()
  }, [fetchSubscriptionData])

  // Check specific limit
  const checkLimit = useCallback((resource: keyof PlanLimits): LimitCheck => {
    const currentUsage = getUsageForResource(resource, usage)
    const limit = limits[resource] as number

    if (isUnlimited(limit)) {
      return {
        allowed: true,
        current: currentUsage,
        limit: -1,
        percentage: 0,
        message: 'Ilimitado',
      }
    }

    const percentage = Math.round((currentUsage / limit) * 100)
    const allowed = currentUsage < limit

    let message = ''
    if (percentage >= 100) {
      message = `Has alcanzado el límite de ${limit}`
    } else if (percentage >= 80) {
      message = `Te quedan ${limit - currentUsage} disponible`
    }

    return {
      allowed,
      current: currentUsage,
      limit,
      percentage: Math.min(percentage, 100),
      message,
    }
  }, [limits, usage])

  // Check if user can perform action
  const canPerform = useCallback((resource: keyof PlanLimits, increment = 1): boolean => {
    const currentUsage = getUsageForResource(resource, usage)
    const limit = limits[resource] as number

    if (isUnlimited(limit)) return true
    return (currentUsage + increment) <= limit
  }, [limits, usage])

  // Get warning level for UI
  const getWarningLevel = useCallback((resource: keyof PlanLimits): 'ok' | 'warning' | 'critical' => {
    const check = checkLimit(resource)
    if (check.limit === -1) return 'ok'
    if (check.percentage >= 100) return 'critical'
    if (check.percentage >= 80) return 'warning'
    return 'ok'
  }, [checkLimit])

  return {
    plan,
    limits,
    usage,
    loading,
    checkLimit,
    canPerform,
    getWarningLevel,
    refreshData: fetchSubscriptionData,
  }
}

function getUsageForResource(resource: keyof PlanLimits, usage: UsageStats): number {
  const mapping: Record<keyof PlanLimits, number> = {
    products: usage.products,
    employees: usage.employees,
    registers: usage.registers,
    storageMB: usage.storageUsedMB,
    aiTokensPerDay: usage.aiTokensUsedToday,
    aiTokensPerMonth: usage.aiTokensUsedMonth,
    clients: usage.clients,
    purchases: usage.purchases,
    reportsPerMonth: 0, // Would track separately
    ecommerceProducts: usage.products, // Using products for now
    branches: usage.branches,
    allowMultiStore: 0,
    allowApiAccess: 0,
    supportLevel: 0,
  }
  return mapping[resource] || 0
}

// Component for showing limit warnings
export function LimitWarning({ 
  resource, 
  label 
}: { 
  resource: keyof PlanLimits
  label: string 
}) {
  const { checkLimit, getWarningLevel, limits } = useSubscriptionLimits()
  const check = checkLimit(resource)
  const warningLevel = getWarningLevel(resource)

  if (warningLevel === 'ok') return null
  if (limits[resource] === -1) return null

  const colorClass = warningLevel === 'critical' 
    ? 'bg-red-50 border-red-200 text-red-700'
    : 'bg-amber-50 border-amber-200 text-amber-700'

  return (
    <div className={`p-3 rounded-xl border text-sm ${colorClass}`}>
      <p className="font-medium">
        ⚠️ Límite de {label}: {check.current}/{check.limit}
        {check.message && ` - ${check.message}`}
      </p>
      <a href="/admin/upgrade" className="text-xs underline mt-1 inline-block">
        Hacer upgrade
      </a>
    </div>
  )
}
