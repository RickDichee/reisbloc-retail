import { useEffect, useMemo, useState, useRef } from 'react'
import logger from '@/utils/logger'
import { useAppStore } from '@/store/appStore'
import { BRANDING } from '@/config/branding'
import supabaseService from '@/services/supabaseService'
import imageCacheService from '@/services/imageCacheService'
import { supabase } from '@/config/supabase'
import DashboardLayout from '@/components/layout/DashboardLayout'
import ProductGrid from '@/components/pos/ProductGrid'
import OrderPanel from '@/components/pos/OrderPanel'
import PaymentPanel, { PaymentResult } from '@/components/pos/PaymentPanel'
import OrderNoteModal from '@/components/pos/OrderNoteModal'
import ManualItemModal from '@/components/pos/ManualItemModal'
import ReceiptTicket from '@/components/pos/ReceiptTicket'
import TicketShareModal from '@/components/pos/TicketShareModal'
import PendingOrdersModal from '@/components/pos/PendingOrdersModal'
import { renderToStaticMarkup } from 'react-dom/server'
import { Product, OrderItem, Order } from '@/types/index'
import { shiftService } from '@/services/shiftService'
import printService from '@/services/printService'
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner'
import { sanitizeHTML } from '@/utils/sanitize'
import { PlusCircle, Search, Printer, DollarSign, LayoutGrid, AlertTriangle, Share2, Plus, Edit2, X, User, Users, Save, Loader2, Sparkles, SlidersHorizontal, Package, ShoppingBag, ChevronUp, ChevronDown } from 'lucide-react'
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
  const [showManualAdjustModal, setShowManualAdjustModal] = useState(false)
  const [activeOrdersList, setActiveOrdersList] = useState<Order[]>([])
  const [showPendingOrdersModal, setShowPendingOrdersModal] = useState(false)
  const [showMobileCartDrawer, setShowMobileCartDrawer] = useState(false)

  // CRM Clients state & loading
  const [clients, setClients] = useState<any[]>([])
  const [selectedClient, setSelectedClient] = useState<any>(null)
  const [showClientSelector, setShowClientSelector] = useState(false)
  const [clientSearchTerm, setClientSearchTerm] = useState('')
  const [showNewClientModal, setShowNewClientModal] = useState(false)
  const [newClientName, setNewClientName] = useState('')
  const [newClientPhone, setNewClientPhone] = useState('')
  const [newClientEmail, setNewClientEmail] = useState('')
  const [isSavingClient, setIsSavingClient] = useState(false)

  const loadClients = async () => {
    if (!currentUser?.organizationId) return
    try {
      // usando supabase importado estáticamente
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('organization_id', currentUser.organizationId)
        .is('deleted_at', null)
        .order('name', { ascending: true })
      if (!error && data) {
        setClients(data)
      }
    } catch (e) {
      console.error('Error fetching clients in POS:', e)
    }
  }

  useEffect(() => {
    loadClients()
  }, [currentUser?.organizationId])

  const handleCreateQuickClient = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newClientName.trim() || !currentUser?.organizationId) return
    setIsSavingClient(true)
    try {
      // usando supabase importado estáticamente
      const payload = {
        name: newClientName.trim(),
        phone: newClientPhone.trim() || null,
        email: newClientEmail.trim() || null,
        organization_id: currentUser.organizationId,
        updated_at: new Date().toISOString()
      }
      const { data, error } = await supabase
        .from('clients')
        .insert([payload])
        .select()
        .single()
      
      if (error) throw error
      if (data) {
        await loadClients()
        setSelectedClient(data)
        setShowNewClientModal(false)
        setNewClientName('')
        setNewClientPhone('')
        setNewClientEmail('')
      }
    } catch (err: any) {
      alert(`Error al registrar cliente: ${err.message}`)
    } finally {
      setIsSavingClient(false)
    }
  }

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
    const allNums = Object.keys(registers).map(Number).sort((a, b) => a - b)
    const isAdminOrManager = ['admin', 'manager', 'owner', 'superadmin'].includes(currentUser?.role?.toLowerCase() || '')

    if (isAdminOrManager) {
      return allNums
    }

    // Para Empleados / Cajeros (ej. Hilda): Mostrar únicamente su Caja Asignada + 1 Caja de Emergencia
    let assignedNum: number | null = null
    for (const num of allNums) {
      const assignedUserId = registerAssignments[num.toString()]
      if (assignedUserId === currentUser?.id) {
        assignedNum = num
        break
      }
    }

    const userRegister = assignedNum || 1
    const emergencyRegister = allNums.length > 1 ? allNums[allNums.length - 1] : (userRegister === 1 ? 2 : 1)

    const visible = [userRegister]
    if (emergencyRegister !== userRegister && !visible.includes(emergencyRegister)) {
      visible.push(emergencyRegister)
    }

    return visible.sort((a, b) => a - b)
  }, [registers, registerAssignments, currentUser])

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
        // usando supabase importado estáticamente
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
        // usando supabase importado estáticamente
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
        // usando supabase importado estáticamente
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
  const [isHeaderExpanded, setIsHeaderExpanded] = useState(false)

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
    const targetTicket = (scannerNum && tableButtons.includes(scannerNum)) ? scannerNum : tableNumber
    const scanned = code.trim().toLowerCase()

    let isPackScan = false
    let matchedProduct = products.find(p => {
      const pPiece = (p.barcode || p.sku || '').trim().toLowerCase()
      const pPack = ((p as any).barcode_pack || (p as any).barcodePack || `${pPiece}-paq`).toLowerCase()
      
      if (scanned === pPack || scanned === `${pPiece}-paq` || (p.sku && scanned === `${p.sku.toLowerCase()}-paq`)) {
        isPackScan = true
        return true
      }
      return scanned === pPiece || scanned === (p.sku || '').toLowerCase()
    })

    if (!matchedProduct) return

    const parsedDesc = parseProductDescription(matchedProduct.description || '')
    const explicitPackQty = Number(matchedProduct.packQuantity || (matchedProduct as any).pack_quantity || (matchedProduct as any).wholesale_min_qty || parsedDesc.packQty || 1)
    const packQty = explicitPackQty > 1 ? explicitPackQty : 10

    const rawPrice = Number(matchedProduct.price || 0)
    let wholesalePrice = Number(matchedProduct.wholesalePrice || (matchedProduct as any).wholesale_price || parsedDesc.wholesalePrice || 0)
    let packPrice = Number((matchedProduct as any).packPrice || (matchedProduct as any).pack_price || parsedDesc.packPrice || 0)

    let extractedPriceFromName: number | null = null
    const nameStr = matchedProduct.name || ''
    if (nameStr.includes('$')) {
      const afterDollar = nameStr.split('$')[1] || ''
      const parsedNum = parseFloat(afterDollar)
      if (!isNaN(parsedNum) && parsedNum > 0) {
        extractedPriceFromName = parsedNum
      }
    }

    let unitPackPrice = rawPrice
    if (extractedPriceFromName !== null && extractedPriceFromName > 0) {
      unitPackPrice = extractedPriceFromName
    } else if (packPrice > 0) {
      unitPackPrice = packPrice > rawPrice * 2 && explicitPackQty > 1 ? packPrice / packQty : packPrice
    } else if (wholesalePrice > 0) {
      unitPackPrice = wholesalePrice
    }

    if (isPackScan || priceMode === 'paquete') {
      // 📦 Escaneo / Modo Paquete Completo: agregar packQty piezas al ticket con unitPackPrice
      const computedProduct = {
        ...matchedProduct,
        price: unitPackPrice,
        packQuantity: 1
      }
      for (let i = 0; i < packQty; i++) {
        addItemToDraft(targetTicket, computedProduct, currentUser.username || currentUser.email || currentUser.id)
      }
    } else {
      if (targetTicket !== tableNumber) {
        setCurrentTicket(targetTicket)
      }
      handleAddProduct(matchedProduct, false)
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
    // 1. Cargar instantáneamente desde caché local (IndexedDB/localStorage) a 0ms
    try {
      const cached = await imageCacheService.getCachedProducts()
      if (cached && cached.length > 0) {
        setProducts(cached)
        setLoading(false)
      } else {
        setLoading(true)
      }
    } catch (e) {
      setLoading(true)
    }

    // 2. Sincronizar catálogo actualizado desde Supabase en segundo plano
    try {
      const prods = await supabaseService.getAllRetailProducts()
      if (prods && prods.length > 0) {
        setProducts(prods)
        imageCacheService.saveCachedProducts(prods).catch(console.error)
      }
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
        handleAddProduct(exactMatch, priceMode === 'paquete')
        setSearchTerm('')
        return
      }
      if (filteredProducts.length === 1) {
        handleAddProduct(filteredProducts[0], priceMode === 'paquete')
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

  const handleAddProduct = (product: Product, isPackageMode: boolean = false) => {
    if (!currentUser || isReadOnly) return
    
    const parsedDesc = parseProductDescription(product.description || '')

    let namePrice: number | null = null
    if (product.name && product.name.includes('$')) {
      const afterDollar = product.name.split('$')[1] || ''
      const pNum = parseFloat(afterDollar)
      if (!isNaN(pNum) && pNum > 0) namePrice = pNum
    }

    const rawPrice = Number(product.price || 0)
    const wholesalePrice = Number(product.wholesalePrice || (product as any).wholesale_price || parsedDesc.wholesalePrice || 0)
    const packPrice = Number((product as any).packPrice || (product as any).pack_price || parsedDesc.packPrice || 0)
    const unitPackPrice = namePrice || (packPrice > 0 ? (packPrice > rawPrice * 2 ? packPrice / 10 : packPrice) : (wholesalePrice > 0 ? wholesalePrice : rawPrice))

    // 📦 MODO PAQUETE: Agregar paquete completo de piezas a precio por pieza en paquete
    if (isPackageMode || priceMode === 'paquete') {
      const explicitPackQty = Number(product.packQuantity || (product as any).pack_quantity || (product as any).wholesale_min_qty || parsedDesc.packQty || 1)
      const packQty = explicitPackQty > 1 ? explicitPackQty : 10

      const computedProduct = {
        ...product,
        price: unitPackPrice,
        packQuantity: 1
      }

      for (let i = 0; i < packQty; i++) {
        addItemToDraft(tableNumber, computedProduct, currentUser.id)
      }
      return
    }

    // 👤 MODO PIEZA: Agregar 1 pieza individual usando PRECIO POR PIEZA EN PAQUETE
    const computedProduct = {
      ...product,
      price: unitPackPrice,
      packQuantity: 1
    }

    addItemToDraft(tableNumber, computedProduct, currentUser.id)
  }

  const handleAddPackageProduct = (product: Product) => {
    if (!currentUser || isReadOnly) return

    const parsedDesc = parseProductDescription(product.description || '')
    const explicitPackQty = Number(product.packQuantity || (product as any).pack_quantity || (product as any).wholesale_min_qty || parsedDesc.packQty || 1)
    const packQty = explicitPackQty > 1 ? explicitPackQty : 10

    const rawPrice = Number(product.price || 0)
    let wholesalePrice = Number(product.wholesalePrice || (product as any).wholesale_price || parsedDesc.wholesalePrice || 0)
    let packPrice = Number((product as any).packPrice || (product as any).pack_price || parsedDesc.packPrice || 0)

    let namePrice: number | null = null
    if (product.name && product.name.includes('$')) {
      const afterDollar = product.name.split('$')[1] || ''
      const pNum = parseFloat(afterDollar)
      if (!isNaN(pNum) && pNum > 0) namePrice = pNum
    }

    let unitPackPrice = rawPrice
    if (namePrice !== null && namePrice > 0) {
      unitPackPrice = namePrice
    } else if (packPrice > 0) {
      unitPackPrice = packPrice > rawPrice * 2 && explicitPackQty > 1 ? packPrice / packQty : packPrice
    } else if (wholesalePrice > 0) {
      unitPackPrice = wholesalePrice
    }

    const computedProduct = {
      ...product,
      price: unitPackPrice,
      packQuantity: 1
    }

    for (let i = 0; i < packQty; i++) {
      addItemToDraft(tableNumber, computedProduct, currentUser.id)
    }
  }

  const handleAddManualItem = (description: string, price: number, packQty: number = 1) => {
    if (!currentUser || isReadOnly) return
    const virtualProduct: any = {
      id: `manual-${Date.now()}`,
      name: description,
      price: price,
      category: 'Manual',
      image: '',
      packQuantity: 1
    }

    const count = packQty > 1 ? packQty : 1
    for (let i = 0; i < count; i++) {
      addItemToDraft(tableNumber, virtualProduct, currentUser.id)
    }
    
    // Audit Log: Manual item added
    supabaseService.createAuditLog({
      userId: currentUser.id,
      action: 'POS_MANUAL_ITEM_ADDED',
      entityType: 'POS',
      entityId: `caja-${tableNumber}`,
      newValue: { description, price, packQty: count }
    }).catch(err => console.error('Error logging manual item:', err))
  }

  const handleCreatePendingOrder = async () => {
    if (items.length === 0 || !currentUser) return

    // 🔒 RESTRICCIÓN DE SEGURIDAD: Solo Admin y Gerencia pueden crear pedidos sin cobrar
    const userRole = (currentUser?.role || '').toLowerCase()
    const isAuthorized = userRole === 'admin' || userRole === 'manager' || userRole === 'supervisor' || userRole === 'gerente'
    
    if (!isAuthorized) {
      alert('🔒 Acceso Restringido:\nLa creación de pedidos y apartados sin cobrar está reservada únicamente para Gerencia y Administradores.')
      return
    }

    let clientInfo = selectedClient 
      ? `${selectedClient.name} ${selectedClient.phone ? `(Tel: ${selectedClient.phone})` : ''}`
      : prompt('Nombre / Datos del cliente para guardar este pedido/apartado:')

    if (!clientInfo || !clientInfo.trim()) return

    try {
      const orderPayload: any = {
        tableNumber,
        items: items.map(i => ({
          id: i.id,
          productId: i.productId,
          productName: i.productName,
          quantity: i.quantity,
          unitPrice: i.unitPrice
        })),
        total: currentTotal,
        notes: clientInfo,
        status: 'pending_surtir',
        createdBy: currentUser.id,
        paidAmount: 0,
        pendingBalance: currentTotal,
        paymentStatus: 'unpaid',
        isPaid: false
      }

      const orderId = await supabaseService.createOrder(orderPayload)

      // 📝 LOG DE AUDITORÍA OBLIGATORIO DE CREACIÓN DE PEDIDO
      await supabaseService.createAuditLog({
        userId: currentUser.id,
        action: 'POS_PENDING_ORDER_CREATED',
        entityType: 'ORDER',
        entityId: orderId,
        newValue: {
          clientInfo,
          total: currentTotal,
          itemsCount: items.length,
          createdBy: currentUser.username || currentUser.email || currentUser.id,
          role: currentUser.role
        }
      })

      // Reservar inventario
      for (const item of items) {
        const prod = products.find(p => p.id === item.productId)
        if (prod && prod.hasInventory) {
          const newStock = Math.max(0, (prod.currentStock || 0) - item.quantity)
          await supabaseService.updateProductStock(prod.id, newStock)
        }
      }

      clearDraftForTable(tableNumber)
      setSelectedClient(null)

      alert(`✅ Pedido/Apartado #${(orderId || '').slice(0, 8).toUpperCase()} creado por ${currentUser.username || 'Gerencia'} y registrado en Auditoría. Stock reservado.`)
      const updatedList = await supabaseService.getActiveOrders()
      setActiveOrdersList(updatedList || [])
    } catch (err: any) {
      console.error('Error saving pending order:', err)
      alert('Error al guardar el pedido: ' + err.message)
    }
  }

  const handleCheckoutPendingOrder = (order: Order) => {
    const draftItems: OrderItem[] = order.items.map(item => ({
      id: item.id || `order-item-${Math.random()}`,
      productId: item.productId,
      productName: item.productName,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      packQuantity: 1
    }))

    useAppStore.setState(state => ({
      draftOrders: {
        ...state.draftOrders,
        [tableNumber]: draftItems
      }
    }))

    setPaymentPanel({
      isOpen: true,
      orderId: order.id,
      orderTotal: order.total,
      orderIds: [order.id]
    })
  }

  const handleUpdatePrice = (itemId: string, newPrice: number) => {
    if (!currentUser || isReadOnly) return
    const item = items.find(i => i.id === itemId)
    if (item) {
      const isPriceReduction = newPrice < item.unitPrice
      const isAdmin = ['admin', 'owner', 'superadmin'].includes(currentUser.role?.toLowerCase() || '')

      if (isPriceReduction && !isAdmin) {
        alert(`⚠️ ALERTA DE EXCEPCIÓN DE PRECIO (ADMIN):
Se está aplicando un precio especial ($${newPrice.toFixed(2)}) por debajo del precio público a una sola pieza.
Esta excepción será registrada en el registro de auditoría y quedará notificada en las observaciones del Cierre de Caja.`)
      }

      updateDraftItemPrice(tableNumber, itemId, newPrice)
      
      // Audit Log: Price manually adjusted in cart with exception flag
      supabaseService.createAuditLog({
        userId: currentUser.id,
        action: isPriceReduction ? 'POS_SPECIAL_PRICE_EXCEPTION_APPLIED' : 'POS_PRICE_ADJUSTED',
        entityType: 'POS',
        entityId: `caja-${tableNumber}`,
        newValue: { itemId, oldPrice: item.unitPrice, newPrice, productName: item.name || 'Producto', isException: isPriceReduction, userRole: currentUser.role }
      }).catch(err => console.error('Error logging price adjustment:', err))

      // Registrar nota de ajuste en el turno de caja activo si aplica reducción
      if (isPriceReduction && activeShift?.id) {
        const noteMsg = `⚠️ Excepción de Precio Aplicada por ${currentUser.name || currentUser.username}: ${item.name} de $${item.unitPrice.toFixed(2)} a $${newPrice.toFixed(2)}`
        shiftService.appendShiftNote(activeShift.id, noteMsg)
      }
    }
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
          clientName={selectedClient?.name}
          clientPhone={selectedClient?.phone}
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

    // 2. CRM Client Check (Obligatorio o Bypass con Bitácora de Auditoría) 👤
    if (!selectedClient) {
      setShowClientSelector(true)
      return
    }

    confirmCheckout()
  }

  const handleBypassCrmClient = () => {
    if (!currentUser) return
    
    // Registrar Audit Log del Bypass de CRM por el cajero
    supabaseService.createAuditLog({
      userId: currentUser.id,
      action: 'POS_CRM_CLIENT_BYPASS',
      entityType: 'POS',
      entityId: `caja-${tableNumber}`,
      newValue: {
        total: currentTotal,
        reason: 'Venta realizada sin asociación de cliente CRM (Bypass autorizado por cajero)'
      }
    }).catch(err => console.error('Error logging CRM bypass:', err))

    setShowClientSelector(false)
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
        notes: 'Venta Directa Retail',
        clientId: selectedClient?.id,
        clientName: selectedClient?.name,
        clientPhone: selectedClient?.phone
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
            clientName={selectedClient?.name}
            clientPhone={selectedClient?.phone}
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

      setSelectedClient(null)
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
        {/* Mobile Sticky Header Bar */}
        <div className="flex md:hidden items-center justify-between bg-white p-3 rounded-xl border border-gray-200 shadow-sm shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-black text-slate-800 uppercase tracking-tight">
              {registers[tableNumber.toString()] || `Caja ${tableNumber}`}
            </span>
            <span className="text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-black uppercase">
              {priceMode}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowManualItemModal(true)}
              className="p-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800"
              title="Agregar item manual"
            >
              <Plus size={14} />
            </button>
            <button
              onClick={() => setIsHeaderExpanded(!isHeaderExpanded)}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-[10px] font-black uppercase flex items-center gap-1 transition-all border border-slate-200"
            >
              {isHeaderExpanded ? 'Ocultar 🔼' : '🔍 Buscar / Cajas 🔽'}
            </button>
          </div>
        </div>

        {/* Unified Header with Search and Accounts */}
        <div className={`bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 items-center shrink-0 ${isHeaderExpanded ? 'flex animate-scaleIn' : 'hidden md:flex'}`}>
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
                              // usando supabase importado estáticamente
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

          <button
            onClick={() => setShowManualItemModal(true)}
            className="hidden md:flex p-3 bg-slate-900 text-white rounded-xl shadow-md hover:scale-105 transition-all"
            title="Agregar producto manual"
          >
            <PlusCircle size={22} />
          </button>

          <button
            onClick={() => setShowManualAdjustModal(true)}
            className="hidden md:flex p-3 bg-white text-slate-500 hover:text-slate-900 border border-slate-200 hover:border-slate-300 rounded-xl transition-all shrink-0 active:scale-95 shadow-sm"
            title="Ajuste Manual de Ticket (Piezas y Precios)"
          >
            <SlidersHorizontal size={20} />
          </button>

          <button
            onClick={() => setShowPendingOrdersModal(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-amber-400 text-slate-950 rounded-xl font-black text-xs hover:bg-amber-500 transition-all shrink-0 shadow-md shadow-amber-200 active:scale-95 border border-amber-300"
            title="Ver Pedidos Pendientes y Apartados con Stock Reservado"
          >
            <ShoppingBag size={18} />
            <span className="hidden sm:inline uppercase">Pedidos</span>
            <span className="bg-slate-950 text-amber-300 font-mono text-[10.5px] px-1.5 py-0.5 rounded-full font-black">
              {activeOrdersList.length}
            </span>
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
                    // usando supabase importado estáticamente
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
                    // usando supabase importado estáticamente
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
                    // usando supabase importado estáticamente
                    await supabase.from('organizations').update({ settings: updatedSettings }).eq('id', currentUser.organizationId)
                    useAppStore.setState({ currentUser: { ...currentUser, organizationSettings: updatedSettings } })
                  }
                }}
                className="w-48 px-2 py-1 bg-slate-50 border border-slate-200 rounded outline-none text-slate-900 font-normal"
              />
            </div>
          </div>
        )}

        {/* Main Workspace: Combined Grid and Cart */}
        <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
          {/* Catalog Panel (Left - Maximized) */}
          <div className="flex-[7.5] flex flex-col min-h-0 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="flex-1 min-h-0 p-3 sm:p-4 overflow-y-auto custom-scrollbar">
              <ProductGrid 
                products={filteredProducts} 
                onAdd={handleAddProduct} 
                disableAdd={isReadOnly || !!activeShift?.end_time} 
              />
            </div>
          </div>

          {/* Cart Panel (Right - Pinned on Desktop, Hidden on Mobile/Tablet) */}
          <div className="hidden lg:flex flex-[2.5] flex-col min-h-0 bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-1.5 sm:p-2">
              <OrderPanel
                tableNumber={tableNumber}
                items={items}
                activeOrders={[]} // Hide restaurant statuses in Retail Pivot
                onIncrement={(id) => incrementDraftItem(tableNumber, id)}
                onDecrement={(id) => decrementDraftItem(tableNumber, id)}
                onRemove={(id) => removeDraftItem(tableNumber, id)}
                onClear={() => clearDraftForTable(tableNumber)}
                onEditNote={(item) => setEditingItem(item)}
                onUpdatePrice={(id, price) => handleUpdatePrice(id, price)}
              />
            </div>

            {/* Checkout Region - Compact Desktop */}
            <div className="p-3 bg-white border-t border-slate-200 space-y-2.5 shrink-0 shadow-[0_-4px_10px_rgba(0,0,0,0.03)]">
              {/* CRM Client Association */}
              <div className="animate-fadeIn">
                {selectedClient ? (
                  <div className="w-full flex items-center justify-between px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl shadow-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 bg-emerald-500 text-slate-950 font-black rounded-md flex items-center justify-center text-[10px] shrink-0">
                        {selectedClient.name[0].toUpperCase()}
                      </div>
                      <div className="text-left min-w-0">
                        <p className="text-[7.5px] font-black text-emerald-600 uppercase tracking-widest leading-none mb-0.5">Cliente CRM</p>
                        <p className="text-xs font-black text-slate-800 leading-none truncate">{selectedClient.name}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedClient(null)}
                      className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors shrink-0"
                      title="Quitar cliente"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setClientSearchTerm('')
                      setShowClientSelector(true)
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl transition-all group"
                  >
                    <div className="flex items-center gap-2 text-slate-600">
                      <User size={14} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
                      <span className="text-[9.5px] font-black uppercase tracking-wider">Asociar Cliente CRM</span>
                    </div>
                    <Plus size={13} className="text-slate-400" />
                  </button>
                )}
              </div>

              {/* Total Display */}
              <div className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-xl">
                <span className="font-black text-slate-500 text-xs uppercase">TOTAL</span>
                <span className="font-black text-2xl text-slate-900 tracking-tight">
                  ${currentTotal.toFixed(2)}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleCreatePendingOrder}
                  disabled={currentTotal === 0}
                  className="w-full py-2.5 bg-amber-400 text-slate-950 font-black rounded-xl flex items-center justify-center gap-2 hover:bg-amber-500 transition-all border border-amber-300 shadow-xs shadow-amber-100 disabled:opacity-40 uppercase text-[11px] tracking-wider"
                >
                  <ShoppingBag size={16} />
                  <span>Guardar Pedido / Apartado (Stock)</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handlePrintAccount(tableNumber)}
                    disabled={currentTotal === 0}
                    className="py-2.5 bg-slate-100 text-slate-900 font-bold rounded-xl flex items-center justify-center gap-1.5 hover:bg-slate-200 transition-all border border-slate-300 text-xs"
                  >
                    <Printer size={16} />
                    Ticket
                  </button>
                  <button
                    onClick={handleQuickCheckout}
                    disabled={currentTotal === 0}
                    className="py-2.5 bg-emerald-600 text-white font-black rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-emerald-200 hover:bg-emerald-700 transition-all text-xs"
                  >
                    <DollarSign size={16} />
                    COBRAR
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 📱 Mobile & Tablet Floating Ticket Bar (< lg screens) */}
        <div className="lg:hidden fixed bottom-3 left-3 right-3 z-40 bg-slate-900 text-white rounded-2xl shadow-2xl p-3 border border-slate-800 flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold">
                <ShoppingBag size={20} />
              </div>
              {items.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-amber-400 text-slate-950 font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
                  {items.reduce((acc, i) => acc + i.quantity, 0)}
                </span>
              )}
            </div>
            <div>
              <p className="text-[9.5px] font-black text-amber-400 uppercase tracking-widest leading-none">Ticket #{tableNumber}</p>
              <p className="text-base font-black text-white leading-tight">
                ${currentTotal.toFixed(2)} <span className="text-xs text-slate-400 font-medium">({items.length} items)</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowMobileCartDrawer(true)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase rounded-xl shadow-md transition-all flex items-center gap-1.5 active:scale-95"
          >
            <span>Ver Ticket</span>
            <ChevronUp size={16} />
          </button>
        </div>

        {/* 📱 Mobile & Tablet Slide-Up Ticket Drawer Sheet (< lg screens) */}
        {showMobileCartDrawer && (
          <div className="fixed inset-0 z-[9999] lg:hidden bg-slate-900/60 backdrop-blur-sm flex flex-col justify-end p-0 sm:p-4">
            <div className="bg-slate-50 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-slideUp border border-slate-200">
              {/* Header Drawer */}
              <div className="bg-slate-900 text-white p-4 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                  <ShoppingBag size={20} className="text-amber-400" />
                  <h3 className="font-black text-base uppercase">Detalle de Ticket #{tableNumber}</h3>
                </div>
                <button
                  onClick={() => setShowMobileCartDrawer(false)}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-all flex items-center gap-1 text-xs font-bold"
                >
                  <span>Ocultar</span>
                  <ChevronDown size={16} />
                </button>
              </div>

              {/* Order Panel Body */}
              <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                <OrderPanel
                  tableNumber={tableNumber}
                  items={items}
                  activeOrders={[]}
                  onIncrement={(id) => incrementDraftItem(tableNumber, id)}
                  onDecrement={(id) => decrementDraftItem(tableNumber, id)}
                  onRemove={(id) => removeDraftItem(tableNumber, id)}
                  onClear={() => clearDraftForTable(tableNumber)}
                  onEditNote={(item) => setEditingItem(item)}
                  onUpdatePrice={(id, price) => handleUpdatePrice(id, price)}
                />
              </div>

              {/* Checkout Region in Drawer */}
              <div className="p-4 bg-white border-t border-slate-200 space-y-3 shrink-0">
                {/* CRM Client */}
                <div>
                  {selectedClient ? (
                    <div className="w-full flex items-center justify-between px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <span className="text-xs font-black text-slate-800 truncate">👤 {selectedClient.name}</span>
                      <button onClick={() => setSelectedClient(null)} className="text-slate-400 hover:text-red-500">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setShowMobileCartDrawer(false)
                        setShowClientSelector(true)
                      }}
                      className="w-full py-2 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase"
                    >
                      + Asociar Cliente CRM
                    </button>
                  )}
                </div>

                {/* Total */}
                <div className="flex justify-between items-center bg-slate-50 px-4 py-2.5 rounded-xl">
                  <span className="font-black text-slate-500 text-xs uppercase">TOTAL A COBRAR</span>
                  <span className="font-black text-2xl text-slate-900">${currentTotal.toFixed(2)}</span>
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMobileCartDrawer(false)
                      handleCreatePendingOrder()
                    }}
                    disabled={currentTotal === 0}
                    className="w-full py-3 bg-amber-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md"
                  >
                    <ShoppingBag size={18} />
                    <span>Guardar Pedido / Apartado (Stock)</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setShowMobileCartDrawer(false)
                        handlePrintAccount(tableNumber)
                      }}
                      disabled={currentTotal === 0}
                      className="py-3 bg-slate-100 text-slate-900 font-bold rounded-xl text-xs flex items-center justify-center gap-2"
                    >
                      <Printer size={18} />
                      Imprimir
                    </button>
                    <button
                      onClick={() => {
                        setShowMobileCartDrawer(false)
                        handleQuickCheckout()
                      }}
                      disabled={currentTotal === 0}
                      className="py-3 bg-emerald-600 text-white font-black rounded-xl text-xs uppercase flex items-center justify-center gap-2 shadow-lg shadow-emerald-200"
                    >
                      <DollarSign size={18} />
                      COBRAR
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

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
              businessName: currentUser?.businessName || BRANDING.appWithBrand.toUpperCase(),
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

        {showManualAdjustModal && (
          <ManualAdjustModal
            isOpen={showManualAdjustModal}
            onClose={() => setShowManualAdjustModal(false)}
            items={items}
            tableNumber={tableNumber}
            currentUser={currentUser}
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
        {/* Client Selector Modal */}
        {showClientSelector && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-scaleIn border border-slate-200 flex flex-col max-h-[85vh]">
              <div className="bg-slate-900 p-5 text-white flex justify-between items-center shrink-0">
                <div>
                  <h2 className="text-lg font-black uppercase tracking-tighter">Asociar Cliente CRM</h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Reisbloc Loyalty & CRM</p>
                </div>
                <button
                  onClick={() => setShowClientSelector(false)}
                  className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 flex flex-col gap-4 overflow-hidden flex-1">
                {/* Search Bar */}
                <div className="relative shrink-0">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    placeholder="Buscar por Nombre o Teléfono..."
                    value={clientSearchTerm}
                    onChange={(e) => setClientSearchTerm(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none font-bold text-sm"
                  />
                </div>

                {/* Clients List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                  {clients.filter(c =>
                    c.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
                    c.phone?.includes(clientSearchTerm)
                  ).length === 0 ? (
                    <div className="text-center py-12 flex flex-col items-center">
                      <Users className="text-slate-200 mb-2" size={40} />
                      <p className="text-xs text-slate-400 font-bold">No se encontraron clientes</p>
                    </div>
                  ) : (
                    clients
                      .filter(c =>
                        c.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
                        c.phone?.includes(clientSearchTerm)
                      )
                      .map(client => (
                        <button
                          key={client.id}
                          onClick={() => {
                            setSelectedClient(client)
                            setShowClientSelector(false)
                            setClientSearchTerm('')
                          }}
                          className="w-full text-left p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/50 transition-all flex items-center justify-between group active:scale-[0.98]"
                        >
                          <div>
                            <p className="text-sm font-black text-slate-800">{client.name}</p>
                            {client.phone && <p className="text-[10px] text-slate-400 font-bold">{client.phone}</p>}
                          </div>
                          <span className="text-[10px] bg-slate-200/60 group-hover:bg-slate-900 group-hover:text-white px-2.5 py-1 rounded-md font-black uppercase tracking-wider transition-all">
                            Seleccionar
                          </span>
                        </button>
                      ))
                  )}
                </div>

                {/* Quick Register Trigger */}
                <div className="space-y-2 shrink-0 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setShowClientSelector(false)
                      setShowNewClientModal(true)
                    }}
                    className="w-full py-3.5 bg-slate-900 text-white hover:bg-slate-850 rounded-xl font-black text-xs uppercase tracking-tight flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md"
                  >
                    <Plus size={16} />
                    + Crear Nuevo Cliente en CRM
                  </button>

                  <button
                    onClick={handleBypassCrmClient}
                    className="w-full py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all"
                    title="Registra esta omisión en los Audit Logs de Configuración"
                  >
                    <span>⚠️ Omitir Registro CRM y Continuar Cobro (Bitácora Log)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick New Client Modal */}
        {showNewClientModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-scaleIn border border-slate-200">
              <div className="bg-slate-900 p-5 text-white flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-black uppercase tracking-tighter">Registrar Cliente</h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Alta rápida desde Caja</p>
                </div>
                <button
                  onClick={() => setShowNewClientModal(false)}
                  className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateQuickClient} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nombre Completo *</label>
                  <input
                    required
                    type="text"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    placeholder="Ej. Juan Pérez"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none font-bold text-slate-700 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Teléfono móvil</label>
                    <input
                      type="tel"
                      value={newClientPhone}
                      onChange={(e) => setNewClientPhone(e.target.value)}
                      placeholder="9981234567"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none font-bold text-slate-700 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Correo Electrónico</label>
                    <input
                      type="email"
                      value={newClientEmail}
                      onChange={(e) => setNewClientEmail(e.target.value)}
                      placeholder="juan@gmail.com"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none font-bold text-slate-700 text-sm"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewClientModal(false)
                      setShowClientSelector(true)
                    }}
                    className="flex-1 py-3.5 bg-slate-100 text-slate-600 rounded-xl font-black text-xs hover:bg-slate-200 transition-all uppercase tracking-tight"
                  >
                    Volver
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingClient}
                    className="flex-1 py-3.5 bg-slate-900 text-white rounded-xl font-black text-xs shadow-lg hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-50 uppercase tracking-tight"
                  >
                    {isSavingClient ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                    REGISTRAR
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showPendingOrdersModal && (
          <PendingOrdersModal
            isOpen={showPendingOrdersModal}
            onClose={() => setShowPendingOrdersModal(false)}
            orders={activeOrdersList}
            onCheckoutOrder={handleCheckoutPendingOrder}
            onRefresh={async () => {
              const active = await supabaseService.getActiveOrders()
              setActiveOrdersList(active || [])
            }}
          />
        )}

      </div>
    </DashboardLayout>
  )
}

// Modal de Ajuste Manual de Ticket (Para todos los usuarios con Log de Auditoría obligatorio)
function ManualAdjustModal({
  isOpen,
  onClose,
  items,
  tableNumber,
  currentUser
}: {
  isOpen: boolean
  onClose: () => void
  items: OrderItem[]
  tableNumber: number
  currentUser: any
}) {
  const [adjustedItems, setAdjustedItems] = useState<OrderItem[]>([])
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setAdjustedItems(JSON.parse(JSON.stringify(items)))
      setReason('')
    }
  }, [isOpen, items])

  if (!isOpen) return null

  const handleQtyChange = (id: string, newQty: number) => {
    setAdjustedItems(prev => prev.map(item => item.id === id ? { ...item, quantity: Math.max(1, newQty) } : item))
  }

  const handlePriceChange = (id: string, newPrice: number) => {
    setAdjustedItems(prev => prev.map(item => item.id === id ? { ...item, unitPrice: Math.max(0, newPrice) } : item))
  }

  const totalBefore = items.reduce((acc, i) => acc + (i.unitPrice * i.quantity), 0)
  const totalAfter = adjustedItems.reduce((acc, i) => acc + (i.unitPrice * i.quantity), 0)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason.trim()) {
      alert('Por favor especifica un motivo o nota breve para el registro de auditoría de este ajuste.')
      return
    }

    setSaving(true)
    try {
      // 📝 LOG DE AUDITORÍA OBLIGATORIO PARA TODOS LOS USUARIOS
      await supabaseService.createAuditLog({
        userId: currentUser?.id || 'unknown',
        action: 'POS_MANUAL_TICKET_ADJUSTMENT',
        entityType: 'POS_TICKET',
        entityId: `caja-${tableNumber}`,
        oldValue: { totalBefore, itemsCountBefore: items.length },
        newValue: {
          totalAfter,
          reason,
          adjustedBy: currentUser?.username || currentUser?.email || currentUser?.id,
          role: currentUser?.role,
          itemsAfter: adjustedItems.map(i => ({ name: i.productName, qty: i.quantity, price: i.unitPrice }))
        }
      })

      // Actualizar borrador en el store
      useAppStore.setState(state => ({
        draftOrders: {
          ...state.draftOrders,
          [tableNumber]: adjustedItems
        }
      }))

      alert('✅ Ajuste manual registrado y auditado correctamente.')
      onClose()
    } catch (err: any) {
      console.error('Error saving manual adjustment:', err)
      alert('Error al aplicar ajuste manual: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 animate-scaleIn border border-slate-100 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2 text-slate-900">
            <SlidersHorizontal size={20} className="text-indigo-600" />
            <h2 className="text-base font-black uppercase">Ajuste Manual de Ticket (Caja {tableNumber})</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
        </div>

        {adjustedItems.length === 0 ? (
          <div className="py-8 text-center text-slate-500 font-medium text-xs">
            No hay productos cargados en esta caja para ajustar.
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4 flex-1 overflow-y-auto pr-1">
            <div className="space-y-2">
              {adjustedItems.map(item => (
                <div key={item.id} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <p className="font-extrabold text-xs text-slate-900 truncate">{item.productName}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Piezas (Cantidad):</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleQtyChange(item.id, parseInt(e.target.value) || 1)}
                        className="w-full bg-white border border-slate-300 p-2 rounded-xl text-xs font-black text-slate-900 text-center outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Precio Unitario ($):</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unitPrice}
                        onChange={(e) => handlePriceChange(item.id, parseFloat(e.target.value) || 0)}
                        className="w-full bg-white border border-slate-300 p-2 rounded-xl text-xs font-black text-slate-900 text-center outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl flex justify-between items-center text-xs font-black">
              <span className="text-slate-600">Nuevo Total Calculado:</span>
              <span className="text-indigo-600 text-base">${totalAfter.toFixed(2)}</span>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                Motivo del Ajuste (Log Obligatorio para Auditoría)
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="ej: Descuento autorizado en mostrador / Corrección de piezas"
                className="w-full bg-slate-50 border border-slate-200 p-3 rounded-2xl font-bold text-xs text-slate-900 outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold text-xs hover:bg-slate-200 transition-all"
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all disabled:opacity-50"
                disabled={saving}
              >
                {saving ? 'Guardando...' : 'Aplicar Ajuste'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
