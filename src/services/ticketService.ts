import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { supabase } from '@/config/supabase';

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
  tableNumber: number;
  businessName: string;
  address?: string;
  phone?: string;
  cashier?: string;
  date?: Date;
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const timestamp = Date.now();
    const path = `tickets/${user.id}/${timestamp}-${filename}`;

      const { error } = await supabase.storage
        .from('tickets')
        .upload(path, blob, {
          contentType: 'application/pdf',
          upsert: false,
        });

      if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('tickets')
      .getPublicUrl(path);

    return urlData.publicUrl;
  },

  async shareByWhatsApp(
    phone: string,
    ticketHtml: string,
    ticketData: TicketData
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const { whatsappService } = await import('./whatsappService');

      if (!whatsappService.isConfigured()) {
        const whatsappUrl = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(
          this.formatTicketAsText(ticketData)
        )}`;
        window.open(whatsappUrl, '_blank');
        return { success: true };
      }

      const pdfBlob = await this.generatePDFFromHTML(ticketHtml);
      const pdfUrl = await this.uploadPDF(pdfBlob, `ticket-${ticketData.orderId}.pdf`);

      const messageId = await whatsappService.sendDocumentMessage(
        phone,
        pdfUrl,
        `ticket-${ticketData.orderId}.pdf`,
        `✅ Ticket de compra #${ticketData.orderId.slice(0, 8)}\nTotal: $${ticketData.total.toFixed(2)}\nGracias por su compra!`
      );

      return { success: true, messageId };
    } catch (error: any) {
      console.error('Error sharing ticket via WhatsApp:', error);
      return { success: false, error: error.message };
    }
  },

  async shareByEmail(
    email: string,
    ticketHtml: string,
    ticketData: TicketData
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const pdfBlob = await this.generatePDFFromHTML(ticketHtml);
      const pdfUrl = await this.uploadPDF(pdfBlob, `ticket-${ticketData.orderId}.pdf`);

      const subject = `Ticket de compra #${ticketData.orderId.slice(0, 8)}`;
      const body = this.formatTicketAsText(ticketData);

      const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = mailtoLink;

      setTimeout(() => {
        const a = document.createElement('a');
        a.href = pdfUrl;
        a.download = `ticket-${ticketData.orderId}.pdf`;
        a.click();
      }, 500);

      return { success: true };
    } catch (error: any) {
      console.error('Error sharing ticket via email:', error);
      return { success: false, error: error.message };
    }
  },

  formatTicketAsText(data: TicketData): string {
    const date = data.date ? new Date(data.date).toLocaleString('es-MX') : new Date().toLocaleString('es-MX');

    let text = `🧾 *TICKET DE COMPRA*\n`;
    text += `─────────────────\n`;
    text += `*${data.businessName}*\n`;
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
    text += `¡Gracias por su compra!\n`;
    text += `⚡ Reisbloc Store`;

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
