'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Sparkles, ArrowRight, Check, Lock, Mail, User, Store } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function RegistroPage() {
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [nombreTienda, setNombreTienda] = useState('')
  const [password, setPassword] = useState('')
  const [registrado, setRegistrado] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  
  const router = useRouter()

  async function manejarRegistro(e: React.FormEvent) {
    e.preventDefault()
    setCargando(true)
    setErrorMsg('')

    try {
      // 1. Registrar el usuario en Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: nombre,
            store_name: nombreTienda,
          }
        }
      })

      if (error) throw error

      // 2. Insertar un registro inicial en tu tabla de tiendas
      if (data.user) {
        const { error: errorTienda } = await supabase.from('tiendas').insert([
          { user_id: data.user.id, nombre_tienda: nombreTienda, plan: 'free' }
        ])
        
        if (errorTienda) {
          console.error('Error al crear la tienda en la tabla:', errorTienda)
        }
      }

      // 3. Activamos el mensaje de éxito
      setRegistrado(true)

      // 4. Redirigir al panel de control después de un breve instante
      setTimeout(() => {
        router.push('/dashboard')
      }, 1500)

    } catch (err: any) {
      console.error('Error detallado en registro:', err)
      setErrorMsg(err.message || 'Hubo un error al registrar la cuenta')
      setCargando(false)
    }
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
            <span>¿Ya tienes cuenta?</span>
            <Link href="/login" className="text-white font-medium hover:text-rose-400 transition-colors">
              Iniciar sesión
            </Link>
          </div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL / FORMULARIO */}
      <main className="max-w-7xl mx-auto px-6 py-16 md:py-24 grid md:grid-cols-12 gap-12 items-center w-full relative z-10">
        
        {/* Columna Izquierda: Propuesta de valor */}
        <div className="md:col-span-6 space-y-8">
          <div>
            <span className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-full px-3.5 py-1.5 mb-6 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              Acceso inmediato
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-[1.1]">
              Crea tu asistente de IA en <span className="bg-gradient-to-r from-rose-400 via-rose-300 to-orange-400 bg-clip-text text-transparent italic font-normal">menos de 2 minutos.</span>
            </h1>
            <p className="mt-4 text-slate-400 text-base leading-relaxed max-w-lg">
              Empieza a automatizar las ventas y el soporte de tu tienda online sin configuraciones complejas ni tarjetas de crédito por adelantado.
            </p>
          </div>

          <div className="space-y-4 pt-2">
            {[
              'Sin llamadas de ventas ni esperas de integración',
              'Sube tu catálogo y el bot aprende al instante',
              'Prueba gratuita sin compromiso de permanencia',
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-3 text-slate-300 text-sm">
                <div className="w-5 h-5 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/20">
                  <Check size={12} />
                </div>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Columna Derecha: Tarjeta de Registro */}
        <div className="md:col-span-6">
          <div className="bg-[#12141C] border border-white/[0.08] rounded-3xl p-8 md:p-10 shadow-2xl shadow-rose-500/10 relative">
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none rounded-3xl" />
            
            <h2 className="text-xl font-semibold text-white mb-2 relative z-10">Comienza gratis</h2>
            <p className="text-slate-400 text-sm mb-8 relative z-10">Introduce tus datos para configurar tu cuenta.</p>

            {errorMsg && (
              <div className="mb-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-3 rounded-xl relative z-10">
                {errorMsg}
              </div>
            )}

            {registrado ? (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 text-center text-emerald-400 relative z-10 space-y-2">
                <p className="font-semibold text-base">¡Cuenta creada con éxito!</p>
                <p className="text-xs text-slate-300">Te estamos redirigiendo al panel de control...</p>
              </div>
            ) : (
              <form onSubmit={manejarRegistro} className="space-y-5 relative z-10">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Nombre completo</label>
                  <div className="relative">
                    <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input 
                      required 
                      type="text" 
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      placeholder="Tu nombre" 
                      className="w-full bg-[#0E1017] border border-white/[0.08] rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-rose-500 transition-colors" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Correo electrónico</label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input 
                      required 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tu@tienda.com" 
                      className="w-full bg-[#0E1017] border border-white/[0.08] rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-rose-500 transition-colors" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Nombre de tu tienda o E-commerce</label>
                  <div className="relative">
                    <Store size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input 
                      required 
                      type="text" 
                      value={nombreTienda}
                      onChange={(e) => setNombreTienda(e.target.value)}
                      placeholder="Ej. Aura Glow" 
                      className="w-full bg-[#0E1017] border border-white/[0.08] rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-rose-500 transition-colors" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Contraseña</label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input 
                      required 
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 8 caracteres" 
                      className="w-full bg-[#0E1017] border border-white/[0.08] rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-rose-500 transition-colors" 
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={cargando}
                  className="w-full mt-2 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-rose-500 to-orange-500 text-white font-medium py-4 rounded-full shadow-lg shadow-rose-500/20 hover:opacity-95 transition-all group cursor-pointer disabled:opacity-50"
                >
                  {cargando ? 'Creando cuenta...' : 'Crear cuenta gratis'} 
                  <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                </button>

                <p className="text-[11px] text-slate-500 text-center leading-relaxed pt-2">
                  Al registrarte aceptas nuestros <Link href="/terminos" className="underline hover:text-slate-400">términos de servicio</Link> y <Link href="/privacidad" className="underline hover:text-slate-400">política de privacidad</Link>.
                </p>
              </form>
            )}
          </div>
        </div>

      </main>

      {/* FOOTER SIMPLE */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-10 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
        <span className="font-semibold text-white">Vortex<span className="text-rose-500">AI</span></span>
        <p>© 2026 VortexAI. Todos los derechos reservados.</p>
      </footer>
      
    </div>
  )
}