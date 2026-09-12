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

export function useTenantTheme(): {
  isModaMiel: boolean
  theme: TenantThemeConfig
} {
  const location = useLocation()
  const { organizationSettings, currentUser } = useAppStore()
  const [activeTheme, setActiveTheme] = useState<TenantThemeConfig>(DEFAULT_THEME)
  const [isModaMielActive, setIsModaMielActive] = useState<boolean>(false)

  useEffect(() => {
    // 🛡️ REGLA DE SEGURIDAD MULTI-TENANT ESTRICTA:
    // Si el usuario está autenticado (currentUser), su tema se define ESTRICTAMENTE por su propia Organización.
    // Jamás imponer el tema de Moda Miel a un usuario de otra tienda.
    let isMM = false

    // Validar que organizationSettings coincida exactamente con currentUser.organizationId para evitar settings residuales
    const isSettingsMatchingUser = Boolean(
      currentUser &&
      organizationSettings &&
      (!organizationSettings.id || organizationSettings.id === currentUser.organizationId)
    )
    const validSettings = isSettingsMatchingUser ? organizationSettings : (currentUser ? null : organizationSettings)

    if (currentUser) {
      // Usuario autenticado -> Evaluar única y estrictamente los datos de la organización del usuario
      const userOrgId = currentUser.organizationId || ''
      const userOrgSlug = validSettings?.slug || validSettings?.name || ''
      isMM = (userOrgId === '1b498fa6-aca5-428c-9bdd-01e6fea30316') ||
             checkIsModaMiel('', '', '', userOrgSlug || userOrgId)
    } else {
      // Visitante público no autenticado -> Evaluar exclusivamente por hostname / query string
      isMM = checkIsModaMiel(
        window.location.hostname,
        location.search || window.location.search,
        location.hash || window.location.hash
      )
    }

    // 🎨 Soporte para temas personalizados definidos en validSettings.theme
    // Si la organización tiene colores / tipografías custom en BD, se aplican sobre el baseTheme.
    const baseTheme = isMM ? MODA_MIEL_THEME : DEFAULT_THEME
    const customTheme = (validSettings?.theme as Partial<TenantThemeConfig>) || {}
    const selectedTheme: TenantThemeConfig = {
      ...baseTheme,
      ...customTheme,
      id: isMM ? 'modamiel' : (validSettings?.slug || customTheme.id || baseTheme.id),
      name: validSettings?.businessName || customTheme.name || baseTheme.name
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
    const appTitle = isMM ? 'Moda Miel MX' : (validSettings?.businessName || currentUser?.businessName || 'Reisbloc Store')
    document.title = appTitle
    const favicon = document.querySelector("link[rel*='icon']") as HTMLLinkElement
    if (favicon) {
      const customLogo = (validSettings as any)?.logo_url || (validSettings as any)?.logoUrl || currentUser?.avatar_url
      favicon.href = isMM ? '/images/moda-miel-mx-logo.jpeg' : (customLogo || '/icon.svg')
    }
  }, [location.search, location.hash, location.pathname, organizationSettings, currentUser])

  return {
    isModaMiel: isModaMielActive,
    theme: activeTheme
  }
}
