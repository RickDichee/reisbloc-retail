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
      const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(ticketText)}`;
      window.open(whatsappUrl, '_blank');
      return { success: true };
    } catch (error: any) {
      console.error('Error sharing ticket via WhatsApp:', error);
      const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(ticketText)}`;
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
    const date = data.date ? new Date(data.date).toLocaleString('es-MX') : new Date().toLocaleString('es-MX');
    const addressStr = data.address || 'TEXTICUITZEO PASILLO 3 LOCAL 230';

    let text = `🧾 *TICKET DE COMPRA*\n`;
    text += `─────────────────\n`;
    text += `*${data.businessName}*\n`;
    text += `📍 ${addressStr}\n`;
    text += `${date}\n`;
    text += `─────────────────\n\n`;


    data.items.forEach(item => {
      text += `${item.name}\n`;
      text += `${item.quantity} x $${item.price.toFixed(2)} = $${(item.quantity * item.price).toFixed(2)}\n\n`;
    });

    text += `─────────────────\n`;
    text += `Subtotal: $${data.subtotal.toFixed(2)}\n`;
    text += `Impuesto: $${data.tax.toFixed(2)}\n`;
    text += `*TOTAL: $${data.total.toFixed(2)}*\n`;
    text += `─────────────────\n`;
    text += `Pago: ${data.paymentMethod}\n`;
    text += `Caja: ${data.tableNumber}\n`;
    text += `─────────────────\n`;
    text += `¡Gracias por su compra!\n\n`;
    text += `*NO HAY CAMBIOS NI DEVOLUCIONES*\n`;
    text += `📲 *WHATSAPP: 445 131 1808*\n`;
    text += `─────────────────\n`;

    text += `⚡ *${BRANDING.poweredBy}*\n`;
    text += `_${BRANDING.poweredByTagline}_\n`;
    text += `🌐 *${BRANDING.poweredByUrl}*`;

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
