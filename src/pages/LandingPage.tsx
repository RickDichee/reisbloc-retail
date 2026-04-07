import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Zap, Check, Bot, FileText } from 'lucide-react';
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
      highlight: false
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
        'Facturación CFDI 4.0',
        'Soporte email'
      ],
      buttonText: 'Elegir Launch',
      planKey: 'starter',
      highlight: true
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
      highlight: false
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
        <div className="inline-block px-4 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm font-bold mb-6">
          🌟 Empieza GRATIS - Sin tarjeta de crédito
        </div>
        <h1 className="text-5xl md:text-7xl font-black mb-6 bg-gradient-to-r from-emerald-400 to-blue-500 bg-clip-text text-transparent">
          Reisbloc Store
        </h1>
        <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
          El sistema de punto de venta que todo negocio necesita.
          <br />
          Cobra rápido, controla tu inventario y crece con IA.
        </p>
        <div className="flex justify-center gap-4">
          <button 
            onClick={() => navigate('/register')}
            className="px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-full font-bold transition-all transform hover:scale-105 shadow-lg shadow-blue-600/30"
          >
            Empezar Gratis Hoy
          </button>
          <button 
            onClick={() => navigate('/pricing')}
            className="px-8 py-4 border border-gray-700 hover:bg-gray-800 rounded-full font-bold transition-all"
          >
            Ver Precios
          </button>
        </div>
      </header>

      {/* Features */}
      <section className="container mx-auto px-6 py-20 grid md:grid-cols-4 gap-12">
        <div className="p-8 bg-gray-900/50 rounded-3xl border border-gray-800">
          <Zap className="text-yellow-400 mb-4" size={40} />
          <h3 className="text-2xl font-bold mb-2">Offline-First</h3>
          <p className="text-gray-400">Tu negocio no se detiene si el internet falla. Sincronización automática al volver.</p>
        </div>
        <div className="p-8 bg-gray-900/50 rounded-3xl border border-gray-800">
          <Shield className="text-green-400 mb-4" size={40} />
          <h3 className="text-2xl font-bold mb-2">Seguridad Total</h3>
          <p className="text-gray-400">Aislamiento de datos con RLS y control estricto de dispositivos autorizados.</p>
        </div>
        <div className="p-8 bg-gray-900/50 rounded-3xl border border-gray-800">
          <Bot className="text-purple-400 mb-4" size={40} />
          <h3 className="text-2xl font-bold mb-2">IA Integrada</h3>
          <p className="text-gray-400">Asistente virtual que te ayuda a tomar mejores decisiones para tu negocio.</p>
        </div>
        <div className="p-8 bg-gradient-to-br from-emerald-900/50 to-teal-900/50 rounded-3xl border border-emerald-500/30 relative overflow-hidden">
          <div className="absolute top-2 right-2 px-2 py-0.5 bg-emerald-500 text-white text-xs font-bold rounded-full">
            NUEVO
          </div>
          <FileText className="text-emerald-400 mb-4" size={40} />
          <h3 className="text-2xl font-bold mb-2">CFDI 4.0</h3>
          <p className="text-gray-400">Facturación electrónica integrada. Genera facturas válidas ante el SAT directamente desde tu POS.</p>
        </div>
      </section>

      {/* Use Cases */}
      <section className="container mx-auto px-6 py-20">
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
      </section>

      {/* Pricing */}
      <section className="container mx-auto px-6 py-20">
        <h2 className="text-4xl font-bold text-center mb-16">Planes para cada etapa</h2>
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div 
              key={plan.name}
              className={`p-8 rounded-3xl border flex flex-col ${
                plan.highlight 
                  ? 'border-blue-500 bg-blue-900/10 scale-105' 
                  : 'border-gray-800 bg-gray-900/30'
              }`}
            >
              <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
              <div className="text-4xl font-bold mb-6">{plan.price}<span className="text-lg text-gray-500">/mes</span></div>
              <ul className="space-y-4 mb-10 flex-grow">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-gray-300">
                    <Check size={18} className="text-blue-500" />
                    {feature}
                  </li>
                ))}
              </ul>
              <button 
                onClick={() => navigate(`/register?plan=${plan.planKey}`)}
                className={`w-full py-4 rounded-xl font-bold transition-all ${
                  plan.highlight ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-800 hover:bg-gray-700'
                }`}
              >
                {plan.buttonText}
              </button>
            </div>
          ))}
        </div>
        <div className="text-center mt-12">
          <p className="text-gray-500">
            ¿Necesitas más? <button onClick={() => navigate('/pricing')} className="text-blue-400 hover:text-blue-300 font-medium">Ver todos los planes →</button>
          </p>
        </div>
      </section>

      {/* CTA Final */}
      <section className="bg-gradient-to-r from-blue-600 to-indigo-700">
        <div className="container mx-auto px-6 py-20 text-center">
          <h2 className="text-4xl font-black mb-6">Empieza hoy, sin costo</h2>
          <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
            Únete a cientos de negocios mexicanos que ya están creciendo con Reisbloc.
          </p>
          <button 
            onClick={() => navigate('/register')}
            className="px-12 py-5 bg-white text-blue-600 rounded-full font-bold text-lg hover:bg-gray-100 transition-all transform hover:scale-105 shadow-2xl"
          >
            Crear cuenta gratis →
          </button>
          <p className="text-white/60 mt-6 text-sm">
            No requiere tarjeta de crédito • Configuración en 5 minutos
          </p>
        </div>
      </section>

      <footer className="text-center py-10 text-gray-600 border-t border-gray-900">
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
