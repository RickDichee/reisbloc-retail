export const checkIsModaMiel = (hostname?: string, search?: string, hash?: string, orgSlug?: string): boolean => {
  const host = (hostname || (typeof window !== 'undefined' ? window.location.hostname : '')).toLowerCase()
  const query = (search || (typeof window !== 'undefined' ? window.location.search : '')).toLowerCase()
  const fragment = (hash || (typeof window !== 'undefined' ? window.location.hash : '')).toLowerCase()
  const slug = (orgSlug || '').toLowerCase()
  
  return (
    host.includes('modamiel') ||
    host.includes('moda-miel') ||
    query.includes('brand=modamiel') ||
    fragment.includes('brand=modamiel') ||
    slug.includes('modamiel') ||
    slug.includes('moda-miel')
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
  mascotEmoji?: string
  mascotName?: string
}

export const MODA_MIEL_THEME: TenantThemeConfig = {
  id: 'modamiel',
  name: 'Moda Miel MX',
  primaryColor: '#E62E6B',       // Vibrant Hot Pink (Top Navbar & Header Accents)
  primaryHoverColor: '#C41E53',  
  secondaryColor: '#FF7597',     // Soft Rose Accent
  accentColor: '#1A1A1A',        // Deep Charcoal Contrast Text & Badges
  bgCanvas: '#FFF5F7',           // Soft Sugar Blush Canvas Background
  bgSurface: '#FFFFFF',          // Crisp White Cards
  textMain: '#1A1A1A',           // High Contrast Readable Dark Text
  textSecondary: '#6B7280',     // Soft Slate Text
  borderColor: '#FCE7F3',        // Light Pink Border
  fontSerif: "'Playfair Display', Georgia, serif",
  fontScript: "'Dancing Script', cursive",
  fontSans: "'Outfit', sans-serif",
  badgeText: 'TODO POR PAQUETE',
  tagline: 'Moda y estilo para tu negocio',
  locationBadge: 'PASILLO 3 · LOCAL 230',
  mascotEmoji: '🐞',
  mascotName: 'Catarina'
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

