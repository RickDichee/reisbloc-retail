export const LOS_CHUNCHES_ORG_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'

export type TenantFeature = 'unitCost' | 'webReference'

const TENANT_FEATURES: Record<string, Record<string, boolean>> = {
  [LOS_CHUNCHES_ORG_ID]: {
    unitCost: true,
    webReference: true
  }
}

export function tenantHasFeature(orgId: string | null | undefined, feature: TenantFeature): boolean {
  if (!orgId) return false
  return Boolean(TENANT_FEATURES[orgId]?.[feature])
}
