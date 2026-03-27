// src/config/plans.ts

export type PlanType = 'free' | 'starter' | 'growth' | 'scale' | 'enterprise'

export interface PlanLimits {
  products: number
  employees: number
  registers: number
  storageMB: number
  aiTokensPerDay: number
  aiTokensPerMonth: number
  clients: number
  purchases: number
  reportsPerMonth: number
  ecommerceProducts: number
  branches: number
  allowMultiStore: boolean
  allowApiAccess: boolean
  supportLevel: 'community' | 'email' | 'priority' | 'dedicated'
}

export const PLANS: Record<PlanType, PlanLimits> = {
  free: {
    products: 100,
    employees: 3,
    registers: 1,
    storageMB: 100,
    aiTokensPerDay: 20,
    aiTokensPerMonth: 60,
    clients: 50,
    purchases: 20,
    reportsPerMonth: 10,
    ecommerceProducts: 50,
    branches: 1,
    allowMultiStore: false,
    allowApiAccess: false,
    supportLevel: 'community',
  },
  starter: {
    products: 1000,
    employees: 10,
    registers: 3,
    storageMB: 1024,
    aiTokensPerDay: 50,
    aiTokensPerMonth: 1500,
    clients: 500,
    purchases: 100,
    reportsPerMonth: 100,
    ecommerceProducts: 500,
    branches: 1,
    allowMultiStore: false,
    allowApiAccess: false,
    supportLevel: 'email',
  },
  growth: {
    products: 5000,
    employees: 25,
    registers: 5,
    storageMB: 5120,
    aiTokensPerDay: 165,
    aiTokensPerMonth: 5000,
    clients: 2000,
    purchases: 500,
    reportsPerMonth: 500,
    ecommerceProducts: 2000,
    branches: 1,
    allowMultiStore: false,
    allowApiAccess: false,
    supportLevel: 'email',
  },
  scale: {
    products: -1,
    employees: -1,
    registers: -1,
    storageMB: 10240,
    aiTokensPerDay: 500,
    aiTokensPerMonth: 15000,
    clients: -1,
    purchases: -1,
    reportsPerMonth: -1,
    ecommerceProducts: -1,
    branches: 3,
    allowMultiStore: true,
    allowApiAccess: true,
    supportLevel: 'priority',
  },
  enterprise: {
    products: -1,
    employees: -1,
    registers: -1,
    storageMB: 51200,
    aiTokensPerDay: 1600,
    aiTokensPerMonth: 50000,
    clients: -1,
    purchases: -1,
    reportsPerMonth: -1,
    ecommerceProducts: -1,
    branches: -1,
    allowMultiStore: true,
    allowApiAccess: true,
    supportLevel: 'dedicated',
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
    free: 'Free',
    starter: 'Launch',
    growth: 'Growth',
    scale: 'Scale',
    enterprise: 'Enterprise',
  }
  return names[plan] || 'Free'
}

export function getPlanPrice(plan: PlanType): number {
  const prices: Record<PlanType, number> = {
    free: 0,
    starter: 149,
    growth: 399,
    scale: 799,
    enterprise: 1999,
  }
  return prices[plan] || 0
}
