import { useEffect, useRef } from 'react'
import logger from '@/utils/logger'

/**
 * Hook para detectar entrada de Scanners USB/Bluetooth (Modo Teclado/HID).
 * Detecta ráfagas rápidas de teclas terminadas en Enter.
 */
export const useBarcodeScanner = (
  onScan: (barcode: string, scannerNum?: number) => void,
  options: { minLength?: number; maxDelay?: number } = {}
) => {
  const { minLength = 3, maxDelay = 30 } = options // Reducido a 30ms para mayor precisión

  const onScanRef = useRef(onScan)
  const buffer = useRef<string>('')
  const lastKeyTime = useRef<number>(0)
  const activeScannerNum = useRef<number | undefined>(undefined)

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

      // Detectar prefijo de escáner especial (Ctrl + 1/2/3/4)
      if (e.ctrlKey && ['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault()
        e.stopPropagation()
        activeScannerNum.current = Number(e.key)
        buffer.current = '' // Iniciar lectura
        lastKeyTime.current = Date.now()
        return
      }

      // Detectar prefijo alternativo de teclas de función (F1, F2, F3, F4)
      if (['F1', 'F2', 'F3', 'F4'].includes(e.key)) {
        e.preventDefault()
        e.stopPropagation()
        const match = e.key.match(/\d+/)
        if (match) {
          activeScannerNum.current = Number(match[0])
        }
        buffer.current = ''
        lastKeyTime.current = Date.now()
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
        activeScannerNum.current = undefined
      }

      lastKeyTime.current = currentTime

      if (e.key === 'Enter') {
        if (buffer.current.length >= minLength) {
          e.preventDefault()
          e.stopPropagation()

          const finalCode = buffer.current.trim()
          logger.info('scanner', `Scan detectado: ${finalCode} (Escáner: ${activeScannerNum.current})`)
          onScanRef.current(finalCode, activeScannerNum.current)
          buffer.current = ''
          activeScannerNum.current = undefined
        } else {
          // Si el buffer es muy corto al dar Enter, probablemente no fue un scan válido
          buffer.current = ''
          activeScannerNum.current = undefined
        }
      } else if (e.key.length === 1) {
        buffer.current += e.key
      }
    }

    const handleReset = () => {
      buffer.current = ''
      activeScannerNum.current = undefined
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('focus', handleReset)
    document.addEventListener('visibilitychange', handleReset)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('focus', handleReset)
      document.removeEventListener('visibilitychange', handleReset)
      buffer.current = '' // Limpieza preventiva
      activeScannerNum.current = undefined
    }
  }, [minLength, maxDelay])
}