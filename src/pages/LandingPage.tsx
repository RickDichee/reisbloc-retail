import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  ShieldCheck,
  Zap,
  Bot,
  FileText,
  Lock,
  ArrowRight,
  Sparkles,
  MessageCircle,
  ExternalLink,
  Shield,
  TrendingUp,
  Smartphone,
  Sliders,
  Layers,
  CreditCard,
  Building,
  CheckCircle2,
  Check,
  Play,
  X,
  ChevronRight,
  Send
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { BRANDING } from '@/config/branding'

export default function LandingPage() {
  const navigate = useNavigate()
  const { currentUser } = useAppStore()

  const [showContactModal, setShowContactModal] = useState(false)
  const [showVideoModal, setShowVideoModal] = useState(false)
  const [contactSubmitted, setContactSubmitted] = useState(false)
  const [formData, setFormData] = useState({
    businessName: '',
    contactName: '',
    phone: '',
    needs: 'Retail Boutique + Terminal Clip',
    notes: '',
  })

  useEffect(() => {
    if (currentUser) {
      navigate('/admin')
    }
  }, [currentUser, navigate])

  const waLink = (text: string) =>
    `https://wa.me/5215665848231?text=${encodeURIComponent(text)}`

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setContactSubmitted(true)

    const text = 
      `Hola equipo Reisbloc 👋 Me interesa cotizar una solución a la medida:\n\n` +
      `• Negocio: ${formData.businessName}\n` +
      `• Contacto: ${formData.contactName}\n` +
      `• Teléfono: ${formData.phone}\n` +
      `• Necesidad: ${formData.needs}\n` +
      (formData.notes ? `• Notas: ${formData.notes}\n` : '') +
      `\nQuisiera información sobre la implementación.`

    setTimeout(() => {
      window.open(waLink(text), '_blank')
    }, 1200)
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] text-[#F8FAFC] font-['Outfit',sans-serif] selection:bg-teal-500 selection:text-black">
      
      {/* ========================================================================= */}
      {/* NAVBAR */}
      {/* ========================================================================= */}
      <nav className="sticky top-0 z-40 bg-[#0B0F19]/90 backdrop-blur-xl border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 sm:gap-3 min-w-0 group flex-shrink">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex-shrink-0 flex items-center justify-center text-white shadow-lg shadow-teal-900/40 group-hover:scale-105 transition-transform p-1.5 sm:p-2">
              <img
                src={BRANDING.logoUrl || '/icon.svg'}
                alt={BRANDING.whiteLabelName}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <span className="font-black text-sm sm:text-xl tracking-tight text-white block leading-none truncate">
                REISBLOC <span className="text-teal-400 font-light">SYSTEMS</span>
              </span>
              <span className="text-[8px] sm:text-[10px] font-extrabold tracking-wider sm:tracking-widest text-amber-400 uppercase block truncate mt-0.5">
                <span className="hidden sm:inline">reisbloc.com &middot; </span>store.reisbloc.com
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden lg:flex items-center gap-7 text-xs font-semibold text-slate-300">
            <a href="#clip" className="hover:text-teal-400 transition-colors">
              Terminal Clip Total 3
            </a>
            <a href="#personalizado" className="hover:text-amber-400 transition-colors">
              100% a la Medida
            </a>
            <a href="#soluciones" className="hover:text-teal-400 transition-colors">
              Capacidades & IA
            </a>
            <a href="#custom-brands" className="hover:text-pink-400 transition-colors">
              Casos de Éxito
            </a>
            <button
              onClick={() => setShowVideoModal(true)}
              className="text-amber-300 hover:text-amber-200 transition-colors flex items-center gap-1.5 font-bold"
            >
              <Play size={14} className="fill-amber-400 text-amber-400" />
              <span>Ver Demo</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <button
              onClick={() => {
                setContactSubmitted(false)
                setShowContactModal(true)
              }}
              className="hidden md:inline-flex px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-teal-300 border border-teal-500/30 text-xs font-black transition-all hover:scale-105 shadow-sm"
            >
              Diseñar Solución
            </button>

            <Link
              to="/login"
              className="bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl text-slate-950 font-black text-xs flex items-center gap-1.5 sm:gap-2 flex-shrink-0 shadow-lg shadow-teal-900/30 transition-all hover:scale-105 whitespace-nowrap"
            >
              <span>Acceso POS</span>
              <ChevronRight size={16} className="flex-shrink-0" />
            </Link>
          </div>

        </div>
      </nav>

      {/* ========================================================================= */}
      {/* HERO SECTION */}
      {/* ========================================================================= */}
      <header className="relative overflow-hidden pt-8 sm:pt-14 pb-14 sm:pb-20 md:py-24 border-b border-slate-800/80 bg-[radial-gradient(circle_at_50%_0%,rgba(20,184,166,0.15)_0%,rgba(0,245,255,0.05)_35%,rgba(11,15,25,0)_70%)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Text Column */}
          <div className="lg:col-span-7 space-y-5 sm:space-y-6 text-center lg:text-left">
            
            {/* Trust Badge */}
            <div className="inline-flex flex-wrap items-center justify-center lg:justify-start gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-[10px] sm:text-xs font-bold max-w-full">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0"></span>
              <span>PLATAFORMA SAAS &middot; RETAIL &middot; BOUTIQUE &middot; F&B</span>
              <span className="text-amber-400 font-mono">&middot; STORE.REISBLOC.COM</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white leading-tight tracking-tight">
              Software POS Inteligente <br/>
              <span className="bg-gradient-to-r from-teal-400 via-cyan-400 to-amber-400 bg-clip-text text-transparent">
                100% Personalizado a tu Medida
              </span>
            </h1>

            <p className="text-slate-300 text-sm sm:text-lg leading-relaxed font-normal max-w-2xl mx-auto lg:mx-0">
              Sin planes rígidos ni suscripciones infladas con funciones que nunca vas a usar. Diseñamos la infraestructura tecnológica exacta de tu negocio (Retail, Mayoreo, Boutiques o Gastronomía) con integración a <strong>Terminal Clip Total 3</strong>, Agentes de IA, Facturación CFDI 4.0 y Modo Offline-First.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3 sm:gap-4 pt-2">
              <button
                onClick={() => {
                  setContactSubmitted(false)
                  setShowContactModal(true)
                }}
                class="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-600 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-teal-900/40 hover:scale-105 transition-all flex items-center justify-center gap-2 sm:gap-3"
              >
                <Sliders size={18} className="flex-shrink-0" />
                <span>Diseñar Mi Solución a la Medida</span>
              </button>

              <button
                onClick={() => setShowVideoModal(true)}
                className="w-full sm:w-auto px-5 sm:px-6 py-3.5 sm:py-4 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-amber-300 border border-amber-500/40 font-extrabold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 hover:scale-105"
              >
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-amber-500/20 flex items-center justify-center border border-amber-500/40 flex-shrink-0">
                  <Play size={12} className="fill-amber-400 text-amber-400 ml-0.5" />
                </div>
                <span>Ver Video Demostración</span>
              </button>

              <Link
                to="/login"
                className="w-full sm:w-auto px-5 sm:px-6 py-3.5 sm:py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold text-xs sm:text-sm transition-all text-center"
              >
                Entrar al Sistema &rarr;
              </Link>
            </div>

            {/* Quick Badges */}
            <div className="pt-6 grid grid-cols-3 gap-2 sm:gap-4 border-t border-slate-800/80 max-w-lg mx-auto lg:mx-0 text-center sm:text-left">
              <div>
                <span className="block text-lg sm:text-xl font-black text-amber-400">0%</span>
                <span className="text-[10px] sm:text-xs text-slate-400 font-medium">Precios Rígidos</span>
              </div>
              <div>
                <span className="block text-lg sm:text-xl font-black text-teal-400">Clip Total 3</span>
                <span className="text-[10px] sm:text-xs text-slate-400 font-medium">Auto-Charge API</span>
              </div>
              <div>
                <span className="block text-lg sm:text-xl font-black text-emerald-400">PCI-DSS</span>
                <span className="text-[10px] sm:text-xs text-slate-400 font-medium">Auditado SAQ A</span>
              </div>
            </div>

          </div>

          {/* Hero Visual Dual-Cards */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* CARD 1: CLIP TOTAL 3 HARDWARE INTEGRATION */}
            <div id="clip" className="bg-slate-900/80 backdrop-blur-md rounded-3xl p-4 sm:p-6 border border-slate-800 space-y-4 sm:space-y-5 shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 sm:pb-4 gap-2">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0">
                    <Smartphone size={20} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-extrabold text-white text-xs sm:text-sm truncate">Clip Total 3 + POS Reisbloc</h3>
                    <p className="text-[10px] sm:text-xs text-slate-400 truncate">Cobro Automático sin Digitación</p>
                  </div>
                </div>
                <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-[9px] sm:text-[10px] font-black uppercase tracking-wider flex-shrink-0">
                  En Línea
                </span>
              </div>

              {/* Sample Live Ticket Calculation */}
              <div className="bg-slate-950 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-800/90 space-y-2">
                <div className="flex justify-between text-[11px] sm:text-xs text-slate-400 font-medium">
                  <span>Subtotal Productos / Consumo:</span>
                  <span className="text-slate-200 font-bold">$1,250.00 MXN</span>
                </div>
                <div className="flex justify-between text-[11px] sm:text-xs text-amber-400 font-semibold">
                  <span>Comisión de Terminal Transparente:</span>
                  <span>+$38.50 MXN</span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm font-black text-white pt-2 border-t border-slate-800">
                  <span>Monto Enviado a Clip:</span>
                  <span className="text-amber-400 text-sm sm:text-base font-extrabold">$1,288.50 MXN</span>
                </div>
              </div>

              <div className="space-y-2 text-[11px] sm:text-xs text-slate-300 font-medium">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 size={16} className="flex-shrink-0" />
                  <span>Transmisión instantánea al presionar "Cobrar".</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 size={16} className="flex-shrink-0" />
                  <span>Cero errores de captura humana por el cajero.</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 size={16} className="flex-shrink-0" />
                  <span>Descuento de stock en tiempo real y voucher.</span>
                </div>
              </div>
            </div>

            {/* CARD 2: AI AGENT & OFFLINE ENGINE */}
            <div className="bg-slate-900/80 backdrop-blur-md rounded-3xl p-4 sm:p-5 border border-slate-800 space-y-2.5 sm:space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-lg sm:text-xl flex-shrink-0">🤖</span>
                  <span className="text-xs font-bold text-cyan-300 truncate">Agente de IA Activo</span>
                </div>
                <span className="text-[9px] sm:text-[10px] text-emerald-400 font-mono bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800 flex-shrink-0">
                  Offline-First Ready
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-300 italic bg-slate-950/80 p-2.5 sm:p-3 rounded-xl border border-slate-800 leading-relaxed">
                "Sugerencia predictiva: La tasa de rotación en paquetes mayoreo aumentó un 24%. Se recomienda lanzar campaña por WhatsApp."
              </p>
            </div>

          </div>

        </div>
      </header>

      {/* ========================================================================= */}
      {/* SECCIÓN: ¿POR QUÉ NO MOSTRAMOS PRECIOS FIJOS? */}
      {/* ========================================================================= */}
      <section id="personalizado" className="py-20 bg-slate-950/70 border-b border-slate-800/80 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-16">
          
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold">
              <Sliders size={14} className="text-amber-400" />
              <span>Modelo de Arquitectura a la Medida</span>
            </div>
            
            <h2 className="text-3xl sm:text-4xl font-black text-white">
              ¿Por qué no mostramos planes de precios fijos?
            </h2>
            
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Ninguna tienda de ropa, boutique de mayoreo ni restaurante opera con moldes idénticos. En <strong>Reisbloc</strong> eliminamos las suscripciones infladas con módulos innecesarios. Pagas únicamente por la infraestructura que tu operación realmente necesita.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Pillar 1 */}
            <div className="bg-slate-900/60 p-8 rounded-3xl border border-slate-800 space-y-4 hover:border-teal-500/40 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400 font-bold">
                <Layers size={24} />
              </div>
              <h3 className="text-xl font-bold text-white">Módulos a tu Elección</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Activa únicamente los componentes indispensables: POS Multicaja, Control de Inventario y Código de Barras, Mayoreo por Paquete, Comandero de Cocina, Facturación CFDI 4.0 o Reportes Financieros.
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="bg-slate-900/60 p-8 rounded-3xl border border-slate-800 space-y-4 hover:border-amber-500/40 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold">
                <CreditCard size={24} />
              </div>
              <h3 className="text-xl font-bold text-white">Reglas Comerciales de Pago</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Configura comisiones transparentes por pago con tarjeta (ej. 3.5%), apartados de mercancía, abonos parciales, cortes ciegos y conexión directa con terminales bancarias Clip sin digitación.
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="bg-slate-900/60 p-8 rounded-3xl border border-slate-800 space-y-4 hover:border-emerald-500/40 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
                <Building size={24} />
              </div>
              <h3 className="text-xl font-bold text-white">Dominio & Marca Propia</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Despliegue exclusivo bajo tu propio subdominio (<code className="text-teal-300">tu-negocio.reisbloc.com</code> o tu dominio <code class="text-teal-300">tu-tienda.com</code>) con tus logotipos, tipografías y catálogo público.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECCIÓN: SOLUCIONES INTEGRADAS Y CAPACIDADES TÉCNICAS */}
      {/* ========================================================================= */}
      <section id="soluciones" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <h2 className="text-3xl sm:text-4xl font-black text-white">
            Capacidades de Alto Rendimiento
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">
            Arquitectura moderna pensada para negocios que no pueden detenerse ni un minuto.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Card 1 */}
          <div className="bg-slate-900/60 p-6 rounded-3xl border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center font-bold">
              <Zap size={22} />
            </div>
            <h4 className="font-extrabold text-white text-base">Modo Offline-First</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Sigue cobrando, imprimiendo tickets y guardando órdenes incluso si se corta internet. Se sincroniza con Supabase en cuanto vuelve la conexión.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-slate-900/60 p-6 rounded-3xl border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold">
              <Bot size={22} />
            </div>
            <h4 className="font-extrabold text-white text-base">Agentes IA de Ventas</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Copiloto inteligente que genera campañas de WhatsApp, predice agotamiento de stock y analiza márgenes de ganancia en tiempo real.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-slate-900/60 p-6 rounded-3xl border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
              <FileText size={22} />
            </div>
            <h4 className="font-extrabold text-white text-base">Facturación SAT CFDI 4.0</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Emisión de facturas electrónicas directamente desde la venta con Facturapi. Descarga inmediata de PDF y XML para clientes.
            </p>
          </div>

          {/* Card 4 */}
          <div className="bg-slate-900/60 p-6 rounded-3xl border border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
              <ShieldCheck size={22} />
            </div>
            <h4 className="font-extrabold text-white text-base">Seguridad Bancaria PCI-DSS</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Cumplimiento estricto PCI-DSS v4.0 SAQ A y OWASP ASVS Nivel 2. Datos protegidos con cifrado de grado bancario y Row Level Security.
            </p>
          </div>

        </div>

      </section>

      {/* ========================================================================= */}
      {/* SECCIÓN: CASO DE ÉXITO (MODA MIEL MX) */}
      {/* ========================================================================= */}
      <section id="custom-brands" className="py-16 bg-[#0B0F19] border-t border-slate-800/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="inline-block px-3 py-1 rounded-full bg-pink-500/10 text-pink-400 border border-pink-500/20 text-xs font-bold uppercase tracking-widest">
              Caso de Éxito en Producción
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Potenciando Marcas de Mayoreo & Retail
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm">
              Descubre cómo <strong>Moda Miel MX</strong> opera su e-commerce mayorista por paquete y sus ventas en mostrador físico con Reisbloc.
            </p>
          </div>

          <div className="bg-slate-900/80 backdrop-blur-md rounded-3xl p-5 sm:p-8 border border-pink-500/30 grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6 items-center min-w-0 overflow-hidden relative shadow-xl">
            <div className="md:col-span-8 space-y-3 min-w-0">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-3xl flex-shrink-0">🐞</span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg sm:text-xl font-bold text-white break-words">Moda Miel MX</h3>
                  <p className="text-[10px] sm:text-xs text-pink-400 font-bold uppercase tracking-wider leading-relaxed break-words">Tienda de Importación Mayorista · Pasillo 3 Local 230</p>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed break-words">
                Personalización completa con catálogo digital en tiempo real de lotes por paquete, canal directo de pedidos hacia WhatsApp, sincronización de stock multi-caja y conciliación de ventas con terminales automáticas.
              </p>
            </div>
            <div className="md:col-span-4 flex justify-center md:justify-end pt-2 md:pt-0">
              <Link
                to="/login?brand=modamiel"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#D4386C] hover:bg-[#B52656] text-white font-bold px-6 py-3 rounded-xl text-xs sm:text-sm transition-all shadow-lg hover:scale-105 active:scale-95 text-center"
              >
                <span>Ver Experiencia Moda Miel</span>
                <ArrowRight size={16} className="flex-shrink-0" />
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* CTA SECTION FINAL */}
      {/* ========================================================================= */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="rounded-3xl bg-gradient-to-r from-teal-950 via-slate-900 to-amber-950 p-8 sm:p-12 border border-teal-500/30 text-center space-y-6 shadow-2xl relative overflow-hidden">
          
          <h2 className="text-3xl sm:text-4xl font-black text-white">
            ¿Listo para equipar tu negocio con la mejor tecnología?
          </h2>
          
          <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto font-medium">
            Solicita una cotización personalizada sin compromiso. Analizamos tus necesidades operativas y te entregamos una propuesta exacta a la medida.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-3">
            <button
              onClick={() => {
                setContactSubmitted(false)
                setShowContactModal(true)
              }}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm shadow-xl flex items-center gap-2.5 transition-all hover:scale-105"
            >
              <MessageCircle size={18} />
              <span>Solicitar Cotización Personalizada</span>
            </button>

            <a
              href={waLink('Hola, quiero cotizar un sistema Reisbloc a la medida de mi negocio')}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/30 hover:scale-105"
            >
              <Send size={18} />
              <span>Chat en WhatsApp</span>
            </a>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* FOOTER */}
      {/* ========================================================================= */}
      <footer className="bg-slate-950 text-slate-400 py-10 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center gap-2">
            <span className="font-black text-base text-white">REISBLOC <span className="text-teal-400 font-light">SYSTEMS</span></span>
            <span className="text-[10px] text-amber-400 font-mono bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
              reisbloc.com &middot; store.reisbloc.com
            </span>
          </div>

          <p className="text-[11px] text-center text-slate-500">
            &copy; 2026 Reisbloc. Todos los derechos reservados. Certificado PCI-DSS v4.0 SAQ A & OWASP ASVS Nivel 2.
          </p>

          <div className="flex items-center gap-5 text-xs font-medium">
            <Link to="/login" className="text-teal-400 hover:underline">Acceso POS</Link>
            <Link to="/terms" className="hover:text-cyan-400 transition">Términos</Link>
            <Link to="/privacy" className="hover:text-cyan-400 transition">Privacidad</Link>
          </div>

        </div>
      </footer>

      {/* ========================================================================= */}
      {/* MODAL: COTIZACIÓN Y DISEÑO A LA MEDIDA */}
      {/* ========================================================================= */}
      {showContactModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl max-w-lg w-full p-5 sm:p-8 space-y-4 sm:space-y-5 shadow-2xl text-white relative max-h-[92vh] overflow-y-auto my-auto">
            <button
              onClick={() => setShowContactModal(false)}
              className="absolute top-4 right-4 sm:top-5 sm:right-5 text-slate-400 hover:text-white text-xl"
            >
              <X size={20} />
            </button>

            {!contactSubmitted ? (
              <div>
                <div className="space-y-1">
                  <h3 className="text-xl sm:text-2xl font-black text-white">Diseñar Mi Solución a la Medida</h3>
                  <p className="text-xs text-slate-400">Cuéntanos sobre tu negocio para generar una propuesta personalizada sin costo.</p>
                </div>

                <form onSubmit={handleContactSubmit} className="space-y-3.5 sm:space-y-4 pt-2 sm:pt-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Nombre de tu Negocio *</label>
                    <input
                      required
                      type="text"
                      placeholder="Ej: Boutique Central o Restaurante El Farol"
                      value={formData.businessName}
                      onChange={e => setFormData({ ...formData, businessName: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-sm text-white focus:border-teal-400 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Tu Nombre *</label>
                      <input
                        required
                        type="text"
                        placeholder="Tu nombre"
                        value={formData.contactName}
                        onChange={e => setFormData({ ...formData, contactName: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-sm text-white focus:border-teal-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">WhatsApp / Teléfono *</label>
                      <input
                        required
                        type="tel"
                        placeholder="10 dígitos"
                        value={formData.phone}
                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-sm text-white focus:border-teal-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Giro / Necesidad Principal</label>
                    <select
                      value={formData.needs}
                      onChange={e => setFormData({ ...formData, needs: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-teal-400 focus:outline-none"
                    >
                      <option value="Retail Boutique + Terminal Clip">Tienda Retail / Boutique + Terminal Clip</option>
                      <option value="Mayoreo por Paquete + E-commerce WhatsApp">Venta por Paquete / Mayoreo + E-commerce</option>
                      <option value="Restaurante / Bar / Dark Kitchen">Restaurante / Bar / Comandero Cocina</option>
                      <option value="POS Multi-Sucursal + Facturacion CFDI 4.0">Multi-sucursal + Facturación Electrónica SAT</option>
                      <option value="Desarrollo 100% Personalizado">Desarrollo Especial a la Medida</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Detalles Adicionales (Opcional)</label>
                    <textarea
                      rows={2}
                      placeholder="Número de cajas, sucursales o funciones especiales..."
                      value={formData.notes}
                      onChange={e => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-teal-400 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-black text-sm shadow-xl flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                  >
                    <span>Enviar Solicitud por WhatsApp</span>
                    <ArrowRight size={18} />
                  </button>
                </form>
              </div>
            ) : (
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto text-3xl">
                  <Check size={32} />
                </div>
                <h4 className="text-2xl font-black text-white">¡Solicitud Lista!</h4>
                <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
                  Abriendo canal directo de WhatsApp para atender tu propuesta a la medida de inmediato.
                </p>
                <button
                  onClick={() => setShowContactModal(false)}
                  className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold"
                >
                  Cerrar
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: VIDEO DEMOSTRACIÓN */}
      {/* ========================================================================= */}
      {showVideoModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-4 sm:p-6 shadow-2xl text-white relative">
            <button
              onClick={() => setShowVideoModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-2xl z-10"
            >
              <X size={24} />
            </button>
            
            <div className="mb-4">
              <h4 className="text-lg font-black text-white flex items-center gap-2">
                <span className="text-amber-400">▶</span> Demostración en Vivo: Reisbloc POS & Clip Total 3
              </h4>
              <p className="text-xs text-slate-400">Mira cómo fluye una venta real sin digitación manual.</p>
            </div>

            <div className="relative rounded-2xl overflow-hidden bg-black aspect-video border border-slate-800 flex items-center justify-center">
              <video controls autoPlay className="w-full h-full object-cover">
                <source src="/demo_video.mp4" type="video/mp4" />
                Tu navegador no soporta reproducción de video HTML5.
              </video>
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
              <span>¿Te interesa implementarlo en tu negocio?</span>
              <button
                onClick={() => {
                  setShowVideoModal(false)
                  setContactSubmitted(false)
                  setShowContactModal(true)
                }}
                className="text-teal-400 font-bold hover:underline flex items-center gap-1"
              >
                <span>Solicitar Cotización</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
