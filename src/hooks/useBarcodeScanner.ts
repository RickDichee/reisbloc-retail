import { useEffect, useRef } from 'react'
import logger from '@/utils/logger'

/**
 * Hook para detectar entrada de Scanners USB/Bluetooth (Modo Teclado/HID).
 * Detecta ráfagas rápidas de teclas terminadas en Enter.
 */
export const useBarcodeScanner = (
  onScan: (barcode: string) => void,
  options: { minLength?: number; maxDelay?: number } = {}
) => {
  const { minLength = 3, maxDelay = 30 } = options // Reducido a 30ms para mayor precisión

  const onScanRef = useRef(onScan)
  const buffer = useRef<string>('')
  const lastKeyTime = useRef<number>(0)

  useEffect(() => {
    onScanRef.current = onScan
  }, [onScan])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 🛡️ SEGURIDAD: Si está enfocado en un input, ignorar scanner para evitar "ruido"
      // Excepto si es el input de búsqueda del POS (opcional, pero mejor ignorar todo)
      const target = e.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        return
      }

      // Ignorar teclas de control (Shift, Alt, etc) que el scanner pueda enviar
      if (e.key.length > 1 && e.key !== 'Enter') return

      const currentTime = Date.now()
      const delay = currentTime - lastKeyTime.current

      // Si la velocidad es humana (>30ms), reseteamos el buffer
      // Los scanners disparan teclas casi instantáneamente (< 10ms)
      if (delay > maxDelay) {
        buffer.current = ''
      }

      lastKeyTime.current = currentTime

      if (e.key === 'Enter') {
        if (buffer.current.length >= minLength) {
          e.preventDefault()
          e.stopPropagation()

          const finalCode = buffer.current.trim()
          logger.info('scanner', `Scan detectado: ${finalCode} (Velocidad: ${delay}ms)`)
          onScanRef.current(finalCode)
          buffer.current = ''
        } else {
          // Si el buffer es muy corto al dar Enter, probablemente no fue un scan válido
          buffer.current = ''
        }
      } else if (e.key.length === 1) {
        buffer.current += e.key
      }
    }

    // Usar "true" para captura si es necesario, pero burbujeo está bien si evitamos inputs
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      buffer.current = '' // Limpieza preventiva
    }
  }, [minLength, maxDelay])
}