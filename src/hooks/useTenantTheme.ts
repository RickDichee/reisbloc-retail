import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import {
  checkIsModaMiel,
  checkIsLosChunches,
  checkIsJuguetes,
  MODA_MIEL_THEME,
  LOS_CHUNCHES_THEME,
  JUGUETES_THEME,
  DEFAULT_THEME,
  TenantThemeConfig
} from '@/config/branding'

export function resetTenantTheme() {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const body = document.body
  root.classList.remove('theme-modamiel')
  body.classList.remove('theme-modamiel')
  root.classList.remove('theme-chunches')
  body.classList.remove('theme-chunches')
  root.classList.remove('theme-juguetes')
  body.classList.remove('theme-juguetes')

  root.style.setProperty('--primary', DEFAULT_THEME.primaryColor)
  root.style.setProperty('--primary-hover', DEFAULT_THEME.primaryHoverColor)
  root.style.setProperty('--secondary', DEFAULT_THEME.secondaryColor)
  root.style.setProperty('--accent', DEFAULT_THEME.accentColor)
  root.style.setProperty('--bg-canvas', DEFAULT_THEME.bgCanvas)
  root.style.setProperty('--bg-surface', DEFAULT_THEME.bgSurface)
  root.style.setProperty('--text-main', DEFAULT_THEME.textMain)
  root.style.setProperty('--text-secondary', DEFAULT_THEME.textSecondary)
  root.style.setProperty('--border-light', DEFAULT_THEME.borderColor)
  root.style.setProperty('--font-serif', DEFAULT_THEME.fontSerif)
  root.style.setProperty('--font-script', DEFAULT_THEME.fontScript)
  root.style.setProperty('--font-sans', DEFAULT_THEME.fontSans)
  root.style.setProperty('--on-primary-soft', DEFAULT_THEME.onPrimarySoft)
  root.style.setProperty('--login-primary', DEFAULT_THEME.loginAccent || DEFAULT_THEME.primaryColor)
  root.style.setProperty('--login-primary-hover', DEFAULT_THEME.loginAccentHover || DEFAULT_THEME.primaryHoverColor)

  document.title = DEFAULT_THEME.name
  const favicon = document.querySelector("link[rel*='icon']") as HTMLLinkElement
  if (favicon) {
    favicon.href = '/icon.svg'
  }
}

export function useTenantTheme(): {
  isModaMiel: boolean
  isLosChunches: boolean
  isJuguetes: boolean
  theme: TenantThemeConfig
} {
  const location = useLocation()
  const { organizationSettings, currentUser } = useAppStore()
  const [activeTheme, setActiveTheme] = useState<TenantThemeConfig>(DEFAULT_THEME)
  const [isModaMielActive, setIsModaMielActive] = useState<boolean>(false)
  const [isLosChunchesActive, setIsLosChunchesActive] = useState<boolean>(false)
  const [isJuguetesActive, setIsJuguetesActive] = useState<boolean>(false)

  useEffect(() => {
    // 🛡️ REGLA DE SEGURIDAD MULTI-TENANT ESTRICTA:
    // Si el usuario está autenticado (currentUser), su tema se define ESTRICTAMENTE por su propia Organización.
    let isMM = false
    let isLC = false
    let isJG = false

    // Validar que organizationSettings coincida exactamente con currentUser.organizationId para evitar settings residuales
    const isSettingsMatchingUser = Boolean(
      currentUser &&
      organizationSettings &&
      (!organizationSettings.id || organizationSettings.id === currentUser.organizationId)
    )
    const validSettings = isSettingsMatchingUser ? organizationSettings : (currentUser ? null : organizationSettings)

    // En ambiente local (localhost / 127.0.0.1) permitir preview de cualquier marca vía ?brand= sin necesidad de desloguearse
    const currentQuery = location.search || (typeof window !== 'undefined' ? window.location.search : '')
    const searchParams = new URLSearchParams(currentQuery)
    const brandQueryParam = searchParams.get('brand') || searchParams.get('preview')
    const isDevHost = typeof window !== 'undefined' && (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.includes('192.168.')
    )

    if (currentUser && !(isDevHost && brandQueryParam)) {
      // Usuario autenticado -> Evaluar única y estrictamente los datos de la organización del usuario
      const userOrgId = currentUser.organizationId || ''
      const userOrgSlug = validSettings?.slug || validSettings?.name || ''
      isMM = (userOrgId === '1b498fa6-aca5-428c-9bdd-01e6fea30316') ||
             checkIsModaMiel('', '', '', userOrgSlug || userOrgId)
      isLC = (userOrgId === 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d') ||
             checkIsLosChunches('', '', '', userOrgSlug || userOrgId)
      isJG = (userOrgId === '324fd41f-b8af-4aef-9ea6-2f954350775a') ||
             checkIsJuguetes('', '', '', userOrgSlug || userOrgId)
    } else {
      // Visitante público o desarrollador en localhost con ?brand= -> Evaluar por hostname / query string
      isMM = checkIsModaMiel(
        window.location.hostname,
        currentQuery,
        location.hash || (typeof window !== 'undefined' ? window.location.hash : '')
      )
      isLC = checkIsLosChunches(
        window.location.hostname,
        currentQuery,
        location.hash || (typeof window !== 'undefined' ? window.location.hash : '')
      )
      isJG = checkIsJuguetes(
        window.location.hostname,
        currentQuery,
        location.hash || (typeof window !== 'undefined' ? window.location.hash : '')
      )
    }

    // 🎨 Soporte para temas personalizados definidos en validSettings.theme
    const baseTheme = isMM ? MODA_MIEL_THEME : isJG ? JUGUETES_THEME : (isLC ? LOS_CHUNCHES_THEME : DEFAULT_THEME)
    const customTheme = (validSettings?.theme as Partial<TenantThemeConfig>) || {}
    const selectedTheme: TenantThemeConfig = {
      ...baseTheme,
      ...customTheme,
      id: isMM ? 'modamiel' : isJG ? 'juguetes' : (isLC ? 'los-chunches' : (validSettings?.slug || customTheme.id || baseTheme.id)),
      name: validSettings?.businessName || customTheme.name || baseTheme.name
    }

    setActiveTheme(selectedTheme)
    setIsModaMielActive(isMM)
    setIsLosChunchesActive(isLC)
    setIsJuguetesActive(isJG)

    // 1. Inyectar Google Fonts si aún no existen
    const fontLinkId = 'google-fonts-tenant-theme'
    if (!document.getElementById(fontLinkId)) {
      const link = document.createElement('link')
      link.id = fontLinkId
      link.rel = 'stylesheet'
      link.href =
        'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600;700&family=Outfit:wght@300;400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,600;0,700;0,900;1,700&family=Fredoka+One&family=Lilita+One&family=Pacifico&family=Luckiest+Guy&family=Boogaloo&family=Great+Vibes&display=swap'
      document.head.appendChild(link)
    }

    // 2. Inyectar variables CSS en el :root y body
    const root = document.documentElement
    const body = document.body

    // Limpiar todas las clases de tema primero
    root.classList.remove('theme-modamiel', 'theme-chunches', 'theme-juguetes')
    body.classList.remove('theme-modamiel', 'theme-chunches', 'theme-juguetes')

    if (isMM) {
      root.classList.add('theme-modamiel')
      body.classList.add('theme-modamiel')
    } else if (isJG) {
      root.classList.add('theme-juguetes')
      body.classList.add('theme-juguetes')
    } else if (isLC) {
      root.classList.add('theme-chunches')
      body.classList.add('theme-chunches')
    }

    root.style.setProperty('--primary', selectedTheme.primaryColor)
    root.style.setProperty('--primary-hover', selectedTheme.primaryHoverColor)
    root.style.setProperty('--secondary', selectedTheme.secondaryColor)
    root.style.setProperty('--accent', selectedTheme.accentColor)
    root.style.setProperty('--bg-canvas', selectedTheme.bgCanvas)
    root.style.setProperty('--bg-surface', selectedTheme.bgSurface)
    root.style.setProperty('--text-main', selectedTheme.textMain)
    root.style.setProperty('--text-secondary', selectedTheme.textSecondary)
    root.style.setProperty('--border-light', selectedTheme.borderColor)
    root.style.setProperty('--font-serif', selectedTheme.fontSerif)
    root.style.setProperty('--font-script', selectedTheme.fontScript)
    root.style.setProperty('--font-sans', selectedTheme.fontSans)
    root.style.setProperty('--on-primary-soft', selectedTheme.onPrimarySoft)
    root.style.setProperty('--login-primary', selectedTheme.loginAccent || selectedTheme.primaryColor)
    root.style.setProperty('--login-primary-hover', selectedTheme.loginAccentHover || selectedTheme.primaryHoverColor)

    // Favicon, Open Graph y Título dinámicos
    const appTitle = isMM
      ? 'Moda Miel MX'
      : isJG
      ? 'Juguetes y Novedades San Judas Tadeo'
      : isLC
      ? 'Los Chunches de Cons'
      : (validSettings?.businessName || currentUser?.businessName || 'Reisbloc Store')
    document.title = appTitle

    const ogImage = isMM
      ? `${window.location.origin}/images/moda-miel-mx-logo.jpeg`
      : isJG
      ? `${window.location.origin}/images/juguetes-san-judas-logo.jpeg`
      : isLC
      ? `${window.location.origin}/images/los_chunches.jpeg`
      : `${window.location.origin}/images/logoNew.jpg`

    const setMetaTag = (selector: string, content: string) => {
      const el = document.querySelector(selector) as HTMLMetaElement | null
      if (el) el.content = content
    }
    setMetaTag("meta[property='og:title']", appTitle)
    setMetaTag("meta[property='og:description']", selectedTheme.tagline)
    setMetaTag("meta[property='og:image']", ogImage)
    setMetaTag("meta[name='description']", `${appTitle} · ${selectedTheme.tagline}`)

    const favicon = document.querySelector("link[rel*='icon']") as HTMLLinkElement
    if (favicon) {
      const customLogo = (validSettings as any)?.logo_url || (validSettings as any)?.logoUrl || currentUser?.avatar_url
      favicon.href = isMM
        ? '/images/moda-miel-mx-logo.jpeg'
        : isJG
        ? '/images/juguetes-san-judas-logo.jpeg'
        : isLC
        ? '/images/los_chunches.jpeg'
        : (customLogo || '/icon.svg')
    }
  }, [location.search, location.hash, location.pathname, organizationSettings, currentUser])

  return {
    isModaMiel: isModaMielActive,
    isLosChunches: isLosChunchesActive,
    isJuguetes: isJuguetesActive,
    theme: activeTheme
  }
}
