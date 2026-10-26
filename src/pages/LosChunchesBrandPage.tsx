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
  UserCheck,
  Star
} from 'lucide-react'
import supabaseService from '@/services/supabaseService'
import { useAppStore } from '@/store/appStore'
import { Product } from '@/types'

interface CartItem {
  product: Product
  quantity: number
}

const LOS_CHUNCHES_ORG_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'

// 📦 Catálogo de ejemplo estilo "Saldos Costco" (solo URLs verificadas 200 OK)
// Mapea keywords de productos reales a fotografías de categoría
const CATEGORY_IMAGES: Record<string, string> = {
  'Muebles': 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=600&q=80',
  'Ropa y Tenis': 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80',
  'Herramientas': 'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?auto=format&fit=crop&w=600&q=80',
  'Hogar y Cocina': 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=600&q=80',
  'Electrónica': 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=600&q=80',
  'Deportes': 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=600&q=80',
  'Todos': 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80'
}

function resolveProductImage(product: Product): string {
  // Si ya tiene una foto real asignada y no es el logo corporativo, usarla
  if (product.imageUrl && !product.imageUrl.includes('los_chunches.jpeg') && !product.imageUrl.includes('logo')) {
    return product.imageUrl
  }

  const name = (product.name || '').toLowerCase()
  const cat = (product.category || '').toLowerCase()
  const blob = `${name} ${cat}`

  if (blob.includes('sofa') || blob.includes('sofá') || blob.includes('sillon') || blob.includes('sillón') || blob.includes('silla') || blob.includes('mesa') || cat.includes('mueble')) {
    return CATEGORY_IMAGES['Muebles']
  }
  if (blob.includes('colchon') || blob.includes('colchón') || blob.includes('cama') || blob.includes('matrimonial')) {
    return 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=600&q=80'
  }
  if (blob.includes('tenis') || blob.includes('zapato') || blob.includes('sneaker') || blob.includes('calzado') || blob.includes('sandalia')) {
    return CATEGORY_IMAGES['Ropa y Tenis']
  }
  if (blob.includes('sudadera') || blob.includes('hoodie') || blob.includes('chamarra')) {
    return 'https://images.unsplash.com/photo-1562157873-818bc0726f68?auto=format&fit=crop&w=600&q=80'
  }
  if (blob.includes('playera') || blob.includes('camiseta') || blob.includes('ropa') || blob.includes('traje') || blob.includes('chaqueta')) {
    return 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=600&q=80'
  }
  if (blob.includes('maletin') || blob.includes('maletín') || blob.includes('llaves') || blob.includes('dados')) {
    return 'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?auto=format&fit=crop&w=600&q=80'
  }
  if (blob.includes('taladro') || blob.includes('herramienta') || blob.includes('broca') || blob.includes('destornillador') || cat.includes('herramienta')) {
    return CATEGORY_IMAGES['Herramientas']
  }
  if (blob.includes('cafe') || blob.includes('café') || blob.includes('despensa')) {
    return 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=600&q=80'
  }
  if (blob.includes('termo') || blob.includes('vaso') || blob.includes('botella')) {
    return 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=600&q=80'
  }
  if (blob.includes('licuadora') || blob.includes('cocina') || blob.includes('ollas') || blob.includes('sarten') || blob.includes('sartén') || cat.includes('hogar')) {
    return CATEGORY_IMAGES['Hogar y Cocina']
  }
  if (blob.includes('tv') || blob.includes('televisi') || blob.includes('pantalla')) {
    return CATEGORY_IMAGES['Electrónica']
  }
  if (blob.includes('laptop') || blob.includes('computadora') || blob.includes('macbook')) {
    return 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=600&q=80'
  }
  if (blob.includes('smartwatch') || blob.includes('reloj')) {
    return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80'
  }
  if (blob.includes('audifono') || blob.includes('audífono') || blob.includes('headphone')) {
    return 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=600&q=80'
  }
  if (blob.includes('pesas') || blob.includes('gimnasio') || blob.includes('fitness') || blob.includes('yoga')) {
    return CATEGORY_IMAGES['Deportes']
  }
  if (blob.includes('juguete') || blob.includes('niños') || blob.includes('ninos') || blob.includes('lego') || blob.includes('construible') || blob.includes('constructivo')) {
    return 'https://images.unsplash.com/photo-1558060370-d644479cb6f7?auto=format&fit=crop&w=600&q=80'
  }

  // Fallback por defecto: ambiente de bodega / paquetes de saldos
  return CATEGORY_IMAGES['Todos']
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

  // Catálogo de ejemplo estilo "saldos de Costco" (muebles, ropa, tenis,
  // herramientas, hogar y electrónica — todo lo no perecedero). En producción
  // este catálogo vive en la tabla products del tenant en DEV.
  const fallbackProducts: Product[] = [
    // ==================== MUEBLES ====================
    {
      id: 'lc-f1',
      name: 'Sofá 3 Plazas Premium',
      description: 'Sofá de salón de tela premium con patas de madera. Estilo moderno, recién desempacado.',
      price: 4499,
      category: 'Muebles',
      sku: 'LC-MUE-01',
      currentStock: 4,
      isAvailable: true,
      imageUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=600&q=80',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'lc-f2',
      name: 'Sillón Individual Ergonómico',
      description: 'Butaca tapizada con soporte lumbar, ideal para sala o estudio.',
      price: 1799,
      category: 'Muebles',
      sku: 'LC-MUE-02',
      currentStock: 6,
      isAvailable: true,
      imageUrl: 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=600&q=80',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'lc-f3',
      name: 'Set 2 Sillas de Comedor',
      description: 'Par de sillas tapizadas con estructura de acero. Resistentes y elegantes.',
      price: 1199,
      category: 'Muebles',
      sku: 'LC-MUE-03',
      currentStock: 10,
      isAvailable: true,
      imageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=600&q=80',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'lc-f4',
      name: 'Base + Colchón Matrimonial Pillowtop',
      description: 'Base tapizada con colchón pillowtop de resortes. Cómodo y de doble cara.',
      price: 3999,
      category: 'Muebles',
      sku: 'LC-MUE-04',
      currentStock: 3,
      isAvailable: true,
      imageUrl: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=600&q=80',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    // ==================== ROPA Y TENIS ====================
    {
      id: 'lc-r1',
      name: 'Tenis Running Ultraligeros',
      description: 'Tenis deportivos unisex con amortiguación premium. Varios números disponibles.',
      price: 1699,
      category: 'Ropa y Tenis',
      sku: 'LC-TEN-01',
      currentStock: 18,
      isAvailable: true,
      imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'lc-r2',
      name: 'Sneakers Blancas Urban',
      description: 'Sneakers blancas versátiles para casual y gimnasio. Números del 24 al 29.',
      price: 1299,
      category: 'Ropa y Tenis',
      sku: 'LC-TEN-02',
      currentStock: 22,
      isAvailable: true,
      imageUrl: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=600&q=80',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'lc-r3',
      name: 'Sandalias Cómodas Unisex',
      description: 'Sandalias livianas con correa ajustable, perfectas para el día a día.',
      price: 649,
      category: 'Ropa y Tenis',
      sku: 'LC-TEN-03',
      currentStock: 30,
      isAvailable: true,
      imageUrl: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&w=600&q=80',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'lc-r4',
      name: 'Pack 4 Playeras Básicas Algodón',
      description: 'Cuatro playeras de algodón 100% básicas. Tallas surtidas de la S a la XL.',
      price: 499,
      category: 'Ropa y Tenis',
      sku: 'LC-ROP-01',
      currentStock: 25,
      isAvailable: true,
      imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=600&q=80',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'lc-r5',
      name: 'Sudadera Fleece Unisex',
      description: 'Sudadera de forro polar con capucha. Perfecta para clima frío.',
      price: 549,
      category: 'Ropa y Tenis',
      sku: 'LC-ROP-02',
      currentStock: 20,
      isAvailable: true,
      imageUrl: 'https://images.unsplash.com/photo-1562157873-818bc0726f68?auto=format&fit=crop&w=600&q=80',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    // ==================== HERRAMIENTAS ====================
    {
      id: 'lc-h1',
      name: 'Taladro Percutor Inalámbrico 20V',
      description: 'Taladro a batería con set de brocas incluido, mandril ajustable y luz LED integrada.',
      price: 1199,
      category: 'Herramientas',
      sku: 'LC-HER-01',
      currentStock: 8,
      isAvailable: true,
      imageUrl: 'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?auto=format&fit=crop&w=600&q=80',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'lc-h2',
      name: 'Maletín de Herramientas 120 Piezas',
      description: 'Set completo de llaves, dados, destornilladores y alicates en estuche reforzado.',
      price: 899,
      category: 'Herramientas',
      sku: 'LC-HER-02',
      currentStock: 9,
      isAvailable: true,
      imageUrl: 'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?auto=format&fit=crop&w=600&q=80',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    // ==================== HOGAR Y COCINA ====================
    {
      id: 'lc-k1',
      name: 'Licuadora Profesional 1200W',
      description: 'Vaso de vidrio de 2L, motor de 1200W y 10 velocidades. Potente para smoothies.',
      price: 999,
      category: 'Hogar y Cocina',
      sku: 'LC-HOG-01',
      currentStock: 12,
      isAvailable: true,
      imageUrl: 'https://images.unsplash.com/photo-1570222094114-d054a817e56b?auto=format&fit=crop&w=600&q=80',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'lc-k2',
      name: 'Batería de Cocina Antiadherente 10 Pzas',
      description: 'Set de ollas y sartenes antiadherentes con tapas de cristal. Compatible con inducción.',
      price: 1249,
      category: 'Hogar y Cocina',
      sku: 'LC-HOG-02',
      currentStock: 7,
      isAvailable: true,
      imageUrl: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=600&q=80',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'lc-k3',
      name: 'Vaso Térmico Tumbler 1L',
      description: 'Doble pared de acero inoxidable que mantiene bebidas frías o calientes por 24 horas.',
      price: 349,
      category: 'Hogar y Cocina',
      sku: 'LC-HOG-03',
      currentStock: 40,
      isAvailable: true,
      imageUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=600&q=80',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'lc-k4',
      name: 'Café Tostado Premium 2.5kg',
      description: 'Bolsa de café tostado molido de altura 100% arábica. Despensa no perecedera.',
      price: 589,
      category: 'Hogar y Cocina',
      sku: 'LC-HOG-04',
      currentStock: 35,
      isAvailable: true,
      imageUrl: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=600&q=80',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    // ==================== ELECTRÓNICA ====================
    {
      id: 'lc-e1',
      name: 'Smart TV 55" 4K UHD',
      description: 'Pantalla 4K HDR con sistema inteligente y control remoto por voz. Caja sellada.',
      price: 7499,
      category: 'Electrónica',
      sku: 'LC-ELE-01',
      currentStock: 5,
      isAvailable: true,
      imageUrl: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=600&q=80',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'lc-e2',
      name: 'Laptop Ultrafina 14"',
      description: 'Estilo premium, SSD de 512GB, 16GB RAM y cargador rápido. Recién desempacada.',
      price: 11999,
      category: 'Electrónica',
      sku: 'LC-ELE-02',
      currentStock: 4,
      isAvailable: true,
      imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=600&q=80',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'lc-e3',
      name: 'Smartwatch Serie Pro',
      description: 'Hasta 7 días de batería, monitoreo de ritmo cardíaco y pantalla AMOLED.',
      price: 1799,
      category: 'Electrónica',
      sku: 'LC-ELE-03',
      currentStock: 11,
      isAvailable: true,
      imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'lc-e4',
      name: 'Audífonos Inalámbricos ANC',
      description: 'Cancelación de ruido activa, 30 horas de batería y carga rápida USB-C.',
      price: 1599,
      category: 'Electrónica',
      sku: 'LC-ELE-04',
      currentStock: 14,
      isAvailable: true,
      imageUrl: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=600&q=80',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    // ==================== DEPORTES ====================
    {
      id: 'lc-d1',
      name: 'Kit de Pesas Hexagonales · 30kg',
      description: 'Par de pesas de hierro recubiertas de neopreno, ideal para gym en casa.',
      price: 1499,
      category: 'Deportes',
      sku: 'LC-DEP-01',
      currentStock: 6,
      isAvailable: true,
      imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=600&q=80',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'lc-d2',
      name: 'Set de Construcción Extra Grande',
      description: 'Caja con cientos de piezas para construir. Diversión garantizada para niños.',
      price: 899,
      category: 'Deportes',
      sku: 'LC-DEP-02',
      currentStock: 10,
      isAvailable: true,
      imageUrl: 'https://images.unsplash.com/photo-1558060370-d644479cb6f7?auto=format&fit=crop&w=600&q=80',
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

  const categories = ['Todos', 'Muebles', 'Ropa y Tenis', 'Herramientas', 'Hogar y Cocina', 'Electrónica', 'Deportes']

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesCat =
      selectedCategory === 'Todos' ||
      p.category?.toLowerCase() === selectedCategory.toLowerCase() ||
      (selectedCategory === 'Ropa y Tenis' && p.category?.toLowerCase().includes('ropa'))
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
    const message = `¡Hola Los Chunches de Cons! 📦 Me interesa el siguiente saldo:\n\n${lines.join(
      '\n'
    )}\n\n*Total aproximado: $${cartTotal.toFixed(2)} MXN*\n¿Está disponible? ¿Aceptan envío a mi domicilio? ¡Gracias!`

    const encoded = encodeURIComponent(message)
    window.open(`https://wa.me/?text=${encoded}`, '_blank')
  }

  return (
    <div className="min-h-screen bg-[#FAF6F7] text-slate-800 font-['Outfit',sans-serif] selection:bg-[#9B4158] selection:text-white pb-20">
      {/* 📦 HEADER MINIMALISTA & EQUILIBRADO */}
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
                <span className="text-base text-rose-300">📦</span>
              </div>
              <p className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                Saldos de Costco · Novedades Semanales
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

      {/* 📦 STRIP DE BODEGA: novedad de lotes */}
      <div className="bg-slate-950 text-amber-300 text-[10px] sm:text-[11px] font-black tracking-[0.18em] uppercase text-center py-2.5 px-4">
        📦 Nuevos lotes cada semana · Saldos originales de Costco · Precios de mayoreo 📦
      </div>

      {/* 📦 HERO SALDOS */}
      <section className="relative overflow-hidden py-12 sm:py-16 px-4 bg-gradient-to-b from-white to-[#FAF6F7]">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          {/* Badge Saldos */}
          <div className="inline-flex items-center gap-2 bg-white border border-[#EDE6E8] text-[#9B4158] px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase mb-6 shadow-xs">
            <Sparkles size={13} className="text-[#9B4158]" />
            Saldos Originales de Costco · Nuevo Lote Cada Semana
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
              Saldos y liquidación de Costco: muebles, ropa, tenis, herramientas, cocina, electrónica — todo lo que <span className="font-semibold text-slate-800">no es perecedero</span>, hasta <span className="font-semibold text-[#9B4158]">60% menos</span>. Pedidos directo por WhatsApp.
            </p>
          </div>

          {/* Garantías y Valores (Sobrios y limpios) */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mt-8">
            <div className="bg-white border border-[#EDE6E8] px-4 py-2 rounded-2xl shadow-2xs flex items-center gap-2 text-xs font-medium text-slate-700">
              <CheckCircle2 size={15} className="text-[#9B4158]" />
              <span>Mercancía Original Costco</span>
            </div>
            <div className="bg-white border border-[#EDE6E8] px-4 py-2 rounded-2xl shadow-2xs flex items-center gap-2 text-xs font-medium text-slate-700">
              <Star size={14} className="text-amber-500 fill-amber-500" />
              <span>Precios de Saldo Real</span>
            </div>
            <div className="bg-white border border-[#EDE6E8] px-4 py-2 rounded-2xl shadow-2xs flex items-center gap-2 text-xs font-medium text-slate-700">
              <Package size={15} className="text-[#9B4158]" />
              <span>Nuevo Lote Cada Semana</span>
            </div>
          </div>
        </div>
      </section>

      {/* 📦 CATÁLOGO & EXPLORACIÓN DE PRODUCTOS */}
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
                  {/* 📦 Fotografía de la categoría + badge de saldo */}
                  <div className="relative aspect-4/3 bg-stone-100 overflow-hidden">
                    <img
                      src={photo}
                      alt={p.name}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3 bg-red-600 text-white px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm">
                      Saldo
                    </div>
                    <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-slate-700 border border-stone-200/80 shadow-2xs">
                      {p.category || 'Novedades'}
                    </div>
                    {p.currentStock !== undefined && p.currentStock > 0 && p.currentStock <= 5 && (
                      <div className="absolute bottom-3 left-3 bg-slate-900/85 backdrop-blur-xs text-white px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                        ¡Últimas {p.currentStock} piezas!
                      </div>
                    )}
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

      {/* 📦 MODAL DE CARRITO ELEGANTE */}
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

      {/* 📦 FOOTER SOBRIO Y PROFESIONAL */}
      <footer className="mt-20 border-t border-[#EDE6E8] bg-white py-8 px-4 text-center">
        <div className="max-w-4xl mx-auto space-y-3">
          <div className="flex items-center justify-center gap-2">
            <span className="font-bold text-slate-800 text-sm">Los Chunches de Cons</span>
            <span className="text-xs text-rose-300">📦</span>
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
