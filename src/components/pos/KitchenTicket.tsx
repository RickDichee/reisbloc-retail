import { useRef } from 'react'
import logger from '@/utils/logger'
import { Order, Product } from '@/types/index'
import { Printer } from 'lucide-react'

interface KitchenTicketProps {
  order: Order
  products: Product[]
  tableNumber: number
  isBar?: boolean
  businessName?: string
  ticketNumber?: number
}

export default function KitchenTicket({
  order,
  products,
  tableNumber,
  isBar = false,
  businessName = 'RESTAURANTE TPV',
  ticketNumber,
}: KitchenTicketProps) {
  const ticketRef = useRef<HTMLDivElement>(null)

  // Filtrar items por destino
  const destinationItems = order.items.filter(item => {
    const product = products.find(p => p.id === item.productId)
    const isBar_ = product?.category === 'Bebidas'
    return isBar ? isBar_ : !isBar_
  })

  const handlePrint = () => {
    if (ticketRef.current) {
      const printWindow = window.open('', '', 'height=600,width=350')
      if (printWindow) {
        printWindow.document.write(ticketRef.current.innerHTML)
        printWindow.document.close()
        printWindow.print()
        printWindow.close()
      }
    }
  }

  if (destinationItems.length === 0) return null

  const destination = isBar ? '🍹 BARRA' : '🍽️ COCINA'

  return (
    <>
      <div
        ref={ticketRef}
        className="kitchen-ticket"
        style={{
          width: '58mm',
          padding: '8px',
          fontFamily: '"Courier New", monospace',
          fontSize: '12px',
          lineHeight: '1.4',
          backgroundColor: '#fff',
          color: '#000',
          display: 'none', // Hidden, solo para print
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '8px', borderBottom: '2px solid #000' }}>
          <div style={{ fontWeight: 'bold', fontSize: '14px', letterSpacing: '2px' }}>
            {destination}
          </div>
          <div style={{ fontSize: '10px', marginTop: '4px' }}>COMANDA DE ORDEN</div>
        </div>

        {/* Orden Info */}
        <div style={{ marginBottom: '8px', borderBottom: '1px dashed #000', paddingBottom: '6px', fontSize: '11px' }}>
          <div>
            <strong>Mesa:</strong> {tableNumber}
          </div>
          <div>
            <strong>Hora:</strong> {new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
          </div>
          {ticketNumber && (
            <div>
              <strong>Comanda:</strong> #{ticketNumber}
            </div>
          )}
        </div>

        {/* Items */}
        <div style={{ marginBottom: '8px', borderBottom: '1px dashed #000', paddingBottom: '6px' }}>
          {destinationItems.map((item, idx) => {
            const product = products.find(p => p.id === item.productId)
            return (
              <div key={idx} style={{ marginBottom: '6px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '13px' }}>
                  {item.quantity}x {product?.name || 'Desconocido'}
                </div>
                {item.notes && (
                  <div
                    style={{
                      fontSize: '11px',
                      fontStyle: 'italic',
                      marginLeft: '8px',
                      marginTop: '2px',
                      borderLeft: '2px solid #000',
                      paddingLeft: '4px',
                    }}
                  >
                    📝 {item.notes}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', fontSize: '10px', paddingTop: '4px' }}>
          <div style={{ fontWeight: 'bold' }}>⏱️ URGENTE</div>
          <div style={{ fontSize: '9px', marginTop: '4px' }}>Impreso: {new Date().toLocaleString('es-MX')}</div>
        </div>
      </div>

      {/* Print button para testing */}
      <button
        onClick={handlePrint}
        className="hidden"
        style={{ display: 'none' }}
      >
        Imprimir Comanda
      </button>
    </>
  )
}
