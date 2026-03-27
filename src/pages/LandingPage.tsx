import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Zap, Check, Users, Package, Smartphone, Bot, BarChart3, ArrowRight, Star } from 'lucide-react';
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
      name: 'Free',
      price: '$0',
      priceNote: 'para siempre',
      features: [
        '1 Dispositivo',
        '3 Empleados',
        '50 Productos',
        '20 Consultas AI/mes',
        'Inventario básico',
        'Punto de Venta'
      ],
      buttonText: 'Empezar Gratis',
      planKey: 'free',
      highlight: false,
      color: 'gray'
    },
    {
      name: 'Launch',
      price: '$149',
      priceNote: 'al mes',
      features: [
        '3 Dispositivos',
        '5 Empleados',
        '500 Productos',
        '100 Consultas AI/día',
        'Reportes avanzados',
        'Marketing AI',
        'Soporte email'
      ],
      buttonText: 'Elegir Launch',
      planKey: 'starter',
      highlight: true,
      color: 'indigo'
    },
    {
      name: 'Growth',
      price: '$399',
      priceNote: 'al mes',
      features: [
        '5 Dispositivos',
        '15 Empleados',
        '2,000 Productos',
        'AI Ilimitado',
        'Multi-sucursal',
        'API Access',
        'E-commerce'
      ],
      buttonText: 'Elegir Growth',
      planKey: 'growth',
      highlight: false,
      color: 'emerald'
    }
  ];

  const features = [
    {
      icon: Zap,
      title: 'Offline-First',
      description: 'Tu negocio no se detiene sin internet. Sincroniza automáticamente cuando vuelva.',
      color: 'yellow'
    },
    {
      icon: Shield,
      title: 'Seguro',
      description: 'Tus datos están protegidos con el más alto nivel de seguridad. Aislamiento total.',
      color: 'green'
    },
    {
      icon: Bot,
      title: 'IA Integrada',
      description: 'Asistente virtual que te ayuda a tomar mejores decisiones para tu negocio.',
      color: 'purple'
    },
    {
      icon: BarChart3,
      title: 'Reportes',
      description: 'Visualiza ventas, tendencias y métricas en tiempo real.',
      color: 'blue'
    },
    {
      icon: Package,
      title: 'Inventario',
      description: 'Control total de tu stock. Alertas automáticas de productos bajos.',
      color: 'amber'
    },
    {
      icon: Users,
      title: 'Multi-Usuario',
      description: 'Varios empleados, diferentes permisos. Controla quién hace qué.',
      color: 'pink'
    }
  ];

  const useCases = [
    {
      title: 'Tiendas de Ropa',
      description: 'Control de tallas, colores y variantes. Photos de productos.',
      icon: '👕'
    },
    {
      title: 'Abarrotes',
      description: 'Código de barras, entradas y salidas, alertas de reorder.',
      icon: '🏪'
    },
    {
      title: 'Ferreterías',
      description: 'Inventario pesado, precios por kilo/unidad, buscar rápido.',
      icon: '🔧'
    },
    {
      title: 'Restaurantes',
      description: 'Órdenes, cocina, cuentas separadas, propinas.',
      icon: '🍽️'
    },
    {
      title: 'Papelerías',
      description: 'Catálogo amplio, productos similares, combos.',
      icon: '📚'
    },
    {
      title: 'Regalos',
      description: 'Photos atractivas, precios especiales, envoltura.',
      icon: '🎁'
    }
  ];

  return (
    <div className="min-h-screen bg-[#0B0B0B] text-white font-sans">
      {/* Hero Section */}
      <header className="container mx-auto px-6 py-16 text-center">
        <div className="inline-block px-4 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-sm font-bold mb-6">
          🌟 Empieza GRATIS - Sin tarjeta de crédito
        </div>
        <h1 className="text-5xl md:text-7xl font-black mb-6 bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
          Reisbloc Store
        </h1>
        <p className="text-xl text-gray-400 mb-6 max-w-2xl mx-auto">
          El sistema de punto de venta diseñado para negocios mexicanos.
          <br />
          <span className="text-white font-semibold">Cobra rápido, controla tu inventario y crece con IA.</span>
        </p>
        <div className="flex justify-center gap-4 mb-8">
          <button 
            onClick={() => navigate('/register')}
            className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 rounded-full font-bold transition-all transform hover:scale-105 shadow-lg shadow-emerald-500/30 flex items-center gap-2"
          >
            Crear mi cuenta gratis
            <ArrowRight size={20} />
          </button>
          <button 
            onClick={() => navigate('/pricing')}
            className="px-8 py-4 border border-gray-700 hover:bg-gray-800 rounded-full font-bold transition-all"
          >
            Ver Precios
          </button>
        </div>
        
        {/* Stats */}
        <div className="flex justify-center gap-8 text-center">
          <div>
            <p className="text-3xl font-black text-emerald-400">$0</p>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Setup</p>
          </div>
          <div className="w-px bg-gray-800"></div>
          <div>
            <p className="text-3xl font-black text-blue-400">5 min</p>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Setup</p>
          </div>
          <div className="w-px bg-gray-800"></div>
          <div>
            <p className="text-3xl font-black text-purple-400">100%</p>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Online</p>
          </div>
        </div>
      </header>

      {/* Trust Badges */}
      <section className="border-y border-gray-800 bg-gray-900/50">
        <div className="container mx-auto px-6 py-6">
          <div className="flex flex-wrap justify-center gap-8 items-center text-gray-500 text-sm">
            <span className="flex items-center gap-2">
              <Shield size={16} className="text-emerald-500" />
              Datos seguros
            </span>
            <span className="flex items-center gap-2">
              <Zap size={16} className="text-yellow-500" />
              Funciona sin internet
            </span>
            <span className="flex items-center gap-2">
              <Smartphone size={16} className="text-blue-500" />
              Móvil y desktop
            </span>
            <span className="flex items-center gap-2">
              <Star size={16} className="text-amber-500" />
              Soporte en español
            </span>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-black mb-4">Todo lo que necesitas</h2>
          <p className="text-gray-400 text-lg">En un solo lugar, sin complicaciones</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <div key={feature.title} className="p-8 bg-gray-900/50 rounded-3xl border border-gray-800 hover:border-gray-700 transition-all group">
                <div className={`w-14 h-14 bg-${feature.color}-500/20 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon size={28} className={`text-${feature.color}-400`} />
                </div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Use Cases */}
      <section className="bg-gray-900/50 border-y border-gray-800">
        <div className="container mx-auto px-6 py-20">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black mb-4">Funciona para tu tipo de negocio</h2>
            <p className="text-gray-400 text-lg">Diseñado para retailers mexicanos</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {useCases.map((useCase) => (
              <div key={useCase.title} className="p-6 bg-gray-800/50 rounded-2xl border border-gray-700 flex items-start gap-4">
                <span className="text-4xl">{useCase.icon}</span>
                <div>
                  <h3 className="font-bold text-lg mb-1">{useCase.title}</h3>
                  <p className="text-gray-400 text-sm">{useCase.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-black mb-4">Planes simples y transparentes</h2>
          <p className="text-gray-400 text-lg">Sin sorpresas. Sin contratos. Cancela cuando quieras.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div 
              key={plan.name}
              className={`p-8 rounded-3xl border flex flex-col ${
                plan.highlight 
                  ? 'border-indigo-500 bg-indigo-900/20 scale-105 shadow-xl shadow-indigo-500/10' 
                  : 'border-gray-800 bg-gray-900/50'
              }`}
            >
              {plan.highlight && (
                <div className="text-center mb-4">
                  <span className="inline-block px-3 py-1 bg-indigo-500 text-white text-xs font-bold rounded-full uppercase tracking-wider">
                    ⭐ Más Popular
                  </span>
                </div>
              )}
              <h3 className="text-2xl font-black mb-2">{plan.name}</h3>
              <div className="mb-6">
                <span className="text-4xl font-black">{plan.price}</span>
                <span className="text-gray-500 ml-1">/{plan.priceNote}</span>
              </div>
              <ul className="space-y-3 mb-8 flex-grow">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-gray-300">
                    <Check size={18} className={plan.highlight ? 'text-indigo-400 mt-0.5' : 'text-emerald-400 mt-0.5'} />
                    {feature}
                  </li>
                ))}
              </ul>
              <button 
                onClick={() => navigate(`/register?plan=${plan.planKey}`)}
                className={`w-full py-4 rounded-xl font-bold transition-all ${
                  plan.highlight 
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
                    : 'bg-gray-800 hover:bg-gray-700 text-white'
                }`}
              >
                {plan.buttonText}
              </button>
            </div>
          ))}
        </div>
        
        <div className="text-center mt-12">
          <p className="text-gray-500">
            ¿Necesitas más? <button onClick={() => navigate('/pricing')} className="text-indigo-400 hover:text-indigo-300 font-medium">Ver todos los planes →</button>
          </p>
        </div>
      </section>

      {/* CTA Final */}
      <section className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600">
        <div className="container mx-auto px-6 py-20 text-center">
          <h2 className="text-4xl font-black mb-6">Empieza hoy, sin costo</h2>
          <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
            Únete a cientos de negocios mexicanos que ya están creciendo con Reisbloc.
          </p>
          <button 
            onClick={() => navigate('/register')}
            className="px-12 py-5 bg-white text-indigo-600 rounded-full font-bold text-lg hover:bg-gray-100 transition-all transform hover:scale-105 shadow-2xl"
          >
            Crear cuenta gratis →
          </button>
          <p className="text-white/60 mt-6 text-sm">
            No requiere tarjeta de crédito • Configuración en 5 minutos
          </p>
        </div>
      </section>

      <footer className="text-center py-12 text-gray-600 border-t border-gray-900">
        <div className="flex justify-center gap-6 mb-4">
          <button onClick={() => navigate('/privacy')} className="hover:text-gray-400 transition-colors">Privacidad</button>
          <button onClick={() => navigate('/terms')} className="hover:text-gray-400 transition-colors">Términos</button>
          <button onClick={() => navigate('/pricing')} className="hover:text-gray-400 transition-colors">Precios</button>
        </div>
        <p>© 2026 Reisbloc Store. Hecho con ❤️ en México 🇲🇽</p>
      </footer>
    </div>
  );
};

export default LandingPage;
