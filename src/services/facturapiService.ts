import { supabase } from '../config/supabase';

const FACTURAPI_API_KEY = import.meta.env.VITE_FACTURAPI_API_KEY || '';
const FACTURAPI_WEBHOOK_URL = import.meta.env.VITE_FACTURAPI_WEBHOOK_URL || '';

export interface InvoiceData {
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    taxClassification: 'IEPS' | 'IVA' | 'ISR' | 'No aplica';
    taxRate: number;
  }[];
  customer: {
    legalName: string;
    taxId: string;
    email: string;
    fiscalRegime: string;
    taxSystem: string;
    address?: {
      street: string;
      exterior: string;
      interior?: string;
      neighborhood: string;
      zip: string;
      city: string;
      state: string;
      country: string;
    };
  };
  use: string;
  paymentForm: string;
  paymentMethod?: string;
  observations?: string;
}

export interface InvoiceResponse {
  id: string;
  status: 'draft' | 'pending' | 'validated' | 'canceled';
  folioNumber: string;
  series: string;
  total: number;
  uuid?: string;
  pdfUrl?: string;
  xmlUrl?: string;
  createdAt: string;
}

export const facturapiService = {
  async createInvoice(data: InvoiceData): Promise<InvoiceResponse> {
    if (!FACTURAPI_API_KEY) {
      throw new Error('Facturapi API key no configurada');
    }

    const items = data.items.map(item => ({
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      product: {
        description: item.description,
        unit_code: 'PZA',
        taxes: item.taxClassification !== 'No aplica' ? [{
          type: item.taxClassification,
          rate: item.taxRate / 100,
        }] : [],
      },
    }));

    const invoicePayload = {
      customer: {
        legal_name: data.customer.legalName,
        tax_id: data.customer.taxId,
        email: data.customer.email,
        fiscal_regime: data.customer.fiscalRegime,
        tax_system: data.customer.taxSystem,
        address: data.customer.address ? {
          street: data.customer.address.street,
          exterior: data.customer.address.exterior,
          interior: data.customer.address.interior,
          neighborhood: data.customer.address.neighborhood,
          zip: data.customer.address.zip,
          city: data.customer.address.city,
          state: data.customer.address.state,
          country: data.customer.address.country,
        } : undefined,
      },
      items,
      use: data.use,
      payment_form: data.paymentForm,
      payment_method: data.paymentMethod || 'PUE',
      observations: data.observations,
      series: 'RBL',
      external_id: `ticket-${Date.now()}`,
    };

    const response = await fetch('https://www.facturapi.io/v2/invoices', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FACTURAPI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invoicePayload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al crear factura');
    }

    const result = await response.json();

    await this.logInvoice(result.id, invoicePayload);

    return {
      id: result.id,
      status: result.status,
      folioNumber: result.folio_number,
      series: result.series,
      total: result.total,
      uuid: result.uuid,
      pdfUrl: result.pdf_url,
      xmlUrl: result.xml_url,
      createdAt: result.created_at,
    };
  },

  async validateInvoice(invoiceId: string): Promise<InvoiceResponse> {
    const response = await fetch(`https://www.facturapi.io/v2/invoices/${invoiceId}/validate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FACTURAPI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al validar factura');
    }

    const result = await response.json();

    return {
      id: result.id,
      status: result.status,
      folioNumber: result.folio_number,
      series: result.series,
      total: result.total,
      uuid: result.uuid,
      pdfUrl: result.pdf_url,
      xmlUrl: result.xml_url,
      createdAt: result.created_at,
    };
  },

  async cancelInvoice(invoiceId: string, reason: string = '02'): Promise<void> {
    const response = await fetch(`https://www.facturapi.io/v2/invoices/${invoiceId}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FACTURAPI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al cancelar factura');
    }
  },

  async getInvoice(invoiceId: string): Promise<InvoiceResponse> {
    const response = await fetch(`https://www.facturapi.io/v2/invoices/${invoiceId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${FACTURAPI_API_KEY}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al obtener factura');
    }

    const result = await response.json();

    return {
      id: result.id,
      status: result.status,
      folioNumber: result.folio_number,
      series: result.series,
      total: result.total,
      uuid: result.uuid,
      pdfUrl: result.pdf_url,
      xmlUrl: result.xml_url,
      createdAt: result.created_at,
    };
  },

  async listInvoices(page: number = 1, limit: number = 20): Promise<InvoiceResponse[]> {
    const response = await fetch(
      `https://www.facturapi.io/v2/invoices?page=${page}&limit=${limit}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${FACTURAPI_API_KEY}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al listar facturas');
    }

    const result = await response.json();

    return result.data.map((invoice: any) => ({
      id: invoice.id,
      status: invoice.status,
      folioNumber: invoice.folio_number,
      series: invoice.series,
      total: invoice.total,
      uuid: invoice.uuid,
      pdfUrl: invoice.pdf_url,
      xmlUrl: invoice.xml_url,
      createdAt: invoice.created_at,
    }));
  },

  async downloadPdf(invoiceId: string): Promise<Blob> {
    const response = await fetch(`https://www.facturapi.io/v2/invoices/${invoiceId}/pdf`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${FACTURAPI_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error('Error al descargar PDF');
    }

    return response.blob();
  },

  async downloadXml(invoiceId: string): Promise<Blob> {
    const response = await fetch(`https://www.facturapi.io/v2/invoices/${invoiceId}/xml`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${FACTURAPI_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error('Error al descargar XML');
    }

    return response.blob();
  },

  async logInvoice(invoiceId: string, data: any): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('invoices').insert({
        facturapi_id: invoiceId,
        user_id: user.id,
        data,
        status: 'pending',
      });
    } catch (error) {
      console.error('Error al registrar invoice:', error);
    }
  },

  async registerWebhook(): Promise<void> {
    if (!FACTURAPI_WEBHOOK_URL) {
      throw new Error('Webhook URL no configurada');
    }

    const response = await fetch('https://www.facturapi.io/v2/webhooks', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FACTURAPI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: FACTURAPI_WEBHOOK_URL,
        events: ['invoice.validated', 'invoice.canceled'],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al registrar webhook');
    }
  },

  isConfigured(): boolean {
    return !!FACTURAPI_API_KEY;
  },

  getCustomerTaxRegimes(): { id: string; name: string }[] {
    return [
      { id: '601', name: 'General de Ley Personas Morales' },
      { id: '603', name: 'Personas Morales con Fines No Lucrativos' },
      { id: '605', name: 'Sueldos y Salarios e Ingresos Asimilados a Salarios' },
      { id: '606', name: 'Arrendamiento' },
      { id: '608', name: 'Demas ingresos' },
      { id: '609', name: 'Consolidacion' },
      { id: '610', name: 'Residentes en el Extranjero' },
      { id: '611', name: 'Ingresos por Dividendos' },
      { id: '612', name: 'Personas Fisicas con Actividades Empresariales y Profesionales' },
      { id: '614', name: 'Ingresos por Intereses' },
      { id: '616', name: 'Regimen Simplificado de Ley General de Personas Morales' },
      { id: '620', name: 'Regimen Simplificado de Confianza' },
    ];
  },

  getTaxSystems(): { id: string; name: string }[] {
    return [
      { id: '601', name: 'General de Ley Personas Morales' },
      { id: '603', name: 'Personas Morales con Fines No Lucrativos' },
      { id: '605', name: 'Sueldos y Salarios e Ingresos Asimilados a Salarios' },
      { id: '606', name: 'Arrendamiento' },
      { id: '608', name: 'Demas ingresos' },
      { id: '609', name: 'Consolidacion' },
      { id: '610', name: 'Residentes en el Extranjero' },
      { id: '611', name: 'Ingresos por Dividendos' },
      { id: '612', name: 'Personas Fisicas con Actividades Empresariales y Profesionales' },
      { id: '614', name: 'Ingresos por Intereses' },
      { id: '616', name: 'Regimen Simplificado de Ley General de Personas Morales' },
      { id: '620', name: 'Regimen Simplificado de Confianza' },
    ];
  },

  getUsageTypes(): { id: string; name: string }[] {
    return [
      { id: 'G01', name: 'Adquisici&#243;n de mercancias' },
      { id: 'G02', name: 'Devoluciones, descuentos o bonificaciones' },
      { id: 'G03', name: 'Gastos en general' },
      { id: 'I01', name: 'Obras, servicios o comisiones' },
      { id: 'I02', name: 'Devoluciones, descuentos o bonificaciones' },
      { id: 'I03', name: 'Gastos en general' },
      { id: 'I04', name: 'Equiparaci&#243;n autom&#243;vil' },
      { id: 'I08', name: 'Autre (Otro)' },
      { id: 'I09', name: 'Comprobante de especie' },
      { id: 'I10', name: 'Por cuenta de terceros' },
      { id: 'I13', name: 'Compensaci&#243;n' },
      { id: 'I14', name: 'Notarios elektr&#243;nicos' },
      { id: 'P01', name: 'Por definir' },
    ];
  },

  getPaymentForms(): { id: string; name: string }[] {
    return [
      { id: '01', name: 'Efectivo' },
      { id: '02', name: 'Cheque nominativo' },
      { id: '03', name: 'Transferencia electr&#243;nica de fondos' },
      { id: '04', name: 'Tarjeta de cr&#233;dito' },
      { id: '05', name: 'Monedero electr&#243;nico' },
      { id: '06', name: 'Dinero electr&#243;nico' },
      { id: '08', name: 'Vales de despensa' },
      { id: '12', name: 'Daci&#243;n en pago' },
      { id: '13', name: 'Pago por subrogaci&#243;n' },
      { id: '14', name: 'Pago por consignaci&#243;n' },
      { id: '15', name: 'Condonaci&#243;n' },
      { id: '17', name: 'Compensaci&#243;n' },
      { id: '23', name: 'Novaci&#243;n' },
      { id: '24', name: 'Confusi&#243;n' },
      { id: '25', name: 'Remisi&#243;n de deuda' },
      { id: '26', name: 'Prescripci&#243;n o caducidad' },
      { id: '27', name: 'A satisfacci&#243;n del acreedor' },
      { id: '28', name: 'Tarjeta de d&#233;bito' },
      { id: '29', name: 'Tarjeta de servicios' },
      { id: '30', name: 'Aplicaci&#243;n de anticipos' },
      { id: '31', name: 'Intermediario de pagos' },
      { id: '99', name: 'Otros' },
    ];
  },
};
