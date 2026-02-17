import { useEffect, useMemo, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import logger from '@/utils/logger'
import { useAppStore } from '@/store/appStore'
import { useAuth } from '@/hooks/useAuth'
import supabaseService from '@/services/supabaseService'
import { APP_CONFIG } from '@/config/constants'
import DashboardLayout from '@/components/layout/DashboardLayout'
import ProductGrid from '@/components/pos/ProductGrid'
import OrderPanel from '@/components/pos/OrderPanel'
import CartSummary from '@/components/pos/CartSummary'
import PaymentPanel, { PaymentResult } from '@/components/pos/PaymentPanel'
import OrderNoteModal from '@/components/pos/OrderNoteModal'
import ManualItemModal from '@/components/pos/ManualItemModal'
import { Product, OrderItem } from '@/types/index'
import { sendNotificationToUsers } from '@/services/sendNotificationHelper'
import { shiftService } from '@/services/shiftService'
import printService from '@/services/printService'
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner'
import { X, PlusCircle, Search } from 'lucide-react'
import { Navigate } from 'react-router-dom'

export default function POS() {
  const navigate = useNavigate()
  const {
    logout,
  } = useAuth()
  const {
    currentUser,
    products,
    setProducts,
    tables,
    currentTableNumber,
    setCurrentTable,
    draftOrders,
    addItemToDraft,
    incrementDraftItem,
    decrementDraftItem,
    removeDraftItem,
    clearDraftForTable,
  } = useAppStore()

  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [stockError, setStockError] = useState<string | undefined>()
  const [readyOrdersCount, setReadyOrdersCount] = useState(0)
  const [activeTableOrders, setActiveTableOrders] = useState<any[]>([]) // Estado para "Mesa Viva"
  const [editingItem, setEditingItem] = useState<OrderItem | null>(null)
  const prevReadyCountRef = useRef(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const cashRegisterAudioRef = useRef<HTMLAudioElement | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [paymentPanel, setPaymentPanel] = useState<{
    isOpen: boolean
    orderId: string | null
    orderTotal: number
  }>({
    isOpen: false,
    orderId: null,
    orderTotal: 0,
  })
  const [activeTab, setActiveTab] = useState<'order' | 'products'>('order')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos')
  const [showManualItemModal, setShowManualItemModal] = useState(false)
  const [activeShift, setActiveShift] = useState<any>(null)

  const tableNumber = currentTableNumber || 1
  const items = draftOrders[tableNumber] || []
  const isReadOnly = currentUser?.role === 'supervisor'

  // 🔫 Scanner Integration
  useBarcodeScanner((code) => {
    if (isReadOnly || !currentUser) return

    // Buscar producto por código de barras o SKU
    // @ts-ignore
    const product = products.find(p => p.barcode === code || p.sku === code)

    if (product) {
      handleAddProduct(product)
      // Aquí podrías agregar un sonido de "beep" exitoso si quisieras
    }
  })

  if (!currentUser && !loading) {
    return <Navigate to="/login" replace />
  }

  useEffect(() => {
    // Audio de notificación
    audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBiuBzvLZiDYIF2W79+qbUg8OTqvn8raKOwcVa7r3GMUBAAAAAAABAAAAA')
    // Audio de Caja Registradora (Ka-ching!)
    cashRegisterAudioRef.current = new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU7/3//3/9//3//3/9//3//3/9//3//3/9//3//3/9//3//3/9//3//3/9//3//3/9//3//3/w==')
    loadProducts()
    checkShift()
  }, [])

  const checkShift = async () => {
    if (!currentUser) return
    try {
      const shift = await shiftService.getActiveShift(currentUser.id)
      setActiveShift(shift)
    } catch (e) {
      logger.error('pos', 'Error checking shift', e as any)
    }
  }

  // Monitorear órdenes listas en tiempo real
  useEffect(() => {
    const unsubscribe = supabaseService.subscribeToOrdersByStatus('ready', (readyOrders) => {
      const count = readyOrders.length
      setReadyOrdersCount(count)

      // Reproducir sonido cuando aumenta el contador
      if (count > prevReadyCountRef.current && prevReadyCountRef.current > 0) {
        audioRef.current?.play().catch(e => logger.warn('pos', 'No se pudo reproducir audio', e as any))
      }

      prevReadyCountRef.current = count
    })

    return () => unsubscribe?.()
  }, [])

  // Monitorear órdenes activas de la mesa actual (Persistencia visual)
  useEffect(() => {
    if (!currentTableNumber) {
      setActiveTableOrders([])
      return
    }
    // Suscribirse a cambios en órdenes para mantener la mesa "viva"
    const unsubscribe = supabaseService.subscribeToActiveOrders((orders) => {
      setActiveTableOrders(orders.filter(o => o.tableNumber === currentTableNumber))
    })
    return () => unsubscribe?.()
  }, [currentTableNumber])

  const loadProducts = async () => {
    setLoading(true)
    try {
      const prods = await supabaseService.getAllProducts()
      setProducts(prods)
    } catch (error) {
      logger.error('pos', 'Error loading products', error as any)
    } finally {
      setLoading(false)
    }
  }

  // 🏷️ Extraer Categorías únicas de los productos
  const categories = useMemo(() => {
    // @ts-ignore - Asumiendo que el producto tiene campo category
    const cats = new Set(products.map(p => p.category).filter(Boolean))
    return ['Todos', ...Array.from(cats).sort()]
  }, [products])

  // ⌨️ Manejo de ENTER en el buscador (Entrada Manual Rápida)
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchTerm) {
      // 1. Intento de coincidencia EXACTA (Barcode o SKU)
      // @ts-ignore
      const exactMatch = products.find(p => p.barcode === searchTerm || p.sku === searchTerm)

      if (exactMatch) {
        handleAddProduct(exactMatch)
        setSearchTerm('') // Limpiar para el siguiente
        return
      }

      // 2. Si no es exacta, pero el filtro solo muestra UNO, agrégalo
      if (filteredProducts.length === 1) {
        handleAddProduct(filteredProducts[0])
        setSearchTerm('')
      }
    }
  }

  // 🔍 Lógica de Filtrado para Retail (Búsqueda rápida)
  const filteredProducts = useMemo(() => {
    let result = products

    // 1. Filtrar por Categoría
    if (selectedCategory !== 'Todos') {
      // @ts-ignore
      result = result.filter(p => p.category === selectedCategory)
    }

    // 2. Filtrar por Buscador
    if (!searchTerm) return result

    const lower = searchTerm.toLowerCase()
    return result.filter(p =>
      p.name.toLowerCase().includes(lower) ||
      // @ts-ignore
      p.sku?.toLowerCase().includes(lower) ||
      // @ts-ignore
      p.barcode?.includes(lower)
    )
  }, [products, searchTerm, selectedCategory])

  const handleUpdateItemNote = (itemId: string, note: string) => {
    useAppStore.setState(state => {
      const tableDraft = state.draftOrders[tableNumber] || [];
      const updatedDraft = tableDraft.map(item =>
        item.id === itemId ? { ...item, notes: note } : item
      );
      return {
        draftOrders: {
          ...state.draftOrders,
          [tableNumber]: updatedDraft
        }
      };
    });
  }

  const handlePrintAccount = async () => {
    if (items.length === 0) return
    const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
    const tax = subtotal * 0.16
    const total = subtotal + tax
    const date = new Date().toLocaleString('es-MX')

    const lines = items
      .map(item => `
        <div style="display:flex;justify-content:space-between;margin:2px 0;">
          <span>${item.quantity}x ${item.productName}</span>
          <span>$${(item.unitPrice * item.quantity).toFixed(2)}</span>
        </div>
      `)
      .join('')

    // Cálculos de propina sugerida
    const tip10 = subtotal * 0.10
    const tip15 = subtotal * 0.15
    const tip20 = subtotal * 0.20

    const businessName = currentUser?.businessName || 'REISBLOC POS'
    const cashierName = currentUser?.username || 'Staff'

    const html = `
      <div style="width:58mm;padding:8px;font-family:'Courier New', monospace;font-size:11px;line-height:1.2;color:#000;">
        <div style="text-align:center;margin-bottom:8px;border-bottom:1px solid #000;">
          <div style="font-weight:bold;font-size:12px;">${businessName.toUpperCase()}</div>
          <div style="font-size:9px;">Cuenta ${tableNumber}</div>
        </div>
        <div style="margin-bottom:6px;font-size:9px;">
          <div>Fecha: ${date}</div>
          <div>Le atiende: ${cashierName}</div>
        </div>
        <div style="margin-bottom:8px;border-bottom:1px solid #000;padding-bottom:8px;">
          ${lines}
        </div>
        <div style="margin-bottom:8px;border-bottom:1px solid #000;padding-bottom:8px;">
          <div style="display:flex;justify-content:space-between;margin:2px 0;">
            <span>Subtotal:</span>
            <span>$${subtotal.toFixed(2)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin:2px 0;">
            <span>IVA (16%):</span>
            <span>$${tax.toFixed(2)}</span>
          </div>
          <div style="font-weight:bold;display:flex;justify-content:space-between;font-size:12px;">
            <span>TOTAL:</span>
            <span>$${total.toFixed(2)}</span>
          </div>
        </div>
        
        <div style="margin-bottom:8px;border-bottom:1px solid #000;padding-bottom:8px;">
          <div style="text-align:center;font-weight:bold;margin-bottom:4px;">PROPINA SUGERIDA</div>
          <div style="display:flex;justify-content:space-between;font-size:10px;">
            <span>10%: $${tip10.toFixed(2)}</span>
            <span>15%: $${tip15.toFixed(2)}</span>
          </div>
          <div style="text-align:center;font-size:10px;margin-top:2px;">
            <span>20%: $${tip20.toFixed(2)}</span>
          </div>
        </div>
        <div style="text-align:center;font-size:9px;margin-top:8px;">
          <div>Este no es comprobante fiscal.</div>
          <div style="margin-top:4px;font-size:8px;">Gracias por su preferencia</div>
        </div>
      </div>
    `

    try {
      await printService.printReceipt(html, { title: 'Cuenta', width: 58 })
    } catch (e) {
      // errores ya se registran en printService
    }
  }

  const handleAddProduct = (product: Product) => {
    if (!currentUser || isReadOnly) return
    addItemToDraft(tableNumber, product, currentUser.id)
  }

  const handleAddManualItem = (description: string, price: number) => {
    if (!currentUser || isReadOnly) return

    // Crear un producto virtual al vuelo
    const virtualProduct: Product = {
      id: `manual-${Date.now()}`,
      name: description,
      price: price,
      category: 'Manual',
      image: '',
      available: true
    }

    addItemToDraft(tableNumber, virtualProduct, currentUser.id)
  }

  const handleSendToKitchen = async () => {
    if (!currentUser || items.length === 0 || isReadOnly || sending) return

    setSending(true)
    setStockError(null)
    try {
      // Validar stock disponible
      const stockUpdates: { productId: string; quantity: number }[] = []
      for (const item of items) {
        const product = products.find(p => p.id === item.productId)
        if (product?.hasInventory) {
          const available = product.currentStock ?? 0
          if (available < item.quantity) {
            setStockError(`No hay stock suficiente de "${product.name}". Disponible: ${available}, Solicitado: ${item.quantity}`)
            return
          }
          stockUpdates.push({ productId: item.productId, quantity: -item.quantity })
        }
      }

      // Separar items por categoría: Comida → Cocina, Bebidas → Bar
      const foodItems = items.filter(item => {
        const product = products.find(p => p.id === item.productId)
        return product?.category !== 'Bebidas'
      })

      const drinkItems = items.filter(item => {
        const product = products.find(p => p.id === item.productId)
        return product?.category === 'Bebidas'
      })

      const orderIds: string[] = []

      // Crear orden para Cocina (comida)
      if (foodItems.length > 0) {
        const foodOrderId = await supabaseService.createOrder({
          tableNumber,
          items: foodItems,
          status: 'sent',
          createdBy: currentUser.id,
          createdAt: new Date(),
          notes: '🍽️ Comida',
        })
        orderIds.push(foodOrderId)

        // Notificar a cocina
        try {
          await sendNotificationToUsers({
            roles: ['cocina'],
            title: `🍽️ Nueva orden cocina - Mesa ${tableNumber}`,
            body: `${foodItems.length} platillo(s)`,
            type: 'order',
            priority: 'high',
            data: {
              orderId: foodOrderId,
              tableNumber: tableNumber.toString(),
              itemCount: foodItems.length.toString()
            }
          })
        } catch (notifError) {
          logger.warn('pos', 'No se pudo notificar a cocina', notifError as any)
        }
      }

      // Crear orden para Bar (bebidas)
      if (drinkItems.length > 0) {
        const drinkOrderId = await supabaseService.createOrder({
          tableNumber,
          items: drinkItems,
          status: 'sent',
          createdBy: currentUser.id,
          createdAt: new Date(),
          notes: '🍹 Bebidas',
        })
        orderIds.push(drinkOrderId)

        // Notificar a bar
        try {
          await sendNotificationToUsers({
            roles: ['bar'],
            title: `🍹 Nueva orden bar - Mesa ${tableNumber}`,
            body: `${drinkItems.length} bebida(s)`,
            type: 'order',
            priority: 'high',
            data: {
              orderId: drinkOrderId,
              tableNumber: tableNumber.toString(),
              itemCount: drinkItems.length.toString()
            }
          })
        } catch (notifError) {
          logger.warn('pos', 'No se pudo notificar a bar', notifError as any)
        }
      }

      // Decrementar stock
      if (stockUpdates.length > 0) {
        await supabaseService.updateProductStockBatch(stockUpdates)
        const updatedProducts = await supabaseService.getAllProducts()
        setProducts(updatedProducts)
      }

      // Limpiar carrito y mostrar confirmación
      clearDraftForTable(tableNumber)
      const summary = []
      if (foodItems.length > 0) summary.push(`${foodItems.length} comida`)
      if (drinkItems.length > 0) summary.push(`${drinkItems.length} bebidas`)
      alert(`✅ Orden enviada - Mesa ${tableNumber}\n${summary.join(' + ')}`)

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al enviar orden'
      setStockError(message)
      logger.error('pos', 'Error creating order', error as any)
    } finally {
      setSending(false)
    }
  }

  const handlePaymentComplete = async (result: PaymentResult) => {
    if (!currentUser || !paymentPanel.orderId || isReadOnly) return

    try {
      const mappedMethod = result.paymentMethod === 'card' ? 'tarjeta' : (result.paymentMethod === 'digital' ? 'transferencia' : result.paymentMethod)

      // Registrar venta
      await supabaseService.createSale({
        organizationId: currentUser.organizationId,
        orderIds: [paymentPanel.orderId],
        tableNumber,
        items,
        subtotal: paymentPanel.orderTotal,
        discounts: 0,
        tax: 0,
        total: result.total,
        paymentMethod: mappedMethod as any,
        tip: result.tip,
        tipSource: result.tip > 0 ? (mappedMethod === 'cash' ? 'cash' : mappedMethod) : 'none',
        saleBy: currentUser.id,
        createdAt: new Date(),
      } as any)

      // IMPORTANTE: Marcar la orden como completada para consolidar la mesa
      await supabaseService.updateOrderStatus(paymentPanel.orderId, 'completed')

      // Imprimir ticket final con monto, propina y método de pago
      try {
        const subtotal = paymentPanel.orderTotal
        const tax = 0
        const total = result.total
        const date = new Date().toLocaleString('es-MX')

        const lines = items
          .map(item => `
            <div style="display:flex;justify-content:space-between;margin:2px 0;">
              <span>${item.quantity}x ${item.productName}</span>
              <span>$${(item.unitPrice * item.quantity).toFixed(2)}</span>
            </div>
          `)
          .join('')

        const businessName = currentUser?.businessName || 'REISBLOC POS'
        const cashierName = currentUser?.username || 'Staff'

        const html = `
          <div style="width:58mm;padding:8px;font-family:'Courier New', monospace;font-size:11px;line-height:1.2;color:#000;">
            <div style="text-align:center;margin-bottom:8px;border-bottom:1px solid #000;">
              <div style="font-weight:bold;font-size:12px;">${businessName.toUpperCase()}</div>
              <div style="font-size:9px;">Mesa ${tableNumber}</div>
              <div style="font-size:9px;">Ticket: ${paymentPanel.orderId.slice(0, 8)}</div>
            </div>
            <div style="margin-bottom:6px;font-size:9px;">
              <div>Fecha: ${date}</div>
              <div>Cajero: ${cashierName}</div>
            </div>
            <div style="margin-bottom:8px;border-bottom:1px solid #000;padding-bottom:8px;">
              ${lines}
            </div>
            <div style="margin-bottom:8px;border-bottom:1px solid #000;padding-bottom:8px;">
              <div style="display:flex;justify-content:space-between;margin:2px 0;">
                <span>Subtotal:</span>
                <span>$${subtotal.toFixed(2)}</span>
              </div>
              <div style="display:flex;justify-content:space-between;margin:2px 0;">
                <span>Impuesto:</span>
                <span>$${tax.toFixed(2)}</span>
              </div>
              <div style="display:flex;justify-content:space-between;margin:2px 0;">
                <span>Propina:</span>
                <span>$${(result.tip || 0).toFixed(2)}</span>
              </div>
              <div style="font-weight:bold;display:flex;justify-content:space-between;font-size:12px;">
                <span>TOTAL:</span>
                <span>$${total.toFixed(2)}</span>
              </div>
            </div>
            <div style="text-align:center;font-size:9px;margin-top:8px;">
              <div>Pagado: ${mappedMethod.toUpperCase()}</div>
              <div style="margin-top:4px;font-size:8px;">Gracias por su preferencia</div>
            </div>
          </div>
        `

        await printService.printReceipt(html, { title: 'Ticket de Pago', width: 58 })
      } catch (printErr) {
        logger.warn('pos', 'No se pudo imprimir ticket final', printErr as any)
      }

      // Limpiar carrito
      clearDraftForTable(tableNumber)

      // Cerrar panel de pago
      setPaymentPanel({ isOpen: false, orderId: null, orderTotal: 0 })

      logger.info('pos', 'Sale recorded', { orderId: paymentPanel.orderId, transactionId: result.transactionId })
    } catch (error) {
      logger.error('pos', 'Error recording sale', error as any)
      setStockError('Error al registrar la venta')
    }
  }

  const tableButtons = useMemo(() => {
    const baseTables = tables.length ? tables : Array.from({ length: APP_CONFIG.TABLES.NUMBERED_TABLES }, (_, i) => i + 1)
    return baseTables
  }, [tables])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Cargando productos...</p>
        </div>
      </div>
    )
  }

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-2rem)] flex flex-col lg:flex-row gap-6">
        {/* Mobile View Tabs */}
        <div className="lg:hidden flex bg-white border-b border-gray-200 sticky top-0 z-20">
          <button
            onClick={() => setActiveTab('products')}
            className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'products' ? 'text-slate-900 border-b-2 border-slate-900' : 'text-slate-400'}`}
          >
            Catálogo
          </button>
          <button
            onClick={() => setActiveTab('order')}
            className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === 'order' ? 'text-slate-900 border-b-2 border-slate-900' : 'text-slate-400'}`}
          >
            Cuenta
            {items.length > 0 && (
              <span className="absolute top-3 right-4 bg-slate-900 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-white animate-bounce-short">
                {items.length}
              </span>
            )}
          </button>
        </div>

        {/* Left Column: Product Grid & Controls */}
        <div className={`flex-1 lg:w-2/3 h-full min-h-0 flex flex-col gap-4 ${activeTab !== 'products' ? 'hidden lg:flex' : 'flex'}`}>
          {/* Controls Header */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col gap-4 shrink-0">
            <div className="flex gap-2">
              {/* Search Bar */}
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-10 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all font-bold"
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                />
              </div>

              {/* Manual Item Button */}
              <button
                onClick={() => setShowManualItemModal(true)}
                className="p-3 bg-slate-100 text-slate-800 rounded-lg hover:bg-slate-200 transition-colors"
                title="Item Manual"
              >
                <PlusCircle size={24} />
              </button>
            </div>

            {/* Category Chips */}
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all border ${selectedCategory === cat
                    ? 'bg-slate-900 text-white border-slate-900 shadow-lg'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Grid */}
          <div className="flex-1 min-h-0">
            <ProductGrid
              products={filteredProducts}
              onAdd={handleAddProduct}
              disableAdd={isReadOnly || !!activeShift?.end_time}
            />
          </div>
        </div>

        {/* Right Column: Order Panel & Cart */}
        <div className={`w-full lg:w-1/3 flex flex-col gap-4 h-full min-h-0 ${activeTab !== 'order' ? 'hidden lg:flex' : 'flex'}`}>
          {/* Table Selector Widget */}
          <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200 flex gap-2 overflow-x-auto no-scrollbar shrink-0">
            {tableButtons.map(num => (
              <button
                key={num}
                onClick={() => setCurrentTable(num)}
                className={`relative px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${tableNumber === num
                  ? 'bg-slate-900 text-white shadow-xl scale-105 z-10'
                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                  }`}
              >
                Cuenta {num}
                {(draftOrders[num]?.length || 0) > 0 && (
                  <span className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${tableNumber === num ? 'bg-red-500 animate-pulse' : 'bg-slate-400'}`} />
                )}
              </button>
            ))}
          </div>

          {/* Active Order Widget */}
          <div className="flex-1 min-h-0 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <OrderPanel
              tableNumber={tableNumber}
              items={items}
              activeOrders={activeTableOrders}
              onIncrement={(itemId) => !isReadOnly && incrementDraftItem(tableNumber, itemId)}
              onDecrement={(itemId) => !isReadOnly && decrementDraftItem(tableNumber, itemId)}
              onRemove={(itemId) => !isReadOnly && removeDraftItem(tableNumber, itemId)}
              onEditNote={(item) => setEditingItem(item)}
            />
          </div>

          {/* Cart Actions Widget */}
          <div className="flex-none pb-20 lg:pb-0">
            <CartSummary
              tableNumber={tableNumber}
              items={items}
              onSend={handleSendToKitchen}
              onClear={() => clearDraftForTable(tableNumber)}
              sending={sending}
              products={products}
              stockError={stockError}
            />
          </div>
        </div>

        {paymentPanel.isOpen && paymentPanel.orderId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
            <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
              <PaymentPanel
                orderId={paymentPanel.orderId}
                orderTotal={paymentPanel.orderTotal}
                tableNumber={tableNumber}
                onPaymentComplete={handlePaymentComplete}
                onCancel={() => setPaymentPanel({ isOpen: false, orderId: null, orderTotal: 0 })}
              />
            </div>
          </div>
        )}

        {editingItem && (
          <OrderNoteModal
            isOpen={!!editingItem}
            onClose={() => setEditingItem(null)}
            onSave={(note) => {
              if (editingItem) {
                handleUpdateItemNote(editingItem.id, note)
                setEditingItem(null)
              }
            }}
            // @ts-ignore
            initialNote={editingItem.notes || ''}
            itemName={editingItem.productName}
          />
        )}

        {showManualItemModal && (
          <ManualItemModal
            isOpen={showManualItemModal}
            onClose={() => setShowManualItemModal(false)}
            onAdd={handleAddManualItem}
          />
        )}
      </div>
    </DashboardLayout>
  )
}
