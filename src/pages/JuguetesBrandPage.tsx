import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ShoppingCart,
  Sparkles,
  Search,
  MessageCircle,
  Plus,
  Minus,
  CheckCircle2,
  Package,
  Star,
  Gift,
  Truck
} from 'lucide-react'
import supabaseService from '@/services/supabaseService'
import { useAppStore } from '@/store/appStore'
import { Product } from '@/types'

interface CartItem {
  product: Product
  quantity: number
}

const JUGUETES_ORG_ID = '324fd41f-b8af-4aef-9ea6-2f954350775a'

// 🎁 Paleta oficial Juguetes San Judas Tadeo
const PALETTE = {
  red: '#C8323E',      // Rojo Juguetero (Pantone 186C suavizado)
  redDark: '#9A1F2B',
  green: '#109848',    // Verde San Judas (Pantone 347C brillante)
  greenDark: '#0D7A38',
  blue: '#1E88C8',     // Azul Juguete (Pantone 2925C)
  gold: '#F5C438',     // Dorado Navideño (Pantone 871C)
  black: '#1A1A1A',
  white: '#FFFFFF',
}

// 🧸 Colores oficiales 3D de las letras de juguete (según Manual de Identidad)
const JUGUETES_LETTERS: { char: string; color: string; rotate: number }[] = [
  { char: 'J', color: '#E8252A', rotate: -3 },
  { char: 'U', color: '#E8252A', rotate: 1 },
  { char: 'G', color: '#1488D8', rotate: -2 },
  { char: 'U', color: '#149E48', rotate: 2 },
  { char: 'E', color: '#E61E8C', rotate: -1 },
  { char: 'T', color: '#1488D8', rotate: 2 },
  { char: 'E', color: '#FACC15', rotate: -2 },
  { char: 'S', color: '#F97316', rotate: 3 },
]

const Y_NOVEDADES_LETTERS: { char: string; color: string; rotate: number; spaceAfter?: boolean }[] = [
  { char: 'Y', color: '#FACC15', rotate: -3, spaceAfter: true },
  { char: 'N', color: '#1488D8', rotate: 2 },
  { char: 'O', color: '#E61E8C', rotate: -1 },
  { char: 'V', color: '#FACC15', rotate: 2 },
  { char: 'E', color: '#E61E8C', rotate: -2 },
  { char: 'D', color: '#149E48', rotate: 1 },
  { char: 'A', color: '#149E48', rotate: -2 },
  { char: 'D', color: '#1488D8', rotate: 2 },
  { char: 'E', color: '#FACC15', rotate: -1 },
  { char: 'S', color: '#F97316', rotate: 3 },
]

// 🎄 Elementos decorativos distribuidos en todo el ancho (32 íconos para llenar pantallas grandes)
const HERO_DECORATIONS: { emoji: string; top: string; left: string; size: string; rotate: string; opacity: string }[] = [
  // Fila superior (0% - 24%)
  { emoji: '🎄', top: '4%', left: '3%', size: 'text-5xl md:text-6xl', rotate: '-10deg', opacity: 'opacity-15' },
  { emoji: '🧸', top: '8%', left: '12%', size: 'text-4xl md:text-5xl', rotate: '8deg', opacity: 'opacity-15' },
  { emoji: '🎁', top: '5%', left: '22%', size: 'text-4xl md:text-5xl', rotate: '-6deg', opacity: 'opacity-15' },
  { emoji: '⭐', top: '10%', left: '31%', size: 'text-3xl md:text-4xl', rotate: '12deg', opacity: 'opacity-20' },
  { emoji: '❄️', top: '6%', left: '40%', size: 'text-3xl md:text-4xl', rotate: '0deg', opacity: 'opacity-15' },
  { emoji: '✨', top: '6%', left: '60%', size: 'text-3xl md:text-4xl', rotate: '15deg', opacity: 'opacity-20' },
  { emoji: '🧸', top: '9%', left: '69%', size: 'text-4xl md:text-5xl', rotate: '-8deg', opacity: 'opacity-15' },
  { emoji: '🎁', top: '5%', left: '78%', size: 'text-4xl md:text-5xl', rotate: '10deg', opacity: 'opacity-15' },
  { emoji: '⭐', top: '11%', left: '87%', size: 'text-4xl md:text-5xl', rotate: '-12deg', opacity: 'opacity-20' },
  { emoji: '🎄', top: '4%', left: '94%', size: 'text-5xl md:text-6xl', rotate: '8deg', opacity: 'opacity-15' },

  // Fila media-alta (26% - 48%)
  { emoji: '🎁', top: '28%', left: '2%', size: 'text-4xl md:text-5xl', rotate: '12deg', opacity: 'opacity-15' },
  { emoji: '🏎️', top: '32%', left: '9%', size: 'text-4xl md:text-5xl', rotate: '-8deg', opacity: 'opacity-15' },
  { emoji: '🧸', top: '27%', left: '18%', size: 'text-5xl md:text-6xl', rotate: '6deg', opacity: 'opacity-15' },
  { emoji: '❄️', top: '34%', left: '27%', size: 'text-3xl md:text-4xl', rotate: '18deg', opacity: 'opacity-15' },
  { emoji: '🧩', top: '30%', left: '35%', size: 'text-3xl md:text-4xl', rotate: '-14deg', opacity: 'opacity-15' },
  { emoji: '🚂', top: '30%', left: '65%', size: 'text-3xl md:text-4xl', rotate: '10deg', opacity: 'opacity-15' },
  { emoji: '❄️', top: '34%', left: '73%', size: 'text-3xl md:text-4xl', rotate: '-15deg', opacity: 'opacity-15' },
  { emoji: '🎁', top: '27%', left: '82%', size: 'text-5xl md:text-6xl', rotate: '-7deg', opacity: 'opacity-15' },
  { emoji: '🧸', top: '33%', left: '90%', size: 'text-4xl md:text-5xl', rotate: '9deg', opacity: 'opacity-15' },
  { emoji: '✨', top: '26%', left: '96%', size: 'text-3xl md:text-4xl', rotate: '0deg', opacity: 'opacity-20' },

  // Fila media-baja (52% - 72%)
  { emoji: '🧸', top: '55%', left: '4%', size: 'text-5xl md:text-6xl', rotate: '-6deg', opacity: 'opacity-15' },
  { emoji: '🎄', top: '58%', left: '13%', size: 'text-4xl md:text-5xl', rotate: '10deg', opacity: 'opacity-15' },
  { emoji: '🎁', top: '52%', left: '23%', size: 'text-4xl md:text-5xl', rotate: '-12deg', opacity: 'opacity-15' },
  { emoji: '⭐', top: '60%', left: '31%', size: 'text-3xl md:text-4xl', rotate: '8deg', opacity: 'opacity-20' },
  { emoji: '⭐', top: '60%', left: '68%', size: 'text-3xl md:text-4xl', rotate: '-8deg', opacity: 'opacity-20' },
  { emoji: '🧸', top: '53%', left: '76%', size: 'text-4xl md:text-5xl', rotate: '11deg', opacity: 'opacity-15' },
  { emoji: '🎄', top: '58%', left: '85%', size: 'text-4xl md:text-5xl', rotate: '-9deg', opacity: 'opacity-15' },
  { emoji: '🎁', top: '54%', left: '93%', size: 'text-5xl md:text-6xl', rotate: '7deg', opacity: 'opacity-15' },

  // Fila inferior (75% - 88%)
  { emoji: '🎁', top: '78%', left: '6%', size: 'text-5xl md:text-6xl', rotate: '8deg', opacity: 'opacity-15' },
  { emoji: '🧸', top: '80%', left: '16%', size: 'text-5xl md:text-6xl', rotate: '-10deg', opacity: 'opacity-15' },
  { emoji: '❄️', top: '76%', left: '26%', size: 'text-3xl md:text-4xl', rotate: '0deg', opacity: 'opacity-15' },
  { emoji: '🚀', top: '82%', left: '36%', size: 'text-3xl md:text-4xl', rotate: '-12deg', opacity: 'opacity-15' },
  { emoji: '🏎️', top: '82%', left: '63%', size: 'text-3xl md:text-4xl', rotate: '12deg', opacity: 'opacity-15' },
  { emoji: '❄️', top: '76%', left: '73%', size: 'text-3xl md:text-4xl', rotate: '0deg', opacity: 'opacity-15' },
  { emoji: '🎁', top: '80%', left: '83%', size: 'text-5xl md:text-6xl', rotate: '-8deg', opacity: 'opacity-15' },
  { emoji: '🧸', top: '77%', left: '92%', size: 'text-5xl md:text-6xl', rotate: '6deg', opacity: 'opacity-15' },
]

// 🧸 Imagen por categoría de juguete
const CATEGORY_IMAGES: Record<string, string> = {
  'Muñecas': 'https://images.unsplash.com/photo-1558171813-52748c7ad7e6?auto=format&fit=crop&w=600&q=80',
  'Carros': 'https://images.unsplash.com/photo-1594787318286-3d835c1d207f?auto=format&fit=crop&w=600&q=80',
  'Figuras de acción': 'https://images.unsplash.com/photo-1608889825103-eb5ed706fc64?auto=format&fit=crop&w=600&q=80',
  'Juegos de mesa': 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?auto=format&fit=crop&w=600&q=80',
  'Peluches': 'https://images.unsplash.com/photo-1559181567-c3190e01a9d4?auto=format&fit=crop&w=600&q=80',
  'Lego / Bloques': 'https://images.unsplash.com/photo-1587654780291-39c9098e5be5?auto=format&fit=crop&w=600&q=80',
  'Novedades': 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=600&q=80',
  'Todos': 'https://images.unsplash.com/photo-1558171813-52748c7ad7e6?auto=format&fit=crop&w=600&q=80'
}

function resolveProductImage(product: Product): string {
  if (product.imageUrl && !product.imageUrl.includes('juguetes-san-judas') && !product.imageUrl.includes('logo')) {
    return product.imageUrl
  }
  const name = (product.name || '').toLowerCase()
  const cat = (product.category || '').toLowerCase()
  const blob = `${name} ${cat}`

  if (blob.includes('muñeca') || blob.includes('barbie') || blob.includes('doll')) return CATEGORY_IMAGES['Muñecas']
  if (blob.includes('carro') || blob.includes('auto') || blob.includes('hot wheel') || blob.includes('camion') || blob.includes('camión')) return CATEGORY_IMAGES['Carros']
  if (blob.includes('figura') || blob.includes('accion') || blob.includes('hero') || blob.includes('marvel')) return CATEGORY_IMAGES['Figuras de acción']
  if (blob.includes('lego') || blob.includes('bloque') || blob.includes('construccion') || blob.includes('construcción')) return CATEGORY_IMAGES['Lego / Bloques']
  if (blob.includes('peluche') || blob.includes('teddy') || blob.includes('osito') || blob.includes('oso')) return CATEGORY_IMAGES['Peluches']
  if (blob.includes('juego') || blob.includes('mesa') || blob.includes('carta') || blob.includes('dado')) return CATEGORY_IMAGES['Juegos de mesa']
  if (blob.includes('novedad') || blob.includes('regalo') || blob.includes('gift') || cat.includes('novedad')) return CATEGORY_IMAGES['Novedades']
  return CATEGORY_IMAGES['Todos']
}

// ⭐ Categorías de la tienda
const CATEGORIES = ['Todos', 'Muñecas', 'Carros', 'Figuras de acción', 'Peluches', 'Lego / Bloques', 'Juegos de mesa', 'Novedades']

// Estilo 3D para las letras de juguete (borde blanco + extrusión oscura)
const TOY_LETTER_SHADOW = [
  '-2px -2px 0 #FFFFFF',
  '2px -2px 0 #FFFFFF',
  '-2px 2px 0 #FFFFFF',
  '2px 2px 0 #FFFFFF',
  '0px 3px 0 #FFFFFF',
  '0px 5px 0 rgba(0,0,0,0.38)',
  '0px 8px 14px rgba(0,0,0,0.35)',
].join(', ')

// Estilo Brush Script grueso con contorno crema/dorado para "San Judas Tadeo" (sin distorsión sobre fondo rojo)
const SAN_JUDAS_SCRIPT_SHADOW = [
  '-2px -2px 0 #FFFDF2',
  '2px -2px 0 #FFFDF2',
  '-2px 2px 0 #FFFDF2',
  '2px 2px 0 #FFFDF2',
  '0px -2px 0 #FFFDF2',
  '0px 2px 0 #FFFDF2',
  '-2px 0px 0 #FFFDF2',
  '2px 0px 0 #FFFDF2',
  '-3px 3px 0 #E5B23A',
  '3px 3px 0 #E5B23A',
  '0px 4px 0 #C48F1B',
  '0px 7px 14px rgba(0,0,0,0.45)',
].join(', ')

export default function JuguetesBrandPage() {
  const navigate = useNavigate()
  const { currentUser } = useAppStore()
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [cart, setCart] = useState<CartItem[]>([])
  const [showCart, setShowCart] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Todos')
  const [addedFeedback, setAddedFeedback] = useState<string | null>(null)

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0)
  const totalPrice = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0)

  useEffect(() => {
    // Si el usuario ya está autenticado, redirigirlo al POS/Admin
    if (currentUser) {
      const adminRoles = ['admin', 'owner', 'superadmin', 'manager']
      navigate(adminRoles.includes(currentUser.role) ? '/admin' : '/pos', { replace: true })
      return
    }
    loadProducts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser])

  const loadProducts = async () => {
    try {
      setLoading(true)
      // Si el caché tenía imágenes genéricas de Unsplash, forzar actualización fresca
      try {
        localStorage.removeItem(last_products_fetch_ms_)
      } catch { /* ignore */ }
      const juguetesProducts = await supabaseService.getAllProducts(JUGUETES_ORG_ID)
      const visible = juguetesProducts.filter(p => p.active !== false)
      setProducts(visible)
      setFilteredProducts(visible)
    } catch (err) {
      console.error('Error cargando productos:', err)
    } finally {
      setLoading(false)
    }
  }

  // Filtro reactivo por búsqueda y categoría
  useEffect(() => {
    let result = products
    if (selectedCategory !== 'Todos') {
      result = result.filter(p =>
        (p.category || '').toLowerCase().includes(selectedCategory.toLowerCase()) ||
        (p.name || '').toLowerCase().includes(selectedCategory.toLowerCase())
      )
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      result = result.filter(p =>
        (p.name || '').toLowerCase().includes(term) ||
        (p.description || '').toLowerCase().includes(term) ||
        (p.category || '').toLowerCase().includes(term)
      )
    }
    setFilteredProducts(result)
  }, [searchTerm, selectedCategory, products])

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id)
      if (existing) {
        return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      }
      return [...prev, { product, quantity: 1 }]
    })
    setAddedFeedback(product.id)
    setTimeout(() => setAddedFeedback(null), 1200)
  }

  const removeFromCart = (productId: string) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === productId)
      if (existing && existing.quantity > 1) {
        return prev.map(i => i.product.id === productId ? { ...i, quantity: i.quantity - 1 } : i)
      }
      return prev.filter(i => i.product.id !== productId)
    })
  }

  const handleWhatsAppOrder = () => {
    if (cart.length === 0) return
    const lines = cart.map(i => `• ${i.product.name} x${i.quantity} — $${(i.product.price * i.quantity).toFixed(2)}`).join('\n')
    const msg = encodeURIComponent(`🎁 ¡Hola! Quiero hacer un pedido de Juguetes y Novedades San Judas Tadeo:\n\n${lines}\n\n💰 Total: $${totalPrice.toFixed(2)}\n\n¡Gracias!`)
    window.open(`https://wa.me/524426003500?text=${msg}`, '_blank')
  }

  return (
    <div className="min-h-screen" style={{ background: '#FAF7F5', fontFamily: "'Outfit', sans-serif" }}>

      {/* ============================================================
          HERO BANNER — Rojo festivo con identidad oficial del manual
      ============================================================ */}
      <div
        className="relative overflow-hidden"
        style={{
          background: `radial-gradient(circle at 50% 35%, #DB3B48 0%, ${PALETTE.red} 48%, ${PALETTE.redDark} 100%)`,
          minHeight: '540px'
        }}
      >
        {/* Decoración abundante de fondo para pantallas grandes y móviles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
          {HERO_DECORATIONS.map((item, idx) => (
            <div
              key={idx}
              className={`absolute ${item.size} ${item.opacity} transition-transform duration-700`}
              style={{
                top: item.top,
                left: item.left,
                transform: `rotate(${item.rotate})`,
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))'
              }}
            >
              {item.emoji}
            </div>
          ))}
        </div>

        {/* Barra superior de navegación */}
        <div className="relative z-10 flex items-center justify-between px-4 sm:px-8 py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full overflow-hidden border-2 border-[#F5C438] shadow-lg ring-2 ring-[#F5C438]/40 bg-[#9A1F2B]">
              <img src="/images/juguetes-san-judas-logo.jpeg" alt="San Judas Tadeo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-white font-black text-xs sm:text-sm tracking-wide leading-tight" style={{ fontFamily: "'Lilita One', 'Fredoka', sans-serif" }}>
                JUGUETES Y NOVEDADES
              </h1>
              <p
                className="text-sm sm:text-base leading-none mt-0.5"
                style={{
                  color: '#14A850',
                  fontFamily: "'Pacifico', cursive",
                  textShadow: '-1px -1px 0 #FFFDF2, 1px -1px 0 #FFFDF2, -1px 1px 0 #FFFDF2, 1px 1px 0 #FFFDF2, 0 2px 4px rgba(0,0,0,0.35)'
                }}
              >
                San Judas Tadeo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/login"
              className="text-white/90 hover:text-white text-xs sm:text-sm font-bold px-3.5 py-2 rounded-xl border border-white/25 hover:bg-white/15 transition-all backdrop-blur-xs"
            >
              Iniciar sesión
            </Link>
            <button
              onClick={() => setShowCart(true)}
              className="relative flex items-center gap-2 bg-white text-[#C8323E] font-black px-3.5 py-2 rounded-xl text-xs sm:text-sm shadow-lg hover:bg-yellow-50 transition-all active:scale-95"
            >
              <ShoppingCart size={16} />
              <span className="hidden sm:inline">Carrito</span>
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-[#109848] text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow">
                  {totalItems}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Hero Content — Composición Vertical Oficial (Isotipo arriba + Tipografía 3D abajo como en el PDF) */}
        <div className="relative z-10 px-4 sm:px-6 pt-2 pb-20 flex flex-col items-center text-center max-w-4xl mx-auto">

          {/* 1. Isotipo Circular Grande (Medallón de San Judas Tadeo arriba) */}
          <div className="relative mb-5 sm:mb-6 group">
            {/* Resplandor dorado detrás del medallón */}
            <div
              className="absolute -inset-3 rounded-full blur-xl opacity-55 group-hover:opacity-75 transition-opacity"
              style={{ background: 'radial-gradient(circle, #FDE047 0%, #F59E0B 60%, transparent 100%)' }}
            />
            <div className="relative w-44 h-44 sm:w-56 sm:h-56 md:w-64 md:h-64 rounded-full overflow-hidden border-[5px] border-[#F5C438] shadow-[0_14px_35px_rgba(0,0,0,0.45)] ring-8 ring-[#F5C438]/30 mx-auto bg-[#8C1D28]">
              <img
                src="/images/juguetes-san-judas-logo.jpeg"
                alt="San Judas Tadeo Isotipo Oficial"
                className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
              />
            </div>
          </div>

          {/* 2. Tipografía "JUGUETES Y NOVEDADES" estilo bloques de juguete 3D multicolor */}
          <div className="select-none mb-2 sm:mb-3">
            {/* Línea 1: JUGUETES */}
            <div
              className="flex items-center justify-center flex-wrap tracking-wider leading-none mb-1 sm:mb-1.5"
              style={{ fontFamily: "'Lilita One', 'Fredoka', sans-serif" }}
              aria-label="JUGUETES"
            >
              {JUGUETES_LETTERS.map((item, index) => (
                <span
                  key={index}
                  className="inline-block text-5xl sm:text-6xl md:text-7xl font-black px-[1px] sm:px-[2px] transition-transform hover:scale-110"
                  style={{
                    color: item.color,
                    transform: `rotate(${item.rotate}deg)`,
                    textShadow: TOY_LETTER_SHADOW,
                  }}
                >
                  {item.char}
                </span>
              ))}
            </div>

            {/* Línea 2: Y NOVEDADES */}
            <div
              className="flex items-center justify-center flex-wrap tracking-wide leading-none"
              style={{ fontFamily: "'Lilita One', 'Fredoka', sans-serif" }}
              aria-label="Y NOVEDADES"
            >
              {Y_NOVEDADES_LETTERS.map((item, index) => (
                <span
                  key={index}
                  className={`inline-block text-4xl sm:text-5xl md:text-6xl font-black px-[1px] sm:px-[1.5px] transition-transform hover:scale-110 ${item.spaceAfter ? 'mr-3 sm:mr-4' : ''}`}
                  style={{
                    color: item.color,
                    transform: `rotate(${item.rotate}deg)`,
                    textShadow: TOY_LETTER_SHADOW,
                  }}
                >
                  {item.char}
                </span>
              ))}
            </div>
          </div>

          {/* 3. "San Judas Tadeo" en Brush Script grueso verde esmeralda con borde crema/dorado (cero distorsión visual) */}
          <div className="relative flex items-center justify-center gap-2 sm:gap-3 my-1 sm:my-2">
            <span className="text-white/90 text-lg sm:text-2xl select-none drop-shadow">❄️</span>
            <p
              className="text-4xl sm:text-5xl md:text-6xl px-2 leading-tight select-none"
              style={{
                color: '#109848',
                fontFamily: "'Pacifico', cursive",
                textShadow: SAN_JUDAS_SCRIPT_SHADOW,
                letterSpacing: '0.02em',
              }}
            >
              San Judas Tadeo
            </p>
            <span className="text-white/90 text-lg sm:text-2xl select-none drop-shadow">❄️</span>
          </div>

          {/* Subtítulo y píldoras de beneficios */}
          <p className="text-white/95 font-medium text-sm sm:text-base md:text-lg max-w-lg mt-3 drop-shadow">
            🎁 El juguete de tus sueños te espera · Surtido de temporada, envíos y pickup en tienda
          </p>

          <div className="flex flex-wrap gap-2.5 mt-4 justify-center">
            <span className="bg-[#109848] text-white text-xs sm:text-sm font-black px-3.5 py-1.5 rounded-full shadow-md border border-white/25">
              🚚 Envío gratis $500+
            </span>
            <span className="bg-[#FACC15] text-slate-900 text-xs sm:text-sm font-black px-3.5 py-1.5 rounded-full shadow-md border border-white/40">
              ⭐ Juguetería y Novedades
            </span>
            <span className="bg-[#1488D8] text-white text-xs sm:text-sm font-black px-3.5 py-1.5 rounded-full shadow-md border border-white/25">
              🎄 Temporada todo el año
            </span>
          </div>
        </div>

        {/* Wave separator */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 48L60 42C120 36 240 24 360 20C480 16 600 20 720 26C840 32 960 40 1080 40C1200 40 1320 32 1380 28L1440 24V48H0Z" fill="#FAF7F5"/>
          </svg>
        </div>
      </div>

      {/* ============================================================
          BADGES DE CONFIANZA
      ============================================================ */}
      <div className="bg-white border-b border-red-100 py-3">
        <div className="max-w-5xl mx-auto px-4 flex flex-wrap items-center justify-center gap-4 sm:gap-8">
          {[
            { icon: <Package size={16} />, text: 'Productos originales', color: PALETTE.green },
            { icon: <Truck size={16} />, text: 'Envío rápido', color: PALETTE.blue },
            { icon: <Gift size={16} />, text: 'Empaque regalo', color: PALETTE.red },
            { icon: <Star size={16} />, text: 'Calidad garantizada', color: '#D49B17' },
          ].map((b, i) => (
            <div key={i} className="flex items-center gap-2 text-xs sm:text-sm font-bold" style={{ color: b.color }}>
              {b.icon}
              <span>{b.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ============================================================
          BUSCADOR + FILTROS
      ============================================================ */}
      <div className="max-w-5xl mx-auto px-4 pt-6 pb-2">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar juguetes, novedades..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-red-100 focus:border-red-400 outline-none text-sm bg-white shadow-sm"
            />
          </div>
          {/* Carrito rápido móvil */}
          {totalItems > 0 && (
            <button
              onClick={() => setShowCart(true)}
              className="sm:hidden flex items-center justify-center gap-2 text-white font-black py-2.5 px-4 rounded-xl shadow-md text-sm"
              style={{ background: PALETTE.green }}
            >
              <ShoppingCart size={16} />
              Ver carrito ({totalItems}) · ${totalPrice.toFixed(0)}
            </button>
          )}
        </div>

        {/* Categorías */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className="flex-shrink-0 text-xs font-black px-3 py-1.5 rounded-full border-2 transition-all"
              style={selectedCategory === cat
                ? { background: PALETTE.red, color: '#fff', borderColor: PALETTE.red }
                : { background: '#fff', color: PALETTE.red, borderColor: '#FECACA' }
              }
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ============================================================
          GRID DE PRODUCTOS
      ============================================================ */}
      <div className="max-w-5xl mx-auto px-4 py-4">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl h-56 animate-pulse shadow-sm" />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <Package size={48} className="mx-auto mb-4 opacity-30" />
            <p className="font-bold text-lg">No hay productos disponibles</p>
            <p className="text-sm mt-1">Intenta con otra búsqueda o categoría 🎁</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
            {filteredProducts.map(product => {
              const inCart = cart.find(i => i.product.id === product.id)
              const justAdded = addedFeedback === product.id
              return (
                <div
                  key={product.id}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all border-2 border-transparent hover:border-red-200 group flex flex-col"
                >
                  {/* Imagen */}
                  <div className="relative overflow-hidden h-44 sm:h-52 bg-white p-2 flex items-center justify-center border-b border-slate-100">
                    <img
                      src={resolveProductImage(product)}
                      alt={product.name}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      onError={e => { (e.target as HTMLImageElement).src = CATEGORY_IMAGES['Todos'] }}
                    />
                    {product.category && (
                      <span className="absolute top-2 left-2 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full" style={{ background: PALETTE.green }}>
                        {product.category}
                      </span>
                    )}
                    {justAdded && (
                      <div className="absolute inset-0 bg-green-500/80 flex items-center justify-center rounded-2xl">
                        <CheckCircle2 size={40} className="text-white" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-2.5 flex flex-col flex-1">
                    <h3 className="font-bold text-xs sm:text-sm text-slate-800 line-clamp-2 leading-tight mb-1 flex-1">
                      {product.name}
                    </h3>
                    <div className="flex items-center justify-between gap-1 mt-1">
                      <span className="font-black text-base" style={{ color: PALETTE.red }}>
                        ${product.price.toFixed(2)}
                      </span>
                      {inCart ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => removeFromCart(product.id)}
                            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-black"
                            style={{ background: PALETTE.red }}
                          >
                            <Minus size={12} />
                          </button>
                          <span className="text-xs font-black w-4 text-center">{inCart.quantity}</span>
                          <button
                            onClick={() => addToCart(product)}
                            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-black"
                            style={{ background: PALETTE.green }}
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(product)}
                          className="flex items-center justify-center w-7 h-7 rounded-full text-white shadow-md hover:scale-110 transition-transform active:scale-95"
                          style={{ background: PALETTE.red }}
                          title="Agregar al carrito"
                        >
                          <Plus size={14} />
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

      {/* ============================================================
          FOOTER
      ============================================================ */}
      <footer className="mt-12 pb-8 text-center">
        <div
          className="py-10 px-4"
          style={{ background: `linear-gradient(135deg, ${PALETTE.redDark}, ${PALETTE.red})` }}
        >
          <div className="w-20 h-20 rounded-full overflow-hidden border-3 border-[#F5C438] mx-auto mb-3 shadow-xl ring-4 ring-[#F5C438]/30">
            <img src="/images/juguetes-san-judas-logo.jpeg" alt="Logo San Judas Tadeo" className="w-full h-full object-cover" />
          </div>
          <p
            className="text-white font-black text-xl sm:text-2xl tracking-wide"
            style={{ fontFamily: "'Lilita One', 'Fredoka', sans-serif", textShadow: '0 2px 4px rgba(0,0,0,0.35)' }}
          >
            JUGUETES Y NOVEDADES
          </p>
          <p
            className="text-2xl sm:text-3xl mt-1"
            style={{
              color: '#109848',
              fontFamily: "'Pacifico', cursive",
              textShadow: SAN_JUDAS_SCRIPT_SHADOW
            }}
          >
            San Judas Tadeo
          </p>
          <p className="text-white/80 text-xs sm:text-sm mt-2">🎄 ¡El juguete de tus sueños te espera!</p>
          <p className="text-white font-black text-xs sm:text-sm mt-1">📞 Tel / WhatsApp: (442) 600-3500</p>

          <div className="flex items-center justify-center gap-4 mt-5">
            <button
              onClick={handleWhatsAppOrder}
              disabled={cart.length === 0}
              className="flex items-center gap-2 bg-[#109848] hover:bg-[#0D7A38] text-white font-black px-4 py-2.5 rounded-xl text-sm transition-all disabled:opacity-40 shadow-lg"
            >
              <MessageCircle size={16} />
              Pedir por WhatsApp
            </button>
            <Link
              to="/login"
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold px-4 py-2.5 rounded-xl text-sm border border-white/25 transition-all"
            >
              <Sparkles size={16} />
              Soy colaborador
            </Link>
          </div>
        </div>
        <p className="text-slate-400 text-xs mt-4">Powered by Reisbloc · sanjudastadeo.reisbloc.com</p>
      </footer>

      {/* ============================================================
          CARRITO LATERAL (drawer)
      ============================================================ */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={() => setShowCart(false)} />
          <div className="w-full max-w-sm bg-white shadow-2xl flex flex-col">
            {/* Cart Header */}
            <div className="p-4 text-white font-black flex items-center justify-between" style={{ background: PALETTE.red }}>
              <div className="flex items-center gap-2">
                <ShoppingCart size={20} />
                <span>Mi Carrito ({totalItems})</span>
              </div>
              <button onClick={() => setShowCart(false)} className="text-white/80 hover:text-white text-xl leading-none">✕</button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.length === 0 ? (
                <div className="text-center text-slate-400 py-12">
                  <Package size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="font-bold">Tu carrito está vacío</p>
                  <p className="text-xs mt-1">¡Agrega algunos juguetes! 🎁</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.product.id} className="flex items-center gap-3 bg-slate-50 rounded-xl p-2">
                    <img
                      src={resolveProductImage(item.product)}
                      alt={item.product.name}
                      className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-xs text-slate-800 line-clamp-2">{item.product.name}</p>
                      <p className="font-black text-sm mt-0.5" style={{ color: PALETTE.red }}>
                        ${(item.product.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white"
                        style={{ background: PALETTE.red }}
                      >
                        <Minus size={10} />
                      </button>
                      <span className="text-xs font-black w-4 text-center">{item.quantity}</span>
                      <button
                        onClick={() => addToCart(item.product)}
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white"
                        style={{ background: PALETTE.green }}
                      >
                        <Plus size={10} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Cart Footer */}
            {cart.length > 0 && (
              <div className="p-4 border-t border-slate-100 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-600">Total</span>
                  <span className="font-black text-xl" style={{ color: PALETTE.red }}>
                    ${totalPrice.toFixed(2)}
                  </span>
                </div>
                <button
                  onClick={handleWhatsAppOrder}
                  className="w-full text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 text-sm shadow-lg transition-all hover:opacity-90 active:scale-[0.98]"
                  style={{ background: '#25D366' }}
                >
                  <MessageCircle size={18} />
                  Pedir por WhatsApp
                </button>
                <button
                  onClick={() => setShowCart(false)}
                  className="w-full text-slate-600 font-bold py-2 rounded-xl text-sm hover:bg-slate-100 transition-all"
                >
                  Seguir comprando
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
