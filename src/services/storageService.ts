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
  }
}