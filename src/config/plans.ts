// src/config/plans.ts
// 🎯 Estrategia: "Libre para empezar, paga por crecer"
// Free tier MUY limitado para evitar costos excesivos de DB/AI

export type PlanType = 'free' | 'starter' | 'growth' | 'scale' | 'enterprise'

export interface PlanLimits {
  products: number
  employees: number
  registers: number
  storageMB: number
  aiTokensPerDay: number        // CRÍTICO: limitar para evitar costos
  aiTokensPerMonth: number
  clients: number
  purchases: number
  reportsPerMonth: number
  ecommerceProducts: number
  branches: number
  allowMultiStore: boolean
  allowApiAccess: boolean
  allowEcommerce: boolean
  allowFacturation: boolean
  supportLevel: 'community' | 'email' | 'priority' | 'dedicated'
  maxTokensPerFeature: Record<string, number> // Límite por feature de AI
}

export const PLANS: Record<PlanType, PlanLimits> = {
  free: {
    products: 25,               // Reducido para evitar DB costs
    employees: 1,
    registers: 1,
    storageMB: 50,              // Muy limitado
    aiTokensPerDay: 10,        // CRÍTICO: 10/día max
    aiTokensPerMonth: 50,      // 50/month - casi nada
    clients: 10,
    purchases: 5,
    reportsPerMonth: 3,
    ecommerceProducts: 10,
    branches: 1,
    allowMultiStore: false,
    allowApiAccess: false,
    allowEcommerce: false,      // NO incluir en free
    allowFacturation: false,     // NO incluir en free
    supportLevel: 'community',
    maxTokensPerFeature: {
      ai_chat: 5,              // 5 consultas/día max
      ai_insights: 2,
      post_generation: 0,        // NO permitido en free
      report_pdf: 1,
    }
  },
  starter: {
    products: 100,
    employees: 2,
    registers: 1,
    storageMB: 500,
    aiTokensPerDay: 30,
    aiTokensPerMonth: 300,
    clients: 50,
    purchases: 20,
    reportsPerMonth: 20,
    ecommerceProducts: 50,
    branches: 1,
    allowMultiStore: false,
    allowApiAccess: false,
    allowEcommerce: true,
    allowFacturation: false,
    supportLevel: 'email',
    maxTokensPerFeature: {
      ai_chat: 20,
      ai_insights: 10,
      post_generation: 5,
      report_pdf: 10,
    }
  },
  growth: {
    products: 500,
    employees: 5,
    registers: 2,
    storageMB: 2048,
    aiTokensPerDay: 100,
    aiTokensPerMonth: 1500,
    clients: 200,
    purchases: 100,
    reportsPerMonth: 100,
    ecommerceProducts: 200,
    branches: 1,
    allowMultiStore: false,
    allowApiAccess: false,
    allowEcommerce: true,
    allowFacturation: true,      // Facturación incluida
    supportLevel: 'email',
    maxTokensPerFeature: {
      ai_chat: 50,
      ai_insights: 25,
      post_generation: 20,
      report_pdf: 30,
    }
  },
  scale: {
    products: 2000,
    employees: 15,
    registers: 5,
    storageMB: 5120,
    aiTokensPerDay: 300,
    aiTokensPerMonth: 5000,
    clients: 1000,
    purchases: 500,
    reportsPerMonth: 500,
    ecommerceProducts: 1000,
    branches: 3,
    allowMultiStore: true,
    allowApiAccess: true,
    allowEcommerce: true,
    allowFacturation: true,
    supportLevel: 'priority',
    maxTokensPerFeature: {
      ai_chat: 150,
      ai_insights: 50,
      post_generation: 50,
      report_pdf: 100,
    }
  },
  enterprise: {
    products: -1,
    employees: -1,
    registers: -1,
    storageMB: 20480,
    aiTokensPerDay: 1000,
    aiTokensPerMonth: 20000,
    clients: -1,
    purchases: -1,
    reportsPerMonth: -1,
    ecommerceProducts: -1,
    branches: -1,
    allowMultiStore: true,
    allowApiAccess: true,
    allowEcommerce: true,
    allowFacturation: true,
    supportLevel: 'dedicated',
    maxTokensPerFeature: {
      ai_chat: -1,              // Ilimitado
      ai_insights: -1,
      post_generation: -1,
      report_pdf: -1,
    }
  },
}

export function getPlanLimits(plan: PlanType): PlanLimits {
  return PLANS[plan] || PLANS.free
}

export function isUnlimited(value: number): boolean {
  return value === -1
}

export function getPlanDisplayName(plan: PlanType): string {
  const names: Record<PlanType, string> = {
    free: 'Libre',
    starter: 'Negocio',
    growth: 'Empresarial',
    scale: 'Negocios',
    enterprise: 'Corporativo',
  }
  return names[plan] || 'Libre'
}

export function getPlanPrice(plan: PlanType): number {
  const prices: Record<PlanType, number> = {
    free: 0,
    starter: 499,      // $499 MXN - para empezar
    growth: 999,      // $999 MXN - crecimiento
    scale: 2499,      // $2499 MXN - multi-sucursal
    enterprise: 4999, // $4999 MXN - corporativo
  }
  return prices[plan] || 0
}

// Trial temporal para Growth (7 días gratis)
export const GROWTH_TRIAL_DAYS = 7

export function getTrialEndDate(): string {
  const endDate = new Date()
  endDate.setDate(endDate.getDate() + GROWTH_TRIAL_DAYS)
  return endDate.toISOString()
}

// Verificar si el plan permite cierta funcionalidad
export function canAccessFeature(plan: PlanType, feature: string): boolean {
  const limits = getPlanLimits(plan)
  
  switch (feature) {
    case 'ecommerce':
      return limits.allowEcommerce
    case 'facturation':
      return limits.allowFacturation
    case 'multiStore':
      return limits.allowMultiStore
    case 'api':
      return limits.allowApiAccess
    default:
      return true
  }
}
