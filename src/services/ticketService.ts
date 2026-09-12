import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { supabase } from '@/config/supabase';
import { BRANDING } from '@/config/branding';
import { whatsappService } from './whatsappService';

export interface TicketData {
  orderId: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  ticketNumber: number;  // Número de ticket (antes "tableNumber")
  businessName: string;
  address?: string;
  phone?: string;
  cashier?: string;
  date?: Date;
  imageUrl?: string;
  clientName?: string;
  clientPhone?: string;
  // Legacy
  tableNumber?: number;
}

export const ticketService = {
  async generatePDFFromHTML(html: string): Promise<Blob> {
    const container = document.createElement('div');
    container.innerHTML = html;
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '280px';
    document.body.appendChild(container);

    try {
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, 200],
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

      const blob = pdf.output('blob');
      return blob;
    } finally {
      document.body.removeChild(container);
    }
  },

  async generateImageFromHTML(html: string): Promise<{ blob: Blob; dataUrl: string }> {
    const container = document.createElement('div');
    container.innerHTML = html;
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '320px';
    container.style.padding = '8px';
    container.style.backgroundColor = '#ffffff';
    document.body.appendChild(container);

    try {
      const canvas = await html2canvas(container, {
        scale: 2.5,
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b || new Blob()), 'image/jpeg', 0.95);
      });

      return { blob, dataUrl };
    } finally {
      document.body.removeChild(container);
    }
  },

  downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },

  async uploadPDF(blob: Blob, filename: string): Promise<string> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || 'anon';
      const timestamp = Date.now();
      const path = `tickets/${userId}/${timestamp}-${filename}`;

      const { error } = await supabase.storage
        .from('tickets')
        .upload(path, blob, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('tickets')
        .getPublicUrl(path);

      return urlData.publicUrl;
    } catch (err) {
      console.warn('⚠️ Supabase Storage bucket "tickets" no disponible:', err);
      throw err;
    }
  },

  async uploadImage(blob: Blob, filename: string): Promise<string> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || 'public';
      const timestamp = Date.now();
      const path = `images/${userId}/${timestamp}-${filename}`;

      const { error } = await supabase.storage
        .from('tickets')
        .upload(path, blob, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (error) {
        console.warn('⚠️ Error subiendo imagen a storage:', error.message);
        return '';
      }

      const { data: urlData } = supabase.storage
        .from('tickets')
        .getPublicUrl(path);

      return urlData.publicUrl;
    } catch (err) {
      console.warn('⚠️ Error subiendo imagen de ticket a storage:', err);
      return '';
    }
  },

  async copyImageToClipboard(blob: Blob): Promise<boolean> {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && typeof ClipboardItem !== 'undefined') {
        let pngBlob = blob;
        if (blob.type !== 'image/png') {
          const img = new Image();
          const url = URL.createObjectURL(blob);
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = url;
          });
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0);
          URL.revokeObjectURL(url);
          pngBlob = await new Promise<Blob>((resolve) => {
            canvas.toBlob((b) => resolve(b || blob), 'image/png');
          });
        }

        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': pngBlob })
        ]);
        return true;
      }
    } catch (e) {
      console.warn('⚠️ No se pudo copiar la imagen al portapapeles:', e);
    }
    return false;
  },

  async shareByWhatsApp(
    phone: string,
    ticketHtml: string,
    ticketData: TicketData
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const cleanPhone = this.formatPhoneNumber(phone);
    const ticketText = this.formatTicketAsText(ticketData);

    try {
      if (whatsappService.isConfigured()) {
        try {
          const pdfBlob = await this.generatePDFFromHTML(ticketHtml);
          const pdfUrl = await this.uploadPDF(pdfBlob, `ticket-${ticketData.orderId}.pdf`);

          const messageId = await whatsappService.sendDocumentMessage(
            cleanPhone,
            pdfUrl,
            `ticket-${ticketData.orderId}.pdf`,
            `✅ Ticket de compra #${ticketData.orderId.slice(0, 8)}\nTotal: $${ticketData.total.toFixed(2)}\nGracias por su compra!`
          );
          return { success: true, messageId };
        } catch (apiError) {
          console.warn('⚠️ Fallo de envío por API/Storage, redirigiendo a WhatsApp Web:', apiError);
        }
      }

      // Fallback 100% resiliente: Abrir WhatsApp Web con el mensaje formateado
      const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const baseUrl = isMobile ? 'https://api.whatsapp.com/send' : 'https://web.whatsapp.com/send';
      const whatsappUrl = `${baseUrl}?phone=${cleanPhone}&text=${encodeURIComponent(ticketText)}`;
      window.open(whatsappUrl, '_blank');
      return { success: true };
    } catch (error: any) {
      console.error('Error sharing ticket via WhatsApp:', error);
      const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const baseUrl = isMobile ? 'https://api.whatsapp.com/send' : 'https://web.whatsapp.com/send';
      const whatsappUrl = `${baseUrl}?phone=${cleanPhone}&text=${encodeURIComponent(ticketText)}`;
      window.open(whatsappUrl, '_blank');
      return { success: true };
    }
  },

  async shareByEmail(
    email: string,
    ticketHtml: string,
    ticketData: TicketData
  ): Promise<{ success: boolean; error?: string }> {
    const subject = `Ticket de compra #${ticketData.orderId.slice(0, 8)}`;
    const body = this.formatTicketAsText(ticketData);

    try {
      let pdfUrl = '';
      try {
        const pdfBlob = await this.generatePDFFromHTML(ticketHtml);
        pdfUrl = await this.uploadPDF(pdfBlob, `ticket-${ticketData.orderId}.pdf`);
      } catch (e) {
        console.warn('⚠️ Falló generación de PDF en Storage para email:', e);
      }

      const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = mailtoLink;

      if (pdfUrl) {
        setTimeout(() => {
          const a = document.createElement('a');
          a.href = pdfUrl;
          a.download = `ticket-${ticketData.orderId}.pdf`;
          a.click();
        }, 500);
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error sharing ticket via email:', error);
      const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = mailtoLink;
      return { success: true };
    }
  },


  formatTicketAsText(data: TicketData): string {
    const date = data.date ? new Date(data.date).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : new Date().toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
    const bizName = (data.businessName || 'REISBLOC STORE').toUpperCase();
    const folio = data.orderId ? data.orderId.slice(0, 8).toUpperCase() : 'VENTA';

    let text = `🧾 *TICKET DE COMPRA DIGITAL*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n`;
    text += `✨ *${bizName}*\n`;
    if (data.address && data.address.trim()) {
      text += `📍 ${data.address.trim()}\n`;
    }
    text += `🗓️ ${date} hrs\n`;
    text += `🏷️ Folio: #${folio}\n`;
    if (data.clientName) {
      text += `👤 Cliente: ${data.clientName}\n`;
    }
    text += `━━━━━━━━━━━━━━━━━━━━\n\n`;

    data.items.forEach(item => {
      const qty = Number(item.quantity || 1);
      const price = Number(item.price || 0);
      text += `🛍️ *${item.name}*\n`;
      text += `   ${qty} pz × $${price.toFixed(2)} = *$${(qty * price).toFixed(2)}*\n\n`;
    });

    text += `━━━━━━━━━━━━━━━━━━━━\n`;
    text += `💵 Subtotal: $${data.subtotal.toFixed(2)}\n`;
    text += `💰 *TOTAL A PAGAR: $${data.total.toFixed(2)} MXN*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n`;
    text += `💳 Forma de pago: ${data.paymentMethod}\n`;
    text += `📦 Caja: ${data.ticketNumber || 1}\n\n`;
    if (data.imageUrl) {
      text += `🖼️ *Ver Ticket Digital (Imagen HD):*\n${data.imageUrl}\n\n`;
    }
    text += `¡Muchas gracias por su compra! ✨\n`;
    text += `_Conserve este comprobante para cualquier duda._\n`;
    text += `*NO HAY CAMBIOS NI DEVOLUCIONES*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📲 *Atención a Clientes:* 445 131 1808\n`;
    text += `⚡ *Powered by Reisbloc Retail*`;

    return text;
  },



  formatPhoneNumber(phone: string): string {
    let formatted = phone.replace(/\D/g, '');
    if (formatted.length === 10) {
      formatted = '52' + formatted;
    }
    if (formatted.startsWith('1') && formatted.length === 11) {
      formatted = formatted.substring(1);
      formatted = '52' + formatted;
    }
    return formatted;
  },
};
