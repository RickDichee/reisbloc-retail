import { supabase } from '@/config/supabase'
import logger from '@/utils/logger'

export const storageService = {
  /**
   * Sube una foto al bucket de avatars y retorna la URL pública.
   */
  async uploadAvatar(userId: string, fileBlob: Blob): Promise<string> {
    try {
      // Nombre de archivo único para evitar colisiones y problemas de cache
      const fileName = `${userId}/${Date.now()}.jpg`

      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, fileBlob, {
          contentType: 'image/jpeg',
          upsert: true
        })

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(data.path)

      return publicUrl
    } catch (error) {
      logger.error('storage', 'Error uploading avatar', error as any)
      throw error
    }
  },

  /**
   * Sube una foto de producto optimizada.
   */
  async uploadProductImage(productId: string, fileBlob: Blob): Promise<string> {
    try {
      const fileName = `${productId}/${Date.now()}.jpg`

      const { data, error } = await supabase.storage
        .from('products')
        .upload(fileName, fileBlob, {
          contentType: 'image/jpeg',
          upsert: true
        })

      if (error) {
        // Fallback: If 'products' bucket doesn't exist, we use the public 'avatars' bucket 
        // and put it in a 'products/' folder. This prevents crashes on new databases.
        logger.warn('storage', 'Bucket "products" no encontrado. Usando fallback seguro en "avatars/"...')
        const { data: { user } } = await supabase.auth.getUser()
        const uid = user?.id || 'public'
        
        // Lo guardamos dentro de la carpeta del usuario para respetar RLS del bucket "avatars"
        const fallbackFileName = `${uid}/products_${fileName.replace('/', '_')}`
        
        const { data: fallbackData, error: fallbackError } = await supabase.storage
          .from('avatars')
          .upload(fallbackFileName, fileBlob, {
            contentType: 'image/jpeg',
            upsert: true
          })
          
        if (fallbackError) {
          logger.error('storage', 'Error crítico en fallback de avatars', fallbackError)
          throw fallbackError
        }
        
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(fallbackData.path)
          
        return publicUrl
      }

      const { data: { publicUrl } } = supabase.storage
        .from('products')
        .getPublicUrl(data.path)

      return publicUrl
    } catch (error) {
      logger.error('storage', 'Error uploading product image', error as any)
      throw error
    }
  }
}