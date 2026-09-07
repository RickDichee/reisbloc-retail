import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import {
  checkIsModaMiel,
  MODA_MIEL_THEME,
  DEFAULT_THEME,
  TenantThemeConfig
} from '@/config/branding'

export function useTenantTheme(): {
  isModaMiel: boolean
  theme: TenantThemeConfig
} {
  const location = useLocation()
  const { organizationSettings, currentUser } = useAppStore()
  const [activeTheme, setActiveTheme] = useState<TenantThemeConfig>(DEFAULT_THEME)
  const [isModaMielActive, setIsModaMielActive] = useState<boolean>(false)

  useEffect(() => {
    // 🛡️ REGLA DE SEGURIDAD MULTI-TENANT ROBUSTA:
    // Si el usuario está autenticado (currentUser), su tema se define ESTRICTAMENTE por su propia Organización.
    // Jamás imponer el tema de Moda Miel a un usuario de otra tienda (ej. Reisbloc Store) por el hostname.
    let isMM = false
    const userOrgSlug = organizationSettings?.slug || currentUser?.businessName || currentUser?.organizationId

    if (currentUser) {
      // Usuario autenticado -> Evaluar únicamente si la organización del usuario es Moda Miel
      isMM = checkIsModaMiel('', '', '', userOrgSlug)
    } else {
      // Visitante público no autenticado -> Evaluar por subdominio o parámetro
      isMM = checkIsModaMiel(
        window.location.hostname,
        location.search || window.location.search,
        location.hash || window.location.hash,
        userOrgSlug
      )
    }

    // 🎨 Soporte para temas personalizados definidos en organizationSettings.theme
    // Si la organización tiene colores / tipografías custom en BD, se aplican sobre el baseTheme.
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
      const customLogo = (organizationSettings as any)?.logo_url || currentUser?.avatar_url
      favicon.href = isMM ? '/images/moda-miel-mx-logo.jpeg' : (customLogo || '/icon.svg')
    }
  }, [location.search, location.hash, location.pathname, organizationSettings, currentUser])

  return {
    isModaMiel: isModaMielActive,
    theme: activeTheme
  }
}
