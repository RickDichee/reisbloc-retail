/**
 * usePlanLimits — Hook central del sistema de feature gating por plan.
 * Lee el plan de la organización desde el appStore y expone helpers
 * para controlar qué features y límites aplican al tenant activo.
 */

import { useAppStore } from '@/store/appStore'

export type PlanType = 'free' | 'pro' | 'enterprise'

export type PlanFeature =
  | 'product_images'   // Imágenes en productos
  | 'conekta'          // Pagos QR / Conekta
  | 'mercadopago'      // Pagos QR / MercadoPago
  | 'realtime'         // Subscripciones Realtime
  | 'audit_logs'       // Audit logs
  | 'advanced_reports' // Reportes avanzados + export
  | 'thermal_printer'  // Impresora térmica (todos los planes, pero Free tiene branding)
  | 'multi_register'   // Más de 1 caja
  | 'multi_user'       // Más de 1 usuario
  | 'multi_branch'     // Sucursales múltiples
  | 'sales_history_full' // Historial completo (12+ meses)

export type PlanResource = 'products' | 'users' | 'registers'

const PLAN_LIMITS: Record<PlanType, Record<PlanResource, number>> = {
  free:       { products: 50,   users: 1,  registers: 1 },
  pro:        { products: 500,  users: 5,  registers: 3 },
  enterprise: { products: 9999, users: 99, registers: 99 },
}

const PLAN_FEATURES: Record<PlanType, PlanFeature[]> = {
  free: [
    'thermal_printer', // sí, pero con branding
  ],
  pro: [
    'thermal_printer',
    'product_images',
    'conekta',
    'mercadopago',
    'realtime',
    'audit_logs',
    'advanced_reports',
    'multi_register',
    'multi_user',
    'sales_history_full',
  ],
  enterprise: [
    'thermal_printer',
    'product_images',
    'conekta',
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
  const plan: PlanType = (orgPlan as PlanType) || 'free'

  const canUseFeature = (feature: PlanFeature): boolean => {
    return PLAN_FEATURES[plan]?.includes(feature) ?? false
  }

  const isWithinLimit = (resource: PlanResource, count: number): boolean => {
    return count < PLAN_LIMITS[plan][resource]
  }

  const getLimit = (resource: PlanResource): number => {
    return PLAN_LIMITS[plan][resource]
  }

  const showBranding = plan === 'free'
  const planName = plan === 'free' ? 'Esencial' : plan === 'pro' ? 'Pro' : 'Enterprise'
  const isPro = plan === 'pro' || plan === 'enterprise'
  const isEnterprise = plan === 'enterprise'

  return {
    plan,
    planName,
    isPro,
    isEnterprise,
    showBranding,
    canUseFeature,
    isWithinLimit,
    getLimit,
  }
}
