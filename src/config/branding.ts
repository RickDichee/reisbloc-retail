// =============================================================================
// branding.ts - Detección de tenants y configuración de marca
// Multi-tenant: ModaMiel · Los Chunches de Cons · Juguetes San Judas Tadeo
// REGLA: No hardcodear estilos por cliente fuera de este archivo y useTenantTheme.ts
// =============================================================================

// ---------------------------------------------------------------------------
// HELPER INTERNO: Obtiene el identificador de organización del usuario activo
// ---------------------------------------------------------------------------
function getActiveSessionOrgHint(): string {
  if (typeof window === 'undefined') return ''
  try {
    const raw = window.localStorage?.getItem('app-store')
    if (raw) {
      const parsed = JSON.parse(raw)
      const state = parsed?.state
      if (state?.isAuthenticated && state?.currentUser?.organizationId) {
        return String(state.currentUser.organizationId).toLowerCase()
      }
      if (state?.organizationSettings?.slug || state?.organizationSettings?.id) {
        return `${state.organizationSettings.id || ''} ${state.organizationSettings.slug || ''}`.toLowerCase()
      }
    }
  } catch {
    // ignore storage parse error
  }
  const path = (window.location?.pathname || '').toLowerCase()
  if (path.startsWith('/sanjudastadeo') || path.startsWith('/juguetes')) return 'sanjudastadeo'
  if (path.startsWith('/loschunches')) return 'los-chunches'
  if (path.startsWith('/modamiel')) return 'modamiel'
  return ''
}

// ---------------------------------------------------------------------------
// DETECCIÓN: Moda Miel MX
// ---------------------------------------------------------------------------
export const checkIsModaMiel = (hostname?: string, search?: string, hash?: string, orgSlug?: string): boolean => {
  const effectiveOrg = (typeof orgSlug === 'string' && orgSlug.trim() !== '')
    ? orgSlug
    : (hostname === undefined && search === undefined && hash === undefined ? getActiveSessionOrgHint() : '')

  // 🛡️ AISLAMIENTO ESTRICTO: Si se provee orgSlug / orgId específico o hay sesión activa, evaluar ÚNICAMENTE la organización
  if (effectiveOrg) {
    const slug = effectiveOrg.toLowerCase()
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

// ---------------------------------------------------------------------------
// DETECCIÓN: Los Chunches de Cons
// ---------------------------------------------------------------------------
export const checkIsLosChunches = (hostname?: string, search?: string, hash?: string, orgSlug?: string): boolean => {
  const effectiveOrg = (typeof orgSlug === 'string' && orgSlug.trim() !== '')
    ? orgSlug
    : (hostname === undefined && search === undefined && hash === undefined ? getActiveSessionOrgHint() : '')

  if (effectiveOrg) {
    const slug = effectiveOrg.toLowerCase()
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

// ---------------------------------------------------------------------------
// DETECCIÓN: Juguetes y Novedades San Judas Tadeo
// ---------------------------------------------------------------------------
export const checkIsJuguetes = (hostname?: string, search?: string, hash?: string, orgSlug?: string): boolean => {
  const effectiveOrg = (typeof orgSlug === 'string' && orgSlug.trim() !== '')
    ? orgSlug
    : (hostname === undefined && search === undefined && hash === undefined ? getActiveSessionOrgHint() : '')

  if (effectiveOrg) {
    const slug = effectiveOrg.toLowerCase()
    return (
      slug === 'sanjudastadeo' ||
      slug === 'juguetes' ||
      slug === 'juguetessanjudas' ||
      slug === '324fd41f-b8af-4aef-9ea6-2f954350775a' ||
      slug.includes('sanjudas') ||
      slug.includes('judastadeo') ||
      slug.includes('juguetes')
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
    host.includes('sanjudastadeo') ||
    host.includes('juguetessanjudas') ||
    query.includes('brand=juguetes') ||
    query.includes('brand=sanjudastadeo') ||
    fragment.includes('brand=juguetes') ||
    fragment.includes('brand=sanjudastadeo') ||
    envBrand.includes('juguetes') ||
    envBrand.includes('sanjudas') ||
    envSlug.includes('juguetes') ||
    envSlug.includes('sanjudas')
  )
}

// ---------------------------------------------------------------------------
// INTERFACE DE TEMA
// ---------------------------------------------------------------------------
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
  // Color suave legible sobre fondos del color primario (nav, chips)
  onPrimarySoft: string
  // Fondo opcional para la pantalla de carga (solo tenants con diseño festivo)
  loadingBg?: string
  // Color del CTA principal del login (por si el primario no contrasta con el fondo)
  loginAccent?: string
  loginAccentHover?: string
  locationBadge?: string
  mascotEmoji?: string
  mascotName?: string
  subdomain?: string
  receiptWhatsappPlaceholder?: string
  receiptNoReturnsPolicy?: string
  ticketLogoUrl?: string
}

// ---------------------------------------------------------------------------
// TEMAS POR TENANT
// ---------------------------------------------------------------------------

export const MODA_MIEL_THEME: TenantThemeConfig = {
  id: 'modamiel',
  name: 'Moda Miel MX',
  primaryColor: '#D4386C',       // Refined Rose Berry
  primaryHoverColor: '#B52656',
  secondaryColor: '#E8638B',     // Delicate Rose Accent
  accentColor: '#1A1A1A',        // Deep Charcoal
  bgCanvas: '#FFF8F9',           // Gentle Soft Canvas
  bgSurface: '#FFFFFF',
  textMain: '#1A1A1A',
  textSecondary: '#6B7280',
  borderColor: '#FCEBF2',        // Soft Rose Border
  fontSerif: "'Playfair Display', Georgia, serif",
  fontScript: "'Dancing Script', cursive",
  fontSans: "'Outfit', sans-serif",
  badgeText: 'TODO POR PAQUETE',
  onPrimarySoft: '#FFD6E8',
  loginAccent: '#EC4899',
  loginAccentHover: '#F472B6',
  tagline: 'Moda y estilo para tu negocio',
  locationBadge: 'PASILLO 3 · LOCAL 230',
  mascotEmoji: '🐞',
  mascotName: 'Catarina',
  subdomain: 'modamielmx.reisbloc.com',
  receiptWhatsappPlaceholder: '+52 445 145 7252',
  receiptNoReturnsPolicy: 'NO HAY CAMBIOS NI DEVOLUCIONES UNA VEZ SALIDA LA MERCANCÍA',
  ticketLogoUrl: '/images/moda-miel-mx-logo.jpeg'
}

export const LOS_CHUNCHES_THEME: TenantThemeConfig = {
  id: 'los-chunches',
  name: 'Los Chunches de Cons',
  // Paleta oficial: Pantone 213C (Hot Pink) como primario
  primaryColor: '#C83E74',       // Soft Berry Rose (Pantone 213C suavizado)
  primaryHoverColor: '#AD2E60',  // Deep Berry Rose Hover
  secondaryColor: '#2B4882',     // Azul marino suavizado (Pantone 294C)
  accentColor: '#D49B2A',        // Dorado cálido suave (Pantone 108C)
  bgCanvas: '#FDF8FA',           // Lienzo rosado cálido ultra sutil
  bgSurface: '#FFFFFF',
  textMain: '#1A1A1A',
  textSecondary: '#6B7280',
  borderColor: '#F3DFEA',        // Borde rosa empolvado sutil
  fontSerif: "'Luckiest Guy', 'Boogaloo', 'Playfair Display', Georgia, serif",
  fontScript: "'Pacifico', 'Dancing Script', cursive",
  fontSans: "'Outfit', sans-serif",
  badgeText: 'LOS CHUNCHES DE CONS',
  onPrimarySoft: '#FFD0EA',
  loginAccent: '#C83E74',
  loginAccentHover: '#AD2E60',
  tagline: 'Mercancía Americana e Importada',
  locationBadge: 'TARGET · CVS · JCP',
  mascotEmoji: '🎀',
  mascotName: 'Chunches',
  subdomain: 'loschunchesdecons.reisbloc.com',
  receiptWhatsappPlaceholder: '(443) 124-4490',
  receiptNoReturnsPolicy: 'MERCANCÍA DE SALDO / IMPORTACIÓN: NO HAY CAMBIOS NI DEVOLUCIONES UNA VEZ SALIDA LA MERCANCÍA',
  ticketLogoUrl: '/images/los_chunches.jpeg'
}

export const JUGUETES_THEME: TenantThemeConfig = {
  id: 'juguetes',
  name: 'Juguetes y Novedades San Judas Tadeo',
  // Paleta oficial extraída del brand identity sheet
  primaryColor: '#C8323E',       // Rojo Carmesí Suavizado (Pantone 186C suavizado)
  primaryHoverColor: '#A92430',  // Carmesí profundo hover
  secondaryColor: '#1E7E48',     // Verde Pino San Judas Suavizado (Pantone 347C)
  accentColor: '#1E88C8',        // Azul Juguete Suavizado (Pantone 871C)
  bgCanvas: '#FAF7F5',           // Crema cálido suave y descansado
  bgSurface: '#FFFFFF',
  textMain: '#1A1A1A',
  textSecondary: '#4A4A4A',
  borderColor: '#EFE4E2',        // Borde cálido suave
  fontSerif: "'Fredoka One', 'Lilita One', Georgia, serif",
  fontScript: "'Dancing Script', cursive",
  fontSans: "'Outfit', sans-serif",
  badgeText: 'JUGUETES Y NOVEDADES',
  onPrimarySoft: '#FFEB99',
  loadingBg: 'linear-gradient(135deg, #9E2430 0%, #B82D3B 50%, #7A1822 100%)',
  loginAccent: '#1E7E48',
  loginAccentHover: '#166338',
  tagline: '¡El juguete de tus sueños te espera!',
  locationBadge: 'SAN JUDAS TADEO',
  mascotEmoji: '🧸',
  mascotName: 'San Judas',
  subdomain: 'sanjudastadeo.reisbloc.com',
  receiptWhatsappPlaceholder: '(442) 600-3500',
  receiptNoReturnsPolicy: 'NO HAY CAMBIOS NI DEVOLUCIONES UNA VEZ SALIDA LA MERCANCÍA · REVISE SU JUGUETE ANTES DE RETIRARSE',
  ticketLogoUrl: '/images/sanjudas-ticket-logo.png'
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
  onPrimarySoft: '#FBBF24',
  loginAccent: '#F59E0B',
  loginAccentHover: '#FBBF24',
  tagline: 'Tu negocio, sin límites',
  subdomain: 'store.reisbloc.com',
  receiptWhatsappPlaceholder: 'Por configurar',
  receiptNoReturnsPolicy: 'NO HAY CAMBIOS NI DEVOLUCIONES UNA VEZ SALIDA LA MERCANCÍA',
  ticketLogoUrl: '/images/logoNew.jpg'
}

// ---------------------------------------------------------------------------
// getBranding() - helper para componentes que reciben flags como props
// ---------------------------------------------------------------------------
export function getBranding(isMM: boolean = false, customSettings?: any, isLC: boolean = false, isJG: boolean = false) {
  const isJuguetes = isJG || checkIsJuguetes()
  const isChunches = isLC || checkIsLosChunches()

  const theme = isMM
    ? MODA_MIEL_THEME
    : isJuguetes
    ? JUGUETES_THEME
    : isChunches
    ? LOS_CHUNCHES_THEME
    : DEFAULT_THEME

  const appName = isMM
    ? 'Moda Miel MX'
    : isJuguetes
    ? 'Juguetes y Novedades San Judas Tadeo'
    : isChunches
    ? 'Los Chunches de Cons'
    : (customSettings?.businessName || customSettings?.name || 'Reisbloc Store')

  const whiteLabel = isMM
    ? 'Moda Miel MX'
    : isJuguetes
    ? 'Juguetes San Judas'
    : isChunches
    ? 'Los Chunches'
    : (customSettings?.businessName || 'Reisbloc')

  return {
    isModaMiel: isMM,
    isLosChunches: isChunches,
    isJuguetes,
    appName,
    whiteLabelName: whiteLabel,
    appWithBrand: isMM
      ? 'Moda Miel MX'
      : isJuguetes
      ? 'Juguetes y Novedades San Judas Tadeo'
      : isChunches
      ? 'Los Chunches de Cons'
      : (customSettings?.businessName || 'Reisbloc Store'),
    poweredBy: 'POWERED BY REISBLOC',
    poweredByUrl: 'Visítanos en: store.reisbloc.com',
    poweredByTagline: 'Integra el Poder de la IA en tu negocio',
    logoUrl: isMM
      ? '/images/moda-miel-mx-logo.jpeg'
      : isJuguetes
      ? '/images/juguetes-san-judas-logo.jpeg'
      : isChunches
      ? '/images/los_chunches.jpeg'
      : (customSettings?.logoUrl || '/images/logoNew.jpg'),
    ticketLogoUrl: isMM
      ? '/images/moda-miel-mx-logo.jpeg'
      : isJuguetes
      ? '/images/sanjudas-ticket-logo.png'
      : isChunches
      ? '/images/los_chunches.jpeg'
      : (customSettings?.ticketLogoUrl || customSettings?.logoUrl || '/images/logoNew.jpg'),
    bannerUrl: isMM
      ? '/images/moda-miel-mx-banner.jpeg'
      : isJuguetes
      ? '/images/juguetes-banner-rojo.jpeg'
      : undefined,
    loginSubtitle: isMM
      ? 'Accede a tu sistema POS de Moda Miel MX'
      : isJuguetes
      ? '¡Bienvenido al POS de Juguetes San Judas Tadeo!'
      : isChunches
      ? 'Accede al POS de Los Chunches de Cons'
      : 'Accede a tu punto de venta',
    loadingTitle: isMM
      ? 'Moda Miel MX'
      : isJuguetes
      ? 'Juguetes San Judas Tadeo'
      : isChunches
      ? 'Los Chunches de Cons'
      : (customSettings?.businessName || 'Reisbloc Store'),
    receiptTagline: isMM
      ? MODA_MIEL_THEME.tagline
      : isJuguetes
      ? JUGUETES_THEME.tagline
      : isChunches
      ? LOS_CHUNCHES_THEME.tagline
      : (customSettings?.tagline || DEFAULT_THEME.tagline),
    theme
  }
}

// ---------------------------------------------------------------------------
// BRANDING - objeto reactivo con getters dinámicos
// ---------------------------------------------------------------------------
/**
 * BRANDING dinámico: Usa getters para no quedar congelado estáticamente
 * en el primer render y reflejar si la página o el contexto actual es
 * Moda Miel, Los Chunches, Juguetes San Judas o Default.
 */
export const BRANDING = {
  get isModaMiel() {
    return checkIsModaMiel()
  },
  get isLosChunches() {
    return checkIsLosChunches()
  },
  get isJuguetes() {
    return checkIsJuguetes()
  },
  get appName() {
    if (checkIsModaMiel()) return 'Moda Miel MX'
    if (checkIsJuguetes()) return 'Juguetes y Novedades San Judas Tadeo'
    if (checkIsLosChunches()) return 'Los Chunches de Cons'
    return 'Reisbloc Store'
  },
  get whiteLabelName() {
    if (checkIsModaMiel()) return 'Moda Miel MX'
    if (checkIsJuguetes()) return 'Juguetes San Judas'
    if (checkIsLosChunches()) return 'Los Chunches'
    return 'Reisbloc'
  },
  get appWithBrand() {
    if (checkIsModaMiel()) return 'Moda Miel MX'
    if (checkIsJuguetes()) return 'Juguetes y Novedades San Judas Tadeo'
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
    if (checkIsJuguetes()) return '/images/juguetes-san-judas-logo.jpeg'
    if (checkIsLosChunches()) return '/images/los_chunches.jpeg'
    return '/images/logoNew.jpg'
  },
  get ticketLogoUrl() {
    if (checkIsModaMiel()) return '/images/moda-miel-mx-logo.jpeg'
    if (checkIsJuguetes()) return '/images/sanjudas-ticket-logo.png'
    if (checkIsLosChunches()) return '/images/los_chunches.jpeg'
    return '/images/logoNew.jpg'
  },
  get bannerUrl() {
    if (checkIsModaMiel()) return '/images/moda-miel-mx-banner.jpeg'
    if (checkIsJuguetes()) return '/images/juguetes-banner-rojo.jpeg'
    return undefined
  },
  get loginSubtitle() {
    if (checkIsModaMiel()) return 'Accede a tu sistema POS de Moda Miel MX'
    if (checkIsJuguetes()) return '¡Bienvenido al POS de Juguetes San Judas Tadeo!'
    if (checkIsLosChunches()) return 'Accede al POS de Los Chunches de Cons'
    return 'Accede a tu punto de venta'
  },
  get loadingTitle() {
    if (checkIsModaMiel()) return 'Moda Miel MX'
    if (checkIsJuguetes()) return 'Juguetes San Judas Tadeo'
    if (checkIsLosChunches()) return 'Los Chunches de Cons'
    return 'Reisbloc Store'
  },
  get receiptTagline() {
    if (checkIsModaMiel()) return MODA_MIEL_THEME.tagline
    if (checkIsJuguetes()) return JUGUETES_THEME.tagline
    if (checkIsLosChunches()) return LOS_CHUNCHES_THEME.tagline
    return DEFAULT_THEME.tagline
  },
  get theme() {
    if (checkIsModaMiel()) return MODA_MIEL_THEME
    if (checkIsJuguetes()) return JUGUETES_THEME
    if (checkIsLosChunches()) return LOS_CHUNCHES_THEME
    return DEFAULT_THEME
  }
}
