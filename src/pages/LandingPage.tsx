import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Rocket, Shield, Zap, Check } from 'lucide-react';
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
      features: ['1 Dispositivo', '3 Usuarios', '50 Productos', 'Soporte Comunitario'],
      buttonText: 'Empezar Gratis',
      planKey: 'free'
    },
    {
      name: 'Pro',
      price: '$25',
      features: ['5 Dispositivos', '15 Usuarios', '500 Productos', 'Soporte Prioritario', 'Aprobación de Dispositivos'],
      buttonText: 'Elegir Pro',
      planKey: 'pro',
      highlight: true
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      features: ['Dispositivos Ilimitados', 'Usuarios Ilimitados', 'Productos Ilimitados', 'Soporte 24/7', 'Multi-sucursal'],
      buttonText: 'Contactar',
      planKey: 'enterprise'
    }
  ];

  return (
    <div className="min-h-screen bg-[#0B0B0B] text-white font-sans">
      {/* Hero Section */}
      <header className="container mx-auto px-6 py-16 text-center">
        <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
          Reisbloc Retail
        </h1>
        <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
          La solución definitiva para la gestión de ventas. Offline-first, seguro y diseñado para escalar tu negocio.
        </p>
        <div className="flex justify-center gap-4">
          <button 
            onClick={() => navigate('/register')}
            className="px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-full font-bold transition-all transform hover:scale-105"
          >
            Registrar mi Negocio
          </button>
          <button 
            onClick={() => navigate('/login')}
            className="px-8 py-4 border border-gray-700 hover:bg-gray-800 rounded-full font-bold transition-all"
          >
            Iniciar Sesión
          </button>
        </div>
      </header>

      {/* Features */}
      <section className="container mx-auto px-6 py-20 grid md:grid-cols-3 gap-12">
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
          <Rocket className="text-purple-400 mb-4" size={40} />
          <h3 className="text-2xl font-bold mb-2">Multi-Tenant</h3>
          <p className="text-gray-400">Gestiona múltiples sucursales u organizaciones desde una sola plataforma.</p>
        </div>
      </section>

      {/* Pricing */}
      <section className="container mx-auto px-6 py-20">
        <h2 className="text-4xl font-bold text-center mb-16">Planes para cada etapa</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div 
              key={plan.name}
              className={`p-8 rounded-3xl border ${plan.highlight ? 'border-blue-500 bg-blue-900/10 scale-105' : 'border-gray-800 bg-gray-900/30'} flex flex-col`}
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
      </section>

      <footer className="text-center py-10 text-gray-600 border-t border-gray-900">
        <p>© 2026 Reisbloc Lab. Hecho con ❤️ en México.</p>
      </footer>
    </div>
  );
};

export default LandingPage;