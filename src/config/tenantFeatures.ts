// =============================================================================
// tenantFeatures.ts — Feature flags por organización (deny-by-default)
// REGLA: Toda feature tenant-específica DEBE estar aquí. Default siempre false.
// =============================================================================

export const LOS_CHUNCHES_ORG_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
export const JUGUETES_SAN_JUDASTADEO_ORG_ID = '324fd41f-b8af-4aef-9ea6-2f954350775a'
export const MODA_MIEL_ORG_ID = '1b498fa6-aca5-428c-9bdd-01e6fea30316'

export type TenantFeature =
  | 'unitCost'
  | 'webReference'
  | 'packLabel'
  | 'onlineStoreModule'
  | 'aiModules'
  | 'cardTerminal'
  | 'wholesaleModule'
  | 'invoicingModule'
  | 'branchesModule'

const TENANT_FEATURES: Record<string, Record<string, boolean>> = {
  [MODA_MIEL_ORG_ID]: {
    // Moda Miel vende por paquete: el label del precio es "Pqte" en vez de "Precio"
    packLabel: true,
    onlineStoreModule: true,
    aiModules: false,
    cardTerminal: false,
    wholesaleModule: true,
    invoicingModule: false,
    branchesModule: false
  },
  [LOS_CHUNCHES_ORG_ID]: {
    unitCost: true,
    webReference: true,
    onlineStoreModule: true,
    aiModules: false,
    cardTerminal: true,
    wholesaleModule: false,
    invoicingModule: false,
    branchesModule: false
  },
  [JUGUETES_SAN_JUDASTADEO_ORG_ID]: {
    unitCost: false,
    webReference: false,
    packLabel: false,
    onlineStoreModule: false,
    aiModules: false,
    cardTerminal: false,
    wholesaleModule: false,
    invoicingModule: false,
    branchesModule: false
  }
}

export function tenantHasFeature(orgId: string | null | undefined, feature: TenantFeature): boolean {
  if (!orgId) return false
  return Boolean(TENANT_FEATURES[orgId]?.[feature])
}
