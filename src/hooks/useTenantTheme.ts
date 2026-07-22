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
    const orgSlug = organizationSettings?.slug || currentUser?.organizationId
    const isMM = checkIsModaMiel(
      window.location.hostname,
      location.search || window.location.search,
      location.hash || window.location.hash,
      orgSlug
    )

    const selectedTheme = isMM ? MODA_MIEL_THEME : DEFAULT_THEME
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

    // 2. Inyectar variables CSS en el :root
    const root = document.documentElement
    if (isMM) {
      root.classList.add('theme-modamiel')
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
      
      // Favicon y Título
      document.title = selectedTheme.name
      const favicon = document.querySelector("link[rel*='icon']") as HTMLLinkElement
      if (favicon) {
        favicon.href = '/images/moda-miel-mx-logo.jpeg'
      }
    } else {
      root.classList.remove('theme-modamiel')
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
    }
  }, [location.search, location.hash, location.pathname, organizationSettings, currentUser])

  return {
    isModaMiel: isModaMielActive,
    theme: activeTheme
  }
}
