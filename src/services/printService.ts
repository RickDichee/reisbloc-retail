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
      const { title = 'Ticket', silent = false, width = 58 } = options

      // Crear iframe invisible
      const iframe = document.createElement('iframe')
      iframe.style.display = 'none'
      document.body.appendChild(iframe)

      const doc = iframe.contentDocument || iframe.contentWindow?.document
      if (!doc) throw new Error('No se pudo acceder al documento del iframe')

      // HTML con estilos para térmica
      const printHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>${title}</title>
          <style>
            * { margin: 0; padding: 0; }
            body {
              font-family: "Courier New", monospace;
              font-size: 12px;
              width: ${width}mm;
              padding: 8px;
            }
            @media print {
              body { width: ${width}mm; }
              @page { size: ${width}mm auto; margin: 0; }
            }
          </style>
        </head>
        <body>
          ${htmlContent}
        </body>
        </html>
      `

      doc.open()
      doc.write(printHTML)
      doc.close()

      // Esperar a que cargue y luego imprimir
      setTimeout(() => {
        iframe.contentWindow?.print()
        // Eliminar iframe después de 1 segundo
        setTimeout(() => document.body.removeChild(iframe), 1000)
      }, 250)

      logger.info('print', 'Impresión iniciada (web)', { title })
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
    return this.printHTML(receiptHTML, {
      title: 'Ticket de Venta',
      width: 58,
      ...options,
    })
  }

  /**
   * Imprimir comanda de cocina/bar
   */
  async printKitchenTicket(
    ticketHTML: string,
    options: PrintOptions = {}
  ): Promise<void> {
    logger.info('print', 'Preparando impresión de comanda', {})
    return this.printHTML(ticketHTML, {
      title: 'Comanda',
      width: 58,
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
