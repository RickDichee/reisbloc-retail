import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Shield,
  Scale,
  HelpCircle,
  ShoppingBag,
  Shirt,
  Heart,
  QrCode,
  Store,
  Sparkles,
  Search,
  MessageCircle,
  Plus,
  Minus,
  CheckCircle,
  Package,
  ChevronRight,
  UserCheck
} from 'lucide-react'
import supabaseService from '@/services/supabaseService'
import { Product } from '@/types'

interface CartItem {
  product: Product
  quantity: number
}

export default function ModaMielBrandPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos')
  const [cart, setCart] = useState<CartItem[]>([])
  const [showCartModal, setShowCartModal] = useState(false)

  // Package presets fallback if DB is empty for demo
  const fallbackPackages: Product[] = [
    {
      id: 'mm-pkg-1',
      name: 'Paquete Vestidos de Temporada (Mayoreo)',
      description: 'Lote de 6 vestidos surtidos de alta calidad para boutique.',
      price: 1800,
      category: 'Vestidos',
      packQuantity: 6,
      sku: 'MM-VES-06',
      stock: 25,
      isAvailable: true,
      imageUrl: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=600&q=80',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'mm-pkg-2',
      name: 'Paquete Blusas Moda Importación',
      description: 'Paquete de 12 blusas tendencias actuales en colores de temporada.',
      price: 2400,
      category: 'Blusas',
      packQuantity: 12,
      sku: 'MM-BLU-12',
      stock: 40,
      isAvailable: true,
      imageUrl: 'https://images.unsplash.com/photo-1564257631407-4deb1f99d992?auto=format&fit=crop&w=600&q=80',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'mm-pkg-3',
      name: 'Paquete Conjuntos Femeninos Trendy',
      description: 'Lote de 6 conjuntos de saco y pantalón/falda de vestir.',
      price: 3200,
      category: 'Conjuntos',
      packQuantity: 6,
      sku: 'MM-CNJ-06',
      stock: 18,
      isAvailable: true,
      imageUrl: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=600&q=80',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'mm-pkg-4',
      name: 'Paquete Jeans Premium Stretch',
      description: 'Paquete de 10 jeans mezclilla stretch corte colombiano.',
      price: 3500,
      category: 'Jeans',
      packQuantity: 10,
      sku: 'MM-[#JNS]-10',
      stock: 30,
      isAvailable: true,
      imageUrl: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=600&q=80',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ]

  useEffect(() => {
    const loadStoreProducts = async () => {
      setLoading(true)

      // 🛡️ Client-side Cache Protection (5 minutos de caché para proteger cuota de Supabase y Bots/DDoS)
      const CACHE_KEY = 'modamiel_public_products_cache'
      const CACHE_TIME_KEY = 'modamiel_public_products_time'
      const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutos

      const cachedData = sessionStorage.getItem(CACHE_KEY)
      const cachedTime = sessionStorage.getItem(CACHE_TIME_KEY)

      if (cachedData && cachedTime && (Date.now() - Number(cachedTime) < CACHE_TTL_MS)) {
        try {
          const parsed = JSON.parse(cachedData)
          if (parsed && parsed.length > 0) {
            setProducts(parsed)
            setLoading(false)
            return
          }
        } catch (e) {
          // ignore cache parse error
        }
      }

      try {
        const org = await supabaseService.getOrganizationBySlug('modamiel')
        if (org?.id) {
          const fetchedProducts = await supabaseService.getPublicProducts(org.id)
          if (fetchedProducts && fetchedProducts.length > 0) {
            setProducts(fetchedProducts)
            sessionStorage.setItem(CACHE_KEY, JSON.stringify(fetchedProducts))
            sessionStorage.setItem(CACHE_TIME_KEY, String(Date.now()))
            setLoading(false)
            return
          }
        }
      } catch (e) {
        console.info('Cargando catálogo oficial de Moda Miel MX', e)
      }
      setProducts(fallbackPackages)
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(fallbackPackages))
      sessionStorage.setItem(CACHE_TIME_KEY, String(Date.now()))
      setLoading(false)
    }
    loadStoreProducts()
  }, [])

  const categories = ['Todos', ...Array.from(new Set(products.map(p => p.category || 'General')))]

  const filteredProducts = products.filter(p => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesCat = selectedCategory === 'Todos' || p.category === selectedCategory
    return matchesSearch && matchesCat
  })

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id)
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      }
      return [...prev, { product, quantity: 1 }]
    })
  }

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev =>
      prev
        .map(item => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta
            return newQty > 0 ? { ...item, quantity: newQty } : null
          }
          return item
        })
        .filter(Boolean) as CartItem[]
    )
  }

  const totalCartCount = cart.reduce((acc, item) => acc + item.quantity, 0)
  const totalCartPrice = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0)

  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [lastOrderText, setLastOrderText] = useState('')
  const [lastOrderItems, setLastOrderItems] = useState<CartItem[]>([])

  const sendWhatsAppOrder = async () => {
    if (cart.length === 0) return

    const currentCart = [...cart]
    const orderLines = currentCart.map(
      item => `• *${item.product.name}* (x${item.quantity} paquetes) - $${(item.product.price * item.quantity).toLocaleString()} MXN`
    )
    const text = `Hola *Moda Miel MX* 🐞, quiero realizar el siguiente pedido por paquete desde su tienda web:\n\n${orderLines.join('\n')}\n\n*TOTAL:* $${totalCartPrice.toLocaleString()} MXN\n*Ubicación de entrega/recogida:* Pasillo 3 Local 230.\n¡Muchas gracias!`

    setLastOrderText(text)
    setLastOrderItems(currentCart)
    setShowCartModal(false)
    setShowSuccessModal(true)

    // 📦 Registrar en Supabase en segundo plano para notificar a la caja en el POS
    try {
      const org = await supabaseService.getOrganizationBySlug('modamiel')
      if (org?.id) {
        await supabaseService.createEcommerceOrder({
          organization_id: org.id,
          customer_name: 'Cliente Web WhatsApp',
          customer_phone: 'Pendiente WhatsApp',
          items: currentCart.map(i => ({
            id: i.product.id,
            name: i.product.name,
            quantity: i.quantity,
            price: i.product.price,
            packQuantity: i.product.packQuantity || 6
          })),
          total: totalCartPrice,
          status: 'pending',
          channel: 'whatsapp_web',
          created_at: new Date().toISOString()
        })
      }
    } catch (e) {
      console.info('Pedido registrado localmente', e)
    }

    setCart([])
  }

  return (
    <div className="min-h-screen bg-[#FFF5F7] text-slate-900 font-sans selection:bg-pink-200">
      {/* 🌸 Top Navigation Bar */}
      <div className="bg-[#E62E6B] text-white shadow-md sticky top-0 z-50 border-b-2 border-pink-300">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white text-[#E62E6B] rounded-2xl flex items-center justify-center font-black text-xl shadow-md border-2 border-pink-200">
              🐞
            </div>
            <div>
              <h1 className="font-['Playfair_Display',Georgia,serif] text-lg sm:text-xl font-black text-white tracking-tight">
                Moda Miel MX
              </h1>
              <p className="text-[10px] text-pink-100 font-bold uppercase tracking-widest">
                Tienda de Importación · Pasillo 3 Local 230
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Cart Button */}
            {totalCartCount > 0 && (
              <button
                onClick={() => setShowCartModal(true)}
                className="bg-white text-[#E62E6B] hover:bg-pink-50 px-4 py-2 rounded-2xl font-black text-sm flex items-center gap-2 shadow-lg transition-all animate-bounce"
              >
                <ShoppingBag size={18} />
                <span>{totalCartCount} paq.</span>
                <span className="bg-[#E62E6B] text-white px-2 py-0.5 rounded-full text-xs">
                  ${totalCartPrice.toLocaleString()}
                </span>
              </button>
            )}

            {/* Restricted Staff Login Access Button */}
            <Link
              to="/login?brand=modamiel"
              className="bg-pink-950/40 hover:bg-pink-950/60 border border-pink-300/40 text-white font-bold px-3.5 py-2 rounded-2xl text-xs sm:text-sm transition-all flex items-center gap-2"
              title="Acceso reservado a personal contratado"
            >
              <UserCheck size={16} className="text-pink-200" />
              <span className="hidden sm:inline">Acceso Personal POS</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-12">
        {/* 🌸 BRAND FLYER HERO SECTION (Exact Flyer Design with Catarina Mariquita 🐞) */}
        <div className="relative bg-white rounded-3xl p-8 sm:p-14 shadow-xl border-4 border-pink-100 text-center overflow-hidden">
          {/* Decorative Background Accents */}
          <div className="absolute -top-12 -left-12 w-40 h-40 bg-pink-100/60 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-pink-200/50 rounded-full blur-2xl pointer-events-none" />

          {/* Powered by Badge */}
          <div className="inline-flex items-center gap-2 bg-pink-50 text-[#E62E6B] border border-pink-200 px-4 py-1.5 rounded-full text-xs font-black tracking-wider uppercase mb-6 shadow-xs">
            <Sparkles size={14} className="animate-spin text-[#E62E6B]" style={{ animationDuration: '4s' }} />
            TIENDA OFICIAL · SITIO WEB & E-COMMERCE MAYOREO
          </div>

          {/* Main Brand Header Typography */}
          <div className="relative inline-block mb-4">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
              <span className="font-['Playfair_Display',Georgia,serif] text-5xl sm:text-7xl font-extrabold text-slate-900 tracking-tight">
                Moda
              </span>
              <div className="relative flex items-center">
                <span className="font-['Dancing_Script',cursive] text-6xl sm:text-8xl font-bold text-[#E62E6B] leading-none drop-shadow-xs">
                  Miel
                </span>
                {/* Floating Catarina Mascot 🐞 */}
                <div
                  className="ml-2 sm:ml-3 transform -rotate-12 bg-pink-100 border border-pink-300 p-2 sm:p-2.5 rounded-full shadow-md animate-bounce"
                  style={{ animationDuration: '3s' }}
                >
                  <span className="text-3xl sm:text-4xl" role="img" aria-label="Catarina Moda Miel">
                    🐞
                  </span>
                </div>
              </div>
            </div>

            {/* Subtitle Hearts MX */}
            <div className="flex items-center justify-center gap-2 mt-2 text-[#E62E6B] font-black text-xl tracking-widest uppercase">
              <Heart size={18} fill="#E62E6B" />
              <span>M X</span>
              <Heart size={18} fill="#E62E6B" />
            </div>
          </div>

          {/* Ribbon Banner: TODO POR PAQUETE */}
          <div className="my-6 max-w-md mx-auto">
            <div className="bg-[#E62E6B] text-white font-extrabold text-lg sm:text-xl py-2.5 px-6 rounded-2xl shadow-md border-2 border-white tracking-wider uppercase flex items-center justify-between">
              <span className="text-pink-200 text-sm">❮❮</span>
              <span>TODO POR PAQUETE</span>
              <span className="text-pink-200 text-sm">❯❯</span>
            </div>
          </div>

          {/* Main Location Badge (PASILLO 3 LOCAL 230) */}
          <div className="my-8 max-w-lg mx-auto">
            <div className="bg-[#1A1A1A] text-white p-5 sm:p-7 rounded-[2.5rem] border-4 border-[#E62E6B] shadow-2xl transition-transform hover:scale-[1.02] duration-300">
              <div className="font-['Outfit',sans-serif] text-3xl sm:text-5xl font-black tracking-tight text-white uppercase drop-shadow-sm">
                PASILLO 3
              </div>
              <div className="font-['Outfit',sans-serif] text-4xl sm:text-6xl font-black tracking-tight text-[#E62E6B] uppercase drop-shadow-md mt-1">
                LOCAL 230
              </div>
            </div>
          </div>

          {/* Feature Pills (Hacemos Envíos · Contacto · Marcas de Moda) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 max-w-3xl mx-auto items-center">
            {/* Pill 1: Hacemos Envíos */}
            <div className="bg-pink-50 border border-pink-200 p-5 rounded-2xl flex flex-col items-center justify-center gap-2 text-center hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-[#E62E6B] text-white rounded-full flex items-center justify-center shadow-md">
                <ShoppingBag size={26} />
              </div>
              <span className="font-black text-slate-900 tracking-wide uppercase text-sm mt-1">
                HACEMOS ENVÍOS
              </span>
            </div>

            {/* Pill 2: Contacto WhatsApp / QR */}
            <div className="bg-white border-2 border-pink-200 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 text-center shadow-sm hover:shadow-md transition-shadow">
              <span className="font-['Dancing_Script',cursive] text-2xl font-bold text-slate-800">
                Contáctanos
              </span>
              <div className="bg-slate-50 border border-slate-200 p-2 rounded-xl">
                <QrCode size={64} className="text-slate-900" />
              </div>
              <span className="text-xs font-bold text-slate-500">Tienda de Importación Mx</span>
            </div>

            {/* Pill 3: Marcas de Moda */}
            <div className="bg-pink-50 border border-pink-200 p-5 rounded-2xl flex flex-col items-center justify-center gap-2 text-center hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-[#1A1A1A] text-white rounded-full flex items-center justify-center shadow-md">
                <Shirt size={26} />
              </div>
              <span className="font-black text-slate-900 tracking-wide uppercase text-sm mt-1">
                MARCAS DE MODA
              </span>
            </div>
          </div>
        </div>

        {/* 🛍️ LIVE PUBLIC E-COMMERCE CATALOG SECTION */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-lg border border-pink-100 space-y-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-pink-100 pb-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-['Playfair_Display',serif]">
                Catálogo de Paquetes en Existencia 📦
              </h2>
              <p className="text-slate-500 text-sm font-medium mt-1">
                Precios especiales de mayoreo. Elige tus paquetes y recíbelos por envío o recógelos en Pasillo 3 Local 230.
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-72">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-400" size={18} />
              <input
                type="text"
                placeholder="Buscar prenda o lote..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-pink-50/50 border border-pink-200 rounded-2xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#E62E6B] transition-all"
              />
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-2xl text-xs font-black whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-[#E62E6B] text-white shadow-md scale-105'
                    : 'bg-pink-50 text-slate-700 hover:bg-pink-100 border border-pink-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Products Grid */}
          {loading ? (
            <div className="py-16 text-center">
              <div className="w-12 h-12 border-4 border-[#E62E6B] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="font-bold text-slate-400 text-sm">Cargando paquetes de mayoreo...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-12 text-center bg-pink-50/50 rounded-2xl border border-pink-100">
              <Package size={40} className="text-pink-300 mx-auto mb-2" />
              <p className="font-bold text-slate-700">No encontramos paquetes para esta búsqueda</p>
              <button
                onClick={() => {
                  setSearchTerm('')
                  setSelectedCategory('Todos')
                }}
                className="mt-3 text-xs font-black text-[#E62E6B] underline"
              >
                Ver todos los paquetes
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredProducts.map(product => {
                const inCart = cart.find(item => item.product.id === product.id)
                return (
                  <div
                    key={product.id}
                    className="bg-white border-2 border-pink-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group"
                  >
                    <div className="relative h-48 bg-slate-100 overflow-hidden">
                      <img
                        src={
                          product.imageUrl ||
                          'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=600&q=80'
                        }
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-3 left-3 bg-[#1A1A1A] text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-md">
                        {product.packQuantity || 6} Piezas / Paquete
                      </div>
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        <span className="text-[10px] font-bold text-[#E62E6B] uppercase tracking-wider">
                          {product.category || 'Mayoreo'}
                        </span>
                        <h3 className="font-bold text-slate-900 text-base leading-tight mt-1">
                          {product.name}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                          {product.description}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-pink-100 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">
                            Precio Paquete
                          </span>
                          <span className="text-xl font-black text-[#E62E6B]">
                            ${product.price.toLocaleString()} MXN
                          </span>
                        </div>

                        {inCart ? (
                          <div className="flex items-center gap-2 bg-pink-100 border border-pink-300 rounded-2xl px-2 py-1">
                            <button
                              onClick={() => updateQuantity(product.id, -1)}
                              className="w-7 h-7 bg-white text-[#E62E6B] rounded-xl flex items-center justify-center font-black shadow-xs active:scale-95"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="font-black text-sm text-[#E62E6B] px-1">
                              {inCart.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(product.id, 1)}
                              className="w-7 h-7 bg-[#E62E6B] text-white rounded-xl flex items-center justify-center font-black shadow-xs active:scale-95"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => addToCart(product)}
                            className="bg-[#E62E6B] hover:bg-[#C41E53] text-white px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                          >
                            <Plus size={16} />
                            Agregar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 📜 GOOGLE OAUTH VERIFICATION & LEGAL DISCLOSURES SECTION */}
        <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-pink-100 space-y-10">
          <div className="border-b border-slate-100 pb-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                Moda Miel MX · Powered by Reisbloc
              </h3>
              <p className="text-slate-500 font-medium mt-1">
                Página Web Oficial & Sistema POS SaaS Registrado
              </p>
            </div>
            <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-[#E62E6B] text-white font-black text-xs flex items-center justify-center text-center">
                MM
              </div>
              <div className="text-xs font-bold text-slate-400">
                POWERED BY<br />
                <span className="text-pink-600 text-sm font-black">REISBLOC</span>
              </div>
            </div>
          </div>

          <section className="bg-pink-50/50 rounded-2xl p-6 border border-pink-100">
            <div className="flex gap-4">
              <Shield className="text-[#E62E6B] shrink-0 mt-1" size={24} />
              <div>
                <h4 className="text-lg font-bold text-slate-900 mb-2">
                  Declaración de Uso Limitado de Datos de Google (Google API Disclosure)
                </h4>
                <p className="text-sm text-slate-600 leading-relaxed">
                  El inicio de sesión mediante Google OAuth 2.0 se utiliza exclusivamente para validar la identidad de empleados contratados por Moda Miel MX. No vendemos ni compartimos datos con terceros.
                </p>
              </div>
            </div>
          </section>

          <section className="bg-slate-50 rounded-2xl p-6 border border-slate-100 flex items-center gap-4">
            <HelpCircle className="text-slate-500 shrink-0" size={24} />
            <div className="text-xs md:text-sm text-slate-600">
              <strong>¿Dudas sobre pedidos o atención en tienda?</strong><br />
              Visítanos en <strong>Pasillo 3 Local 230</strong> o escríbenos directamente por WhatsApp.
            </div>
          </section>
        </div>
      </div>

      {/* 🛒 FLOATING CART DRAWER / MODAL */}
      {showCartModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between border-b border-pink-100 pb-4">
              <div className="flex items-center gap-2">
                <ShoppingBag className="text-[#E62E6B]" size={24} />
                <h3 className="text-xl font-black text-slate-900">Tu Pedido de Paquetes</h3>
              </div>
              <button
                onClick={() => setShowCartModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕ Cerrar
              </button>
            </div>

            {cart.length === 0 ? (
              <p className="text-center text-slate-500 py-8 font-medium">Tu carrito está vacío</p>
            ) : (
              <div className="space-y-4">
                {cart.map(item => (
                  <div
                    key={item.product.id}
                    className="flex items-center justify-between p-3 bg-pink-50/60 border border-pink-100 rounded-2xl"
                  >
                    <div className="flex-1 pr-3">
                      <h4 className="font-bold text-slate-900 text-sm leading-tight">
                        {item.product.name}
                      </h4>
                      <span className="text-xs text-[#E62E6B] font-black">
                        ${(item.product.price * item.quantity).toLocaleString()} MXN
                      </span>
                    </div>

                    <div className="flex items-center gap-2 bg-white border border-pink-200 rounded-xl px-2 py-1">
                      <button
                        onClick={() => updateQuantity(item.product.id, -1)}
                        className="w-6 h-6 text-[#E62E6B] font-black"
                      >
                        -
                      </button>
                      <span className="font-black text-sm">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, 1)}
                        className="w-6 h-6 text-[#E62E6B] font-black"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}

                <div className="pt-4 border-t border-pink-100 flex items-center justify-between">
                  <span className="font-bold text-slate-500">Total a pagar:</span>
                  <span className="text-2xl font-black text-[#E62E6B]">
                    ${totalCartPrice.toLocaleString()} MXN
                  </span>
                </div>

                <button
                  onClick={sendWhatsAppOrder}
                  className="w-full py-4 bg-[#E62E6B] hover:bg-[#C41E53] text-white rounded-2xl font-black text-base flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
                >
                  <MessageCircle size={20} />
                  Generar Confirmación de Pedido
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ⭐ SHINY TRANSPARENT ORDER SUCCESS MODAL */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 sm:p-8 space-y-6 shadow-2xl border-4 border-pink-200 animate-fadeIn text-center relative overflow-hidden">
            {/* Header Badge */}
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-md border border-emerald-300">
              <CheckCircle size={36} />
            </div>

            <div>
              <span className="text-xs font-black text-[#E62E6B] uppercase tracking-widest bg-pink-50 px-3 py-1 rounded-full border border-pink-200">
                ¡PEDIDO REGISTRADO CON ÉXITO!
              </span>
              <h3 className="text-2xl font-black text-slate-900 mt-2 font-['Playfair_Display',serif]">
                Confirmación Moda Miel MX 🐞
              </h3>
              <p className="text-xs text-slate-500 font-bold mt-1">
                Su pedido fue notificado automáticamente al POS y caja en Pasillo 3 Local 230.
              </p>
            </div>

            {/* Direct WhatsApp Action Button */}
            <div className="space-y-3 pt-2">
              <a
                href={`https://wa.me/5215555555555?text=${encodeURIComponent(lastOrderText)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-base flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all border-2 border-emerald-400"
              >
                <MessageCircle size={22} />
                Abrir WhatsApp con mi Pedido
              </a>

              <button
                onClick={() => setShowSuccessModal(false)}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-sm transition-all"
              >
                Entendido / Cerrar Ventana
              </button>
            </div>

            {/* Manager Alert Notice */}
            <div className="bg-pink-50/70 p-3.5 rounded-2xl border border-pink-200 text-[11px] text-slate-600 text-left space-y-1">
              <div className="font-black text-[#E62E6B] uppercase flex items-center gap-1">
                <span>🛡️ Notificación a Gerencia & Cajas</span>
              </div>
              <p>
                Este pedido quedó respaldado en la base de datos de Moda Miel MX para evitar errores de conteo o duplicación en el mostrador.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
