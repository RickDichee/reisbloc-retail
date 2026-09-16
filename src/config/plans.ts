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
    products: 30,               // Perfecto para micro-negocio / tiendita
    employees: 1,
    registers: 1,
    storageMB: 50,
    aiTokensPerDay: 0,         // Sin recarga diaria gratis para no quemar APIs
    aiTokensPerMonth: 25,      // 25 tokens únicos de bienvenida para probar
    clients: 15,
    purchases: 5,
    reportsPerMonth: 3,
    ecommerceProducts: 10,
    branches: 1,
    allowMultiStore: false,
    allowApiAccess: false,
    allowEcommerce: false,
    allowFacturation: false,
    supportLevel: 'community',
    maxTokensPerFeature: {
      ai_chat: 10,             // 10 consultas de chat
      ai_insights: 5,          // Análisis de ventas
      post_generation: 5,      // 1 post de marketing
      report_pdf: 10,          // 1 reporte ejecutivo en PDF
    }
  },
  starter: {
    products: 200,             // Boutique en crecimiento
    employees: 3,
    registers: 2,
    storageMB: 1024,
    aiTokensPerDay: 10,
    aiTokensPerMonth: 50,      // Gemini 1.5 Flash (costo < $2 MXN/mes)
    clients: 100,
    purchases: 50,
    reportsPerMonth: 50,
    ecommerceProducts: 100,
    branches: 1,
    allowMultiStore: false,
    allowApiAccess: false,
    allowEcommerce: true,
    allowFacturation: false,
    supportLevel: 'email',
    maxTokensPerFeature: {
      ai_chat: 25,
      ai_insights: 15,
      post_generation: 10,
      report_pdf: 10,
    }
  },
  growth: {
    products: 1000,
    employees: 10,
    registers: 5,
    storageMB: 4096,
    aiTokensPerDay: 50,
    aiTokensPerMonth: 200,
    clients: 500,
    purchases: 250,
    reportsPerMonth: 250,
    ecommerceProducts: 500,
    branches: 2,
    allowMultiStore: true,
    allowApiAccess: false,
    allowEcommerce: true,
    allowFacturation: true,      // Facturación CFDI incluida
    supportLevel: 'email',
    maxTokensPerFeature: {
      ai_chat: 100,
      ai_insights: 50,
      post_generation: 50,
      report_pdf: 50,
    }
  },
  scale: {
    products: 5000,
    employees: 25,
    registers: 10,
    storageMB: 10240,
    aiTokensPerDay: 150,
    aiTokensPerMonth: 1000,
    clients: 2000,
    purchases: 1000,
    reportsPerMonth: 1000,
    ecommerceProducts: 2000,
    branches: 5,
    allowMultiStore: true,
    allowApiAccess: true,
    allowEcommerce: true,
    allowFacturation: true,
    supportLevel: 'priority',
    maxTokensPerFeature: {
      ai_chat: 300,
      ai_insights: 150,
      post_generation: 100,
      report_pdf: 150,
    }
  },
  enterprise: {
    products: -1,
    employees: -1,
    registers: -1,
    storageMB: 51200,
    aiTokensPerDay: 1000,
    aiTokensPerMonth: 10000,
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
      ai_chat: -1,
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
    starter: 199,     // $199 MXN/mes
    growth: 499,      // $499 MXN/mes
    scale: 1299,      // $1299 MXN/mes
    enterprise: 2999, // $2999 MXN/mes
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
