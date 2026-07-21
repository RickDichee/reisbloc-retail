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
    const category = product?.category || 'Productos'
    if (!acc[category]) acc[category] = []
    acc[category].push({ ...item, productName: product?.name || 'Desconocido' })
    return acc
  }, {} as Record<string, any[]>)

  useEffect(() => {
    const timer = setTimeout(() => {
      if (receiptRef.current) {
        const printWindow = window.open('', '', 'height=800,width=400')
        if (printWindow) {
          const printerWidth = organizationSettings?.ticketPrinterWidth || 58
          printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <style>
                * {
                  margin: 0;
                  padding: 0;
                  box-sizing: border-box;
                  color: #000 !important;
                  -webkit-font-smoothing: none !important;
                  -moz-osx-font-smoothing: none !important;
                  font-smooth: never !important;
                }
                body {
                  width: ${printerWidth}mm;
                  padding: 4px;
                  background: white;
                  font-family: Arial, Helvetica, sans-serif;
                  font-weight: 900;
                  font-size: 12px;
                  line-height: 1.3;
                }
                .dashed-divider {
                  border-bottom: 2px dashed #000 !important;
                  margin: 6px 0;
                }
                .solid-divider {
                  border-bottom: 3px solid #000 !important;
                  margin: 8px 0;
                }
              </style>
            </head>
            <body>
              ${receiptRef.current.innerHTML}
            </body>
            </html>
          `)
          printWindow.document.close()
          printWindow.print()
          printWindow.close()
        }
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [organizationSettings])

  return (
    <div
      ref={receiptRef}
      className="receipt-ticket"
      style={{
        width: `${organizationSettings?.ticketPrinterWidth || 58}mm`,
        padding: '6px',
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontWeight: 900,
        fontSize: '12px',
        lineHeight: '1.3',
        backgroundColor: '#fff',
        color: '#000',
        WebkitFontSmoothing: 'none',
        fontSmooth: 'never'
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '6px', borderBottom: '3px solid #000', paddingBottom: '6px' }}>
        {ticketShowLogo && (
          <img src={BRANDING.logoUrl} alt="Logo" style={{ width: '46px', height: '46px', marginBottom: '4px', borderRadius: '8px', objectFit: 'cover' }} />
        )}
        <div style={{ fontWeight: 'bold', fontSize: '15px', textTransform: 'uppercase' }}>{ticketBusinessName}</div>
        <div style={{ fontSize: '11px', marginTop: '2px' }}>{ticketAddress}</div>
        {ticketPhone && <div style={{ fontSize: '11px', marginTop: '1px' }}>Tel: {ticketPhone}</div>}
      </div>

      {/* Ticket Info */}
      <div style={{ marginBottom: '6px', fontSize: '10px' }}>
        <div>Ticket: {order.id?.slice(0, 8) || 'N/A'}</div>
        <div>Caja: {registerName}</div>
        <div>Fecha: {new Date().toLocaleString('es-MX')}</div>
        {clientName && <div>Cliente: {clientName} {clientPhone ? `(${clientPhone})` : ''}</div>}
      </div>

      {/* Items */}
      <div style={{ marginBottom: '6px', borderBottom: '2px dashed #000', paddingBottom: '6px' }}>
        {Object.entries(itemsByCategory).map(([category, items]) => (
          <div key={category} style={{ marginBottom: '6px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '11px', borderBottom: '2px dashed #000', paddingBottom: '2px', textTransform: 'uppercase' }}>
              {category}
            </div>
            {items.map((item: any, idx: number) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3px' }}>
                <div style={{ paddingRight: '4px' }}>
                  {item.productName} ({item.quantity} pz)
                </div>
                <div style={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                  ${((item.unitPrice || item.price || 0) * item.quantity).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Totales */}
      <div style={{ marginBottom: '6px', borderBottom: '3px solid #000', paddingBottom: '6px' }}>
        <div style={{ fontWeight: 'black', display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
          <span>TOTAL:</span>
          <span>${saleTotal.toFixed(2)}</span>
        </div>
      </div>

      {/* Método de pago */}
      <div style={{ marginBottom: '6px', fontSize: '11px', textAlign: 'center', fontWeight: 'bold' }}>
        <div>PAGO: {paymentMethod.toUpperCase()}</div>
      </div>

      {/* Footer */}
      <div
        style={{
          textAlign: 'center',
          fontSize: '11px',
          borderTop: '2px dashed #000',
          paddingTop: '6px',
          marginTop: '6px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2px'
        }}
      >
        <div style={{ fontWeight: 'bold' }}>{ticketFooterMsg}</div>
        <div style={{ fontSize: '10px', fontStyle: 'italic', marginTop: '2px' }}>
          {BRANDING.receiptTagline}
        </div>

        {/* Publicidad Reisbloc (Siempre Visible al Bottom por Requerimiento Fijo) */}
        <div style={{
          marginTop: '8px',
          borderTop: '2px dashed #000',
          paddingTop: '6px',
          width: '100%',
          fontSize: '10px',
          fontWeight: 'bold',
          textAlign: 'center'
        }}>
          <div>⚡ {BRANDING.poweredBy}</div>
          <div style={{ fontSize: '9px', fontWeight: 'normal', marginTop: '1px' }}>{BRANDING.poweredByUrl}</div>
        </div>
      </div>

      {/* Hidden styles para impresión */}
      <style>{`
        @media print {
          @page {
            margin: 0;
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            color: #000 !important;
            -webkit-font-smoothing: none !important;
            -moz-osx-font-smoothing: none !important;
            font-smooth: never !important;
          }
          body {
            width: ${organizationSettings?.ticketPrinterWidth || 58}mm;
            font-family: Arial, Helvetica, sans-serif;
            font-weight: 900;
          }
          .receipt-ticket {
            width: ${organizationSettings?.ticketPrinterWidth || 58}mm;
            padding: 1mm !important;
          }
          img {
            -webkit-print-color-adjust: exact;
            object-fit: cover;
          }
        }
      `}</style>
    </div>
  )
}
