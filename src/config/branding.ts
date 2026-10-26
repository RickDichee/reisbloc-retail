export const checkIsModaMiel = (hostname?: string, search?: string, hash?: string, orgSlug?: string): boolean => {
  // 🛡️ AISLAMIENTO ESTRICTO: Si se provee orgSlug / orgId específico, evaluar ÚNICAMENTE la organización
  if (typeof orgSlug === 'string' && orgSlug.trim() !== '') {
    const slug = orgSlug.toLowerCase()
    return (
      slug === 'modamiel' ||
      slug === 'modamielmx' ||
      slug === 'moda-miel' ||
      slug === 'moda-miel-mx' ||
      slug === 'moda miel' ||
      slug === 'moda miel mx' ||
      slug.includes('modamiel') ||
      slug.includes('moda-miel') ||
      slug.includes('1b498fa6-aca5-428c-9bdd-01e6fea30316')
    )
  }

  // Si no hay organización (usuario público o en login), evaluar URL y variables de entorno
  const host = (hostname !== undefined ? hostname : (typeof window !== 'undefined' ? window.location.hostname : '')).toLowerCase()
  const query = (search !== undefined ? search : (typeof window !== 'undefined' ? window.location.search : '')).toLowerCase()
  const fragment = (hash !== undefined ? hash : (typeof window !== 'undefined' ? window.location.hash : '')).toLowerCase()

  const envBrand = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_APP_BRAND)
    ? String(import.meta.env.VITE_APP_BRAND).toLowerCase()
    : ''

  return (
    host.includes('modamiel') ||
    host.includes('moda-miel') ||
    query.includes('brand=modamiel') ||
    query.includes('brand=modamielmx') ||
    fragment.includes('brand=modamiel') ||
    fragment.includes('brand=modamielmx') ||
    envBrand.includes('modamiel')
  )
}

export const checkIsLosChunches = (hostname?: string, search?: string, hash?: string, orgSlug?: string): boolean => {
  if (typeof orgSlug === 'string' && orgSlug.trim() !== '') {
    const slug = orgSlug.toLowerCase()
    return (
      slug === 'los-chunches' ||
      slug === 'loschunches' ||
      slug === 'los chunches' ||
      slug === 'los chunches de cons' ||
      slug.includes('chunches') ||
      slug.includes('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d')
    )
  }

  const host = (hostname !== undefined ? hostname : (typeof window !== 'undefined' ? window.location.hostname : '')).toLowerCase()
  const query = (search !== undefined ? search : (typeof window !== 'undefined' ? window.location.search : '')).toLowerCase()
  const fragment = (hash !== undefined ? hash : (typeof window !== 'undefined' ? window.location.hash : '')).toLowerCase()

  const envBrand = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_APP_BRAND)
    ? String(import.meta.env.VITE_APP_BRAND).toLowerCase()
    : ''
  const envSlug = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_DEFAULT_ORG_SLUG)
    ? String(import.meta.env.VITE_DEFAULT_ORG_SLUG).toLowerCase()
    : ''

  return (
    host.includes('chunches') ||
    query.includes('brand=loschunches') ||
    query.includes('brand=chunches') ||
    query.includes('org=los-chunches') ||
    fragment.includes('brand=loschunches') ||
    envBrand.includes('chunches') ||
    envSlug.includes('chunches')
  )
}

export function getBranding(isMM: boolean = false, customSettings?: any, isLC: boolean = false) {
  const isChunches = isLC || checkIsLosChunches()
  const theme = isMM ? MODA_MIEL_THEME : (isChunches ? LOS_CHUNCHES_THEME : DEFAULT_THEME)
  const appName = isMM ? 'Moda Miel MX' : (isChunches ? 'Los Chunches de Cons' : (customSettings?.businessName || customSettings?.name || 'Reisbloc Store'))
  const whiteLabel = isMM ? 'Moda Miel MX' : (isChunches ? 'Los Chunches' : (customSettings?.businessName || 'Reisbloc'))

  return {
    isModaMiel: isMM,
    isLosChunches: isChunches,
    appName,
    whiteLabelName: whiteLabel,
    appWithBrand: isMM ? 'Moda Miel MX' : (isChunches ? 'Los Chunches de Cons' : (customSettings?.businessName || 'Reisbloc Store')),
    poweredBy: 'POWERED BY REISBLOC',
    poweredByUrl: 'Visítanos en: store.reisbloc.com',
    poweredByTagline: 'Integra el Poder de la IA en tu negocio',

    logoUrl: isMM ? '/images/moda-miel-mx-logo.jpeg' : (isChunches ? '/images/los_chunches.jpeg' : (customSettings?.logoUrl || '/images/logoNew.jpg')),
    bannerUrl: isMM ? '/images/moda-miel-mx-banner.jpeg' : undefined,
    loginSubtitle: isMM ? 'Accede a tu sistema POS de Moda Miel MX' : (isChunches ? 'Accede al POS de Los Chunches de Cons' : 'Accede a tu punto de venta'),
    loadingTitle: isMM ? 'Moda Miel MX' : (isChunches ? 'Los Chunches de Cons' : (customSettings?.businessName || 'Reisbloc Store')),
    receiptTagline: isMM ? MODA_MIEL_THEME.tagline : (isChunches ? LOS_CHUNCHES_THEME.tagline : (customSettings?.tagline || DEFAULT_THEME.tagline)),
    theme
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

export const LOS_CHUNCHES_THEME: TenantThemeConfig = {
  id: 'los-chunches',
  name: 'Los Chunches de Cons',
  primaryColor: '#9B4158',       // Elegant Warm Rosewood (gentle on eyes)
  primaryHoverColor: '#833246',  // Deep Rosewood Hover
  secondaryColor: '#D8A4B0',     // Gentle Rose Taupe
  accentColor: '#2D1B22',        // Deep Charcoal Contrast Text
  bgCanvas: '#FAF6F7',           // Calming, warm natural canvas
  bgSurface: '#FFFFFF',          // Clean White Cards
  textMain: '#1E293B',           // High Legibility Dark Slate
  textSecondary: '#64748B',     // Soft Slate Text
  borderColor: '#EDE6E8',        // Whispering Subtle Border
  fontSerif: "'Playfair Display', Georgia, serif",
  fontScript: "'Dancing Script', cursive",
  fontSans: "'Outfit', sans-serif",
  badgeText: 'LOS CHUNCHES DE CONS',
  tagline: 'Detalles y chunches con estilo',
  locationBadge: 'TIENDA OFICIAL',
  mascotEmoji: '🌸',
  mascotName: 'Chunches'
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
 * en el primer render y reflejar si la página o el contexto actual es Moda Miel, Los Chunches o Default.
 */
export const BRANDING = {
  get isModaMiel() {
    return checkIsModaMiel()
  },
  get isLosChunches() {
    return checkIsLosChunches()
  },
  get appName() {
    if (checkIsModaMiel()) return 'Moda Miel MX'
    if (checkIsLosChunches()) return 'Los Chunches de Cons'
    return 'Reisbloc Store'
  },
  get whiteLabelName() {
    if (checkIsModaMiel()) return 'Moda Miel MX'
    if (checkIsLosChunches()) return 'Los Chunches'
    return 'Reisbloc'
  },
  get appWithBrand() {
    if (checkIsModaMiel()) return 'Moda Miel MX'
    if (checkIsLosChunches()) return 'Los Chunches de Cons'
    return 'Reisbloc Store'
  },
  get poweredBy() {
    return 'POWERED BY REISBLOC'
  },
  get poweredByUrl() {
    return 'Visítanos en: store.reisbloc.com'
  },
  get poweredByTagline() {
    return 'Integra el Poder de la IA en tu negocio'
  },
  get logoUrl() {
    if (checkIsModaMiel()) return '/images/moda-miel-mx-logo.jpeg'
    if (checkIsLosChunches()) return '/images/los_chunches.jpeg'
    return '/images/logoNew.jpg'
  },
  get bannerUrl() {
    return checkIsModaMiel() ? '/images/moda-miel-mx-banner.jpeg' : undefined
  },
  get loginSubtitle() {
    if (checkIsModaMiel()) return 'Accede a tu sistema POS de Moda Miel MX'
    if (checkIsLosChunches()) return 'Accede al POS de Los Chunches de Cons'
    return 'Accede a tu punto de venta'
  },
  get loadingTitle() {
    if (checkIsModaMiel()) return 'Moda Miel MX'
    if (checkIsLosChunches()) return 'Los Chunches de Cons'
    return 'Reisbloc Store'
  },
  get receiptTagline() {
    if (checkIsModaMiel()) return MODA_MIEL_THEME.tagline
    if (checkIsLosChunches()) return LOS_CHUNCHES_THEME.tagline
    return DEFAULT_THEME.tagline
  },
  get theme() {
    if (checkIsModaMiel()) return MODA_MIEL_THEME
    if (checkIsLosChunches()) return LOS_CHUNCHES_THEME
    return DEFAULT_THEME
  }
}
