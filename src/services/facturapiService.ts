import { supabase } from '../config/supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';

export interface InvoiceData {
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
  }[];
  customer: {
    legalName: string;
    taxId: string;
    email: string;
    fiscalRegime: string;
    taxSystem: string;
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
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      throw new Error('No hay sesión activa');
    }

    const response = await fetch(`${SUPABASE_URL}/functions/v1/create-invoice`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customer: {
          legalName: data.customer.legalName,
          taxId: data.customer.taxId,
          email: data.customer.email,
          fiscalRegime: data.customer.fiscalRegime,
          taxSystem: data.customer.taxSystem,
        },
        items: data.items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
        })),
        use: data.use,
        paymentForm: data.paymentForm,
        paymentMethod: data.paymentMethod || 'PUE',
        observations: data.observations,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al crear factura');
    }

    const result = await response.json();
    return result.invoice;
  },

  async downloadPdf(invoiceId: string): Promise<Blob> {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('No hay sesión');

    const response = await fetch(`${SUPABASE_URL}/rest/v1/invoices?facturapi_id=eq.${invoiceId}&select=pdf_url`, {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY!,
      },
    });

    const data = await response.json();
    if (!data[0]?.pdf_url) throw new Error('PDF no disponible');

    const pdfResponse = await fetch(data[0].pdf_url);
    return pdfResponse.blob();
  },

  async downloadXml(invoiceId: string): Promise<Blob> {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('No hay sesión');

    const response = await fetch(`${SUPABASE_URL}/rest/v1/invoices?facturapi_id=eq.${invoiceId}&select=xml_url`, {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY!,
      },
    });

    const data = await response.json();
    if (!data[0]?.xml_url) throw new Error('XML no disponible');

    const xmlResponse = await fetch(data[0].xml_url);
    return xmlResponse.blob();
  },

  isConfigured(): boolean {
    return true;
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
      { id: '28', name: 'Tarjeta de d&#233;bito' },
      { id: '99', name: 'Otros' },
    ];
  },
};
