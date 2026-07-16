import { useEffect, useMemo, useState, useRef } from 'react'
import logger from '@/utils/logger'
import { useAppStore } from '@/store/appStore'
import supabaseService from '@/services/supabaseService'
import DashboardLayout from '@/components/layout/DashboardLayout'
import ProductGrid from '@/components/pos/ProductGrid'
import OrderPanel from '@/components/pos/OrderPanel'
import PaymentPanel, { PaymentResult } from '@/components/pos/PaymentPanel'
import OrderNoteModal from '@/components/pos/OrderNoteModal'
import ManualItemModal from '@/components/pos/ManualItemModal'
import ReceiptTicket from '@/components/pos/ReceiptTicket'
import TicketShareModal from '@/components/pos/TicketShareModal'
import { renderToStaticMarkup } from 'react-dom/server'
import { Product, OrderItem } from '@/types/index'
import { shiftService } from '@/services/shiftService'
import printService from '@/services/printService'
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner'
import { sanitizeHTML } from '@/utils/sanitize'
import { PlusCircle, Search, Printer, DollarSign, LayoutGrid, AlertTriangle, Share2, Plus, Edit2, X } from 'lucide-react'
import { Navigate } from 'react-router-dom'

function parseProductDescription(descriptionText: string | null) {
  if (!descriptionText) return { description: '', packPrice: undefined, bulkPrice: undefined, packQty: 6, bulkQty: 12 }
  try {
    if (descriptionText.startsWith('{') && descriptionText.endsWith('}')) {
      const parsed = JSON.parse(descriptionText)
      return {
        description: parsed.description || '',
        packPrice: parsed.packPrice,
        bulkPrice: parsed.bulkPrice,
        packQty: parsed.packQty || 6,
        bulkQty: parsed.bulkQty || 12
      }
    }
  } catch (e) {
    // ignore
  }
  return { description: descriptionText, packPrice: undefined, bulkPrice: undefined, packQty: 6, bulkQty: 12 }
}

export default function POS() {
  const {
    currentUser,
    products,
    setProducts,
    tickets,  // Legacy: antes "tables"
    currentTicketNumber,  // Legacy: antes "currentTableNumber"
    setCurrentTicket,  // Legacy: antes "setCurrentTable"
    draftOrders,
    addItemToDraft,
    incrementDraftItem,
    decrementDraftItem,
    removeDraftItem,
    updateDraftItemPrice,
    clearDraftForTable,
    organizationSettings,
    setOrganizationSettings,
    users,
    setUsers,
  } = useAppStore()

  const [loading, setLoading] = useState(true)
  const [activeTableOrders, setActiveTableOrders] = useState<any[]>([])
  const [editingItem, setEditingItem] = useState<OrderItem | null>(null)
  const cashRegisterAudioRef = useRef<HTMLAudioElement | null>(null)
  const [receiptModal, setReceiptModal] = useState<{
    isOpen: boolean;
    html: string;
    total: number;
    items: any[];
    orderId: string;
    paymentMethod: string;
  } | null>(null)

  const [paymentPanel, setPaymentPanel] = useState<{
    isOpen: boolean
    orderId: string | null
    orderTotal: number
    orderIds?: string[]
  }>({
    isOpen: false,
    orderId: null,
    orderTotal: 0,
    orderIds: []
  })

  const [searchTerm, setSearchTerm] = useState('')
  const [showManualItemModal, setShowManualItemModal] = useState(false)
  const [activeShift, setActiveShift] = useState<any>(null)
  const [stockWarning, setStockWarning] = useState<{ isOpen: boolean, items: any[] }>({ isOpen: false, items: [] })
  const [showShareModal, setShowShareModal] = useState(false)

  const [editingRegisterId, setEditingRegisterId] = useState<number | null>(null)
  const [editingRegisterName, setEditingRegisterName] = useState<string>('')
  const [showHardwareConfig, setShowHardwareConfig] = useState(false)

  // 1. Obtener cajas desde settings
  const registers = useMemo(() => {
    const stored = organizationSettings?.cashRegisters
    if (stored && typeof stored === 'object') {
      return stored as Record<string, string>
    }
    return {
      "1": "Caja 1",
      "2": "Caja 2",
      "3": "Caja 3",
      "4": "Caja 4"
    }
  }, [organizationSettings])

  const registerAssignments = useMemo(() => {
    return (organizationSettings?.registerAssignments || {}) as Record<string, string>
  }, [organizationSettings])

  const tableButtons = useMemo(() => {
    return Object.keys(registers).map(Number).sort((a, b) => a - b)
  }, [registers])

  const handleAddRegister = async () => {
    if (currentUser?.role !== 'admin') return alert('Solo el administrador puede agregar cajas.')
    const nextNum = tableButtons.length > 0 ? Math.max(...tableButtons) + 1 : 1
    const newRegisters = {
      ...registers,
      [nextNum.toString()]: `Caja ${nextNum}`
    }

    const updatedSettings = {
      ...(organizationSettings || {}),
      cashRegisters: newRegisters
    }

    setOrganizationSettings(updatedSettings)
    setCurrentTicket(nextNum)

    if (currentUser?.organizationId && currentUser?.role === 'admin') {
      try {
        const { supabase } = await import('@/config/supabase')
        await supabase
          .from('organizations')
          .update({ settings: updatedSettings })
          .eq('id', currentUser.organizationId)

        // Actualizar currentUser.organizationSettings
        useAppStore.setState({
          currentUser: {
            ...currentUser,
            organizationSettings: updatedSettings
          }
        })
      } catch (e) {
        console.error('Error saving register to Supabase:', e)
      }
    }
  }

  const handleSaveRegisterName = async (num: number) => {
    if (currentUser?.role !== 'admin') return alert('Solo el administrador puede renombrar cajas.')
    setEditingRegisterId(null)
    const trimmed = editingRegisterName.trim()
    if (!trimmed) return

    const newRegisters = {
      ...registers,
      [num.toString()]: trimmed
    }

    const updatedSettings = {
      ...(organizationSettings || {}),
      cashRegisters: newRegisters
    }

    setOrganizationSettings(updatedSettings)

    if (currentUser?.organizationId && currentUser?.role === 'admin') {
      try {
        const { supabase } = await import('@/config/supabase')
        await supabase
          .from('organizations')
          .update({ settings: updatedSettings })
          .eq('id', currentUser.organizationId)

        // Actualizar currentUser.organizationSettings
        useAppStore.setState({
          currentUser: {
            ...currentUser,
            organizationSettings: updatedSettings
          }
        })
      } catch (e) {
        console.error('Error saving register name to Supabase:', e)
      }
    }
  }

  const handleDeleteRegister = async (num: number) => {
    if (currentUser?.role !== 'admin') return alert('Solo el administrador puede eliminar cajas.')
    if (tableButtons.length <= 1) {
      alert('Debe haber al menos 1 caja activa.')
      return
    }

    const nextRegisters = { ...registers }
    delete nextRegisters[num.toString()]

    const nextAssignments = { ...registerAssignments }
    delete nextAssignments[num.toString()]

    const updatedSettings = {
      ...(organizationSettings || {}),
      cashRegisters: nextRegisters,
      registerAssignments: nextAssignments
    }

    setOrganizationSettings(updatedSettings)

    const remainingButtons = Object.keys(nextRegisters).map(Number).sort((a, b) => a - b)
    if (tableNumber === num) {
      setCurrentTicket(remainingButtons[0])
    }

    // Limpiar borrador local
    const nextDrafts = { ...draftOrders }
    delete nextDrafts[num]
    useAppStore.setState({ draftOrders: nextDrafts })

    if (currentUser?.organizationId && currentUser?.role === 'admin') {
      try {
        const { supabase } = await import('@/config/supabase')
        await supabase
          .from('organizations')
          .update({ settings: updatedSettings })
          .eq('id', currentUser.organizationId)

        // Actualizar currentUser.organizationSettings
        useAppStore.setState({
          currentUser: {
            ...currentUser,
            organizationSettings: updatedSettings
          }
        })
      } catch (e) {
        console.error('Error deleting register from Supabase:', e)
      }
    }
  }

  const tableNumber = currentTicketNumber || 1
  const items = draftOrders[tableNumber] || []
  const isReadOnly = currentUser?.role === 'supervisor'

  const [priceMode, setPriceMode] = useState<'pieza' | 'mayoreo' | 'paquete' | 'bulto'>('pieza')

  const handleChangePriceMode = (newMode: 'pieza' | 'mayoreo' | 'paquete' | 'bulto') => {
    setPriceMode(newMode)
    
    const nextItems = items.map(item => {
      const product = products.find(p => p.id === item.productId)
      if (!product) return item

      const parsedDesc = parseProductDescription(product.description || '')
      let activePrice = product.price
      let activePackQty = 1

      if (newMode === 'mayoreo') {
        activePrice = product.wholesalePrice || (product as any).wholesale_price || product.price
        activePackQty = 1
      } else if (newMode === 'paquete') {
        activePrice = parsedDesc.packPrice || (product.price * 0.75)
        activePackQty = parsedDesc.packQty || 6
      } else if (newMode === 'bulto') {
        activePrice = parsedDesc.bulkPrice || (product.price * 0.65)
        activePackQty = parsedDesc.bulkQty || 12
      }

      return {
        ...item,
        unitPrice: activePrice,
        packQuantity: activePackQty
      }
    })

    useAppStore.setState(state => ({
      draftOrders: {
        ...state.draftOrders,
        [tableNumber]: nextItems
      }
    }))
  }

  const filteredProducts = useMemo(() => {
    const result = products
    if (!searchTerm) return result
    const lower = searchTerm.toLowerCase()
    return result.filter(p =>
      p.name.toLowerCase().includes(lower) ||
      p.sku?.toLowerCase().includes(lower) ||
      p.barcode?.includes(lower)
    )
  }, [products, searchTerm])

  // PUSH local sync
  useEffect(() => {
    const localIp = organizationSettings?.localSyncServerIp || localStorage.getItem('local_sync_server_ip')
    if (!navigator.onLine && localIp && tableNumber) {
      const currentItems = draftOrders[tableNumber] || []
      const url = `${localIp.replace(/\/$/, '')}/api/drafts`
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketNumber: tableNumber, items: currentItems })
      }).catch(err => console.warn('⚠️ Falló sincronización local:', err))
    }
  }, [draftOrders, tableNumber, organizationSettings?.localSyncServerIp])

  // PULL local sync
  useEffect(() => {
    let interval: any
    const syncOfflineLocalDrafts = async () => {
      const localIp = organizationSettings?.localSyncServerIp || localStorage.getItem('local_sync_server_ip')
      if (!navigator.onLine && localIp) {
        try {
          const url = `${localIp.replace(/\/$/, '')}/api/drafts`
          const res = await fetch(url)
          if (res.ok) {
            const data = await res.json()
            const currentDrafts = useAppStore.getState().draftOrders
            let hasChanges = false
            const nextDrafts = { ...currentDrafts }

            Object.entries(data).forEach(([key, items]: [string, any]) => {
              const num = Number(key)
              if (JSON.stringify(currentDrafts[num]) !== JSON.stringify(items)) {
                nextDrafts[num] = items
                hasChanges = true
              }
            })

            if (hasChanges) {
              useAppStore.setState({ draftOrders: nextDrafts })
            }
          }
        } catch (e) {
          console.warn('Error fetching from local sync server:', e)
        }
      }
    }

    if (!navigator.onLine) {
      syncOfflineLocalDrafts()
      interval = setInterval(syncOfflineLocalDrafts, 5000)
    }

    return () => clearInterval(interval)
  }, [organizationSettings?.localSyncServerIp])

  useEffect(() => {
    cashRegisterAudioRef.current = new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU7/3//3/9//3//3/9//3//3/9//3//3/9//3//3/9//3//3/9//3//3/9//3//3/9//3//3/w==')
    loadProducts()
    checkShift()
  }, [])

  useEffect(() => {
    if (!currentTicketNumber) {
      setActiveTableOrders([])
      return
    }
    const unsubscribe = supabaseService.subscribeToActiveOrders((orders) => {
      setActiveTableOrders(orders.filter(o => o.tableNumber === currentTicketNumber))
    })
    return () => unsubscribe?.()
  }, [currentTicketNumber])

  useEffect(() => {
    if (users.length === 0) {
      supabaseService.getAllUsers()
        .then(setUsers)
        .catch(e => console.error('Error loading users in POS:', e))
    }
  }, [users.length, setUsers])

  useBarcodeScanner((code, scannerNum) => {
    if (isReadOnly || !currentUser) return
    
    // Si viene prefijo de escáner (1, 2, 3, 4) y la caja existe, redirigir a esa caja
    if (scannerNum && tableButtons.includes(scannerNum)) {
      setCurrentTicket(scannerNum)
      // Agregar el producto a los borradores de esa caja específica
      const product = products.find(p => p.barcode === code || p.sku === code)
      if (product) {
        const parsedDesc = parseProductDescription(product.description || '')
        let activePrice = product.price
        let activePackQty = 1

        if (priceMode === 'mayoreo') {
          activePrice = product.wholesalePrice || (product as any).wholesale_price || product.price
          activePackQty = 1
        } else if (priceMode === 'paquete') {
          activePrice = parsedDesc.packPrice || (product.price * 0.75)
          activePackQty = parsedDesc.packQty || 6
        } else if (priceMode === 'bulto') {
          activePrice = parsedDesc.bulkPrice || (product.price * 0.65)
          activePackQty = parsedDesc.bulkQty || 12
        }

        const computedProduct = {
          ...product,
          price: activePrice,
          packQuantity: activePackQty
        }

        addItemToDraft(scannerNum, computedProduct, currentUser.username || currentUser.email || '')
        
        // PUSH local sync para esa caja específica
        const localIp = organizationSettings?.localSyncServerIp || localStorage.getItem('local_sync_server_ip')
        if (!navigator.onLine && localIp) {
          const nextItems = [...(draftOrders[scannerNum] || []), { productId: product.id, quantity: 1, unitPrice: activePrice, packQuantity: activePackQty }]
          const url = `${localIp.replace(/\/$/, '')}/api/drafts`
          fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticketNumber: scannerNum, items: nextItems })
          }).catch(err => console.warn('⚠️ Falló sincronización local:', err))
        }
      }
    } else {
      // Flujo normal para el escáner del usuario actual en la caja activa
      const product = products.find(p => p.barcode === code || p.sku === code)
      if (product) handleAddProduct(product)
    }
  })

  if (!currentUser && !loading) {
    return <Navigate to="/login" replace />
  }

  const checkShift = async () => {
    if (!currentUser) return
    try {
      const shift = await shiftService.getActiveShift(currentUser.id)
      setActiveShift(shift)
    } catch (e) {
      logger.error('pos', 'Error checking shift', e as any)
    }
  }

  const loadProducts = async () => {
    setLoading(true)
    try {
      const prods = await supabaseService.getAllRetailProducts()
      setProducts(prods)
    } catch (error) {
      logger.error('pos', 'Error loading retail products', error as any)
    } finally {
      setLoading(false)
    }
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchTerm) {
      const exactMatch = products.find(p => p.barcode === searchTerm || p.sku === searchTerm)
      if (exactMatch) {
        handleAddProduct(exactMatch)
        setSearchTerm('')
        return
      }
      if (filteredProducts.length === 1) {
        handleAddProduct(filteredProducts[0])
        setSearchTerm('')
      }
    }
  }

  const handleUpdateItemNote = (itemId: string, note: string) => {
    useAppStore.setState(state => {
      const tableDraft = state.draftOrders[tableNumber] || [];
      const updatedDraft = tableDraft.map(item =>
        item.id === itemId ? { ...item, notes: note } : item
      );
      return {
        draftOrders: { ...state.draftOrders, [tableNumber]: updatedDraft }
      };
    });
  }

  const handleAddProduct = (product: Product) => {
    if (!currentUser || isReadOnly) return
    
    const parsedDesc = parseProductDescription(product.description || '')
    let activePrice = product.price
    let activePackQty = 1

    if (priceMode === 'mayoreo') {
      activePrice = product.wholesalePrice || (product as any).wholesale_price || product.price
      activePackQty = 1
    } else if (priceMode === 'paquete') {
      activePrice = parsedDesc.packPrice || (product.price * 0.75)
      activePackQty = parsedDesc.packQty || 6
    } else if (priceMode === 'bulto') {
      activePrice = parsedDesc.bulkPrice || (product.price * 0.65)
      activePackQty = parsedDesc.bulkQty || 12
    }

    const computedProduct = {
      ...product,
      price: activePrice,
      packQuantity: activePackQty
    }

    addItemToDraft(tableNumber, computedProduct, currentUser.id)
  }

  const handleAddManualItem = (description: string, price: number) => {
    if (!currentUser || isReadOnly) return
    const virtualProduct: any = {
      id: `manual-${Date.now()}`,
      name: description,
      price: price,
      category: 'Manual',
      image: '',
    }
    addItemToDraft(tableNumber, virtualProduct, currentUser.id)
  }

  const handlePrintAccount = async (tableNum: number) => {
    try {
      const ordersToPrint = activeTableOrders
      const draftItems = draftOrders[tableNum] || []
      const activeTotal = ordersToPrint.reduce((sum, o) => sum + (o.items?.reduce((s: number, i: any) => s + (i.unitPrice * i.quantity), 0) || 0), 0)
      const draftTotal = draftItems.reduce((sum, i) => sum + (i.unitPrice * i.quantity), 0)
      const total = activeTotal + draftTotal
      if (total === 0) return

      const allItems = [...ordersToPrint.flatMap(o => o.items || []), ...draftItems]

      const ticketHTML = renderToStaticMarkup(
        <ReceiptTicket
          order={{ id: 'Pre-cuenta', items: allItems, status: 'pending', total: total } as any}
          products={products}
          saleTotal={total}
          paymentMethod="Pendiente"
          tableNumber={tableNum}
        />
      )
      await printService.printReceipt(ticketHTML, { title: 'Pre-cuenta', width: 58 })
    } catch (error) {
      logger.error('pos', 'Error printing account', error as any)
      alert('Error al imprimir cuenta')
    }
  }

  const checkStockAvailability = (orders: any[], currentDraft: any[]) => {
    // Combine all items to be sold
    const allItems = [...currentDraft, ...orders.flatMap(o => o.items || [])]

    // Agrupar por producto para sumar cantidades totales (Considerando Productos Mayoristas)
    const totals: Record<string, number> = {}
    allItems.forEach(item => {
      const targetId = item.parentId || item.productId
      if (targetId) {
        totals[targetId] = (totals[targetId] || 0) + (item.quantity * (item.packQuantity || 1))
      }
    })

    const warnings: any[] = []

    Object.keys(totals).forEach(prodId => {
      const product = products.find(p => p.id === prodId)
      if (product && product.hasInventory) {
        const currentStock = product.currentStock || 0
        if (currentStock < totals[prodId]) {
          warnings.push({
            name: product.name,
            current: currentStock,
            requested: totals[prodId],
            deficit: totals[prodId] - currentStock
          })
        }
      }
    })

    return warnings
  }

  const confirmCheckout = () => {
    const activeTotal = activeTableOrders.reduce((sum, o) => sum + (o.items?.reduce((s: number, i: any) => s + (i.unitPrice * i.quantity), 0) || 0), 0)
    const draftTotal = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0)
    const finalTotal = activeTotal + draftTotal

    if (finalTotal === 0) return

    setPaymentPanel({
      isOpen: true,
      orderId: 'retail-direct',
      orderTotal: finalTotal,
      orderIds: activeTableOrders.map(o => o.id)
    })
  }

  const handleQuickCheckout = async () => {
    if (!currentUser || isReadOnly) return

    // 1. Stock Check 🛡️
    const formattedDraft = items.map(i => ({ ...i, productId: i.productId })) // Ensure shape
    const stockIssues = checkStockAvailability(activeTableOrders, formattedDraft)

    if (stockIssues.length > 0) {
      setStockWarning({ isOpen: true, items: stockIssues })
      return
    }

    confirmCheckout()
  }

  const handlePaymentComplete = async (result: PaymentResult) => {
    if (!currentUser || isReadOnly) return

    try {
      const mappedMethod = result.paymentMethod === 'card' ? 'tarjeta' : (result.paymentMethod === 'card_mercadopago' ? 'transferencia' : result.paymentMethod)

      // Items del borrador activo + (órdenes activas si las hay)
      const { orderIds } = paymentPanel
      const ordersToProcess = activeTableOrders.filter(o => (orderIds || []).includes(o.id))
      const allItems = [...items, ...ordersToProcess.flatMap(o => o.items || [])]

      await supabaseService.createRetailSale({
        tableNumber,
        subtotal: paymentPanel.orderTotal,
        total: result.total,
        paymentMethod: mappedMethod,
        saleBy: currentUser.id,
        notes: 'Venta Directa Retail'
      }, allItems)

      // Generar ticket y mostrar modal
      try {
        const ticketHTML = renderToStaticMarkup(
          <ReceiptTicket
            order={{ id: 'Venta', items: allItems, status: 'completed', total: result.total } as any}
            products={products}
            saleTotal={result.total}
            paymentMethod={mappedMethod}
            tableNumber={tableNumber}
          />
        )
        // Abrir modal ANTES de limpiar el borrador
        const saleId = `sale-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        setReceiptModal({
          isOpen: true,
          html: ticketHTML,
          total: result.total,
          items: allItems,
          orderId: saleId,
          paymentMethod: mappedMethod
        })
      } catch (printErr) {
        logger.warn('pos', 'No se pudo generar ticket', printErr as any)
      }

      clearDraftForTable(tableNumber)
      setPaymentPanel({ isOpen: false, orderId: null, orderTotal: 0, orderIds: [] })
      cashRegisterAudioRef.current?.play().catch(() => { })
    } catch (error: any) {
      logger.error('pos', 'Error recording sale', error)
      alert(`Error: ${error.message}`)
    }
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen">Cargando...</div>

  const currentTotal = (
    activeTableOrders.reduce((sum, o) => sum + (o.items?.reduce((s: number, i: any) => s + (i.unitPrice * i.quantity), 0) || 0), 0) +
    items.reduce((sum, i) => sum + (i.unitPrice * i.quantity), 0)
  )

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-2rem)] flex flex-col gap-4">
        {/* Unified Header with Search and Accounts */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 items-center shrink-0">
          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200 shrink-0 flex-wrap">
            <LayoutGrid size={18} className="text-slate-400 ml-2" />
            {tableButtons.map(num => {
              const isEditing = editingRegisterId === num
              const isSelected = tableNumber === num
              const registerName = registers[num.toString()] || `Caja ${num}`
              const assignedUserId = registerAssignments[num.toString()]
              const assignedUser = users.find(u => u.id === assignedUserId)
              const assignedName = assignedUser ? (assignedUser.username || assignedUser.email?.split('@')[0]) : ''

              return (
                <div key={num} className="flex items-center">
                  {isEditing ? (
                    <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-300">
                      <input
                        type="text"
                        value={editingRegisterName}
                        onChange={(e) => setEditingRegisterName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveRegisterName(num)
                          else if (e.key === 'Escape') setEditingRegisterId(null)
                        }}
                        className="px-1.5 py-0.5 text-xs font-bold outline-none text-slate-900 w-24 border-r border-slate-200"
                        placeholder="Nombre caja"
                        autoFocus
                      />
                      <select
                        value={assignedUserId || ''}
                        onChange={async (e) => {
                          const val = e.target.value
                          const newAssignments = {
                            ...registerAssignments,
                            [num.toString()]: val
                          }
                          const updatedSettings = {
                            ...(organizationSettings || {}),
                            registerAssignments: newAssignments
                          }
                          setOrganizationSettings(updatedSettings)
                          if (currentUser?.organizationId) {
                            try {
                              const { supabase } = await import('@/config/supabase')
                              await supabase
                                .from('organizations')
                                .update({ settings: updatedSettings })
                                .eq('id', currentUser.organizationId)

                              // Actualizar currentUser.organizationSettings
                              useAppStore.setState({
                                currentUser: {
                                  ...currentUser,
                                  organizationSettings: updatedSettings
                                }
                              })
                            } catch (err) {
                              console.error('Error saving assignments:', err)
                            }
                          }
                        }}
                        className="text-[10px] font-bold bg-transparent outline-none text-slate-700 max-w-24 cursor-pointer"
                      >
                        <option value="">-- Sin asignar --</option>
                        {users.map(u => (
                          <option key={u.id} value={u.id}>{u.username || u.email?.split('@')[0]}</option>
                        ))}
                      </select>
                      <button 
                        onClick={() => handleSaveRegisterName(num)}
                        className="text-[10px] bg-slate-900 text-white px-1.5 py-0.5 rounded font-bold hover:bg-slate-800 shrink-0"
                      >
                        OK
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setCurrentTicket(num)}
                      onDoubleClick={() => {
                        if (currentUser?.role === 'admin') {
                          setEditingRegisterId(num)
                          setEditingRegisterName(registerName)
                        }
                      }}
                      className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all flex items-center gap-1 ${isSelected ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                      title={currentUser?.role === 'admin' ? "Doble clic para editar caja/cajero" : undefined}
                    >
                      <span>{registerName}{assignedName ? ` (${assignedName})` : ` (${assignedUserId ? 'Cargando...' : 'Libre'})`}</span>
                      {isSelected && currentUser?.role === 'admin' && (
                        <div className="flex items-center gap-1 ml-1 shrink-0">
                          <span 
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingRegisterId(num)
                              setEditingRegisterName(registerName)
                            }}
                            className="opacity-50 hover:opacity-100 cursor-pointer"
                            title="Editar Caja"
                          >
                            <Edit2 size={12} />
                          </span>
                          <span 
                            onClick={async (e) => {
                              e.stopPropagation()
                              if (confirm(`¿Estás seguro de que deseas eliminar la ${registerName}? Se perderán los borradores de esta caja.`)) {
                                await handleDeleteRegister(num)
                              }
                            }}
                            className="opacity-50 hover:opacity-100 text-red-500 cursor-pointer font-bold"
                            title="Eliminar Caja"
                          >
                            <X size={12} />
                          </span>
                        </div>
                      )}
                    </button>
                  )}
                </div>
              )
            })}
            <button
              onClick={handleAddRegister}
              className="p-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-all flex items-center justify-center border border-dashed border-slate-400"
              title="Agregar Nueva Caja"
            >
              <Plus size={14} />
            </button>
          </div>

          {!navigator.onLine && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl text-amber-800 text-xs font-bold">
              <AlertTriangle size={16} className="text-amber-600 animate-pulse shrink-0" />
              <span className="whitespace-nowrap">Local WiFi Mode:</span>
              <input
                type="text"
                placeholder="IP Servidor (ej: http://192.168.1.100:3001)"
                value={organizationSettings?.localSyncServerIp || localStorage.getItem('local_sync_server_ip') || ''}
                onChange={(e) => {
                  const val = e.target.value
                  localStorage.setItem('local_sync_server_ip', val)
                  setOrganizationSettings({
                    ...(organizationSettings || {}),
                    localSyncServerIp: val
                  })
                }}
                className="px-2 py-1 bg-white border border-amber-300 rounded outline-none text-slate-900 w-44 font-normal"
              />
            </div>
          )}

          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl bg-slate-50 font-bold focus:ring-2 focus:ring-slate-900 transition-all"
              placeholder="Escanear o buscar producto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
            <span className="text-[9px] font-black text-slate-400 uppercase px-2 whitespace-nowrap">Tarifa:</span>
            {(['pieza', 'mayoreo', 'paquete', 'bulto'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => handleChangePriceMode(mode)}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all whitespace-nowrap ${
                  priceMode === mode
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowManualItemModal(true)}
            className="hidden md:flex p-3 bg-slate-900 text-white rounded-xl shadow-lg hover:scale-105 transition-all"
          >
            <PlusCircle size={24} />
          </button>

          <button
            onClick={() => setShowHardwareConfig(!showHardwareConfig)}
            className={`hidden md:flex p-3 rounded-xl border transition-all ${showHardwareConfig ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
            title="Configurar Impresoras y Red Local"
          >
            <Printer size={24} />
          </button>
        </div>

        {showHardwareConfig && (
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap gap-6 items-center animate-scaleIn text-xs font-bold text-slate-700 shrink-0">
            <div className="flex items-center gap-2">
              <span>🎟️ Ancho Ticket (SUM187443):</span>
              <input
                type="number"
                value={organizationSettings?.ticketPrinterWidth || 58}
                onChange={async (e) => {
                  const val = parseInt(e.target.value) || 58
                  const updatedSettings = { ...(organizationSettings || {}), ticketPrinterWidth: val }
                  setOrganizationSettings(updatedSettings)
                  if (currentUser?.organizationId && currentUser?.role === 'admin') {
                    const { supabase } = await import('@/config/supabase')
                    await supabase.from('organizations').update({ settings: updatedSettings }).eq('id', currentUser.organizationId)
                    useAppStore.setState({ currentUser: { ...currentUser, organizationSettings: updatedSettings } })
                  }
                }}
                className="w-16 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-center outline-none text-slate-900 font-bold"
                min="10"
              />
              <span>mm</span>
            </div>

            <div className="flex items-center gap-2">
              <span>🏷️ Ancho Etiqueta (NIMBOT B1):</span>
              <input
                type="number"
                value={organizationSettings?.labelPrinterWidth || 50}
                onChange={async (e) => {
                  const val = parseInt(e.target.value) || 50
                  const updatedSettings = { ...(organizationSettings || {}), labelPrinterWidth: val }
                  setOrganizationSettings(updatedSettings)
                  if (currentUser?.organizationId && currentUser?.role === 'admin') {
                    const { supabase } = await import('@/config/supabase')
                    await supabase.from('organizations').update({ settings: updatedSettings }).eq('id', currentUser.organizationId)
                    useAppStore.setState({ currentUser: { ...currentUser, organizationSettings: updatedSettings } })
                  }
                }}
                className="w-16 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-center outline-none text-slate-900 font-bold"
                min="10"
              />
              <span>mm</span>
            </div>

            <div className="flex items-center gap-2">
              <span>📶 Servidor Sincronización Local:</span>
              <input
                type="text"
                placeholder="http://192.168.1.100:3001"
                value={organizationSettings?.localSyncServerIp || localStorage.getItem('local_sync_server_ip') || ''}
                onChange={async (e) => {
                  const val = e.target.value
                  localStorage.setItem('local_sync_server_ip', val)
                  const updatedSettings = { ...(organizationSettings || {}), localSyncServerIp: val }
                  setOrganizationSettings(updatedSettings)
                  if (currentUser?.organizationId && currentUser?.role === 'admin') {
                    const { supabase } = await import('@/config/supabase')
                    await supabase.from('organizations').update({ settings: updatedSettings }).eq('id', currentUser.organizationId)
                    useAppStore.setState({ currentUser: { ...currentUser, organizationSettings: updatedSettings } })
                  }
                }}
                className="w-48 px-2 py-1 bg-slate-50 border border-slate-200 rounded outline-none text-slate-900 font-normal"
              />
            </div>

            <div className="w-full border-t border-slate-100 pt-3 mt-1 flex flex-wrap gap-4 items-center">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block w-full">⚙️ Configuración del Ticket de Venta</span>
              
              <div className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  id="ticketShowLogo"
                  checked={organizationSettings?.ticketShowLogo ?? true}
                  onChange={async (e) => {
                    const val = e.target.checked
                    const updatedSettings = { ...(organizationSettings || {}), ticketShowLogo: val }
                    setOrganizationSettings(updatedSettings)
                    if (currentUser?.organizationId && currentUser?.role === 'admin') {
                      const { supabase } = await import('@/config/supabase')
                      await supabase.from('organizations').update({ settings: updatedSettings }).eq('id', currentUser.organizationId)
                      useAppStore.setState({ currentUser: { ...currentUser, organizationSettings: updatedSettings } })
                    }
                  }}
                  className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                />
                <label htmlFor="ticketShowLogo" className="text-xs font-bold text-slate-700 cursor-pointer">Mostrar Logo Reisbloc</label>
              </div>

              <div className="flex items-center gap-1.5">
                <span>Negocio:</span>
                <input
                  type="text"
                  placeholder="REISBLOC RETAIL"
                  value={organizationSettings?.ticketBusinessName || ''}
                  onChange={async (e) => {
                    const val = e.target.value
                    const updatedSettings = { ...(organizationSettings || {}), ticketBusinessName: val }
                    setOrganizationSettings(updatedSettings)
                    if (currentUser?.organizationId && currentUser?.role === 'admin') {
                      const { supabase } = await import('@/config/supabase')
                      await supabase.from('organizations').update({ settings: updatedSettings }).eq('id', currentUser.organizationId)
                      useAppStore.setState({ currentUser: { ...currentUser, organizationSettings: updatedSettings } })
                    }
                  }}
                  className="px-2 py-1 bg-slate-50 border border-slate-200 rounded outline-none text-slate-900 w-36 font-normal"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <span>Dirección:</span>
                <input
                  type="text"
                  placeholder="Calle 123 Col. Centro"
                  value={organizationSettings?.ticketAddress || ''}
                  onChange={async (e) => {
                    const val = e.target.value
                    const updatedSettings = { ...(organizationSettings || {}), ticketAddress: val }
                    setOrganizationSettings(updatedSettings)
                    if (currentUser?.organizationId && currentUser?.role === 'admin') {
                      const { supabase } = await import('@/config/supabase')
                      await supabase.from('organizations').update({ settings: updatedSettings }).eq('id', currentUser.organizationId)
                      useAppStore.setState({ currentUser: { ...currentUser, organizationSettings: updatedSettings } })
                    }
                  }}
                  className="px-2 py-1 bg-slate-50 border border-slate-200 rounded outline-none text-slate-900 w-44 font-normal"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <span>Teléfono:</span>
                <input
                  type="text"
                  placeholder="55-1234-5678"
                  value={organizationSettings?.ticketPhone || ''}
                  onChange={async (e) => {
                    const val = e.target.value
                    const updatedSettings = { ...(organizationSettings || {}), ticketPhone: val }
                    setOrganizationSettings(updatedSettings)
                    if (currentUser?.organizationId && currentUser?.role === 'admin') {
                      const { supabase } = await import('@/config/supabase')
                      await supabase.from('organizations').update({ settings: updatedSettings }).eq('id', currentUser.organizationId)
                      useAppStore.setState({ currentUser: { ...currentUser, organizationSettings: updatedSettings } })
                    }
                  }}
                  className="px-2 py-1 bg-slate-50 border border-slate-200 rounded outline-none text-slate-900 w-28 font-normal"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <span>Mensaje Pie:</span>
                <input
                  type="text"
                  placeholder="¡Gracias por su compra!"
                  value={organizationSettings?.ticketFooterMsg || ''}
                  onChange={async (e) => {
                    const val = e.target.value
                    const updatedSettings = { ...(organizationSettings || {}), ticketFooterMsg: val }
                    setOrganizationSettings(updatedSettings)
                    if (currentUser?.organizationId && currentUser?.role === 'admin') {
                      const { supabase } = await import('@/config/supabase')
                      await supabase.from('organizations').update({ settings: updatedSettings }).eq('id', currentUser.organizationId)
                      useAppStore.setState({ currentUser: { ...currentUser, organizationSettings: updatedSettings } })
                    }
                  }}
                  className="px-2 py-1 bg-slate-50 border border-slate-200 rounded outline-none text-slate-900 w-44 font-normal"
                />
              </div>
            </div>

            <div className="text-[10px] text-slate-400 font-normal ml-auto">
              * Cambios guardados automáticamente en la nube (Admin).
            </div>
          </div>
        )}

        {/* Main Workspace: Combined Grid and Cart */}
        <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
          {/* Catalog Panel (Left) */}
          <div className="flex-[5] flex flex-col min-h-0 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="flex-1 min-h-0 p-4 overflow-y-auto custom-scrollbar">
              <ProductGrid products={filteredProducts} onAdd={handleAddProduct} disableAdd={isReadOnly || !!activeShift?.end_time} />
            </div>
          </div>

          {/* Cart Panel (Right) */}
          <div className="flex-[3] flex flex-col min-h-0 bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-2">
              <OrderPanel
                tableNumber={tableNumber}
                items={items}
                activeOrders={[]} // Hide restaurant statuses in Retail Pivot
                onIncrement={(id) => incrementDraftItem(tableNumber, id)}
                onDecrement={(id) => decrementDraftItem(tableNumber, id)}
                onRemove={(id) => removeDraftItem(tableNumber, id)}
                onClear={() => clearDraftForTable(tableNumber)}
                onEditNote={(item) => setEditingItem(item)}
                onUpdatePrice={(id, price) => updateDraftItemPrice(tableNumber, id, price)}
              />
            </div>

            {/* Checkout Region */}
            <div className="p-4 bg-white border-t border-slate-200 space-y-4 shrink-0 shadow-[0_-4px_10px_rgba(0,0,0,0.03)]">
              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl">
                <span className="font-black text-slate-500 text-sm">TOTAL</span>
                <span className="font-black text-3xl text-slate-900 tracking-tight">
                  ${currentTotal.toFixed(2)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handlePrintAccount(tableNumber)}
                  disabled={currentTotal === 0}
                  className="py-4 bg-slate-100 text-slate-900 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-slate-200 transition-all border border-slate-300"
                >
                  <Printer size={20} />
                  Ticket
                </button>
                <button
                  onClick={handleQuickCheckout}
                  disabled={currentTotal === 0}
                  className="py-4 bg-emerald-600 text-white font-black rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all"
                >
                  <DollarSign size={20} />
                  COBRAR
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modals */}
        {receiptModal?.isOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black text-slate-900">✅ Venta Completada</h2>
                <span className="text-2xl font-black text-emerald-600">${receiptModal.total.toFixed(2)}</span>
              </div>

              <div
                className="bg-slate-50 rounded-xl p-3 max-h-64 overflow-y-auto text-xs font-mono border border-slate-200"
                dangerouslySetInnerHTML={{ __html: sanitizeHTML(receiptModal.html) }}
              />

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    printService.printReceipt(receiptModal.html, { title: 'Ticket', width: 58 })
                  }}
                  className="flex-1 py-3 bg-slate-900 text-white font-black rounded-xl hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
                >
                  <Printer size={18} />
                  Imprimir
                </button>
                <button
                  onClick={() => setShowShareModal(true)}
                  className="flex-1 py-3 bg-green-500 text-white font-black rounded-xl hover:bg-green-600 transition-all flex items-center justify-center gap-2"
                >
                  <Share2 size={18} />
                  Compartir
                </button>
              </div>
              <button
                onClick={() => setReceiptModal(null)}
                className="w-full py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-all"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

        {receiptModal?.isOpen && showShareModal && (
          <TicketShareModal
            isOpen={showShareModal}
            onClose={() => setShowShareModal(false)}
            ticketHtml={receiptModal.html}
            ticketData={{
              orderId: receiptModal.orderId,
              items: receiptModal.items.map((item: any) => ({
                name: item.productName || item.name || 'Producto',
                quantity: item.quantity,
                price: item.unitPrice || item.price
              })),
              subtotal: receiptModal.total / 1.16,
              tax: receiptModal.total - (receiptModal.total / 1.16),
              total: receiptModal.total,
              paymentMethod: receiptModal.paymentMethod,
              ticketNumber: tableNumber,  // Legacy: tableNumber → ticketNumber
              businessName: currentUser?.businessName || 'REISBLOC STORE',
              cashier: currentUser?.username
            }}
          />
        )}

        {paymentPanel.isOpen && (
          <PaymentPanel
            orderId={paymentPanel.orderId || ''}
            orderIds={paymentPanel.orderIds}
            orderTotal={paymentPanel.orderTotal}
            tableNumber={tableNumber}
            onPaymentComplete={handlePaymentComplete}
            onCancel={() => setPaymentPanel({ isOpen: false, orderId: null, orderTotal: 0, orderIds: [] })}
          />
        )}

        {editingItem && (
          <OrderNoteModal
            isOpen={!!editingItem}
            onClose={() => setEditingItem(null)}
            onSave={(note) => { handleUpdateItemNote(editingItem.id, note); setEditingItem(null); }}
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

        {stockWarning.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-red-100">
              <div className="bg-red-50 p-6 border-b border-red-100 flex items-center gap-4">
                <div className="p-3 bg-red-100 text-red-600 rounded-full shrink-0">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-red-900 leading-none mb-1">Stock Insuficiente</h3>
                  <p className="text-red-700/80 text-sm font-medium">Algunos productos exceden las existencias.</p>
                </div>
              </div>

              <div className="p-6">
                <p className="text-slate-600 font-medium mb-4 text-sm">Los siguientes productos quedarán con inventario negativo si procedes:</p>
                <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden mb-6">
                  <div className="max-h-48 overflow-y-auto custom-scrollbar">
                    {stockWarning.items.map((item, idx) => (
                      <div key={idx} className="p-3 border-b border-slate-100 last:border-0 flex justify-between items-center text-sm">
                        <span className="font-bold text-slate-800 line-clamp-1">{item.name}</span>
                        <div className="text-right shrink-0 ml-4">
                          <div className="text-red-600 font-black">-{item.deficit}</div>
                          <div className="text-[10px] text-slate-400">Stock actual: {item.current}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStockWarning({ isOpen: false, items: [] })}
                    className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      // 📝 Audit Log: Forced Sale
                      supabaseService.createAuditLog({
                        userId: currentUser?.id || 'system',
                        action: 'SALE_FORCE_STOCK',
                        entityType: 'retail_sale',
                        entityId: 'pre-check',
                        oldValue: { warnings: stockWarning.items },
                        details: 'User forced sale with insufficient stock'
                      }).catch(console.error)

                      setStockWarning({ isOpen: false, items: [] })
                      confirmCheckout() // Proceder
                    }}
                    className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
                  >
                    Forzar Venta
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  )
}
