import { useEffect, useRef } from 'react'

/**
 * Hook para detectar entrada de Scanners USB/Bluetooth (Modo Teclado/HID).
 * Detecta ráfagas rápidas de teclas terminadas en Enter.
 * 
 * @param onScan Callback que recibe el código escaneado
 * @param options Configuración de sensibilidad
 */
export const useBarcodeScanner = (
  onScan: (barcode: string) => void,
  options: { minLength?: number; maxDelay?: number } = {}
) => {
  const { minLength = 3, maxDelay = 60 } = options
  
  // Usamos refs para mantener el estado del buffer sin provocar re-renders constantes
  const buffer = useRef<string>('')
  const lastKeyTime = useRef<number>(0)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const currentTime = Date.now()
      
      // Si el scanner "escribe" muy rápido, la diferencia de tiempo entre teclas es mínima (<60ms).
      // Si pasa mucho tiempo, asumimos que es un humano tecleando lento y reseteamos el buffer.
      if (currentTime - lastKeyTime.current > maxDelay) {
        buffer.current = ''
      }
      
      lastKeyTime.current = currentTime

      // La mayoría de scanners mandan un 'Enter' al final de la lectura
      if (e.key === 'Enter') {
        if (buffer.current.length >= minLength) {
          // ¡Lectura confirmada! Disparamos el evento
          onScan(buffer.current)
          buffer.current = ''
          // Prevenir que el Enter envíe formularios o active botones por error
          e.preventDefault()
        }
      } else if (e.key.length === 1) {
        // Acumular caracteres imprimibles (números, letras)
        buffer.current += e.key
      }
    }

    // Escuchamos en toda la ventana (global)
    window.addEventListener('keydown', handleKeyDown)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onScan, minLength, maxDelay])
}