import { useNavigate, Link } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import {
  Check,
  Star,
  Building,
  ShieldCheck,
  MessageCircle,
  Smartphone,
  ArrowRight,
  ArrowLeft,
  Zap,
  Printer,
  CreditCard,
  Sparkles
} from 'lucide-react'

export default function Pricing() {
  const navigate = useNavigate()
  const { currentUser } = useAppStore()

  const waLink = 'https://wa.me/5215665848231?text=' + encodeURIComponent(
    'Hola equipo Reisbloc 👋 Me interesa cotizar una solución personalizada para mi negocio.'
  )

  return (
    <div className="min-h-screen bg-[#0B0F19] text-[#F8FAFC] font-['Outfit',sans-serif]">
      {/* Navigation */}
      <nav className="border-b border-slate-800/80 bg-[#0B0F19]/90 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white shadow-lg shadow-teal-900/40 p-2">
              <img src="/icon.svg" alt="Reisbloc" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="font-black text-xl tracking-tight text-white block leading-none">
                REISBLOC <span className="text-teal-400 font-light">STORE</span>
              </span>
              <span className="text-[10px] font-extrabold tracking-widest text-amber-400 uppercase block mt-0.5">
                Planes & Soluciones
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            {currentUser ? (
              <button
                onClick={() => navigate('/admin')}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center gap-2"
              >
                <ArrowLeft size={14} />
                Volver al Panel
              </button>
            ) : (
              <Link
                to="/login"
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all"
              >
                Iniciar Sesión
              </Link>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-teal-500/10 border border-teal-500/30 rounded-full text-teal-400 text-xs font-bold uppercase tracking-wider mb-4">
            <Sparkles size={14} />
            Modelo Flexible y Transparente
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-4">
            Comienza gratis. Crece a tu medida.
          </h1>
          <p className="text-slate-400 text-lg sm:text-xl leading-relaxed">
            Una prueba individual gratuita para que valides el sistema hoy mismo, y soluciones de software + hardware personalizadas cuando tu operación lo requiera.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto mb-20">
          
          {/* Tier 1: Free Individual Trial */}
          <div className="bg-slate-900/90 rounded-3xl border border-slate-800 p-8 sm:p-10 flex flex-col justify-between relative shadow-xl hover:border-slate-700 transition-all">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center">
                  <Star size={28} className="text-teal-400" />
                </div>
                <span className="text-xs font-extrabold uppercase px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  Para 1 Persona
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">
                Prueba Gratuita
              </h2>
              <p className="text-slate-400 text-sm mb-6">
                Ideal para emprendedores y dueños de negocio que desean conocer la agilidad de nuestro punto de venta sin ningún compromiso.
              </p>

              <div className="flex items-baseline gap-2 mb-8">
                <span className="text-5xl font-black text-white">$0</span>
                <span className="text-slate-400 text-sm font-medium">MXN / Siempre gratis para probar</span>
              </div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3 text-sm text-slate-300">
                  <Check size={18} className="text-teal-400 mt-0.5 shrink-0" />
                  <span><strong>1 usuario</strong> y <strong>1 caja</strong> de cobro</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-slate-300">
                  <Check size={18} className="text-teal-400 mt-0.5 shrink-0" />
                  <span>Punto de Venta veloz (PC, tablet o smartphone)</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-slate-300">
                  <Check size={18} className="text-teal-400 mt-0.5 shrink-0" />
                  <span>Catálogo de productos y control de stock básico</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-slate-300">
                  <Check size={18} className="text-teal-400 mt-0.5 shrink-0" />
                  <span>Registro de clientes y folios de venta digitales</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-slate-300">
                  <Check size={18} className="text-teal-400 mt-0.5 shrink-0" />
                  <span>Sin necesidad de tarjeta de crédito</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => navigate('/register')}
              className="w-full py-4 px-6 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-all flex items-center justify-center gap-2 group border border-slate-700 hover:border-slate-600"
            >
              <span>Comenzar Prueba Gratis</span>
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Tier 2: Custom Enterprise Solution */}
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 rounded-3xl border-2 border-teal-500/50 p-8 sm:p-10 flex flex-col justify-between relative shadow-2xl shadow-teal-950/40">
            <div className="absolute -top-3.5 right-8 px-4 py-1 rounded-full bg-gradient-to-r from-teal-400 to-emerald-400 text-slate-950 text-xs font-black uppercase tracking-wider shadow-md">
              Recomendado para Tiendas & Cadenas
            </div>

            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 rounded-2xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center">
                  <Building size={28} className="text-teal-300" />
                </div>
                <span className="text-xs font-extrabold uppercase px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  A la Medida
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">
                Solución Personalizada
              </h2>
              <p className="text-slate-400 text-sm mb-6">
                Para boutiques, comercios mayoristas y cadenas con múltiples empleados, pasillos o requerimientos de hardware físico.
              </p>

              <div className="flex items-baseline gap-2 mb-8">
                <span className="text-3xl sm:text-4xl font-black text-white">Cotización Directa</span>
                <span className="text-teal-400 text-xs font-bold uppercase tracking-wider">Adaptado a tu operación</span>
              </div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3 text-sm text-slate-200">
                  <Check size={18} className="text-emerald-400 mt-0.5 shrink-0" />
                  <span><strong>Usuarios y cajeros ilimitados</strong> con roles y auditoría</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-slate-200">
                  <Check size={18} className="text-emerald-400 mt-0.5 shrink-0" />
                  <span><strong>Integración Clip Total 3:</strong> sincronización automática con terminales</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-slate-200">
                  <Check size={18} className="text-emerald-400 mt-0.5 shrink-0" />
                  <span><strong>Tickets térmicos de 80mm / 58mm</strong> y lector de código de barras</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-slate-200">
                  <Check size={18} className="text-emerald-400 mt-0.5 shrink-0" />
                  <span><strong>White Label Completo:</strong> tu propio logo, colores de marca y subdominio</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-slate-200">
                  <Check size={18} className="text-emerald-400 mt-0.5 shrink-0" />
                  <span><strong>Venta por menudeo y paquetes</strong> con inventario mayorista</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-slate-200">
                  <Check size={18} className="text-emerald-400 mt-0.5 shrink-0" />
                  <span><strong>Acompañamiento VIP:</strong> alta de catálogo, capacitación presencial/remota y SLA</span>
                </li>
              </ul>
            </div>

            <a
              href={waLink}
              target="_blank"
              rel="noreferrer"
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-black transition-all flex items-center justify-center gap-2 group shadow-lg shadow-teal-900/30"
            >
              <MessageCircle size={20} className="fill-current" />
              <span>Cotizar Solución por WhatsApp</span>
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </a>
          </div>

        </div>

        {/* Feature Highlights Grid */}
        <div className="border-t border-slate-800/80 pt-16">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h3 className="text-2xl sm:text-3xl font-black text-white mb-3">
              ¿Por qué vendemos de forma personalizada?
            </h3>
            <p className="text-slate-400 text-sm sm:text-base">
              Cada negocio físico tiene dinámicas únicas. En lugar de ofrecer paquetes rígidos que no se ajustan a tu día a día, configuramos exactamente lo que tu comercio necesita.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800/80">
              <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center mb-4 text-teal-400">
                <Smartphone size={24} />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Hardware Conectado</h4>
              <p className="text-slate-400 text-sm leading-relaxed">
                Conectamos terminales bancarias Clip, lectores de código de barras y cajones de dinero para que no tengas descuadres al cobrar.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800/80">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-4 text-amber-400">
                <Printer size={24} />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Tickets Profesionales</h4>
              <p className="text-slate-400 text-sm leading-relaxed">
                Tickets térmicos de 80mm con tu logotipo, política de cambios, dirección y códigos de barras listos para entregarse al cliente.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800/80">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-4 text-emerald-400">
                <ShieldCheck size={24} />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Aislamiento Total</h4>
              <p className="text-slate-400 text-sm leading-relaxed">
                Base de datos privada, roles restringidos para colaboradores y seguridad de nivel bancario respaldada por Supabase en la nube.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom CTA Banner */}
        <div className="mt-16 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 p-8 sm:p-12 text-center max-w-4xl mx-auto">
          <h3 className="text-2xl sm:text-3xl font-black text-white mb-3">
            ¿Listo para llevar el control de tu tienda al siguiente nivel?
          </h3>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto mb-8">
            Ponte en contacto directo con nuestro equipo fundador para agendar una demostración en vivo o resolver cualquier duda.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href={waLink}
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-all flex items-center justify-center gap-2"
            >
              <MessageCircle size={20} className="fill-current" />
              <span>Chatear por WhatsApp (+52 56 6584 8231)</span>
            </a>
            <button
              onClick={() => navigate('/register')}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-all border border-slate-700"
            >
              Probar 1 Persona Gratis
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
