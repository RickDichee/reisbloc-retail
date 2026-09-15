/**
 * Reisbloc POS - Sistema POS Profesional
 * Copyright (C) 2026 Reisbloc Lab
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { createClient } from '@supabase/supabase-js'

// Fallback de seguridad para producción (Reisbloc PROD)
const FALLBACK_SUPABASE_URL = 'https://nmovxyaibnixvxtepbod.supabase.co'
const FALLBACK_SUPABASE_ANON_KEY = 'sb_publishable_99WitkcTh0U8rQ1qt3sgGQ_2uDwzz_D'

// Variables de entorno con fallback inmediato
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim()
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()

const validUrl = supabaseUrl || FALLBACK_SUPABASE_URL
const validKey = supabaseAnonKey || FALLBACK_SUPABASE_ANON_KEY

if (!validUrl || !validKey) {
  console.error('❌ CRÍTICO: No se encontraron credenciales de Supabase configuradas.')
}

// Cliente principal de Supabase
export const supabase = createClient(validUrl, validKey, {
  auth: {
    // IMPORTANTE: Usamos localStorage para Web (Vercel) en lugar de Capacitor Preferences
    storage: window.localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

/**
 * Helper para guardar el token manualmente si es necesario.
 * En web usamos localStorage estándar.
 */
export const setAuthToken = async (token: string) => {
  try {
    window.localStorage.setItem('sb-access-token', token)
    // Actualizamos la sesión de supabase para que las peticiones lleven el token y pasen RLS
    await supabase.auth.setSession({ access_token: token, refresh_token: token })
  } catch (error) {
    console.error('Error guardando token:', error)
  }
}

export const getAuthToken = async (): Promise<string | null> => {
  return window.localStorage.getItem('sb-access-token')
}

export const removeAuthToken = async () => {
  window.localStorage.removeItem('sb-access-token')
}

/**
 * HACK: Forzar el header de autorización cuando setSession falla
 * (necesario para usuarios virtuales que no existen en auth.users)
 */
export const forceAuthHeader = (token: string) => {
  if (!token) return
  // @ts-expect-error - Internal REST property access
  if (supabase.rest) supabase.rest.headers['Authorization'] = `Bearer ${token}`
  if (supabase.realtime) supabase.realtime.setAuth(token)
  // @ts-expect-error - Internal Storage property access
  if (supabase.storage) supabase.storage.headers['Authorization'] = `Bearer ${token}`
}

// Feature flags para Supabase (Requerido por databaseService)
export const SUPABASE_FEATURES = {
  DATABASE_ENABLED: true,
  AUTH_ENABLED: true,
  REALTIME_ENABLED: true,
  STORAGE_ENABLED: true,
  EDGE_FUNCTIONS_ENABLED: true
}
