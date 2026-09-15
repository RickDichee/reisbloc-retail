import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/config/supabase';
import { getPlanPrice, getPlanDisplayName, type PlanType } from '@/config/plans';
import { ShieldCheck, Sparkles, ArrowRight } from 'lucide-react';

const Register = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const referralCode = searchParams.get('ref');
  
  const availablePlans: PlanType[] = ['free', 'starter', 'growth'];
  const urlPlan = searchParams.get('plan')?.toLowerCase() as PlanType;
  const selectedPlan = availablePlans.includes(urlPlan) ? urlPlan : 'free';

  const handleGoogleLogin = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const redirectTo = window.location.origin + '/auth/callback' + (selectedPlan !== 'free' ? `?plan=${selectedPlan}` : '')
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo
        }
      })
      if (error) throw error
    } catch (err: any) {
      console.error('Google auth error:', err)
      setError(err.message || 'Error al iniciar con Google')
      setLoading(false)
    }
  }

  const planPrices: Record<string, number> = {
    free: 0,
    starter: getPlanPrice('starter'),
    growth: getPlanPrice('growth')
  };

  return (
    <div className="min-h-screen bg-[#0B0B0B] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/20 mb-4">
            <ShieldCheck className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-4xl font-black text-white mb-2">Reisbloc</h1>
          <p className="text-gray-400 text-lg">Tu sistema POS listo en 5 minutos</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-500/50 rounded-2xl text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {referralCode && (
          <div className="mb-6 p-4 bg-emerald-900/20 border border-emerald-500/50 rounded-2xl">
            <p className="text-emerald-400 text-sm font-medium flex items-center justify-center gap-2">
              <Sparkles size={16} />
              ¡Te recomendó un amigo!
            </p>
          </div>
        )}

        <div className="bg-gray-900 rounded-3xl border border-gray-800 p-6 shadow-2xl">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white hover:bg-gray-100 text-gray-900 font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.08l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {loading ? 'Conectando...' : 'Continuar con Google'}
            {!loading && <ArrowRight size={20} />}
          </button>
        </div>

        {/* 🌟 Plan Info: Free 1-person trial & Custom enterprise */}
        <div className="mt-6 p-4 rounded-2xl bg-gray-900 border border-gray-800 text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 text-xs font-bold">
            <Sparkles size={14} />
            <span>Prueba Gratuita para 1 Persona</span>
          </div>
          <p className="text-gray-400 text-xs leading-relaxed">
            Acceso sin costo para probar el Punto de Venta e inventario básico.
          </p>
          <div className="pt-2 border-t border-gray-800/80">
            <p className="text-gray-400 text-xs">
              ¿Requieres solución a la medida para tu equipo o boutique?{' '}
              <a 
                href="https://wa.me/5215665848231?text=Hola,%20me%20interesa%20una%20solución%20personalizada%20de%20Reisbloc%20Store"
                target="_blank"
                rel="noreferrer"
                className="text-amber-400 font-bold hover:underline inline-flex items-center gap-1"
              >
                Cotizar Personalizado ➔
              </a>
            </p>
          </div>
        </div>

        <p className="mt-8 text-center text-gray-500 text-sm">
          Al continuar, aceptas nuestros{' '}
          <button onClick={() => navigate('/terms')} className="text-gray-400 hover:text-white">
            Términos de Servicio
          </button>
          {' '}y{' '}
          <button onClick={() => navigate('/privacy')} className="text-gray-400 hover:text-white">
            Política de Privacidad
          </button>
        </p>
      </div>
    </div>
  );
};

export default Register;