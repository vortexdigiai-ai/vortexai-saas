'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Sparkles, ArrowRight, Lock, Mail } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [enviado, setEnviado] = useState(false)
  const router = useRouter()

  function manejarLogin(e: React.FormEvent) {
    e.preventDefault()
    setEnviado(true)

    // Simular un pequeño retraso antes de redirigir al panel de control
    setTimeout(() => {
      router.push('/dashboard') // Cambia '/dashboard' por tu ruta de destino
    }, 1500)
  }

  return (
    <div className="min-h-screen bg-[#0A0B0E] text-slate-100 selection:bg-rose-500/30 selection:text-rose-200 font-sans antialiased flex flex-col justify-between relative overflow-x-hidden">
      
      {/* Background ambient lighting effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] bg-gradient-to-b from-rose-500/10 via-purple-500/5 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* HEADER SIMPLE */}
      <header className="w-full border-b border-white/[0.08] bg-[#0A0B0E]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-rose-500 to-orange-400 flex items-center justify-center shadow-lg shadow-rose-500/20 group-hover:scale-105 transition-transform">
              <Sparkles size={16} className="text-white" />
            </div>
            <span className="font-display text-xl font-bold tracking-tight text-white">
              Vortex<span className="text-rose-500">AI</span>
            </span>
          </Link>

          <div className="flex items-center gap-3 text-sm text-slate-400">
            <span>¿No tienes cuenta?</span>
            <Link href="/registro" className="text-white font-medium hover:text-rose-400 transition-colors">
              Empezar gratis
            </Link>
          </div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL / FORMULARIO DE LOGIN */}
      <main className="max-w-md mx-auto px-6 py-16 md:py-24 w-full relative z-10 flex-1 flex flex-col justify-center">
        
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-full px-3.5 py-1.5 mb-4 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            Acceso a plataforma
          </span>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Bienvenido de nuevo
          </h1>
          <p className="mt-2 text-slate-400 text-sm">
            Introduce tus datos para acceder a tu panel de control.
          </p>
        </div>

        <div className="bg-[#12141C] border border-white/[0.08] rounded-3xl p-8 md:p-10 shadow-2xl shadow-rose-500/10 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none rounded-3xl" />

          {enviado ? (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 text-center text-emerald-400 relative z-10 space-y-2">
              <p className="font-semibold text-base">¡Inicio de sesión exitoso!</p>
              <p className="text-xs text-slate-300">Cargando tu asistente de IA...</p>
            </div>
          ) : (
            <form onSubmit={manejarLogin} className="space-y-5 relative z-10">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Correo electrónico</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input 
                    required 
                    type="email" 
                    placeholder="tu@tienda.com" 
                    className="w-full bg-[#0E1017] border border-white/[0.08] rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-rose-500 transition-colors" 
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-mono uppercase tracking-wider text-slate-400">Contraseña</label>
                  <Link href="/recuperar" className="text-xs text-rose-400 hover:underline">
                    ¿Has olvidado tu contraseña?
                  </Link>
                </div>
                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input 
                    required 
                    type="password" 
                    placeholder="••••••••" 
                    className="w-full bg-[#0E1017] border border-white/[0.08] rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-rose-500 transition-colors" 
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="w-full mt-2 bg-gradient-to-r from-rose-500 to-orange-400 text-white font-medium py-3.5 px-4 rounded-2xl shadow-lg shadow-rose-500/25 hover:opacity-95 transition-opacity flex items-center justify-center gap-2 group cursor-pointer"
              >
                <span>Iniciar sesión</span>
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </form>
          )}
        </div>
      </main>

      {/* FOOTER SIMPLE OPCIONAL */}
      <footer className="w-full py-6 text-center text-xs text-slate-600 border-t border-white/[0.04]">
        © {new Date().getFullYear()} VortexAI. Todos los derechos reservados.
      </footer>
    </div>
  )
}