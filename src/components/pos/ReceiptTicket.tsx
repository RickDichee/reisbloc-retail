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
  width?: number
}

export default function ReceiptTicket({
  order,
  products,
  saleTotal,
  paymentMethod,
  tableNumber,
  businessName,
  address = '',
  phone = '',
  clientName = '',
  clientPhone = '',
  width,
}: ReceiptTicketProps) {
  const receiptRef = useRef<HTMLDivElement>(null)
  const { organizationSettings, currentUser } = useAppStore()
  
  const isMM = Boolean(
    currentUser?.organizationId === '1b498fa6-aca5-428c-9bdd-01e6fea30316' ||
    organizationSettings?.slug === 'modamiel' ||
    organizationSettings?.name?.toLowerCase().includes('moda miel')
  )

  const defaultName = isMM ? 'MODA MIEL MX' : (organizationSettings?.businessName || organizationSettings?.name || currentUser?.businessName || 'REISBLOC STORE')
  const ticketShowLogo = organizationSettings?.ticketShowLogo ?? true
  const ticketBusinessName = (organizationSettings?.ticketBusinessName || businessName || defaultName).toUpperCase()
  const defaultAddress = isMM ? 'TEXTICUITZEO PASILLO 3 LOCAL 230' : ''
  const ticketAddress = organizationSettings?.ticketAddress || address || defaultAddress

  const ticketPhone = organizationSettings?.ticketPhone || phone
  const ticketFooterMsg = organizationSettings?.ticketFooterMsg || '¡Gracias por su compra!'
  const ticketWidth = width || organizationSettings?.ticketPrinterWidth || (typeof window !== 'undefined' ? (parseInt(localStorage.getItem('preferred_ticket_width') || '80') || 80) : 80) || 80

  // Ancho imprimible real: 80mm (72mm área neta) y 58mm (46mm área neta con 1mm de margen de seguridad)
  const is80mm = ticketWidth >= 70
  const printableWidth = is80mm ? 72 : 46

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
    const itemSku = (item as any).sku || product?.sku || product?.barcode || (item as any).barcode || ''
    if (!acc[category]) acc[category] = []
    acc[category].push({
      ...item,
      productName: product?.name || (item as any).name || item.productName || 'Producto',
      sku: itemSku
    })
    return acc
  }, {} as Record<string, any[]>)

  const ticketId = (order.id || '').replace('ticket-', '').slice(0, 8).toUpperCase()
  const ticketFolio = tableNumber ? `TK-${tableNumber}-${ticketId}` : `TK-${ticketId}`
  const barcodeUrl = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(ticketFolio)}&scale=2&height=12&includetext`

  useEffect(() => {
    const timer = setTimeout(() => {
      if (receiptRef.current) {
        const printWindow = window.open('', '_blank', 'width=450,height=650,left=150,top=100')
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
                  box-sizing: border-box !important;
                  color: #000 !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                @page {
                  size: auto;
                  margin: 0mm !important;
                }
                html, body {
                  width: 100% !important;
                  max-width: ${printableWidth}mm !important;
                  margin: 0 auto !important;
                  padding: 0 1mm !important;
                  background: #fff !important;
                  font-family: 'Consolas', 'Courier New', monospace, system-ui;
                  font-weight: 700;
                  font-size: ${is80mm ? '11px' : '9.5px'};
                  line-height: 1.25;
                  text-align: left;
                  overflow: visible !important;
                }
                .receipt-ticket {
                  width: 100% !important;
                  max-width: 100% !important;
                  margin: 0 auto !important;
                  padding: 0 !important;
                  box-sizing: border-box !important;
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                }
                @media print {
                  html, body {
                    width: 100% !important;
                    max-width: ${printableWidth}mm !important;
                    margin: 0 auto !important;
                    padding: 0 1mm !important;
                  }
                  .receipt-ticket {
                    width: 100% !important;
                    max-width: 100% !important;
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
  }, [organizationSettings, printableWidth, ticketId, ticketWidth, is80mm])

  return (
    <div
      ref={receiptRef}
      className="receipt-ticket"
      style={{
        width: '100%',
        maxWidth: `${printableWidth}mm`,
        margin: '0 auto',
        padding: '1mm 1.5mm',
        fontFamily: "'Consolas', 'Courier New', monospace, system-ui",
        fontWeight: 700,
        fontSize: is80mm ? '11px' : '9.5px',
        lineHeight: '1.25',
        backgroundColor: '#fff',
        color: '#000',
        boxSizing: 'border-box',
        wordBreak: 'break-word',
        overflowWrap: 'break-word'
      }}
    >
      {/* Header Térmico Alto Contraste */}
      <div style={{ textAlign: 'center', marginBottom: '5px', borderBottom: '2px dashed #000', paddingBottom: '4px' }}>
        {ticketShowLogo && (
          <img 
            src={isMM ? '/images/moda-miel-mx-logo.jpeg' : (organizationSettings?.logoUrl || BRANDING.logoUrl)} 
            alt="Logo" 
            style={{ width: is80mm ? '46px' : '36px', height: is80mm ? '46px' : '36px', marginBottom: '3px', borderRadius: '4px', objectFit: 'cover', display: 'block', margin: '0 auto 3px auto' }} 
          />
        )}
        <div style={{ fontWeight: 900, fontSize: is80mm ? '15px' : '12px', textTransform: 'uppercase', letterSpacing: '0.2px', color: '#000', wordBreak: 'break-word' }}>
          {ticketBusinessName}
        </div>
        <div style={{ fontSize: is80mm ? '10px' : '8.5px', marginTop: '1px', color: '#000', wordBreak: 'break-word' }}>{ticketAddress}</div>
        {ticketPhone && <div style={{ fontSize: is80mm ? '10px' : '8.5px', marginTop: '1px', color: '#000' }}>Tel: {ticketPhone}</div>}
      </div>

      {/* Info Ticket */}
      <div style={{ marginBottom: '5px', fontSize: is80mm ? '10px' : '8.5px', borderBottom: '1px solid #000', paddingBottom: '4px', color: '#000' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontWeight: 900 }}>FOLIO: #{ticketId}</span>
          <span style={{ marginLeft: 'auto', fontWeight: 900 }}>{registerName}</span>
        </div>
        <div>FECHA: {new Date().toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}</div>
        {clientName && <div style={{ fontWeight: 900, marginTop: '2px', wordBreak: 'break-word' }}>CLIENTE: {clientName.toUpperCase()} {clientPhone ? `(${clientPhone})` : ''}</div>}
      </div>

      {/* Desglose de Artículos */}
      <div style={{ marginBottom: '5px', borderBottom: '2px dashed #000', paddingBottom: '4px' }}>
        {Object.entries(itemsByCategory).map(([category, items]) => (
          <div key={category} style={{ marginBottom: '4px' }}>
            <div style={{ fontWeight: 900, fontSize: is80mm ? '10px' : '8.5px', textTransform: 'uppercase', background: '#000', color: '#fff', padding: '1px 3px', marginBottom: '3px', borderRadius: '1px' }}>
              {category}
            </div>
            {items.map((item: any, idx: number) => {
              const itemQty = Number(item.quantity || 1)
              const itemUnitPrice = Number(item.unitPrice || item.price || 0)
              const itemTotal = itemUnitPrice * itemQty
              const sku = item.sku || ''

              return (
                <div key={idx} style={{ marginBottom: '3px', borderBottom: '1px dotted #ccc', paddingBottom: '2px' }}>
                  <div style={{ fontWeight: 900, fontSize: is80mm ? '11px' : '9.5px', textTransform: 'uppercase', wordBreak: 'break-word', color: '#000', lineHeight: '1.2' }}>
                    {item.productName}
                  </div>
                  {sku && (
                    <div style={{ fontSize: is80mm ? '9px' : '8px', fontWeight: 800, color: '#333', letterSpacing: '0.2px', marginTop: '1px' }}>
                      SKU: {sku}
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: is80mm ? '10px' : '8.5px', color: '#000', marginTop: '1px' }}>
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
      <div style={{ marginBottom: '5px', borderBottom: '2px solid #000', paddingBottom: '4px', paddingTop: '2px' }}>
        <div style={{ fontWeight: 900, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: is80mm ? '14px' : '12px', border: '2px solid #000', padding: '3px 5px', boxSizing: 'border-box', width: '100%' }}>
          <span>TOTAL:</span>
          <span style={{ marginLeft: 'auto' }}>${saleTotal.toFixed(2)}</span>
        </div>
      </div>

      {/* Método de Pago */}
      <div style={{ marginBottom: '5px', fontSize: is80mm ? '10.5px' : '9px', textAlign: 'center', fontWeight: 900, textTransform: 'uppercase' }}>
        PAGO CON: {paymentMethod.toUpperCase()}
      </div>

      {/* Código de Barras Térmico Code128 con Folio del Ticket */}
      <div style={{ textAlign: 'center', fontSize: is80mm ? '10px' : '8.5px', borderTop: '2px dashed #000', paddingTop: '4px', marginTop: '4px', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', boxSizing: 'border-box' }}>
        <img 
          src={barcodeUrl} 
          alt={`barcode-${ticketFolio}`} 
          style={{ width: is80mm ? '42mm' : '34mm', maxWidth: '88%', height: is80mm ? '13mm' : '10mm', margin: '3px auto', display: 'block', objectFit: 'contain' }} 
        />
        <div style={{ fontWeight: 900, marginTop: '1px', fontSize: is80mm ? '9.5px' : '8px', letterSpacing: '0.3px' }}>FOLIO: {ticketFolio}</div>
        <div style={{ fontWeight: 900, marginTop: '1px', wordBreak: 'break-word' }}>{ticketFooterMsg}</div>

        <div style={{ fontSize: is80mm ? '8.5px' : '7.5px', marginTop: '1px' }}>{BRANDING.receiptTagline}</div>

      {/* 📢 LEYENDA Y CONTACTO WHATSAPP CON DISEÑO MODERNO */}
        <div style={{
          marginTop: '6px',
          paddingTop: '4px',
          borderTop: '2px solid #000',
          width: '100%',
          textAlign: 'center',
          fontWeight: 900,
          fontSize: is80mm ? '10px' : '8.5px',
          lineHeight: '1.3',
          textTransform: 'uppercase',
          color: '#000',
          boxSizing: 'border-box'
        }}>
          <div style={{ letterSpacing: '0.2px', marginBottom: '3px' }}>
            NO HAY CAMBIOS NI DEVOLUCIONES
          </div>
          
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px',
            fontSize: is80mm ? '10.5px' : '9px',
            fontWeight: 900,
            background: '#000',
            color: '#fff',
            padding: '2px 8px',
            borderRadius: '4px',
            letterSpacing: '0.2px',
            maxWidth: '100%',
            boxSizing: 'border-box',
            wordBreak: 'break-word'
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#ffffff" style={{ display: 'inline-block', flexShrink: 0 }}>
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.205 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
            </svg>
            <span style={{ color: '#fff' }}>WHATSAPP: 445 131 1808</span>
          </div>
        </div>

        {/* Powered by Reisbloc */}
        <div style={{
          marginTop: '6px',
          paddingTop: '4px',
          borderTop: '1px solid #000',
          width: '100%',
          textAlign: 'center',
          color: '#000'
        }}>
          <div style={{ fontSize: '7.5px', fontWeight: 900, letterSpacing: '0.3px' }}>
            ⚡ {BRANDING.poweredBy}
          </div>
          <div style={{ fontSize: '7px', fontWeight: 700, marginTop: '1px', textTransform: 'none' }}>
            {BRANDING.poweredByTagline}
          </div>
        </div>
      </div>
    </div>
  )
}
