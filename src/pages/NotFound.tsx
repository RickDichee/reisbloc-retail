import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Home, ArrowLeft, AlertTriangle } from 'lucide-react'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Capa 1: Color de fondo base */}
      <div className="absolute inset-0 bg-slate-900 z-0" />

      {/* Capa 2: Doodle */}
      <div 
        className="absolute inset-0 z-0 opacity-70 pointer-events-none bg-repeat"
        style={{
          backgroundImage: 'url("/doodle_ceviche.png?v=2")',
          backgroundSize: '300px',
          filter: 'grayscale(100%)'
        }}
      />
      
      {/* Capa 3: Gradiente */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-slate-900/20 to-blue-900/20 z-0" />

      <div className="relative z-10 text-center text-white max-w-lg mx-auto p-8 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-white/10 rounded-full">
            <AlertTriangle size={48} className="text-yellow-400" />
          </div>
        </div>
        
        <h1 className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mb-2">
          404
        </h1>
        <h2 className="text-2xl font-bold mb-4">Página no encontrada</h2>
        <p className="text-gray-300 mb-8">
          Parece que esta página no existe o no tienes permisos para verla.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 transition-all flex items-center justify-center gap-2 font-semibold"
          >
            <ArrowLeft size={20} />
            Regresar
          </button>
          
          <button
            onClick={() => navigate('/pos')}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2 font-bold"
          >
            <Home size={20} />
            Ir al Inicio
          </button>
        </div>
      </div>
    </div>
  )
}