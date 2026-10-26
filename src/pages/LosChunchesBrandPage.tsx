import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Shield,
  ShoppingCart,
  Sparkles,
  Search,
  MessageCircle,
  Plus,
  Minus,
  CheckCircle2,
  Package,
  UserCheck,
  Star,
  Gift,
  HeartHandshake,
  ArrowRight
} from 'lucide-react'
import supabaseService from '@/services/supabaseService'
import { useAppStore } from '@/store/appStore'
import { Product } from '@/types'

interface CartItem {
  product: Product
  quantity: number
}

const LOS_CHUNCHES_ORG_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'

// 📸 Fotografías de alta calidad curadas para catálogo y categorías (sin duplicar logos de negocio)
const CATEGORY_IMAGES: Record<string, string> = {
  'Bolsas & Accesorios': 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=600&q=80',
  'Joyería': 'https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=600&q=80',
  'Accesorios': 'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?auto=format&fit=crop&w=600&q=80',
  'Novedades': 'https://images.unsplash.com/photo-1616046229478-9901c5536a45?auto=format&fit=crop&w=600&q=80',
  'Regalos': 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=600&q=80',
  'Todos': 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80'
}

function resolveProductImage(product: Product): string {
  // Si ya tiene una foto real asignada y no es el logo corporativo, usarla
  if (product.imageUrl && !product.imageUrl.includes('los_chunches.jpeg') && !product.imageUrl.includes('logo')) {
    return product.imageUrl
  }

  const name = (product.name || '').toLowerCase()
  const cat = (product.category || '').toLowerCase()

  if (name.includes('bolsa') || cat.includes('bolsa')) {
    return 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=600&q=80'
  }
  if (name.includes('arete') || name.includes('arracada') || (cat.includes('joyer') && name.includes('flor'))) {
    return 'https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=600&q=80'
  }
  if (name.includes('collar') || name.includes('dije') || name.includes('cadena')) {
    return 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=600&q=80'
  }
  if (name.includes('diadema') || name.includes('peineta') || name.includes('cabello')) {
    return 'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?auto=format&fit=crop&w=600&q=80'
  }
  if (name.includes('alhajero') || name.includes('cermica') || name.includes('ceramica') || cat.includes('novedad')) {
    return 'https://images.unsplash.com/photo-1616046229478-9901c5536a45?auto=format&fit=crop&w=600&q=80'
  }
  if (name.includes('regalo') || name.includes('sorpresa') || name.includes('caja') || cat.includes('regalo')) {
    return 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=600&q=80'
  }
  if (name.includes('monedero') || name.includes('cartera')) {
    return 'https://images.unsplash.com/photo-1563903530908-afdd155d057a?auto=format&fit=crop&w=600&q=80'
  }

  // Fallback por defecto armónico
  return 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80'
}

export default function LosChunchesBrandPage() {
  const { currentUser } = useAppStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (currentUser) {
      const adminRoles = ['admin', 'owner', 'superadmin', 'manager']
      const target = adminRoles.includes(currentUser.role) ? '/admin' : '/pos'
      navigate(target, { replace: true })
    }
  }, [currentUser, navigate])

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos')
  const [cart, setCart] = useState<CartItem[]>([])
  const [showCartModal, setShowCartModal] = useState(false)

  // Catálogo base con fotos de alta resolución temáticas y equilibradas
  const fallbackProducts: Product[] = [
    {
      id: 'lc-pkg-1',
      name: 'Bolsa Artesanal Chunches Rosa',
      description: 'Hermosa bolsa tejida a mano con detalles tradicionales y forro resistente.',
      price: 180,
      category: 'Bolsas & Accesorios',
      sku: 'LC-BOL-01',
      currentStock: 15,
      isAvailable: true,
      imageUrl: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=600&q=80',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'lc-pkg-2',
      name: 'Aretes Flor Artesanales',
      description: 'Aretes ligeros con acabado floral en tonalidad palo de rosa y baño hipoalergénico.',
      price: 85,
      category: 'Joyería',
      sku: 'LC-ARE-02',
      currentStock: 25,
      isAvailable: true,
      imageUrl: 'https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=600&q=80',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'lc-pkg-3',
      name: 'Diadema Bordada Tradicional',
      description: 'Diadema cómoda y suave con sutiles bordados florales en relieve.',
      price: 120,
      category: 'Accesorios',
      sku: 'LC-DIA-03',
      currentStock: 10,
      isAvailable: true,
      imageUrl: 'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?auto=format&fit=crop&w=600&q=80',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'lc-pkg-4',
      name: 'Collar Corazón de Talavera',
      description: 'Dije de cerámica esmaltada estilo tradicional con cordón ajustable suave.',
      price: 145,
      category: 'Joyería',
      sku: 'LC-COL-04',
      currentStock: 12,
      isAvailable: true,
      imageUrl: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=600&q=80',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'lc-pkg-5',
      name: 'Alhajero Cerámico Decorativo',
      description: 'Pieza decorativa de mesa para organizar anillos, aretes y pequeños tesoros.',
      price: 95,
      category: 'Novedades',
      sku: 'LC-ALH-05',
      currentStock: 18,
      isAvailable: true,
      imageUrl: 'https://images.unsplash.com/photo-1616046229478-9901c5536a45?auto=format&fit=crop&w=600&q=80',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'lc-pkg-6',
      name: 'Caja de Regalo Chunches Sorpresa',
      description: 'Selección curada con 4 accesorios artesanales y tarjeta personalizada de dedicatoria.',
      price: 299,
      category: 'Regalos',
      sku: 'LC-PKG-06',
      currentStock: 8,
      isAvailable: true,
      imageUrl: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=600&q=80',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ]

  useEffect(() => {
    async function loadProducts() {
      try {
        setLoading(true)
        const fetched = await supabaseService.getProducts(LOS_CHUNCHES_ORG_ID)
        if (fetched && fetched.length > 0) {
          // Asignar fotos reales armónicas a los productos cargados
          const hydrated = fetched.map(p => ({
            ...p,
            imageUrl: resolveProductImage(p)
          }))
          setProducts(hydrated)
        } else {
          setProducts(fallbackProducts)
        }
      } catch (err) {
        console.warn('Usando catálogo inicial para Los Chunches:', err)
        setProducts(fallbackProducts)
      } finally {
        setLoading(false)
      }
    }
    loadProducts()
  }, [])

  const categories = ['Todos', 'Bolsas & Accesorios', 'Joyería', 'Accesorios', 'Novedades', 'Regalos']

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesCat =
      selectedCategory === 'Todos' ||
      p.category?.toLowerCase() === selectedCategory.toLowerCase() ||
      (selectedCategory === 'Accesorios' && p.category?.toLowerCase().includes('accesor'))
    return matchesSearch && matchesCat
  })

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id)
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      }
      return [...prev, { product, quantity: 1 }]
    })
  }

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta
            return newQty > 0 ? { ...item, quantity: newQty } : null
          }
          return item
        })
        .filter(Boolean) as CartItem[]
    )
  }

  const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  const handleSendWhatsAppOrder = () => {
    if (cart.length === 0) return
    const lines = cart.map(
      (item) => `• ${item.quantity}x ${item.product.name} ($${(item.product.price * item.quantity).toFixed(2)})`
    )
    const message = `¡Hola Los Chunches de Cons! 🌸 Me gustaría solicitar información y disponibilidad para el siguiente pedido:\n\n${lines.join(
      '\n'
    )}\n\n*Total aproximado: $${cartTotal.toFixed(2)} MXN*\n¿Cuentan con existencias? ¡Muchas gracias!`

    const encoded = encodeURIComponent(message)
    window.open(`https://wa.me/?text=${encoded}`, '_blank')
  }

  return (
    <div className="min-h-screen bg-[#FAF6F7] text-slate-800 font-['Outfit',sans-serif] selection:bg-[#9B4158] selection:text-white pb-20">
      {/* 🌸 HEADER MINIMALISTA & EQUILIBRADO */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#EDE6E8] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-20 flex items-center justify-between gap-4">
          {/* Logotipo y Título del Negocio */}
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl overflow-hidden border border-[#EDE6E8] shadow-xs bg-white flex-shrink-0">
              <img
                src="/images/los_chunches.jpeg"
                alt="Logotipo Los Chunches de Cons"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                  Los Chunches <span className="text-[#9B4158] font-['Dancing_Script',cursive] text-2xl sm:text-3xl font-bold">de Cons</span>
                </h1>
                <span className="text-base text-rose-300">🌸</span>
              </div>
              <p className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                Tienda Oficial & Novedades
              </p>
            </div>
          </div>

          {/* Acciones y Acceso */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Botón Carrito / Bolsa */}
            <button
              onClick={() => setShowCartModal(true)}
              className="relative px-3.5 py-2 sm:px-4 sm:py-2.5 bg-stone-50 hover:bg-stone-100 border border-stone-200 text-slate-700 rounded-2xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 shadow-xs"
            >
              <ShoppingCart size={17} className="text-[#9B4158]" />
              <span className="hidden sm:inline">Mi Bolsa</span>
              {cartItemsCount > 0 && (
                <span className="bg-[#9B4158] text-white text-[11px] w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {cartItemsCount}
                </span>
              )}
            </button>

            {/* Acceso Colaboradores / POS */}
            <Link
              to="/login?brand=loschunches"
              className="bg-[#9B4158] hover:bg-[#833246] text-white font-bold px-4 py-2.5 rounded-2xl text-xs sm:text-sm transition-all flex items-center gap-2 shadow-xs"
              title="Acceso restringido a colaboradores autorizados"
            >
              <UserCheck size={16} />
              <span className="hidden sm:inline">Acceso POS</span>
            </Link>
          </div>
        </div>
      </header>

      {/* 🌸 HERO SECTION LIMPIA Y ARMÓNICA */}
      <section className="relative overflow-hidden py-12 sm:py-16 px-4">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          {/* Badge Suave */}
          <div className="inline-flex items-center gap-2 bg-white border border-[#EDE6E8] text-[#9B4158] px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase mb-6 shadow-xs">
            <Sparkles size={13} className="text-[#9B4158]" />
            Catálogo y Novedades de Temporada
          </div>

          {/* Presentación Central con Logo y Tipografías */}
          <div className="flex flex-col items-center justify-center mb-6">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden border-2 border-white shadow-md mb-4 bg-white">
              <img
                src="/images/los_chunches.jpeg"
                alt="Los Chunches de Cons"
                className="w-full h-full object-cover"
              />
            </div>
            <h2 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight font-['Playfair_Display',Georgia,serif]">
              Los Chunches <span className="text-[#9B4158] font-['Dancing_Script',cursive] text-5xl sm:text-6xl font-bold">de Cons</span>
            </h2>
            <p className="mt-3 text-base sm:text-lg text-slate-600 max-w-xl mx-auto font-normal leading-relaxed">
              Detalles, accesorios y novedades artesanales con estilo único. Regalos cuidadosamente seleccionados para ti.
            </p>
          </div>

          {/* Garantías y Valores (Sobrios y limpios) */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mt-8">
            <div className="bg-white border border-[#EDE6E8] px-4 py-2 rounded-2xl shadow-2xs flex items-center gap-2 text-xs font-medium text-slate-700">
              <CheckCircle2 size={15} className="text-[#9B4158]" />
              <span>Calidad Artesanal</span>
            </div>
            <div className="bg-white border border-[#EDE6E8] px-4 py-2 rounded-2xl shadow-2xs flex items-center gap-2 text-xs font-medium text-slate-700">
              <Star size={14} className="text-amber-500 fill-amber-500" />
              <span>Atención Personalizada</span>
            </div>
            <div className="bg-white border border-[#EDE6E8] px-4 py-2 rounded-2xl shadow-2xs flex items-center gap-2 text-xs font-medium text-slate-700">
              <Gift size={15} className="text-[#9B4158]" />
              <span>Empaque para Regalo</span>
            </div>
          </div>
        </div>
      </section>

      {/* 🌸 CATÁLOGO & EXPLORACIÓN DE PRODUCTOS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8">
        {/* Barra de Filtros y Búsqueda */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-xs border border-[#EDE6E8] mb-8">
          <div className="flex flex-col sm:flex-row items-center gap-4 justify-between">
            {/* Buscador */}
            <div className="relative w-full sm:w-80">
              <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por artículo o categoría..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-stone-50/80 border border-stone-200 rounded-2xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#9B4158]/20 focus:border-[#9B4158] text-slate-800 placeholder-slate-400 transition-all"
              />
            </div>

            {/* Categorías con Chips Sobrios */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    selectedCategory === cat
                      ? 'bg-[#9B4158] text-white shadow-xs'
                      : 'bg-stone-50 text-slate-600 hover:bg-stone-100 border border-stone-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Grid de Productos con Imágenes Reales y Equilibradas */}
        {loading ? (
          <div className="text-center py-20">
            <div className="w-10 h-10 border-3 border-[#9B4158] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-semibold text-slate-500">Cargando productos de Los Chunches...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-[#EDE6E8] p-8">
            <Package size={44} className="text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No encontramos coincidencias</h3>
            <p className="text-xs text-slate-500 mt-1">Intenta con otro término o selecciona "Todos".</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredProducts.map((p) => {
              const photo = p.imageUrl || resolveProductImage(p)
              return (
                <div
                  key={p.id}
                  className="bg-white rounded-3xl overflow-hidden border border-[#EDE6E8] shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col group hover:-translate-y-1"
                >
                  {/* Fotografía Real de la Categoría */}
                  <div className="relative aspect-4/3 bg-stone-100 overflow-hidden">
                    <img
                      src={photo}
                      alt={p.name}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-slate-700 border border-stone-200/80 shadow-2xs">
                      {p.category || 'Novedades'}
                    </div>
                  </div>

                  {/* Detalle y Precio */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-sm sm:text-base text-slate-900 group-hover:text-[#9B4158] transition-colors line-clamp-1">
                        {p.name}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed font-normal">
                        {p.description || 'Artículo especial de la tienda Los Chunches de Cons.'}
                      </p>
                    </div>

                    <div className="mt-5 pt-3.5 border-t border-stone-100 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Precio</span>
                        <span className="text-lg font-black text-slate-900">
                          ${Number(p.price).toFixed(2)}
                        </span>
                      </div>

                      <button
                        onClick={() => addToCart(p)}
                        className="bg-stone-50 hover:bg-[#9B4158] text-slate-700 hover:text-white border border-stone-200 hover:border-[#9B4158] px-3.5 py-2 rounded-xl transition-all duration-200 text-xs font-bold flex items-center gap-1.5 shadow-2xs active:scale-95"
                        title="Agregar a mi bolsa"
                      >
                        <Plus size={14} />
                        <span>Agregar</span>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* 🌸 MODAL DE CARRITO ELEGANTE */}
      {showCartModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-stone-200 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <ShoppingCart className="text-[#9B4158]" size={20} />
                <h3 className="text-base font-bold text-slate-900">Mi Bolsa de Pedido</h3>
              </div>
              <button
                onClick={() => setShowCartModal(false)}
                className="text-slate-400 hover:text-slate-700 text-xs font-bold py-1 px-2 rounded-lg"
              >
                Cerrar
              </button>
            </div>

            {/* Listado */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {cart.length === 0 ? (
                <div className="text-center py-10">
                  <ShoppingCart size={36} className="text-stone-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-500">Tu bolsa está vacía actualmente</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex items-center justify-between p-3 bg-stone-50 rounded-2xl border border-stone-100"
                  >
                    <div className="flex-1 mr-3">
                      <p className="text-xs font-bold text-slate-900 line-clamp-1">{item.product.name}</p>
                      <p className="text-xs text-[#9B4158] font-semibold">
                        ${(item.product.price * item.quantity).toFixed(2)}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => updateQuantity(item.product.id, -1)}
                        className="w-6 h-6 rounded-lg bg-white text-slate-700 hover:bg-stone-200 border border-stone-200 flex items-center justify-center text-xs font-bold"
                      >
                        <Minus size={11} />
                      </button>
                      <span className="text-xs font-bold text-slate-800 w-5 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, 1)}
                        className="w-6 h-6 rounded-lg bg-white text-slate-700 hover:bg-stone-200 border border-stone-200 flex items-center justify-center text-xs font-bold"
                      >
                        <Plus size={11} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Total y WhatsApp */}
            {cart.length > 0 && (
              <div className="pt-4 border-t border-stone-100 space-y-3">
                <div className="flex items-center justify-between text-sm font-bold text-slate-900">
                  <span>Total estimado:</span>
                  <span className="text-xl text-[#9B4158]">${cartTotal.toFixed(2)}</span>
                </div>

                <button
                  onClick={handleSendWhatsAppOrder}
                  className="w-full py-3.5 bg-[#25D366] hover:bg-[#20BA5A] text-white font-bold rounded-2xl flex items-center justify-center gap-2 text-xs sm:text-sm shadow-sm transition-all"
                >
                  <MessageCircle size={17} />
                  <span>Solicitar Pedido por WhatsApp</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 🌸 FOOTER SOBRIO Y PROFESIONAL */}
      <footer className="mt-20 border-t border-[#EDE6E8] bg-white py-8 px-4 text-center">
        <div className="max-w-4xl mx-auto space-y-3">
          <div className="flex items-center justify-center gap-2">
            <span className="font-bold text-slate-800 text-sm">Los Chunches de Cons</span>
            <span className="text-xs text-rose-300">🌸</span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">
            © {new Date().getFullYear()} · Sistema Retail POS Multitenant
          </p>
          <div className="text-[10px] font-bold text-[#9B4158] tracking-widest uppercase">
            POWERED BY REISBLOC
          </div>
        </div>
      </footer>
    </div>
  )
}
