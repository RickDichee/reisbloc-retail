/**
 * usePlanLimits — Hook central del sistema de feature gating por plan.
 * Lee el plan de la organización desde el appStore y expone helpers
 * para controlar qué features y límites aplican al tenant activo.
 */

import { useAppStore } from '@/store/appStore'
import { PLANS, getPlanDisplayName, PlanType as NewPlanType } from '@/config/plans'

export type PlanType = 'free' | 'starter' | 'growth' | 'scale' | 'enterprise'

export type PlanFeature =
  | 'product_images'
  | 'mercadopago'
  | 'realtime'
  | 'audit_logs'
  | 'advanced_reports'
  | 'thermal_printer'
  | 'multi_register'
  | 'multi_user'
  | 'multi_branch'
  | 'sales_history_full'

export type PlanResource = 'products' | 'employees' | 'registers'

const PLAN_LIMITS: Record<PlanType, Record<PlanResource, number>> = {
  free:       { products: 100,  employees: 3,  registers: 1 },
  starter:    { products: 500,  employees: 5,  registers: 3 },
  growth:     { products: 2000, employees: 15, registers: 5 },
  scale:      { products: -1,   employees: -1, registers: -1 },
  enterprise: { products: -1,   employees: -1, registers: -1 },
}

const PLAN_FEATURES: Record<PlanType, PlanFeature[]> = {
  free: [
    'thermal_printer',
  ],
  starter: [
    'thermal_printer',
    'product_images',
    'mercadopago',
    'realtime',
    'audit_logs',
    'multi_register',
    'multi_user',
  ],
  growth: [
    'thermal_printer',
    'product_images',
    'mercadopago',
    'realtime',
    'audit_logs',
    'advanced_reports',
    'multi_register',
    'multi_user',
    'sales_history_full',
  ],
  scale: [
    'thermal_printer',
    'product_images',
    'mercadopago',
    'realtime',
    'audit_logs',
    'advanced_reports',
    'multi_register',
    'multi_user',
    'sales_history_full',
    'multi_branch',
  ],
  enterprise: [
    'thermal_printer',
    'product_images',
    'mercadopago',
    'realtime',
    'audit_logs',
    'advanced_reports',
    'multi_register',
    'multi_user',
    'sales_history_full',
    'multi_branch',
  ],
}

export function usePlanLimits() {
  const { orgPlan } = useAppStore()
  
  // Map old plan names to new ones
  const planMap: Record<string, PlanType> = {
    'free': 'free',
    'pro': 'starter',
    'essential': 'free',
    'starter': 'starter',
    'growth': 'growth',
    'scale': 'scale',
    'enterprise': 'enterprise',
  }
  
  const plan: PlanType = planMap[orgPlan as string] || 'free'
  const planLimits = PLANS[plan as NewPlanType]

  const canUseFeature = (feature: PlanFeature): boolean => {
    return PLAN_FEATURES[plan]?.includes(feature) ?? false
  }

  const isWithinLimit = (resource: PlanResource, count: number): boolean => {
    const limit = PLAN_LIMITS[plan]?.[resource] ?? 0
    if (limit === -1) return true
    return count < limit
  }

  const getLimit = (resource: PlanResource): number => {
    return PLAN_LIMITS[plan]?.[resource] ?? 0
  }

  const showBranding = plan === 'free'
  const planName = getPlanDisplayName(plan as NewPlanType)
  const isPro = plan !== 'free'
  const isEnterprise = plan === 'enterprise' || plan === 'scale'
  const isScale = plan === 'scale'

  return {
    plan,
    planName,
    isPro,
    isEnterprise,
    isScale,
    showBranding,
    canUseFeature,
    isWithinLimit,
    getLimit,
    planLimits,
  }
}
