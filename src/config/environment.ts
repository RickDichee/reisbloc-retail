// src/config/environment.ts

export const ENV = {
  name: import.meta.env.VITE_ENVIRONMENT || 'development',
  isDevelopment: import.meta.env.VITE_ENVIRONMENT === 'development',
  isStaging: import.meta.env.VITE_ENVIRONMENT === 'staging',
  isProduction: import.meta.env.VITE_ENVIRONMENT === 'production',
  
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  },
  
  features: {
    skipMacValidation: import.meta.env.VITE_SKIP_MAC_VALIDATION === 'true',
    enableDebug: import.meta.env.VITE_ENABLE_DEBUG === 'true',
  },
  
  defaultOrgId: import.meta.env.VITE_ORG_ID, // Solo en dev/staging
};

// Helper para logs
export function devLog(...args: any[]) {
  if (ENV.features.enableDebug) {
    console.log('[DEV]', ...args);
  }
}