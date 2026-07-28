import { useEffect, useRef } from 'react'
import { Order, Product } from '@/types/index'
import { useAppStore } from '@/store/appStore'
import { BRANDING } from '@/config/branding'

interface ReceiptTicketProps {
  order: Order
  products: Product[]
  saleTotal: number
  paymentMethod: string
  tableNumber: number
  businessName?: string
  address?: string
  phone?: string
  clientName?: string
  clientPhone?: string
}

export default function ReceiptTicket({
  order,
  products,
  saleTotal,
  paymentMethod,
  tableNumber,
  businessName = BRANDING.appWithBrand.toUpperCase(),
  address = 'Sistema Punto de Venta',
  phone = '',
  clientName = '',
  clientPhone = '',
}: ReceiptTicketProps) {
  const receiptRef = useRef<HTMLDivElement>(null)
  const { organizationSettings } = useAppStore()
  
  const ticketShowLogo = organizationSettings?.ticketShowLogo ?? true
  const ticketBusinessName = organizationSettings?.ticketBusinessName || businessName
  const ticketAddress = organizationSettings?.ticketAddress || address
  const ticketPhone = organizationSettings?.ticketPhone || phone
  const ticketFooterMsg = organizationSettings?.ticketFooterMsg || '¡Gracias por su compra!'
  const ticketWidth = organizationSettings?.ticketPrinterWidth || 58

  // Ancho imprimible real para impresora de 58mm (48mm área neta imprimible para evitar recortes laterales)
  const printableWidth = ticketWidth === 58 ? 48 : (ticketWidth === 80 ? 72 : 48)

  const registerName = (() => {
    const customNames = organizationSettings?.cashRegisters
    if (customNames && typeof customNames === 'object') {
      return customNames[tableNumber.toString()] || `Caja ${tableNumber}`
    }
    return `Caja ${tableNumber}`
  })()

  // Agrupar items por categoría
  const itemsByCategory = order.items.reduce((acc, item) => {
    const product = products.find(p => p.id === item.productId)
    const category = product?.category || 'General'
    if (!acc[category]) acc[category] = []
    acc[category].push({ ...item, productName: product?.name || item.name || 'Producto' })
    return acc
  }, {} as Record<string, any[]>)

  const ticketId = (order.id || '').replace('ticket-', '').slice(0, 8).toUpperCase()
  const ticketFolio = tableNumber ? `TK-${tableNumber}-${ticketId}` : `TK-${ticketId}`
  const barcodeUrl = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(ticketFolio)}&scale=2&height=12&includetext`


  useEffect(() => {
    const timer = setTimeout(() => {
      if (receiptRef.current) {
        const printWindow = window.open('', '_blank', 'width=420,height=600,left=200,top=200')
        if (printWindow) {
          printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <title>Ticket_${ticketId}</title>
              <style>
                * {
                  margin: 0;
                  padding: 0;
                  box-sizing: border-box;
                  color: #000 !important;
                }
                body {
                  width: ${printableWidth}mm;
                  margin: 0 auto;
                  padding: 1mm 0;
                  background: #fff;
                  font-family: 'Consolas', 'Courier New', monospace, system-ui;
                  font-weight: 700;
                  font-size: 11px;
                  line-height: 1.25;
                  text-align: left;
                }
                @media print {
                  @page {
                    size: ${ticketWidth}mm auto;
                    margin: 0;
                  }
                  body {
                    width: ${printableWidth}mm;
                    margin: 0 auto;
                  }
                }
              </style>
            </head>
            <body>
              ${receiptRef.current.innerHTML}
            </body>
            </html>
          `)
          printWindow.document.close()
          setTimeout(() => {
            try {
              printWindow.focus()
              printWindow.print()
            } catch (e) {}
          }, 300)
        }
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [organizationSettings, printableWidth, ticketId, ticketWidth])

  return (
    <div
      ref={receiptRef}
      className="receipt-ticket"
      style={{
        width: `${printableWidth}mm`,
        margin: '0 auto',
        padding: '1mm 0',
        fontFamily: "'Consolas', 'Courier New', monospace, system-ui",
        fontWeight: 700,
        fontSize: '11px',
        lineHeight: '1.25',
        backgroundColor: '#fff',
        color: '#000',
        boxSizing: 'border-box'
      }}
    >
      {/* Header Térmico Alto Contraste */}
      <div style={{ textAlign: 'center', marginBottom: '4px', borderBottom: '2px dashed #000', paddingBottom: '4px' }}>
        {ticketShowLogo && (
          <img 
            src={BRANDING.logoUrl} 
            alt="Logo" 
            style={{ width: '42px', height: '42px', marginBottom: '3px', borderRadius: '6px', objectFit: 'cover', display: 'block', margin: '0 auto 3px auto' }} 
          />
        )}
        <div style={{ fontWeight: 900, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.3px', color: '#000' }}>
          {ticketBusinessName}
        </div>
        <div style={{ fontSize: '10px', marginTop: '1px', color: '#000' }}>{ticketAddress}</div>
        {ticketPhone && <div style={{ fontSize: '10px', marginTop: '1px', color: '#000' }}>Tel: {ticketPhone}</div>}
      </div>

      {/* Info Ticket */}
      <div style={{ marginBottom: '4px', fontSize: '9.5px', borderBottom: '1px solid #000', paddingBottom: '4px', color: '#000' }}>
        <div style={{ display: 'flex', justifyBetween: 'space-between' }}>
          <span>FOLIO: #{ticketId}</span>
          <span style={{ marginLeft: 'auto', fontWeight: 'bold' }}>{registerName}</span>
        </div>
        <div>FECHA: {new Date().toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}</div>
        {clientName && <div style={{ fontWeight: 'bold', marginTop: '1px' }}>CLIENTE: {clientName.toUpperCase()} {clientPhone ? `(${clientPhone})` : ''}</div>}
      </div>

      {/* Desglose de Artículos */}
      <div style={{ marginBottom: '4px', borderBottom: '2px dashed #000', paddingBottom: '4px' }}>
        {Object.entries(itemsByCategory).map(([category, items]) => (
          <div key={category} style={{ marginBottom: '4px' }}>
            <div style={{ fontWeight: 900, fontSize: '9.5px', textTransform: 'uppercase', background: '#000', color: '#fff', padding: '1px 3px', marginBottom: '3px', borderRadius: '1px' }}>
              {category}
            </div>
            {items.map((item: any, idx: number) => {
              const itemQty = Number(item.quantity || 1)
              const itemUnitPrice = Number(item.unitPrice || item.price || 0)
              const itemTotal = itemUnitPrice * itemQty

              return (
                <div key={idx} style={{ marginBottom: '3px' }}>
                  <div style={{ fontWeight: 800, fontSize: '10.5px', textTransform: 'uppercase', wordBreak: 'break-word', color: '#000' }}>
                    {item.productName}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#000' }}>
                    <span>{itemQty} pz x ${itemUnitPrice.toFixed(2)}</span>
                    <span style={{ fontWeight: 900 }}>${itemTotal.toFixed(2)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Resumen Total Térmico */}
      <div style={{ marginBottom: '4px', borderBottom: '2px solid #000', paddingBottom: '4px', paddingTop: '2px' }}>
        <div style={{ fontWeight: 900, display: 'flex', justifyBetween: 'space-between', fontSize: '14px', border: '2px solid #000', padding: '3px 4px', textAlign: 'center' }}>
          <span>TOTAL:</span>
          <span style={{ marginLeft: 'auto' }}>${saleTotal.toFixed(2)}</span>
        </div>
      </div>

      {/* Método de Pago */}
      <div style={{ marginBottom: '4px', fontSize: '10.5px', textAlign: 'center', fontWeight: 900, textTransform: 'uppercase' }}>
        PAGO CON: {paymentMethod.toUpperCase()}
      </div>

      {/* Código de Barras Térmico Code128 con Folio del Ticket */}
      <div style={{ textAlign: 'center', fontSize: '9.5px', borderTop: '2px dashed #000', paddingTop: '4px', marginTop: '4px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <img 
          src={barcodeUrl} 
          alt={`barcode-${ticketFolio}`} 
          style={{ width: '38mm', height: '14mm', margin: '3px auto', display: 'block', objectFit: 'contain' }} 
        />
        <div style={{ fontWeight: 900, marginTop: '1px', fontSize: '9px', letterSpacing: '0.5px' }}>FOLIO: {ticketFolio}</div>
        <div style={{ fontWeight: 900, marginTop: '2px' }}>{ticketFooterMsg}</div>

        <div style={{ fontSize: '8.5px', marginTop: '1px' }}>{BRANDING.receiptTagline}</div>

        {/* Powered by Reisbloc */}
        <div style={{ marginTop: '4px', borderTop: '1px solid #000', paddingTop: '3px', width: '100%', fontSize: '8.5px', fontWeight: 'bold' }}>
          <div>⚡ {BRANDING.poweredBy}</div>
          <div style={{ fontSize: '8px', fontWeight: 'normal' }}>{BRANDING.poweredByUrl}</div>
        </div>
      </div>
    </div>
  )
}
