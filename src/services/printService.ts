import logger from '@/utils/logger'

/**
 * PrintService: Maneja impresión web y nativa (Capacitor)
 * - Web: window.print() para impresora de red/USB
 * - Android: Plugin USB para impresora térmica
 */

interface PrintOptions {
  title?: string
  silent?: boolean // Para Android: imprimir sin diálogo
  width?: number // Para térmica: 58 o 80mm
}

class PrintService {
  /**
   * Imprimir desde HTML (web)
   */
  async printHTML(
    htmlContent: string,
    options: PrintOptions = {}
  ): Promise<void> {
    try {
      const { title = 'Ticket', width = 58 } = options

      return new Promise((resolve) => {
        // En navegadores móviles y PWAs estrictas (Vercel/iOS/Android WebView),
        // imprimir desde un iframe invisible es frecuentemente bloqueado.
        // La forma más robusta y universal es abrir una ventana flotante diminuta 
        // o pestaña efímera y mandar a imprimir ahí.
        const printWindow = window.open('', '_blank', 'width=400,height=600,left=200,top=200')

        if (!printWindow) {
          logger.error('print', 'El navegador bloqueó la ventana emergente de impresión', {})
          alert('Por favor, permite las ventanas emergentes (pop-ups) para imprimir el ticket.')
          resolve() // Resolvemos para no trabar el flujo
          return
        }

        const is80 = Number(width) >= 70
        const printableMm = is80 ? 70 : 46

        const printHTML = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>${title}</title>
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box !important;
                color: #000 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              @page {
                size: auto;
                margin: 0mm !important;
              }
              html, body {
                width: 100% !important;
                max-width: ${printableMm}mm !important;
                margin: 0 auto !important;
                padding: 0 1mm !important;
                background: #fff !important;
                color: #000 !important;
                font-family: 'Consolas', 'Courier New', monospace, system-ui;
                font-weight: 700;
                font-size: ${is80 ? '11px' : '9.5px'};
                line-height: 1.25;
                text-align: left;
                overflow: visible !important;
              }
              .receipt-ticket {
                width: 100% !important;
                max-width: 100% !important;
                margin: 0 auto !important;
                padding: 0 !important;
                box-sizing: border-box !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
              img {
                max-width: 100% !important;
              }
              @media print {
                html, body {
                  width: 100% !important;
                  max-width: ${printableMm}mm !important;
                  margin: 0 auto !important;
                  padding: 0 1mm !important;
                }
                .receipt-ticket {
                  width: 100% !important;
                  max-width: 100% !important;
                }
              }
            </style>
          </head>
          <body>
            ${htmlContent}
          </body>
          </html>
        `

        printWindow.document.open()
        printWindow.document.write(printHTML)
        printWindow.document.close()

        // Dar un momento para que el render engine pinte los assets (ej. SVG del logo)
        setTimeout(() => {
          try {
            printWindow.focus()
            printWindow.print()
          } catch (e) {
            logger.error('print', 'Fallo al ejecutar window.print()', e as any)
          }
          // Ya no intentamos auto-cerrar la ventana con printWindow.close() aquí,
          // porque en iOS WebViews y Chrome Mobile, cerrar la ventana por código
          // justo después de abrir el diálogo de impresión congela la pestaña "madre" (POS).
          // Dejamos que el usuario cierre la pestaña o usamos la vista nativa.
          resolve()
        }, 500)
      })
    } catch (error) {
      logger.error('print', 'Error en impresión web', error as any)
      throw error
    }
  }

  /**
   * Imprimir a impresora térmica USB (Android vía Capacitor)
   * Requiere plugin: npx cap plugin add https://github.com/...
   */
  async printToUSBThermal(
    htmlContent: string,
    options: PrintOptions = {}
  ): Promise<void> {
    try {
      // Intenta usar Capacitor si está disponible
      if (typeof (window as any).CapacitorUSBPrinter === 'undefined') {
        logger.warn('print', 'Plugin USB no disponible, usando web print', {})
        return this.printHTML(htmlContent, options)
      }

      const plugin = (window as any).CapacitorUSBPrinter
      const { title = 'Ticket', width = 58 } = options

      // Llamar plugin personalizado
      const result = await plugin.print({
        content: htmlContent,
        title,
        width,
        encoding: 'UTF-8',
      })

      logger.info('print', 'Impresión a térmica completada', result)
    } catch (error) {
      logger.error('print', 'Error en impresión térmica', error as any)
      // Fallback a web print
      return this.printHTML(htmlContent, options)
    }
  }

  /**
   * Imprimir comprobante de venta (ticket comensal)
   */
  async printReceipt(
    receiptHTML: string,
    options: PrintOptions = {}
  ): Promise<void> {
    logger.info('print', 'Preparando impresión de ticket', {})
    const preferredWidth = typeof window !== 'undefined' ? (parseInt(localStorage.getItem('preferred_ticket_width') || '58') || 58) : 58
    return this.printHTML(receiptHTML, {
      title: 'Ticket de Venta',
      width: options.width || preferredWidth,
      ...options,
    })
  }


  /**
   * Detectar si estamos en Android nativo (Capacitor)
   */
  isNative(): boolean {
    return typeof (window as any).Capacitor !== 'undefined'
  }

  /**
   * Detectar si hay impresora térmica disponible (Android)
   */
  async checkUSBPrinterAvailable(): Promise<boolean> {
    try {
      if (!this.isNative()) return false
      const plugin = (window as any).CapacitorUSBPrinter
      if (!plugin) return false
      const result = await plugin.checkPrinter()
      return result.available || false
    } catch (error) {
      logger.warn('print', 'Error verificando impresora USB', error as any)
      return false
    }
  }
}

export default new PrintService()
