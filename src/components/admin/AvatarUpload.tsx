import React, { useState, useEffect } from 'react'
import { Camera, Upload, Loader2 } from 'lucide-react'
import { compressImage } from '@/utils/imageCompression'
import { storageService } from '@/services/storageService'
import logger from '@/utils/logger'

interface AvatarUploadProps {
  userId: string
  currentAvatarUrl?: string
  onUploadComplete: (url: string) => void
}

export default function AvatarUpload({ userId, currentAvatarUrl, onUploadComplete }: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(currentAvatarUrl)

  // Sincronizar preview con la URL externa si cambia (ej. al guardar)
  useEffect(() => {
    setPreview(currentAvatarUrl)
  }, [currentAvatarUrl])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Requisito 4.1: Límite de 1MB para proteger el almacenamiento
    if (file.size > 1 * 1024 * 1024) {
      alert('⚠️ El archivo es demasiado grande. El límite es de 1MB.')
      return
    }

    setUploading(true)
    try {
      // 1. Comprimir (Máximo 400x400 para ahorrar espacio)
      const compressedBlob = await compressImage(file, 400, 400, 0.7)

      // 2. Crear preview local inmediata
      const localPreview = URL.createObjectURL(compressedBlob)
      setPreview(localPreview)

      // 3. Subir a Supabase Storage
      const publicUrl = await storageService.uploadAvatar(userId, compressedBlob)

      onUploadComplete(publicUrl)
      logger.info('admin', 'Avatar subido con éxito', { userId, url: publicUrl })
    } catch (error) {
      logger.error('admin', 'Error en subida de avatar', error as any)
      alert('Error al procesar la imagen. Intenta con otra.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative group">
        <div className="w-32 h-32 rounded-2xl overflow-hidden bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center relative shadow-inner">
          {preview ? (
            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
          ) : (
            <Camera size={40} className="text-gray-400" />
          )}

          {uploading && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-sm">
              <Loader2 className="text-white animate-spin" size={32} />
            </div>
          )}
        </div>

        <label className="absolute -bottom-2 -right-2 p-2 bg-indigo-600 text-white rounded-xl shadow-lg cursor-pointer hover:bg-indigo-700 transition-all hover:scale-110">
          <Upload size={16} />
          <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={uploading} />
        </label>
      </div>
      <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Foto de Perfil (Optimizado)</p>
    </div>
  )
}