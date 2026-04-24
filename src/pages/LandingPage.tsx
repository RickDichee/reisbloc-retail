import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Zap, Check, Bot, Users, Package, BarChart3, ArrowRight } from 'lucide-react';
import { useAppStore } from '@/store/appStore';

const LandingPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAppStore();

  useEffect(() => {
    if (currentUser) {
      navigate('/admin');
    }
  }, [currentUser, navigate]);

  const plans = [
    {
      name: 'Libre',
      price: '$0',
      priceNote: 'para siempre',
      features: [
        '1 usuario',
        '25 productos',
        'Punto de Venta',
        '10 consultas AI/día',
        'Inventario básico',
        'Reportes básicos'
      ],
      buttonText: 'Empezar Gratis',
      planKey: 'free',
      highlight: false,
      link: 'https://wa.me/5215665848231?text=Hola%2C%20quiero%20empezar%20con%20el%20plan%20Libre%20de%20Reisbloc%20Store'
    },
    {
      name: 'Negocio',
      price: '$299',
      priceNote: 'al mes',
      features: [
        '3 usuarios',
        '100 productos',
        'E-commerce básico',
        'Multi-sucursal',
        '100 consultas AI/día',
        'Tokens de IA incluidos',
        'Reportes avanzados',
        'Soporte por WhatsApp'
      ],
      buttonText: 'Elegir Negocio',
      planKey: 'starter',
      highlight: true,
      link: 'https://wa.me/5215665848231?text=Hola%2C%20quiero%20el%20plan%20Negocio%20de%20Reisbloc%20Store'
    },
    {
      name: 'Empresarial',
      price: '$799',
      priceNote: 'al mes',
      features: [
        'Usuarios ilimitados',
        'Productos ilimitados',
        'E-commerce completo',
        'Facturación CFDI 4.0',
        'Tokens de IA ilimitados',
        'API Access',
        'Multi-sucursal',
        'Soporte dedicado'
      ],
      buttonText: 'Elegir Empresarial',
      planKey: 'growth',
      highlight: false,
      link: 'https://wa.me/5215665848231?text=Hola%2C%20quiero%20el%20plan%20Empresarial%20de%20Reisbloc%20Store'
    }
  ];

  const featureCards = [
    {
      title: 'Punto de Venta',
      description: 'Venta rápida por pieza o por kilo. Interfaz optimizada para cualquier tipo de negocio retail o mayoreo.',
      icon: <Zap className="text-blue-500" size={28} />,
      items: ['Funciona sin internet', 'Sincroniza automáticamente', 'Múltiples formas de pago']
    },
    {
      title: 'Inventario en Tiempo Real',
      description: 'Control de productos, variantes y stock. Alertas de stock mínimo y reportes por categoría.',
      icon: <Package className="text-blue-500" size={28} />,
      items: ['Control de producto', 'Alertas de stock', 'Reportes de venta']
    },
    {
      title: 'Multi-Sucursal',
      description: 'Controla todas tus tiendas desde un solo panel. Empleados, horarios y reportes centralizados.',
      icon: <Users className="text-blue-500" size={28} />,
      items: ['Dashboard centralizado', 'Empleados y horarios', 'Reportes por sucursal']
    },
    {
      title: 'Agenda de Clientes',
      description: 'Registra clientes frecuentes y sus condiciones de crédito. Historial de compras y límites.',
      icon: <Shield className="text-blue-500" size={28} />,
      items: ['Base de clientes', 'Crédito disponible', 'Historial de compras']
    },
    {
      title: 'Agente IA de Ventas',
      description: 'Tu agente de ventas por WhatsApp que responde cotizaciones, hace seguimiento y cierra ventas 24/7.',
      icon: <Bot className="text-purple-500" size={28} />,
      items: ['WhatsApp Business', 'Cotizaciones auto', 'Seguimiento a clientes'],
      highlight: true
    },
    {
      title: 'Reportes y Análisis',
      description: 'Dashboard con ventas, productos más vendidos, margen de ganancia y tendencias.',
      icon: <BarChart3 className="text-blue-500" size={28} />,
      items: ['Ventas por día', 'Productos populares', 'Márgenes de ganancia']
    }
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1F2937] font-['Outfit',sans-serif]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
        body { font-family: 'Outfit', sans-serif; }
        .hero-gradient { background: linear-gradient(135deg, #1F293B 0%, #2d3f55 50%, #1F293B 100%); }
        .card-hover { transition: transform 0.25s ease, box-shadow 0.25s ease; }
        .card-hover:hover { transform: translateY(-4px); box-shadow: 0 20px 40px rgba(31,41,59,0.12); }
        .btn-wa { background: linear-gradient(135deg, #25D366, #128C7E); transition: filter 0.2s ease, transform 0.2s ease; }
        .btn-wa:hover { filter: brightness(1.1); transform: scale(1.03); }
        .btn-dark { background: #1F293B; transition: background 0.2s ease, transform 0.2s ease; }
        .btn-dark:hover { background: #2d3f55; transform: scale(1.03); }
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
        .float { animation: float 4s ease-in-out infinite; }
        .price-popular { background: linear-gradient(135deg, #1F293B, #2d3f55); }
      `}</style>

      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg width="36" height="36" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="512" height="512" rx="100" fill="#1F2937"/>
              <path d="M256 80L428.66 176V336L256 432L83.3397 336V176L256 80Z" fill="#1F2937"/>
              <path d="M256 110L400.66 190V322L256 402L111.34 322V190L256 110Z" stroke="#00F5FF" strokeWidth="12" strokeLinejoin="round"/>
              <path d="M256 110V402" stroke="#00F5FF" strokeWidth="6" strokeDasharray="8 8"/>
              <circle cx="256" cy="256" r="20" fill="#00F5FF" opacity="0.15"/>
            </svg>
            <span className="font-bold text-xl tracking-tight text-[#1F2937]">Reisbloc <span className="font-light text-[#64748B]">Store</span></span>
          </div>
          <div className="flex items-center gap-3">
            <a href="#features" className="text-sm font-medium text-[#64748B] hover:text-[#1F293B] transition">Características</a>
            <a href="#pricing" className="text-sm font-medium text-[#64748B] hover:text-[#1F293B] transition">Precios</a>
            <a
              href="/register"
              className="text-sm font-medium text-[#64748B] hover:text-[#1F293B] transition"
            >
              Ingresar
            </a>
            <a
              href="https://wa.me/5215665848231?text=Hola%2C%20quiero%20una%20demo%20de%20Reisbloc%20Store"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-wa text-white text-sm font-semibold px-5 py-2.5 rounded-full flex items-center gap-2"
            >
              Solicitar Demo
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="hero-gradient text-white overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 py-24 md:py-32 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-block mb-4 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold uppercase tracking-widest">
              Sistema de Punto de Venta con IA
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold leading-tight mb-6">
              Haz crecer tu negocio<br/>
              <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                con inteligencia artificial
              </span>
            </h1>
            <p className="text-lg text-slate-300 mb-10 max-w-md leading-relaxed">
              El POS que funciona sin internet, maneja tu inventario, cierra ventas 24/7 con IA y genera facturas CFDI 4.0.
            </p>
            <div className="flex flex-wrap gap-4">
              <a
                href="https://wa.me/5215665848231?text=Hola%2C%20quiero%20una%20demo%20de%20Reisbloc%20Store"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-wa text-white font-bold px-7 py-4 rounded-full shadow-lg flex items-center gap-2"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Demo por WhatsApp
              </a>
              <a href="#pricing" className="inline-flex items-center gap-2 border border-white/30 hover:bg-white/10 text-white font-semibold px-7 py-4 rounded-full transition">
                Ver precios
                <ArrowRight size={18} />
              </a>
            </div>
          </div>

          <div className="flex justify-center">
            <div className="float relative">
              <div className="w-72 h-72 rounded-3xl bg-white/10 border border-white/20 backdrop-blur flex flex-col items-center justify-center gap-4 shadow-2xl p-8">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
                </svg>
                <p className="text-center text-white/80 text-sm font-medium">POS con IA<br/><span className="text-blue-300 font-bold">Agente de Ventas 24/7</span></p>
                <div className="flex gap-2">
                  <span className="px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded-full">● Sin internet</span>
                  <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full">CFDI 4.0</span>
                </div>
              </div>
              <div className="absolute -top-4 -right-4 bg-white text-[#1F2937] text-xs font-bold px-3 py-2 rounded-xl shadow-lg">
                ⚡ Funciona offline
              </div>
              <div className="absolute -bottom-4 -left-4 bg-[#1F2937] text-white text-xs font-bold px-3 py-2 rounded-xl shadow-lg">
                📋 Fácil de usar
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Features Grid */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <div className="inline-block mb-3 px-3 py-1 rounded-full bg-[#1F2937]/8 text-[#1F2937] text-xs font-semibold uppercase tracking-widest">
            Características
          </div>
          <h2 className="text-4xl font-extrabold text-[#1F2937]">Lo que puedes hacer hoy</h2>
          <p className="mt-4 text-[#64748B] text-lg max-w-xl mx-auto">
            Todo lo que necesitas para hacer crecer tu negocio en un solo sistema.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {featureCards.map((feature) => (
            <div 
              key={feature.title} 
              className={`card-hover bg-white rounded-3xl p-8 border border-[#E2E8F0] shadow-sm flex flex-col ${
                feature.highlight ? 'relative' : ''
              }`}
            >
              {feature.highlight && (
                <div className="absolute top-0 right-0 px-3 py-1 bg-purple-500 text-white text-xs font-bold rounded-full m-4">
                  INCLUIDO
                </div>
              )}
              <div className="w-14 h-14 mb-6 rounded-2xl bg-blue-50 flex items-center justify-center">
                {feature.icon}
              </div>
              <h3 className="text-2xl font-bold mb-3 text-[#1F2937]">{feature.title}</h3>
              <p className="text-[#64748B] leading-relaxed flex-grow">{feature.description}</p>
              <ul className="mt-6 space-y-2 text-sm text-[#1F2937] font-medium">
                {feature.items.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <Check size={16} className="text-green-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="text-center mt-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
            <Check size={16} />
            Disponible: Facturación CFDI 4.0
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-[#F8FAFC] border-t border-[#E2E8F0]">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="text-center mb-16">
            <div className="inline-block mb-3 px-3 py-1 rounded-full bg-[#3B82F6]/10 text-[#3B82F6] text-xs font-semibold uppercase tracking-widest">
              Precios
            </div>
            <h2 className="text-4xl font-extrabold text-[#1F2937]">Planes para Cada Tipo de Negocio</h2>
            <p className="mt-4 text-[#64748B] text-lg max-w-xl mx-auto">
              Desde la tiendita hasta la empresa con varias sucursales. Todos incluyen soporte y actualizaciones.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <div 
                key={plan.name}
                className={`card-hover rounded-3xl p-8 border flex flex-col ${
                  plan.highlight 
                    ? 'price-popular text-white border-[#3B82F6] shadow-xl transform md:-translate-y-4' 
                    : 'bg-white border-[#E2E8F0] shadow-sm'
                }`}
              >
                {plan.highlight && (
                  <div className="mb-4 px-3 py-1 bg-[#3B82F6] text-white text-xs font-bold rounded-full w-fit">
                    MÁS POPULAR
                  </div>
                )}
                <h3 className={`text-xl font-bold mb-2 ${plan.highlight ? 'text-white' : 'text-[#1F2937]'}`}>{plan.name}</h3>
                <div className="mb-6">
                  <span className={`text-4xl font-extrabold ${plan.highlight ? 'text-white' : 'text-[#1F2937]'}`}>{plan.price}</span>
                  <span className={plan.highlight ? 'text-slate-300' : 'text-[#64748B]'}>/mes</span>
                </div>
                {plan.name === 'Libre' && <p className="text-[#64748B] text-sm -mt-4 mb-6">para siempre</p>}
                <ul className={`space-y-3 text-sm mb-8 flex-grow ${plan.highlight ? 'text-slate-200' : 'text-[#1F2937]'}`}>
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <Check size={16} className={plan.highlight ? 'text-blue-400' : 'text-green-500'} />
                      {feature}
                    </li>
                  ))}
                </ul>
                <a 
                  href={plan.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-full py-4 rounded-full font-bold text-center transition-all ${
                    plan.highlight 
                      ? 'btn-wa text-white' 
                      : 'btn-dark text-white'
                  }`}
                >
                  {plan.buttonText}
                </a>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <p className="text-[#64748B] text-sm">
              Todos los precios son en MXN. Pago mensual con tarjeta o transferencia.
            </p>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-sm">
            <div className="text-4xl font-extrabold text-[#1F2937]">99%</div>
            <div className="text-[#64748B] text-sm mt-1">Uptime garantizado</div>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-sm">
            <div className="text-4xl font-extrabold text-[#1F2937]">24/7</div>
            <div className="text-[#64748B] text-sm mt-1">Disponible siempre</div>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-sm">
            <div className="text-4xl font-extrabold text-[#1F2937]">&lt;2s</div>
            <div className="text-[#64748B] text-sm mt-1">Tiempo de respuesta</div>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-sm">
            <div className="text-4xl font-extrabold text-[#1F2937]">MX</div>
            <div className="text-[#64748B] text-sm mt-1">Hecho en México 🇲🇽</div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="hero-gradient text-white">
        <div className="max-w-3xl mx-auto px-6 py-24 text-center">
          <h2 className="text-4xl md:text-5xl font-extrabold mb-6 leading-tight">
            ¿Listo para digitalizar<br/>
            <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">tu negocio?</span>
          </h2>
          <p className="text-slate-300 text-lg mb-10 max-w-xl mx-auto">
            Agenda una demo personalizada para ver cómo Reisbloc Store puede ayudarte a vender más y mejor.
          </p>
          <a 
            href="https://wa.me/5215665848231?text=Hola%2C%20quiero%20una%20demo%20de%20Reisbloc%20Store"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-wa text-white font-bold px-10 py-5 rounded-full shadow-2xl text-xl inline-flex items-center gap-3 transition-all hover:scale-105"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Solicitar Demo por WhatsApp
          </a>
          <p className="mt-6 text-sm text-slate-400">
            También disponible en <a href="mailto:daniel@megamayoreo.mx" className="underline hover:text-white">daniel@megamayoreo.mx</a>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1F2937] text-slate-400 py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <svg width="28" height="28" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="512" height="512" rx="100" fill="#1F2937"/>
              <path d="M256 80L428.66 176V336L256 432L83.3397 336V176L256 80Z" fill="#1F2937"/>
              <path d="M256 110L400.66 190V322L256 402L111.34 322V190L256 110Z" stroke="#00F5FF" strokeWidth="12" strokeLinejoin="round"/>
              <path d="M256 110V402" stroke="#00F5FF" strokeWidth="6" strokeDasharray="8 8"/>
              <circle cx="256" cy="256" r="20" fill="#00F5FF" opacity="0.15"/>
            </svg>
          </div>
          <p className="text-xs text-center">© 2026 Reisbloc Store. Hecho con ❤️ en México 🇲🇽</p>
          <div className="flex gap-4 text-xs">
            <a href="#features" className="hover:text-white transition">Características</a>
            <a href="#pricing" className="hover:text-white transition">Precios</a>
            <a href="https://wa.me/5215665848231" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">Contacto</a>
            <a href="/privacy" className="hover:text-white transition">Privacidad</a>
            <a href="/terms" className="hover:text-white transition">Términos</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
