import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import {
  checkIsModaMiel,
  MODA_MIEL_THEME,
  DEFAULT_THEME,
  TenantThemeConfig
} from '@/config/branding'

export function resetTenantTheme() {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const body = document.body
  root.classList.remove('theme-modamiel')
  body.classList.remove('theme-modamiel')

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

  document.title = DEFAULT_THEME.name
  const favicon = document.querySelector("link[rel*='icon']") as HTMLLinkElement
  if (favicon) {
    favicon.href = '/icon.svg'
  }
}

export function resolveIsModaMiel(
  currentUser?: any,
  organizationSettings?: any,
  location?: any
): boolean {
  // 1. Validar por ID de organización directo en currentUser o localStorage
  const userOrgId = (currentUser?.organizationId || '').trim().toLowerCase()
  if (userOrgId === '1b498fa6-aca5-428c-9bdd-01e6fea30316' || userOrgId.includes('1b498fa6-aca5-428c-9bdd-01e6fea30316')) {
    return true
  }

  if (typeof window !== 'undefined') {
    try {
      const storedOrg = (localStorage.getItem('current_org_id') || '').trim().toLowerCase()
      if (storedOrg === '1b498fa6-aca5-428c-9bdd-01e6fea30316' || storedOrg.includes('1b498fa6-aca5-428c-9bdd-01e6fea30316')) {
        return true
      }
      const rawToken = localStorage.getItem('reisbloc_auth_token')
      if (rawToken && rawToken.includes('1b498fa6-aca5-428c-9bdd-01e6fea30316')) {
        return true
      }
    } catch {}
  }

  // 2. Validar por ajustes de organización (slug, name, businessName)
  const orgSlug = (organizationSettings?.slug || '').toLowerCase()
  const orgName = (organizationSettings?.name || '').toLowerCase()
  const businessName = (organizationSettings?.businessName || '').toLowerCase()
  if (
    orgSlug.includes('modamiel') || orgSlug.includes('moda-miel') ||
    orgName.includes('modamiel') || orgName.includes('moda-miel') || orgName.includes('moda miel') ||
    businessName.includes('modamiel') || businessName.includes('moda-miel') || businessName.includes('moda miel')
  ) {
    return true
  }

  // 3. Validar por email de usuario (colaboradores de Moda Miel)
  const userEmail = (currentUser?.email || '').toLowerCase()
  if (userEmail.includes('modamiel') || userEmail.includes('lu.velazquez') || userEmail.includes('lu.velazquezz')) {
    return true
  }

  // 4. Validar por URL (hostname, query, hash, pathname)
  const hostname = typeof window !== 'undefined' ? window.location.hostname : ''
  const search = location?.search || (typeof window !== 'undefined' ? window.location.search : '')
  const hash = location?.hash || (typeof window !== 'undefined' ? window.location.hash : '')

  return checkIsModaMiel(hostname, search, hash, orgSlug || userOrgId)
}

export function useTenantTheme(): {
  isModaMiel: boolean
  theme: TenantThemeConfig
} {
  const location = useLocation()
  const { organizationSettings, currentUser } = useAppStore()

  // ⚡ Evaluación SÍNCRONA para el primer render (evita parpadeos o estados incorrectos en POS)
  const isMMSync = resolveIsModaMiel(currentUser, organizationSettings, location)
  const [activeTheme, setActiveTheme] = useState<TenantThemeConfig>(isMMSync ? MODA_MIEL_THEME : DEFAULT_THEME)
  const [isModaMielActive, setIsModaMielActive] = useState<boolean>(isMMSync)

  useEffect(() => {
    const isMM = resolveIsModaMiel(currentUser, organizationSettings, location)

    const baseTheme = isMM ? MODA_MIEL_THEME : DEFAULT_THEME
    const customTheme = (organizationSettings?.theme as Partial<TenantThemeConfig>) || {}
    const selectedTheme: TenantThemeConfig = {
      ...baseTheme,
      ...customTheme,
      id: isMM ? 'modamiel' : (organizationSettings?.slug || customTheme.id || baseTheme.id),
      name: organizationSettings?.businessName || customTheme.name || baseTheme.name
    }

    setActiveTheme(selectedTheme)
    setIsModaMielActive(isMM)

    // 1. Inyectar Google Fonts si aún no existen
    const fontLinkId = 'google-fonts-tenant-theme'
    if (!document.getElementById(fontLinkId)) {
      const link = document.createElement('link')
      link.id = fontLinkId
      link.rel = 'stylesheet'
      link.href =
        'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600;700&family=Outfit:wght@300;400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,600;0,700;0,900;1,700&family=Great+Vibes&display=swap'
      document.head.appendChild(link)
    }

    // 2. Inyectar variables CSS en el :root y body
    const root = document.documentElement
    const body = document.body
    if (isMM) {
      root.classList.add('theme-modamiel')
      body.classList.add('theme-modamiel')
    } else {
      root.classList.remove('theme-modamiel')
      body.classList.remove('theme-modamiel')
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

    // Favicon y Título dinámicos
    const appTitle = isMM ? 'Moda Miel MX' : (organizationSettings?.businessName || currentUser?.businessName || 'Reisbloc Store')
    document.title = appTitle
    const favicon = document.querySelector("link[rel*='icon']") as HTMLLinkElement
    if (favicon) {
      const customLogo = (organizationSettings as any)?.logo_url || (organizationSettings as any)?.logoUrl || currentUser?.avatar_url
      favicon.href = isMM ? '/images/moda-miel-mx-logo.jpeg' : (customLogo || '/icon.svg')
    }
  }, [location.search, location.hash, location.pathname, organizationSettings, currentUser])

  return {
    isModaMiel: isModaMielActive,
    theme: activeTheme
  }
}
