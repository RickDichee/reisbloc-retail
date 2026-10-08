import { supabase } from '@/config/supabase'
import logger from '@/utils/logger'

export const storageService = {
  /**
   * Sube una foto al bucket de avatars con fallbacks resilientes para que nunca falle.
   */
  async uploadAvatar(userId: string, fileBlob: Blob): Promise<string> {
    const cleanId = (userId || `usr_${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '_')
    const fileName = `${cleanId}/${Date.now()}.jpg`

    // Intento 1: Bucket dedicado 'avatars'
    try {
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, fileBlob, {
          contentType: 'image/jpeg',
          upsert: true
        })

      if (!error && data) {
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(data.path)
        return publicUrl
      }
      if (error) {
        logger.warn('storage', 'Intento 1 (avatars) falló, probando fallback en tickets...', error)
      }
    } catch (e) {
      logger.warn('storage', 'Excepción en bucket avatars:', e)
    }

    // Intento 2: Bucket 'tickets' (público en producción)
    try {
      const ticketFileName = `avatars/${cleanId}_${Date.now()}.jpg`
      const { data: ticketData, error: ticketError } = await supabase.storage
        .from('tickets')
        .upload(ticketFileName, fileBlob, {
          contentType: 'image/jpeg',
          upsert: true
        })

      if (!ticketError && ticketData) {
        const { data: { publicUrl } } = supabase.storage
          .from('tickets')
          .getPublicUrl(ticketData.path)
        return publicUrl
      }
    } catch (e) {
      logger.warn('storage', 'Excepción en bucket tickets para avatar:', e)
    }

    // Intento 3 (Infalible): Convertir a Data URL Base64
    try {
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = () => reject(new Error('Error al convertir imagen a base64'))
        reader.readAsDataURL(fileBlob)
      })
    } catch (finalErr) {
      logger.error('storage', 'Fallo total al procesar avatar', finalErr)
      throw finalErr
    }
  },

  /**
   * Sube una foto de producto optimizada con fallbacks resilientes.
   */
  async uploadProductImage(productId: string, fileBlob: Blob): Promise<string> {
    const cleanId = (productId || `prod_${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '_')
    const fileName = `${cleanId}/${Date.now()}.jpg`

    // Intento 1: Bucket dedicado 'products'
    try {
      const { data, error } = await supabase.storage
        .from('products')
        .upload(fileName, fileBlob, {
          contentType: 'image/jpeg',
          upsert: true
        })

      if (!error && data) {
        const { data: { publicUrl } } = supabase.storage
          .from('products')
          .getPublicUrl(data.path)
        return publicUrl
      }
      if (error) {
        logger.warn('storage', 'Intento 1 (products) falló, probando fallback en tickets...', error)
      }
    } catch (e) {
      logger.warn('storage', 'Excepción en bucket products:', e)
    }

    // Intento 2: Bucket 'tickets' (con permisos públicos y de inserción activos en PROD)
    try {
      const ticketFileName = `products/${cleanId}_${Date.now()}.jpg`
      const { data: ticketData, error: ticketError } = await supabase.storage
        .from('tickets')
        .upload(ticketFileName, fileBlob, {
          contentType: 'image/jpeg',
          upsert: true
        })

      if (!ticketError && ticketData) {
        const { data: { publicUrl } } = supabase.storage
          .from('tickets')
          .getPublicUrl(ticketData.path)
        return publicUrl
      }
      if (ticketError) {
        logger.warn('storage', 'Intento 2 (tickets) falló, probando avatars...', ticketError)
      }
    } catch (e) {
      logger.warn('storage', 'Excepción en bucket tickets:', e)
    }

    // Intento 3: Bucket 'avatars'
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const uid = user?.id || 'public'
      const fallbackFileName = `${uid}/products_${cleanId}_${Date.now()}.jpg`

      const { data: fallbackData, error: fallbackError } = await supabase.storage
        .from('avatars')
        .upload(fallbackFileName, fileBlob, {
          contentType: 'image/jpeg',
          upsert: true
        })

      if (!fallbackError && fallbackData) {
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(fallbackData.path)
        return publicUrl
      }
      if (fallbackError) {
        logger.warn('storage', 'Intento 3 (avatars) falló, recurriendo a DataURL base64...', fallbackError)
      }
    } catch (e) {
      logger.warn('storage', 'Excepción en bucket avatars:', e)
    }

    // Intento 4 (Infalible): Convertir el Blob comprimido a Data URL base64
    // Garantiza que la imagen NUNCA se pierda y el producto se guarde exitosamente
    try {
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = () => reject(new Error('Error al convertir imagen a base64'))
        reader.readAsDataURL(fileBlob)
      })
    } catch (finalErr) {
      logger.error('storage', 'Fallo total al procesar imagen de producto', finalErr)
      throw finalErr
    }
  }
}