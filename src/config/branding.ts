const isModaMiel = typeof window !== 'undefined' && 
  (window.location.hostname.includes('modamiel') || 
   window.location.hostname.includes('moda-miel') || 
   window.location.search.includes('brand=modamiel') ||
   window.location.hash.includes('brand=modamiel'))

export const BRANDING = {
  appName: isModaMiel ? 'Moda Miel MX' : 'Reisbloc Store',
  whiteLabelName: isModaMiel ? 'Moda Miel MX' : 'Reisbloc',
  appWithBrand: isModaMiel ? 'Moda Miel MX' : 'Reisbloc Store',
  poweredBy: 'Powered by REISBLOC',
  poweredByUrl: 'reisbloc.com',
  logoUrl: isModaMiel ? '/images/moda-miel-mx-logo.jpeg' : '/icon.svg',
  bannerUrl: isModaMiel ? '/images/moda-miel-mx-banner.jpeg' : undefined,
  loginSubtitle: isModaMiel ? 'Accede a tu sistema POS de Moda Miel MX' : 'Accede a tu punto de venta',
  loadingTitle: isModaMiel ? 'Moda Miel MX' : 'Reisbloc Store',
  receiptTagline: isModaMiel ? 'Moda y estilo para tu negocio' : 'Tu negocio, sin límites',
} as const
