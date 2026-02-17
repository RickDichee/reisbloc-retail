import { useEffect, useRef } from 'react'

/**
 * Hook para detectar entrada de Scanners USB/Bluetooth (Modo Teclado/HID).
 * Detecta ráfagas rápidas de teclas terminadas en Enter.
 */
export const useBarcodeScanner = (
  onScan: (barcode: string) => void,
  options: { minLength?: number; maxDelay?: number } = {}
) => {
  const { minLength = 3, maxDelay = 60 } = options
  
  // 1. Guardamos el callback en una referencia para que no reinicie el efecto
  const onScanRef = useRef(onScan)

  useEffect(() => {
    onScanRef.current = onScan
  }, [onScan])
  
  // 2. Buffer para acumular teclas
  const buffer = useRef<string>('')
  const lastKeyTime = useRef<number>(0)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 🛡️ SAFETY: Si el usuario está escribiendo en un input, IGNORAR el scanner
      // Esto evita que se "aloque" cuando buscas manualmente
      const target = e.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return

      const currentTime = Date.now()
      
      // Si pasa mucho tiempo entre teclas, reseteamos (es un humano lento, no un scanner)
      if (currentTime - lastKeyTime.current > maxDelay) {
        buffer.current = ''
      }
      
      lastKeyTime.current = currentTime

      if (e.key === 'Enter') {
        // Si acumulamos suficientes caracteres rápido, es un código de barras
        if (buffer.current.length >= minLength) {
          e.preventDefault() // Evitar submit de formularios fantasma
          onScanRef.current(buffer.current)
          buffer.current = ''
        }
      } else if (e.key.length === 1) {
        // Acumular caracteres
        buffer.current += e.key
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [minLength, maxDelay])
}