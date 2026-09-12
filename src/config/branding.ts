export const checkIsModaMiel = (hostname?: string, search?: string, hash?: string, orgSlug?: string): boolean => {
  // 🛡️ AISLAMIENTO ESTRICTO: Si se provee orgSlug / orgId específico, evaluar ÚNICAMENTE la organización
  if (typeof orgSlug === 'string' && orgSlug.trim() !== '') {
    const slug = orgSlug.toLowerCase()
    return (
      slug === 'modamiel' ||
      slug === 'moda-miel' ||
      slug === 'moda miel' ||
      slug.includes('1b498fa6-aca5-428c-9bdd-01e6fea30316')
    )
  }

  // Si no hay organización (usuario público o en login), evaluar exclusivamente la URL
  const host = (hostname !== undefined ? hostname : (typeof window !== 'undefined' ? window.location.hostname : '')).toLowerCase()
  const query = (search !== undefined ? search : (typeof window !== 'undefined' ? window.location.search : '')).toLowerCase()
  const fragment = (hash !== undefined ? hash : (typeof window !== 'undefined' ? window.location.hash : '')).toLowerCase()

  return (
    host.includes('modamiel') ||
    host.includes('moda-miel') ||
    query.includes('brand=modamiel') ||
    fragment.includes('brand=modamiel')
  )
}

export function getBranding(isMM: boolean = false, customSettings?: any) {
  const theme = isMM ? MODA_MIEL_THEME : DEFAULT_THEME
  const appName = isMM ? 'Moda Miel MX' : (customSettings?.businessName || customSettings?.name || 'Reisbloc Store')
  const whiteLabel = isMM ? 'Moda Miel MX' : (customSettings?.businessName || 'Reisbloc')

  return {
    isModaMiel: isMM,
    appName,
    whiteLabelName: whiteLabel,
    appWithBrand: isMM ? 'Moda Miel MX' : (customSettings?.businessName || 'Reisbloc Store'),
    poweredBy: 'POWERED BY REISBLOC',
    poweredByUrl: 'Visítanos en: reisbloc.store',
    poweredByTagline: 'Integra el Poder de la IA en tu negocio',

    logoUrl: isMM ? '/images/moda-miel-mx-logo.jpeg' : (customSettings?.logoUrl || '/icon.svg'),
    bannerUrl: isMM ? '/images/moda-miel-mx-banner.jpeg' : undefined,
    loginSubtitle: isMM ? 'Accede a tu sistema POS de Moda Miel MX' : 'Accede a tu punto de venta',
    loadingTitle: isMM ? 'Moda Miel MX' : (customSettings?.businessName || 'Reisbloc Store'),
    receiptTagline: isMM ? MODA_MIEL_THEME.tagline : (customSettings?.tagline || DEFAULT_THEME.tagline),
    theme: isMM ? MODA_MIEL_THEME : DEFAULT_THEME
  }
}

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
  primaryColor: '#D4386C',       // Refined Rose Berry (Softer, elegant accent)
  primaryHoverColor: '#B52656',  
  secondaryColor: '#E8638B',     // Delicate Rose Accent
  accentColor: '#1A1A1A',        // Deep Charcoal Contrast Text & Badges
  bgCanvas: '#FFF8F9',           // Gentle Soft Canvas Background
  bgSurface: '#FFFFFF',          // Crisp White Cards
  textMain: '#1A1A1A',           // High Contrast Readable Dark Text
  textSecondary: '#6B7280',     // Soft Slate Text
  borderColor: '#FCEBF2',        // Subdued Soft Rose Border
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

/**
 * BRANDING dinámico: Usa getters para no quedar congelado estáticamente
 * en el primer render y reflejar si la página o el contexto actual es Moda Miel o Default.
 */
export const BRANDING = {
  get isModaMiel() {
    return checkIsModaMiel()
  },
  get appName() {
    return checkIsModaMiel() ? 'Moda Miel MX' : 'Reisbloc Store'
  },
  get whiteLabelName() {
    return checkIsModaMiel() ? 'Moda Miel MX' : 'Reisbloc'
  },
  get appWithBrand() {
    return checkIsModaMiel() ? 'Moda Miel MX' : 'Reisbloc Store'
  },
  get poweredBy() {
    return 'POWERED BY REISBLOC'
  },
  get poweredByUrl() {
    return 'Visítanos en: reisbloc.store'
  },
  get poweredByTagline() {
    return 'Integra el Poder de la IA en tu negocio'
  },
  get logoUrl() {
    return checkIsModaMiel() ? '/images/moda-miel-mx-logo.jpeg' : '/icon.svg'
  },
  get bannerUrl() {
    return checkIsModaMiel() ? '/images/moda-miel-mx-banner.jpeg' : undefined
  },
  get loginSubtitle() {
    return checkIsModaMiel() ? 'Accede a tu sistema POS de Moda Miel MX' : 'Accede a tu punto de venta'
  },
  get loadingTitle() {
    return checkIsModaMiel() ? 'Moda Miel MX' : 'Reisbloc Store'
  },
  get receiptTagline() {
    return checkIsModaMiel() ? MODA_MIEL_THEME.tagline : DEFAULT_THEME.tagline
  },
  get theme() {
    return checkIsModaMiel() ? MODA_MIEL_THEME : DEFAULT_THEME
  }
}


