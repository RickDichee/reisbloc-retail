import { supabase } from '../config/supabase';

const WHATSAPP_BUSINESS_API_URL = 'https://graph.facebook.com/v18.0';
const WHATSAPP_PHONE_NUMBER_ID = import.meta.env.VITE_WHATSAPP_PHONE_NUMBER_ID || '';
const WHATSAPP_ACCESS_TOKEN = import.meta.env.VITE_WHATSAPP_TOKEN || '';

export interface WhatsAppMessage {
  to: string;
  type: 'text' | 'template' | 'image' | 'document' | 'location';
  content: WhatsAppTextContent | WhatsAppTemplateContent | WhatsAppImageContent | WhatsAppDocumentContent | WhatsAppLocationContent;
}

export interface WhatsAppTextContent {
  body: string;
}

export interface WhatsAppTemplateContent {
  name: string;
  language: { code: string };
  components?: {
    type: string;
    parameters: { type: string; [key: string]: any }[];
  }[];
}

export interface WhatsAppImageContent {
  id?: string;
  link?: string;
  caption?: string;
}

export interface WhatsAppDocumentContent {
  id?: string;
  link?: string;
  filename: string;
  caption?: string;
}

export interface WhatsAppLocationContent {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}

export interface WhatsAppWebhookPayload {
  object: string;
  entry: {
    id: string;
    changes: {
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: {
          profile: { name: string };
          wa_id: string;
        }[];
        messages?: {
          from: string;
          id: string;
          timestamp: string;
          type: string;
          text?: { body: string };
          image?: any;
          location?: any;
          button?: any;
        }[];
      };
      field: string;
    }[];
  }[];
}

export const whatsappService = {
  async sendMessage(message: WhatsAppMessage): Promise<{ messageId: string }> {
    if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
      throw new Error('WhatsApp Business API no configurada');
    }

    const payload = {
      messaging_product: 'whatsapp',
      to: message.to.replace(/\D/g, ''),
      type: message.type,
      ...(message.type === 'text' && { text: message.content }),
      ...(message.type === 'template' && { template: message.content }),
      ...(message.type === 'image' && { image: message.content }),
      ...(message.type === 'document' && { document: message.content }),
      ...(message.type === 'location' && { location: message.content }),
    };

    const response = await fetch(
      `${WHATSAPP_BUSINESS_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('WhatsApp API Error:', error);
      throw new Error(error.error?.message || 'Error al enviar mensaje');
    }

    const result = await response.json();
    return { messageId: result.messages[0].id };
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
    components?: WhatsAppTemplateContent['components']
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

  async sendImageMessage(phone: string, imageUrl: string, caption?: string): Promise<string> {
    return this.sendMessage({
      to: phone,
      type: 'image',
      content: {
        link: imageUrl,
        caption,
      },
    }).then(r => r.messageId);
  },

  async sendDocumentMessage(
    phone: string,
    documentUrl: string,
    filename: string,
    caption?: string
  ): Promise<string> {
    return this.sendMessage({
      to: phone,
      type: 'document',
      content: {
        link: documentUrl,
        filename,
        caption,
      },
    }).then(r => r.messageId);
  },

  async sendLocationMessage(
    phone: string,
    latitude: number,
    longitude: number,
    name?: string,
    address?: string
  ): Promise<string> {
    return this.sendMessage({
      to: phone,
      type: 'location',
      content: {
        latitude,
        longitude,
        name,
        address,
      },
    }).then(r => r.messageId);
  },

  async uploadMedia(file: File): Promise<string> {
    if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
      throw new Error('WhatsApp Business API no configurada');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', file.type);
    formData.append('messaging_product', 'whatsapp');

    const response = await fetch(
      `${WHATSAPP_BUSINESS_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}/media`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Error al subir media');
    }

    const result = await response.json();
    return result.id;
  },

  async downloadMedia(mediaId: string): Promise<Blob> {
    if (!WHATSAPP_ACCESS_TOKEN) {
      throw new Error('WhatsApp Business API no configurada');
    }

    const response = await fetch(
      `${WHATSAPP_BUSINESS_API_URL}/${mediaId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Error al descargar media');
    }

    const result = await response.json();
    
    const mediaResponse = await fetch(result.url, {
      headers: {
        'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
      },
    });

    return mediaResponse.blob();
  },

  parseWebhookPayload(payload: WhatsAppWebhookPayload) {
    const message = payload.entry[0]?.changes[0]?.value?.messages?.[0];
    
    if (!message) return null;

    return {
      from: message.from,
      id: message.id,
      timestamp: message.timestamp,
      type: message.type,
      body: message.text?.body,
      image: message.image,
      location: message.location,
    };
  },

  async markAsRead(messageId: string): Promise<void> {
    if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
      throw new Error('WhatsApp Business API no configurada');
    }

    await fetch(
      `${WHATSAPP_BUSINESS_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId,
        }),
      }
    );
  },

  async getPhoneNumberDetails(): Promise<any> {
    if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
      throw new Error('WhatsApp Business API no configurada');
    }

    const response = await fetch(
      `${WHATSAPP_BUSINESS_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}`,
      {
        headers: {
          'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Error al obtener detalles del número');
    }

    return response.json();
  },

  async logMessage(message: {
    from: string;
    to: string;
    direction: 'inbound' | 'outbound';
    type: string;
    content: string;
    status: string;
    message_id?: string;
  }): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('whatsapp_messages').insert({
        user_id: user.id,
        from_number: message.from,
        to_number: message.to,
        direction: message.direction,
        message_type: message.type,
        content: message.content,
        status: message.status,
        whatsapp_message_id: message.message_id,
      });
    } catch (error) {
      console.error('Error logging WhatsApp message:', error);
    }
  },

  isConfigured(): boolean {
    return !!WHATSAPP_ACCESS_TOKEN && !!WHATSAPP_PHONE_NUMBER_ID;
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
      { name: 'sale_confirmation', description: 'Confirmaci&#243;n de venta' },
      { name: 'quotation', description: 'Env&#237;o de cotizaci&#243;n' },
      { name: 'payment_reminder', description: 'Recordatorio de pago' },
      { name: 'appointment_reminder', description: 'Recordatorio de cita' },
    ];
  },
};
