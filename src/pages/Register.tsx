import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/config/supabase';
import { Store, User, Mail, Lock, ArrowRight, Globe } from 'lucide-react';

const Register = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const referralCode = searchParams.get('ref');
  
  const validPlans = ['free', 'launch', 'starter', 'growth', 'scale', 'enterprise']
  const urlPlan = searchParams.get('plan')?.toLowerCase() || 'free'
  const selectedPlan = validPlans.includes(urlPlan) ? urlPlan : 'free';

  const [formData, setFormData] = useState({
    orgName: '',
    fullName: '',
    email: '',
    password: '',
    plan: selectedPlan
  });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            org_name: formData.orgName,
            plan: formData.plan,
            referral_code: referralCode
          }
        }
      });

      if (signUpError) throw signUpError;

      if (data.user) {
        // Save referral code for later processing
        if (referralCode) {
          localStorage.setItem('pending_referral_code', referralCode)
        }
        // Ir al onboarding para configurar el negocio
        navigate('/onboarding');
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'Error al registrar el negocio');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/auth/callback'
        }
      })
      if (error) throw error
    } catch (err: any) {
      console.error('Google auth error:', err)
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0B0B0B] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-gray-900 rounded-3xl border border-gray-800 p-8 shadow-2xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Crea tu Negocio</h2>
          <p className="text-gray-400">Estás registrándote en el plan <span className="text-blue-400 font-bold uppercase">{formData.plan}</span></p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-500/50 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        {referralCode && (
          <div className="mb-6 p-4 bg-green-900/20 border border-green-500/50 rounded-xl">
            <p className="text-green-400 text-sm font-medium">🎁 ¡Te recomendó un amigo!</p>
            <p className="text-green-300 text-xs mt-1">Código: <span className="font-bold">{referralCode}</span> - Ambos ganan crédito al registrarte.</p>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-5">
          <div className="relative">
            <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
            <input
              required
              type="text"
              placeholder="Nombre de tu Negocio"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl py-4 pl-12 pr-4 text-white focus:border-blue-500 outline-none transition-all"
              value={formData.orgName}
              onChange={(e) => setFormData({ ...formData, orgName: e.target.value })}
            />
          </div>

          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
            <input
              required
              type="text"
              placeholder="Tu Nombre Completo"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl py-4 pl-12 pr-4 text-white focus:border-blue-500 outline-none transition-all"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            />
          </div>

          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
            <input
              required
              type="email"
              placeholder="Correo Electrónico"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl py-4 pl-12 pr-4 text-white focus:border-blue-500 outline-none transition-all"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
            <input
              required
              type="password"
              autoComplete="new-password"
              placeholder="Contraseña"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl py-4 pl-12 pr-4 text-white focus:border-blue-500 outline-none transition-all"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>

          <button
            disabled={loading}
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {loading ? 'Procesando...' : 'Crear Cuenta'}
            {!loading && <ArrowRight size={20} />}
          </button>
        </form>

        <div className="relative flex py-4 items-center">
          <div className="flex-grow border-t border-gray-800"></div>
          <span className="flex-shrink-0 mx-4 text-gray-600 text-xs">O regístrate con</span>
          <div className="flex-grow border-t border-gray-800"></div>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full bg-white text-gray-900 hover:bg-gray-100 font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
        >
          <Globe size={20} />
          Google
        </button>

        <p className="mt-8 text-center text-gray-500 text-sm">
          ¿Ya tienes una cuenta?{' '}
          <button onClick={() => navigate('/login')} className="text-blue-400 hover:underline">
            Inicia Sesión
          </button>
        </p>
      </div>
    </div>
  );
};

export default Register;