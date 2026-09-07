import { useEffect } from 'react'
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
  Database
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { BRANDING } from '@/config/branding'

export default function LandingPage() {
  const navigate = useNavigate()
  const { currentUser } = useAppStore()

  useEffect(() => {
    if (currentUser) {
      navigate('/admin')
    }
  }, [currentUser, navigate])

  const waLink = (text: string) =>
    `https://wa.me/5215665848231?text=${encodeURIComponent(text)}`

  return (
    <div className="min-h-screen bg-[#0F172A] text-[#F8FAFC] font-['Outfit',sans-serif] selection:bg-cyan-500 selection:text-black">
      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 bg-[#0F172A]/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center p-1.5 shadow-md group-hover:scale-105 transition-transform">
              <img
                src={BRANDING.logoUrl || '/icon.svg'}
                alt={BRANDING.whiteLabelName}
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <span className="font-extrabold text-lg sm:text-xl tracking-tight text-white">
                Reisbloc <span className="font-light text-cyan-400">Retail</span>
              </span>
              <span className="hidden sm:block text-[9px] text-emerald-400 font-bold uppercase tracking-widest">
                VIP & Enterprise Edition
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-300">
            <a href="#features" className="hover:text-cyan-400 transition">Capacidades</a>
            <a href="#security" className="hover:text-cyan-400 transition flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Seguridad & PCI
            </a>
            <a href="#custom-brands" className="hover:text-cyan-400 transition">Casos de Éxito</a>
            <a href="#vip" className="text-amber-400 hover:text-amber-300 transition flex items-center gap-1">
              ✨ Edición VIP
            </a>
          </div>

          {/* CTAs */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/login"
              className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-2 rounded-lg transition"
            >
              Iniciar Sesión
            </Link>
            <a
              href={waLink('Hola, quiero cotizar la versión VIP / Enterprise de Reisbloc Retail')}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold px-4 py-2 sm:px-5 sm:py-2.5 rounded-full flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all hover:scale-105"
            >
              <MessageCircle size={15} />
              <span className="hidden sm:inline">Cotizar por WhatsApp</span>
              <span className="sm:hidden">WhatsApp</span>
            </a>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <header className="relative overflow-hidden py-16 md:py-24 border-b border-slate-800 bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.12)_0%,rgba(0,245,255,0.04)_40%,transparent_70%)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-12 gap-10 items-center">
          
          {/* Text Content */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            {/* Trust Tag */}
            <a
              href="#security"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 text-xs font-semibold text-cyan-300 hover:border-cyan-400/50 transition backdrop-blur-md"
            >
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
              <span>PCI-DSS v4.0 SAQ A & OWASP ASVS LEVEL 2 CERTIFIED</span>
              <span className="text-slate-400">→</span>
            </a>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight tracking-tight">
              El POS Inteligente para<br/>
              <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
                Retail de Alto Rendimiento
              </span>
            </h1>

            <p className="text-sm sm:text-base text-slate-300 max-w-xl font-normal leading-relaxed mx-auto lg:mx-0">
              Optimiza tus ventas en mostrador y en línea con Agentes de IA, control de inventario multi-sucursal, facturación CFDI 4.0 y cobros seguros sin comisiones ocultas.
            </p>

            {/* Bullet Highlights */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1 text-left text-xs font-medium text-slate-300 max-w-lg mx-auto lg:mx-0">
              <div className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span> Modo Offline-First
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span> Agentes IA de Ventas
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span> Facturación CFDI 4.0
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span> Aislamiento Multitenant
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span> Cobros MercadoPago/Conekta
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span> Soporte VIP Dedicado
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-3">
              <a
                href={waLink('Hola, deseo agendar una Demostración VIP Personalizada de Reisbloc Retail')}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-sm px-7 py-3.5 rounded-full flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-500/20 transition-all hover:scale-105"
              >
                <MessageCircle size={18} />
                <span>Agendar Demo en WhatsApp</span>
              </a>

              <Link
                to="/register"
                className="w-full sm:w-auto bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 hover:text-white font-semibold text-xs px-6 py-3.5 rounded-full flex items-center justify-center gap-2 transition backdrop-blur-md"
              >
                <span>Probar Gratis</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          {/* Hero Visual Station Mockup */}
          <div className="lg:col-span-5">
            <div className="bg-slate-800/60 backdrop-blur-xl rounded-2xl p-6 border border-slate-700 shadow-2xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                </div>
                <span className="text-[11px] font-mono text-cyan-400">REISBLOC-STATION-ONLINE</span>
              </div>

              {/* Mock Dashboard Analytics */}
              <div className="space-y-3">
                <div className="bg-slate-900/90 rounded-xl p-3.5 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Ventas del día</span>
                    <div className="text-xl font-black text-white">
                      $48,920.00 <span className="text-xs text-emerald-400 font-normal">+18%</span>
                    </div>
                  </div>
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <TrendingUp size={20} />
                  </div>
                </div>

                <div className="bg-slate-900/90 rounded-xl p-3.5 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Estado de Red & Sync</span>
                    <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      Offline-First Activo (Local)
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700">Synced</span>
                </div>

                {/* AI Insight Widget */}
                <div className="bg-slate-900/90 border border-cyan-500/20 rounded-xl p-3.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-cyan-300 mb-1">
                    <Bot size={16} />
                    <span>Agente IA Reisbloc:</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-normal">
                    "Pico de ventas detectado en categoría Blusas. Sugerencia: Notificar reposición inmediata a sucursal matriz."
                  </p>
                </div>
              </div>

              {/* Security Footer inside card */}
              <div className="pt-2 border-t border-slate-700 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Lock size={12} className="text-cyan-400" />
                  TLS 1.3 / HSTS
                </span>
                <span className="text-cyan-400 font-bold">PCI-DSS SAQ A Certified</span>
              </div>
            </div>
          </div>

        </div>
      </header>

      {/* 💡 FEATURES CAPABILITIES SECTION */}
      <section id="features" className="py-20 bg-slate-900/80 border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold uppercase tracking-widest">
              Capacidades de la Plataforma
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
              Todo lo que tu Comercio Necesita para Vender Más
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <a
              href={waLink('Hola, quiero más información sobre el Punto de Venta POS')}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/60 hover:border-cyan-400/40 rounded-2xl p-6 space-y-3 block transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
                <Zap size={22} />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 transition">
                Punto de Venta POS Rápido
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Cobro rápido en mostrador con soporte para lectores de código de barras, impresoras térmicas Bluetooth/USB y cálculo automático.
              </p>
              <span className="text-xs font-bold text-cyan-400 block pt-1">
                Consultar detalles por WhatsApp →
              </span>
            </a>

            {/* Feature 2 */}
            <a
              href={waLink('Hola, quiero más información sobre los Agentes de IA')}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/60 hover:border-purple-400/40 rounded-2xl p-6 space-y-3 block transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center">
                <Bot size={22} />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-purple-300 transition">
                Agentes IA de Ventas
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Asistentes virtuales Gemini integrados que analizan tu negocio, generan sugerencias de marketing y atienden prospectos por WhatsApp.
              </p>
              <span className="text-xs font-bold text-purple-400 block pt-1">
                Probar Inteligencia Artificial →
              </span>
            </a>

            {/* Feature 3 */}
            <a
              href={waLink('Hola, quiero más información sobre Facturación CFDI 4.0')}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/60 hover:border-emerald-400/40 rounded-2xl p-6 space-y-3 block transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                <FileText size={22} />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-emerald-300 transition">
                Facturación CFDI 4.0 SAT
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Emisión instantánea de facturas electrónicas timbradas ante el SAT. Descarga directa de archivos PDF y XML para clientes.
              </p>
              <span className="text-xs font-bold text-emerald-400 block pt-1">
                Ver Módulo de Facturación →
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* 🛡️ SECURITY & COMPLIANCE SECTION */}
      <section id="security" className="py-20 bg-[#0F172A] border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-12">
          
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="inline-block px-3.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold uppercase tracking-widest">
              Infraestructura & Certificaciones
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
              Seguridad de Grado Bancario
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm">
              Tus datos, tus ventas y las transacciones de tus clientes respaldados por los estándares internacionales más rigurosos.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1: PCI-DSS */}
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-6 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
                <ShieldCheck size={26} />
              </div>
              <h3 className="text-lg font-bold text-white">PCI-DSS v4.0 SAQ A</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Arquitectura de tokenización fuera de alcance. Cobros seguros mediante MercadoPago y Conekta sin almacenamiento de tarjetas (PAN/CVV).
              </p>
              <div className="pt-2 text-xs font-bold text-cyan-400 flex items-center gap-1">
                <span>Protección Cero Fugas</span>
              </div>
            </div>

            {/* Card 2: OWASP ASVS */}
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-6 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center">
                <Shield size={26} />
              </div>
              <h3 className="text-lg font-bold text-white">OWASP ASVS Level 2</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Verificación continua de código fuente contra los 14 estándares de OWASP. Sanitización con DOMPurify y CI/CD defensivo.
              </p>
              <div className="pt-2 text-xs font-bold text-blue-400 flex items-center gap-1">
                <span>Auditado y Sanitizado</span>
              </div>
            </div>

            {/* Card 3: Multitenant RLS */}
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-6 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                <Database size={26} />
              </div>
              <h3 className="text-lg font-bold text-white">Aislamiento Multitenant RLS</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Segregación estricta de base de datos a nivel PostgreSQL. Row Level Security impone que ningún comercio pueda acceder a información ajena.
              </p>
              <div className="pt-2 text-xs font-bold text-emerald-400 flex items-center gap-1">
                <span>100% Criptográficamente Seguro</span>
              </div>
            </div>

            {/* Card 4: Data Privacy */}
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-6 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
                <Lock size={26} />
              </div>
              <h3 className="text-lg font-bold text-white">Privacidad LFPDPPP / GDPR</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Minimización de datos. CERO venta de información de clientes y protección rigurosa de datos personales conforme a la ley mexicana.
              </p>
              <Link to="/privacy" className="pt-2 text-xs font-bold text-indigo-400 flex items-center gap-1 hover:underline">
                <span>Aviso de Privacidad →</span>
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* 🌟 VIP & ENTERPRISE SUITE SECTION */}
      <section id="vip" className="py-20 bg-slate-900/90 relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl rounded-3xl p-8 sm:p-12 border border-amber-500/30 shadow-2xl">
            <div className="grid lg:grid-cols-12 gap-8 items-center">
              
              <div className="lg:col-span-7 space-y-5">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-bold uppercase tracking-widest">
                  <Sparkles size={14} />
                  <span>EDICIÓN VIP & ENTERPRISE DEDICADA</span>
                </div>

                <h2 className="text-2xl sm:text-4xl font-extrabold text-white leading-tight">
                  Atención Consultiva Personalizada y Soluciones a la Medida
                </h2>

                <p className="text-slate-300 text-xs sm:text-sm font-normal leading-relaxed">
                  No ofrecemos paquetes genéricos con tarjeta. En Reisbloc Retail trabajamos de la mano con dueños de negocios, boutiques y franquicias para ofrecer despliegues VIP personalizados.
                </p>

                <ul className="space-y-3 text-xs sm:text-sm text-slate-200">
                  <li className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 flex items-center justify-center text-[10px] font-bold">✓</span>
                    <span>Configuración de Marca y Dominio Personalizado (White Label Ready)</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 flex items-center justify-center text-[10px] font-bold">✓</span>
                    <span>Tokens ilimitados de Agentes de Inteligencia Artificial Gemini</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 flex items-center justify-center text-[10px] font-bold">✓</span>
                    <span>Integración de Facturación Fiscal CFDI 4.0 Ilimitada</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 flex items-center justify-center text-[10px] font-bold">✓</span>
                    <span>Soporte Técnico y Asesoría 24/7 por Canal Dedicado de WhatsApp</span>
                  </li>
                </ul>
              </div>

              {/* VIP Direct Card */}
              <div className="lg:col-span-5 bg-[#0F172A] rounded-2xl p-6 sm:p-8 border border-amber-500/30 space-y-5 text-center shadow-xl">
                <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto text-2xl font-bold">
                  💎
                </div>

                <div>
                  <h3 className="text-xl font-bold text-white">¿Listo para escalar tu tienda?</h3>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                    Habla directamente con nuestro equipo fundador a través de WhatsApp para recibir una propuesta VIP adaptada al tamaño de tu negocio.
                  </p>
                </div>

                <a
                  href={waLink('Hola, quiero cotizar la versión VIP / Enterprise de Reisbloc Retail')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 transition-all hover:scale-105"
                >
                  <MessageCircle size={18} />
                  <span>Solicitar Cotización VIP</span>
                </a>

                <p className="text-[11px] text-slate-500">
                  Respuesta promedio en menos de 15 minutos en horario comercial.
                </p>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* 🐞 SUCCESS STORY: MODA MIEL MX */}
      <section id="custom-brands" className="py-16 bg-[#0F172A] border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="px-3 py-1 rounded-full bg-pink-500/10 text-pink-400 border border-pink-500/20 text-xs font-bold uppercase tracking-widest">
              Caso de Éxito & Personalización de Marca
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Potenciando Marcas de Moda & Retail
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm">
              Conoce cómo marcas como <strong>Moda Miel MX</strong> operan su canal e-commerce de mayoreo por paquete y su venta en punto de venta con Reisbloc.
            </p>
          </div>

          <div className="bg-slate-800/40 border border-pink-500/30 rounded-2xl p-6 sm:p-8 grid md:grid-cols-12 gap-6 items-center">
            <div className="md:col-span-8 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-xl">
                  🐝
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Moda Miel MX</h3>
                  <p className="text-[10px] text-pink-400 font-bold uppercase tracking-wider">Tienda de Ropa · Mayoreo & Menudeo</p>
                </div>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Personalización completa con catálogo e-commerce en tiempo real de lotes por paquete, canal directo de pedidos hacia WhatsApp e integración total con la caja registradora POS de su local físico.
              </p>
            </div>
            <div className="md:col-span-4 text-center md:text-right">
              <a
                href="https://modamielmx.reisbloc.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#E62E6B] hover:bg-pink-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-all shadow-md hover:scale-105"
              >
                <span>Ver Experiencia Moda Miel</span>
                <ExternalLink size={14} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-950 text-slate-400 py-10 border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-base text-white">
              Reisbloc <span className="font-light text-cyan-400">Retail</span>
            </span>
          </div>

          <p className="text-[11px] text-center text-slate-500">
            © 2026 Reisbloc Store. Todos los derechos reservados. Infraestructura Segura PCI-DSS v4.0 SAQ A & OWASP ASVS L2.
          </p>

          <div className="flex items-center gap-5 text-xs font-medium">
            <Link to="/terms" className="hover:text-cyan-400 transition">Términos</Link>
            <Link to="/privacy" className="hover:text-cyan-400 transition">Privacidad</Link>
            <a href="https://wa.me/5215665848231" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">
              Contacto WhatsApp
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}

