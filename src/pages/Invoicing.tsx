import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { facturapiService, InvoiceData, InvoiceResponse } from '../services/facturapiService';
import { useAuth } from '../hooks/useAuth';
import { BRANDING } from '../config/branding';
import { 
  Receipt, 
  FileText, 
  Download, 
  AlertCircle, 
  CheckCircle, 
  XCircle,
  Loader2,
  Plus,
  Trash2,
  Send
} from 'lucide-react';

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxClassification: 'IVA' | 'IEPS' | 'ISR' | 'No aplica';
  taxRate: number;
}

interface Customer {
  id?: string;
  rfc: string;
  legalName: string;
  email: string;
  fiscalRegime: string;
  taxSystem: string;
}

export default function Invoicing() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState<InvoiceResponse[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  
  const [customer, setCustomer] = useState<Customer>({
    rfc: '',
    legalName: '',
    email: '',
    fiscalRegime: '601',
    taxSystem: '601',
  });
  
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: '1', description: '', quantity: 1, unitPrice: 0, taxClassification: 'IVA', taxRate: 16 }
  ]);
  
  const [use, setUse] = useState('G01');
  const [paymentForm, setPaymentForm] = useState('03');
  
  const taxRegimes = facturapiService.getCustomerTaxRegimes();
  const usageTypes = facturapiService.getUsageTypes();
  const paymentForms = facturapiService.getPaymentForms();

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error('Error loading invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    setItems([...items, {
      id: Date.now().toString(),
      description: '',
      quantity: 1,
      unitPrice: 0,
      taxClassification: 'IVA',
      taxRate: 16
    }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let taxTotal = 0;
    
    items.forEach(item => {
      const itemSubtotal = item.quantity * item.unitPrice;
      const itemTax = itemSubtotal * (item.taxRate / 100);
      subtotal += itemSubtotal;
      taxTotal += itemTax;
    });
    
    return { subtotal, taxTotal, total: subtotal + taxTotal };
  };

  const handleCreateInvoice = async () => {
    if (!customer.rfc || !customer.legalName || !customer.email) {
      alert('Completa los datos del cliente');
      return;
    }
    
    const validItems = items.filter(item => item.description && item.quantity > 0 && item.unitPrice > 0);
    if (validItems.length === 0) {
      alert('Agrega al menos un producto');
      return;
    }
    
    setCreateLoading(true);
    
    try {
      const invoiceData: InvoiceData = {
        items: validItems.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxClassification: item.taxClassification as any,
          taxRate: item.taxRate,
        })),
        customer: {
          legalName: customer.legalName,
          taxId: customer.rfc,
          email: customer.email,
          fiscalRegime: customer.fiscalRegime,
          taxSystem: customer.taxSystem,
        },
        use: use,
        paymentForm: paymentForm,
        observations: `Venta desde ${BRANDING.appWithBrand} - ${new Date().toISOString().split('T')[0]}`,
      };
      
      const result = await facturapiService.createInvoice(invoiceData);
      
      alert(`Factura creada: ${result.folioNumber || result.id}`);
      setShowCreateModal(false);
      resetForm();
      loadInvoices();
    } catch (error: any) {
      console.error('Error creating invoice:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setCreateLoading(false);
    }
  };

  const resetForm = () => {
    setCustomer({ rfc: '', legalName: '', email: '', fiscalRegime: '601', taxSystem: '601' });
    setItems([{ id: '1', description: '', quantity: 1, unitPrice: 0, taxClassification: 'IVA', taxRate: 16 }]);
  };

  const downloadPdf = async (invoiceId: string) => {
    try {
      const blob = await facturapiService.downloadPdf(invoiceId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `factura-${invoiceId}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Error al descargar PDF');
    }
  };

  const downloadXml = async (invoiceId: string) => {
    try {
      const blob = await facturapiService.downloadXml(invoiceId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `factura-${invoiceId}.xml`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading XML:', error);
      alert('Error al descargar XML');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'validated':
        return <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
          <CheckCircle size={12} /> Validada
        </span>;
      case 'pending':
        return <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded-full">
          <Loader2 size={12} className="animate-spin" /> Pendiente
        </span>;
      case 'canceled':
        return <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
          <XCircle size={12} /> Cancelada
        </span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full">
          <AlertCircle size={12} /> {status}
        </span>;
    }
  };

  const { subtotal, taxTotal, total } = calculateTotals();
  const isConfigured = facturapiService.isConfigured();

  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} className="text-amber-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Facturación no configurada</h2>
          <p className="text-slate-600 mb-4">
            La integración con Facturapi aún no está configurada. Contacta al administrador.
          </p>
          <p className="text-xs text-slate-400">
            Necesitas: VITE_FACTURAPI_API_KEY
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
              <Receipt className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Facturación CFDI 4.0</h1>
              <p className="text-sm text-slate-500">Emitidas con Facturapi</p>
            </div>
          </div>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors"
          >
            <Plus size={18} />
            Nueva Factura
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <p className="text-sm text-slate-500">Total Emitidas</p>
            <p className="text-2xl font-bold text-slate-900">{invoices.length}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <p className="text-sm text-slate-500">Validadas</p>
            <p className="text-2xl font-bold text-green-600">{invoices.filter(i => i.status === 'validated').length}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <p className="text-sm text-slate-500">Pendientes</p>
            <p className="text-2xl font-bold text-yellow-600">{invoices.filter(i => i.status === 'pending').length}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <p className="text-sm text-slate-500">Canceladas</p>
            <p className="text-2xl font-bold text-red-600">{invoices.filter(i => i.status === 'canceled').length}</p>
          </div>
        </div>

        {/* Invoice List */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Facturas Recientes</h2>
            <button
              onClick={loadInvoices}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Actualizar
            </button>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="animate-spin mx-auto text-slate-400" size={32} />
            </div>
          ) : invoices.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <FileText size={48} className="mx-auto mb-3 opacity-30" />
              <p>No hay facturas registradas</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-2 text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Crear la primera factura
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {invoices.map((invoice) => (
                <div key={invoice.id} className="px-6 py-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <FileText className="text-indigo-600" size={18} />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">
                        {invoice.series || 'RBL'}-{invoice.folioNumber || invoice.id.slice(0, 8)}
                      </p>
                      <p className="text-sm text-slate-500">
                        {invoice.uuid ? `UUID: ${invoice.uuid.slice(0, 8)}...` : 'Sin UUID'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold text-slate-900">${invoice.total?.toFixed(2) || '0.00'} MXN</p>
                      <p className="text-sm text-slate-500">
                        {new Date(invoice.createdAt).toLocaleDateString('es-MX')}
                      </p>
                    </div>
                    
                    {getStatusBadge(invoice.status)}
                    
                    <div className="flex items-center gap-2">
                      {invoice.pdfUrl && (
                        <button
                          onClick={() => downloadPdf(invoice.id)}
                          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Descargar PDF"
                        >
                          <Download size={18} className="text-slate-600" />
                        </button>
                      )}
                      {invoice.xmlUrl && (
                        <button
                          onClick={() => downloadXml(invoice.id)}
                          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Descargar XML"
                        >
                          <FileText size={18} className="text-slate-600" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Invoice Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Crear Nueva Factura</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <XCircle size={20} className="text-slate-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Customer Info */}
              <div className="bg-slate-50 rounded-xl p-4">
                <h3 className="font-semibold text-slate-900 mb-4">Datos del Cliente</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">RFC *</label>
                    <input
                      type="text"
                      value={customer.rfc}
                      onChange={(e) => setCustomer({...customer, rfc: e.target.value.toUpperCase()})}
                      placeholder="XAXX010101000"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Razón Social *</label>
                    <input
                      type="text"
                      value={customer.legalName}
                      onChange={(e) => setCustomer({...customer, legalName: e.target.value})}
                      placeholder="EMPRESA SA DE CV"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                    <input
                      type="email"
                      value={customer.email}
                      onChange={(e) => setCustomer({...customer, email: e.target.value})}
                      placeholder="cliente@ejemplo.com"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Régimen Fiscal *</label>
                    <select
                      value={customer.fiscalRegime}
                      onChange={(e) => setCustomer({...customer, fiscalRegime: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      {taxRegimes.map(regime => (
                        <option key={regime.id} value={regime.id}>{regime.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-900">Conceptos</h3>
                  <button
                    onClick={addItem}
                    className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    <Plus size={16} /> Agregar concepto
                  </button>
                </div>
                
                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={item.id} className="bg-slate-50 rounded-xl p-4">
                      <div className="grid grid-cols-12 gap-3 items-end">
                        <div className="col-span-5">
                          <label className="block text-xs text-slate-500 mb-1">Descripción</label>
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                            placeholder="Descripción del producto"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs text-slate-500 mb-1">Cantidad</label>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                            min="1"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs text-slate-500 mb-1">Precio Unit.</label>
                          <input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs text-slate-500 mb-1">IVA %</label>
                          <select
                            value={item.taxRate}
                            onChange={(e) => updateItem(item.id, 'taxRate', parseFloat(e.target.value))}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="16">16%</option>
                            <option value="8">8%</option>
                            <option value="0">0%</option>
                          </select>
                        </div>
                        <div className="col-span-1 flex justify-end">
                          <button
                            onClick={() => removeItem(item.id)}
                            className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                            disabled={items.length === 1}
                          >
                            <Trash2 size={18} className="text-red-500" />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-slate-500 mt-2 text-right">
                        Subtotal: ${(item.quantity * item.unitPrice).toFixed(2)} | IVA: ${(item.quantity * item.unitPrice * item.taxRate / 100).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="bg-indigo-50 rounded-xl p-4">
                <div className="flex justify-between items-center text-lg">
                  <span className="font-medium text-slate-700">Subtotal:</span>
                  <span className="font-bold text-slate-900">${subtotal.toFixed(2)} MXN</span>
                </div>
                <div className="flex justify-between items-center text-lg mt-2">
                  <span className="font-medium text-slate-700">IVA:</span>
                  <span className="font-bold text-slate-900">${taxTotal.toFixed(2)} MXN</span>
                </div>
                <div className="flex justify-between items-center text-xl mt-3 pt-3 border-t border-indigo-200">
                  <span className="font-bold text-slate-900">Total:</span>
                  <span className="font-bold text-indigo-600">${total.toFixed(2)} MXN</span>
                </div>
              </div>

              {/* Invoice Options */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Uso CFDI *</label>
                  <select
                    value={use}
                    onChange={(e) => setUse(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    {usageTypes.map(type => (
                      <option key={type.id} value={type.id}>{type.id} - {type.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Forma de Pago *</label>
                  <select
                    value={paymentForm}
                    onChange={(e) => setPaymentForm(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    {paymentForms.map(form => (
                      <option key={form.id} value={form.id}>{form.id} - {form.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-slate-700 font-medium hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateInvoice}
                disabled={createLoading || total === 0}
                className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {createLoading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Send size={18} />
                )}
                {createLoading ? 'Creando...' : 'Crear Factura'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
