import { useEffect, useRef } from 'react'
import { Order, Product } from '@/types/index'

interface ReceiptTicketProps {
  order: Order
  products: Product[]
  saleTotal: number
  paymentMethod: string
  tableNumber: number
  businessName?: string
  address?: string
  phone?: string
}

export default function ReceiptTicket({
  order,
  products,
  saleTotal,
  paymentMethod,
  tableNumber,
  businessName = 'REISBLOC RETAIL',
  address = 'Sistema Punto de Venta',
  phone = '',
}: ReceiptTicketProps) {
  const receiptRef = useRef<HTMLDivElement>(null)

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
          printWindow.document.write(receiptRef.current.innerHTML)
          printWindow.document.close()
          printWindow.print()
          printWindow.close()
        }
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  return (
    <div
      ref={receiptRef}
      className="receipt-ticket"
      style={{
        width: '58mm',
        padding: '8px',
        fontFamily: '"Courier New", monospace',
        fontSize: '11px',
        lineHeight: '1.2',
        backgroundColor: '#fff',
        color: '#000',
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '8px', borderBottom: '1px solid #000' }}>
        <div style={{ fontWeight: 'bold', fontSize: '12px' }}>{businessName}</div>
        <div style={{ fontSize: '9px' }}>{address}</div>
        {phone && <div style={{ fontSize: '9px' }}>{phone}</div>}
      </div>

      {/* Ticket Info */}
      <div style={{ marginBottom: '6px', fontSize: '9px' }}>
        <div>Ticket: {order.id?.slice(0, 8) || 'N/A'}</div>
        <div>Caja: {tableNumber}</div>
        <div>Fecha: {new Date().toLocaleString('es-MX')}</div>
      </div>

      {/* Items */}
      <div style={{ marginBottom: '8px', borderBottom: '1px solid #000', paddingBottom: '8px' }}>
        {Object.entries(itemsByCategory).map(([category, items]) => (
          <div key={category} style={{ marginBottom: '6px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '10px', borderBottom: '1px dashed #ccc' }}>
              {category}
            </div>
            {items.map((item: any, idx: number) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                <div>
                  {item.productName} ({item.quantity} pz)
                </div>
                <div>${(item.price * item.quantity).toFixed(2)}</div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Totales */}
      <div style={{ marginBottom: '8px', borderBottom: '1px solid #000', paddingBottom: '8px' }}>
        <div style={{ fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
          <span>TOTAL:</span>
          <span>${saleTotal.toFixed(2)}</span>
        </div>
      </div>

      {/* Método de pago */}
      <div style={{ marginBottom: '8px', fontSize: '10px', textAlign: 'center' }}>
        <div>Pagado: {paymentMethod.toUpperCase()}</div>
      </div>

      {/* Footer */}
      <div
        style={{
          textAlign: 'center',
          fontSize: '9px',
          borderTop: '1px solid #000',
          paddingTop: '4px',
          marginTop: '8px',
        }}
      >
        <div>¡Gracias por su compra!</div>
        <div style={{ marginTop: '4px', fontSize: '8px' }}>
          Vuelva pronto
        </div>
      </div>

      {/* Hidden styles para impresión */}
      <style>{`
        @media print {
          * {
            margin: 0;
            padding: 0;
          }
          body {
            width: 58mm;
            font-family: "Courier New", monospace;
          }
          .receipt-ticket {
            width: 100%;
          }
        }
      `}</style>
    </div>
  )
}
