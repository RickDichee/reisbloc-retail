/**
 * Reisbloc POS - Secure WhatsApp Service
 * Calls Supabase Edge Function to prevent exposing WhatsApp API secrets on client.
 */
import { supabase } from '../config/supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';

export interface WhatsAppMessage {
  to: string;
  type: 'text' | 'template' | 'image' | 'document' | 'location';
  content: any;
}

export const whatsappService = {
  async sendMessage(message: WhatsAppMessage): Promise<{ messageId: string }> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Sesión requerida para enviar mensajes');
    }

    const response = await fetch(`${SUPABASE_URL}/functions/v1/whatsapp-proxy`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'send_message',
        to: message.to,
        type: message.type,
        content: message.content,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al enviar mensaje vía WhatsApp');
    }

    const result = await response.json();
    return { messageId: result.messageId };
  },

  async sendTextMessage(phone: string, text: string): Promise<string> {
    return this.sendMessage({
      to: phone,
      type: 'text',
      content: { body: text },
    }).then(r => r.messageId);
  },

  async sendTemplateMessage(
    phone: string,
    templateName: string,
    languageCode: string = 'es_MX',
    components?: any[]
  ): Promise<string> {
    return this.sendMessage({
      to: phone,
      type: 'template',
      content: {
        name: templateName,
        language: { code: languageCode },
        components,
      },
    }).then(r => r.messageId);
  },

  isConfigured(): boolean {
    return true; // Controlado en Edge Function
  },

  formatPhoneNumber(phone: string): string {
    let formatted = phone.replace(/\D/g, '');
    if (!formatted.startsWith('52') && formatted.length === 10) {
      formatted = '52' + formatted;
    }
    if (!formatted.startsWith('1') && formatted.length === 11) {
      formatted = '1' + formatted;
    }
    return formatted;
  },

  getSupportedTemplates(): { name: string; description: string }[] {
    return [
      { name: 'hello_world', description: 'Saludo inicial' },
      { name: 'sale_confirmation', description: 'Confirmación de venta' },
      { name: 'quotation', description: 'Envío de cotización' },
      { name: 'payment_reminder', description: 'Recordatorio de pago' },
      { name: 'appointment_reminder', description: 'Recordatorio de cita' },
    ];
  },
};
