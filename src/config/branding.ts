export const checkIsModaMiel = (hostname?: string, search?: string, hash?: string, orgSlug?: string): boolean => {
  if (typeof window === 'undefined' && !hostname) return false
  const host = hostname || (typeof window !== 'undefined' ? window.location.hostname : '')
  const query = search || (typeof window !== 'undefined' ? window.location.search : '')
  const fragment = hash || (typeof window !== 'undefined' ? window.location.hash : '')
  
  return (
    host.includes('modamiel') ||
    host.includes('moda-miel') ||
    query.includes('brand=modamiel') ||
    fragment.includes('brand=modamiel') ||
    orgSlug === 'modamiel' ||
    orgSlug === 'moda-miel-mx'
  )
}

const isModaMiel = checkIsModaMiel()

export interface TenantThemeConfig {
  id: string
  name: string
  primaryColor: string
  primaryHoverColor: string
  secondaryColor: string
  accentColor: string
  bgCanvas: string
  bgSurface: string
  textMain: string
  textSecondary: string
  borderColor: string
  fontSerif: string
  fontScript: string
  fontSans: string
  badgeText: string
  tagline: string
  locationBadge?: string
}

export const MODA_MIEL_THEME: TenantThemeConfig = {
  id: 'modamiel',
  name: 'Moda Miel MX',
  primaryColor: '#E62E6B',       // Hot Pink
  primaryHoverColor: '#C41E53',  // Darker Hot Pink
  secondaryColor: '#FF7597',     // Soft Pink Accent
  accentColor: '#1A1A1A',        // Deep Charcoal / Black
  bgCanvas: '#FFF5F7',           // Soft Blush Canvas
  bgSurface: '#FFFFFF',          // Crisp White Cards
  textMain: '#1A1A1A',           // Dark readable text
  textSecondary: '#6B7280',     // Soft Slate
  borderColor: '#FCE7F3',        // Light Pink Border
  fontSerif: "'Playfair Display', Georgia, serif",
  fontScript: "'Dancing Script', cursive",
  fontSans: "'Outfit', sans-serif",
  badgeText: 'TODO POR PAQUETE',
  tagline: 'Moda y estilo para tu negocio',
  locationBadge: 'PASILLO 3 · LOCAL 230'
}

export const DEFAULT_THEME: TenantThemeConfig = {
  id: 'default',
  name: 'Reisbloc Store',
  primaryColor: '#1F293B',
  primaryHoverColor: '#334155',
  secondaryColor: '#10B981',
  accentColor: '#F59E0B',
  bgCanvas: '#F8FAFC',
  bgSurface: '#FFFFFF',
  textMain: '#0F172A',
  textSecondary: '#64748B',
  borderColor: '#E2E8F0',
  fontSerif: "Georgia, serif",
  fontScript: "cursive",
  fontSans: "'Outfit', sans-serif",
  badgeText: 'SISTEMA POS SAAS',
  tagline: 'Tu negocio, sin límites'
}

export const BRANDING = {
  isModaMiel,
  appName: isModaMiel ? 'Moda Miel MX' : 'Reisbloc Store',
  whiteLabelName: isModaMiel ? 'Moda Miel MX' : 'Reisbloc',
  appWithBrand: isModaMiel ? 'Moda Miel MX' : 'Reisbloc Store',
  poweredBy: 'Powered by REISBLOC',
  poweredByUrl: 'reisbloc.com',
  logoUrl: isModaMiel ? '/images/moda-miel-mx-logo.jpeg' : '/icon.svg',
  bannerUrl: isModaMiel ? '/images/moda-miel-mx-banner.jpeg' : undefined,
  loginSubtitle: isModaMiel ? 'Accede a tu sistema POS de Moda Miel MX' : 'Accede a tu punto de venta',
  loadingTitle: isModaMiel ? 'Moda Miel MX' : 'Reisbloc Store',
  receiptTagline: isModaMiel ? MODA_MIEL_THEME.tagline : DEFAULT_THEME.tagline,
  theme: isModaMiel ? MODA_MIEL_THEME : DEFAULT_THEME
} as const

