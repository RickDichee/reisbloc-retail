export function isUuidIdentifier(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export function normalizePublicTenantIdentifier(value?: string): string | null {
  const normalized = (value || '').trim().toLowerCase()
  if (!normalized) return null
  if (isUuidIdentifier(normalized)) return normalized
  if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)) return normalized
  return null
}

