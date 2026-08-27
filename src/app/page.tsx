'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Upload, Sparkles, Code2, MessageCircle, Zap, ShieldCheck, Check, Menu, X, ArrowRight, ChevronRight, Terminal } from 'lucide-react'

const NAV_LINKS = [
  { href: '#como-funciona', label: 'Cómo funciona' },
  { href: '#producto', label: 'Producto' },
  { href: '#planes', label: 'Planes' },
  { href: '#nosotros', label: 'Nosotros' },
]

export default function LandingPage() {
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [enviado, setEnviado] = useState(false)

  function enviarContacto(e: React.FormEvent) {
    e.preventDefault()
    setEnviado(true)
  }

  return (
    <div className="min-h-screen bg-[#0A0B0E] text-slate-100 selection:bg-rose-500/30 selection:text-rose-200 font-sans antialiased overflow-x-hidden">
      
      {/* Background ambient lighting effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] bg-gradient-to-b from-rose-500/10 via-purple-500/5 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-[#0A0B0E]/80 backdrop-blur-xl border-b border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-rose-500 to-orange-400 flex items-center justify-center shadow-lg shadow-rose-500/20 group-hover:scale-105 transition-transform">
              <Sparkles size={16} className="text-white" />
            </div>
            <span className="font-display text-xl font-bold tracking-tight text-white">
              Vortex<span className="text-rose-500">AI</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} className="hover:text-white transition-colors">{l.label}</a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-5">
            <Link href="/login" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">
              Ya tengo cuenta
            </Link>
            <Link 
              href="/registro" 
              className="relative group overflow-hidden rounded-full p-[1px] focus:outline-none"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-rose-500 to-orange-500 rounded-full transition-all duration-300 group-hover:opacity-90" />
              <span className="relative px-5 py-2.5 rounded-full bg-[#0A0B0E] text-white text-sm font-medium flex items-center gap-2 transition-all duration-300 group-hover:bg-transparent">
                Empezar gratis
                <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </span>
            </Link>
          </div>

          <button className="md:hidden text-slate-300 p-2" onClick={() => setMenuAbierto(!menuAbierto)} aria-label="Abrir menú">
            {menuAbierto ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {menuAbierto && (
          <div className="md:hidden border-t border-white/[0.08] px-6 py-6 flex flex-col gap-5 bg-[#0A0B0E] animate-in slide-in-from-top duration-200">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setMenuAbierto(false)} className="text-base text-slate-300 hover:text-white">
                {l.label}
              </a>
            ))}
            <div className="pt-4 border-t border-white/[0.08] flex flex-col gap-3">
              <Link href="/login" className="text-sm text-slate-400 text-center py-2">Ya tengo cuenta</Link>
              <Link href="/registro" className="w-full py-3 rounded-full bg-gradient-to-r from-rose-500 to-orange-500 text-white font-medium text-center shadow-lg shadow-rose-500/20">
                Empezar gratis
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-16 md:pt-28 pb-20">
        <VortexGraphic />
        
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-12 gap-12 items-center relative z-10">
          
          <div className="md:col-span-7 text-center md:text-left">
            <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-full px-3.5 py-1.5 mb-8 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              Asistentes de IA para E-commerce
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight text-white leading-[1.08]">
              Tu tienda, <br />
              <span className="bg-gradient-to-r from-rose-400 via-rose-300 to-orange-400 bg-clip-text text-transparent italic font-normal">
                respondiendo sola.
              </span>
            </h1>
            
            <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-xl mx-auto md:mx-0 font-normal leading-relaxed">
              Sube tu catálogo y en minutos tendrás un asistente de ventas con IA atendiendo a tus clientes 24/7 de forma autónoma. Sin agencias ni esperas técnicas.
            </p>
            
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center md:justify-start gap-4">
              <Link 
                href="/registro" 
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-rose-500 to-orange-500 text-white font-medium px-8 py-4 rounded-full shadow-xl shadow-rose-500/20 hover:opacity-95 transition-all transform hover:-translate-y-0.5"
              >
                Crear mi chatbot <ArrowRight size={18} />
              </Link>
              <a 
                href="#como-funciona" 
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-full text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-all text-sm font-medium"
              >
                Ver cómo funciona
              </a>
            </div>
          </div>

          {/* Interactive Assistant Preview Widget */}
          <div className="md:col-span-5">
            <div className="relative mx-auto max-w-sm rounded-3xl p-1 bg-gradient-to-b from-white/20 to-white/0 shadow-2xl shadow-rose-500/10">
              <div className="bg-[#12141C] rounded-[22px] p-5 backdrop-blur-xl border border-white/10">
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/[0.08]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded-full bg-rose-500 shadow-sm shadow-rose-500" />
                    <span className="text-slate-300 text-xs font-mono font-medium">Aura Glow — Asistente IA</span>
                  </div>
                  <Terminal size={14} className="text-slate-500" />
                </div>
                
                <div className="space-y-4 font-sans text-sm">
                  <div className="bg-white/[0.05] text-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%] border border-white/[0.02]">
                    ¿Tenéis el sérum para piel sensible?
                  </div>
                  <div className="bg-gradient-to-r from-rose-500 to-rose-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-[85%] ml-auto shadow-md shadow-rose-500/20">
                    Sí, el Sérum Calma 30ml — sin fragancia, apto piel sensible. 24,90€. ¿Te lo añado al carrito?
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-white/[0.08] flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>Estado: Activo (Catálogo Sincronizado)</span>
                  <span className="text-emerald-400 flex items-center gap-1">● Online</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Integration Bar */}
        <div className="relative mt-20 pt-10 border-t border-white/[0.08]">
          <p className="text-center text-xs uppercase tracking-widest text-slate-500 font-mono mb-6">
            Compatible de forma nativa con las principales plataformas del mercado
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16 text-slate-400 font-semibold text-sm opacity-60">
            <span>Shopify</span>
            <span>•</span>
            <span>WooCommerce</span>
            <span>•</span>
            <span>PrestaShop</span>
            <span>•</span>
            <span>Wix</span>
            <span>•</span>
            <span>Tiendanube</span>
          </div>
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section id="como-funciona" className="max-w-7xl mx-auto px-6 py-28 relative">
        <div className="max-w-2xl mb-20">
          <span className="text-xs font-mono uppercase tracking-wider text-rose-400 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20">
            Proceso ágil y sin fricciones
          </span>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white mt-4">
            De cero a chatbot inteligente en tres pasos.
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            { n: '01', icon: Upload, t: 'Sube tu catálogo', d: 'Sube tu inventario mediante un archivo o sintonízalo directamente para que la IA entienda cada referencia.' },
            { n: '02', icon: Sparkles, t: 'Tu bot se entrena solo', d: 'La inteligencia artificial aprende tus precios, características y especificaciones de forma automática e inmediata.' },
            { n: '03', icon: Code2, t: 'Pégalo en tu web', d: 'Copia una sencilla línea de código en tu tienda y el asistente aparecerá integrado fluidamente, listo para vender.' },
          ].map((s) => (
            <div key={s.n} className="group relative bg-[#12141C]/60 hover:bg-[#12141C] border border-white/[0.08] hover:border-rose-500/40 rounded-3xl p-8 transition-all duration-300">
              <div className="flex items-center justify-between mb-8">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 group-hover:scale-110 transition-transform">
                  <s.icon size={22} strokeWidth={1.5} />
                </div>
                <span className="font-mono text-3xl font-bold text-white/10 group-hover:text-rose-500/30 transition-colors">{s.n}</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">{s.t}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PRODUCTO */}
      <section id="producto" className="bg-[#0E1017] border-y border-white/[0.08] py-28 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-16">
            <span className="text-xs font-mono uppercase tracking-wider text-rose-400 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20">
              Módulos del producto
            </span>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white mt-4">
              Un asistente que conoce tu tienda de verdad.
            </h2>
            <p className="text-slate-400 mt-4 text-base">
              Controla y administra las capacidades de tu IA en tiempo real desde tu panel de control personalizado.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: MessageCircle, t: 'Dudas de producto', d: 'Responde con total precisión sobre tallas, ingredientes, stock y precios usando el catálogo real de tu tienda.', estado: 'Activo', on: true },
              { icon: Zap, t: 'Carritos abandonados', d: 'Identifica patrones de salida en los compradores y despliega asistencia proactiva para asegurar conversiones.', estado: 'Disponible', on: true },
              { icon: ShieldCheck, t: 'Políticas y Envíos', d: 'Explica plazos de entrega, condiciones de devolución y garantías comerciales de forma automatizada.', estado: 'Disponible', on: true },
            ].map((f) => (
              <div key={f.t} className="bg-[#12141C] border border-white/[0.08] rounded-3xl p-8 hover:border-white/20 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-rose-400">
                      <f.icon size={22} strokeWidth={1.5} />
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono uppercase tracking-wide ${f.on ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-white/[0.05] text-slate-500 border border-white/[0.05]'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${f.on ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                      {f.estado}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">{f.t}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{f.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* POR QUÉ VORTEXAI */}
      <section className="max-w-7xl mx-auto px-6 py-28">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-rose-400 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20">
              Por qué VortexAI
            </span>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white mt-4 mb-6">
              Sin llamadas de ventas. <br />
              <span className="text-slate-400 font-normal">Sin esperar configuraciones lentas.</span>
            </h2>
            <p className="text-slate-400 leading-relaxed text-base">
              Las soluciones tradicionales te obligan a pasar por consultorías eternas y presupuestos opacos. Con VortexAI creas tu cuenta de forma autónoma y pones a prueba tu asistente en cuestión de minutos.
            </p>
          </div>
          
          <div className="space-y-4">
            {[
              'Plataforma 100% autoservicio, sin intermediarios ni demoras',
              'Esquema de precios transparente, sin costes ocultos',
              'Gestión de catálogos y parámetros desde un panel intuitivo',
              'Máxima seguridad y privacidad para los datos de tu e-commerce',
            ].map((i) => (
              <div key={i} className="flex items-center gap-4 bg-[#12141C] border border-white/[0.08] rounded-2xl p-5">
                <div className="w-6 h-6 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0">
                  <Check size={14} />
                </div>
                <span className="text-sm font-medium text-slate-200">{i}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PLANES */}
      <section id="planes" className="bg-[#0E1017] border-y border-white/[0.08] py-28">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-16">
            <span className="text-xs font-mono uppercase tracking-wider text-rose-400 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20">
              Planes transparentes
            </span>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white mt-4">Elige tu plan ideal.</h2>
            <p className="text-slate-400 mt-3 text-base">Total libertad de suscripción, sin permanencias forzadas. Escala según las necesidades de tu tienda.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {[
              { 
                nombre: 'Free', 
                precio: '0€', 
                subtitulo: 'Configuración libre (Sin Widget).', 
                detalle: ['Configuración completa', 'Sin widget activo', 'Ideal para pruebas'],
                btnText: 'Empezar gratis',
                freePlan: true 
              },
              { 
                nombre: 'Starter', 
                precio: '49.99€', 
                subtitulo: 'Ideal para tiendas que empiezan.', 
                detalle: ['Hasta 1,000 chats / mes', 'Widget desbloqueado', 'Soporte estándar'] 
              },
              { 
                nombre: 'Growth', 
                precio: '129.99€', 
                subtitulo: 'Para escalar ventas con IA avanzada.', 
                detalle: ['Hasta 5,000 chats / mes', 'IA Avanzada & Toggles', 'Soporte prioritario'], 
                popular: true 
              },
              { 
                nombre: 'Pro', 
                precio: '249.99€', 
                subtitulo: 'Automatización total y máxima conversión.', 
                detalle: ['Chats ilimitados', 'Analíticas avanzadas', 'Soporte dedicado 24/7'] 
              },
              { 
                nombre: 'Custom', 
                precio: 'A medida', 
                subtitulo: 'Solución Enterprise para grandes marcas.', 
                detalle: ['Soluciones a medida', 'Integración ERP / CRM', 'SLA garantizado'] 
              },
            ].map((p) => (
              <div 
                key={p.nombre} 
                className={`relative rounded-3xl p-6 flex flex-col justify-between transition-all ${
                  p.popular 
                    ? 'bg-gradient-to-b from-[#1E1722] to-[#12141C] border-2 border-rose-500 shadow-2xl shadow-rose-500/10' 
                    : p.freePlan
                    ? 'bg-[#12141C] border border-rose-500/40 hover:border-rose-500'
                    : 'bg-[#12141C] border border-white/[0.08] hover:border-white/20'
                }`}
              >
                {p.popular && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-rose-500 to-orange-500 text-white text-xs font-semibold px-4 py-1 rounded-full shadow-lg">
                    Más popular
                  </span>
                )}
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-xl text-white">{p.nombre}</h3>
                    {p.freePlan && <span className="text-[10px] font-mono bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded-full border border-rose-500/30">Actual</span>}
                  </div>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-3xl font-bold font-mono tracking-tight text-white">{p.precio}</span>
                    {p.precio !== 'A medida' && <span className="text-xs text-slate-400">/mes</span>}
                  </div>
                  <p className="mt-2 text-xs text-slate-400 min-h-[32px]">{p.subtitulo}</p>
                  
                  <ul className="mt-6 space-y-3 text-xs text-slate-300">
                    {p.detalle.map((d) => (
                      <li key={d} className="flex items-center gap-2">
                        <Check size={14} className="text-rose-400 shrink-0" />
                        <span>{d}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <Link
                  href="/registro"
                  className={`mt-8 w-full py-3 rounded-full text-center text-xs font-medium transition-all ${
                    p.popular
                      ? 'bg-gradient-to-r from-rose-500 to-orange-500 text-white shadow-lg shadow-rose-500/20 hover:opacity-95'
                      : p.freePlan
                      ? 'bg-white text-slate-950 hover:bg-slate-200'
                      : 'bg-white/[0.05] hover:bg-white/[0.1] text-white border border-white/[0.08]'
                  }`}
                >
                  {p.precio === 'A medida' ? 'Contactar' : (p.btnText || `Pagar ${p.nombre}`)}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* NOSOTROS */}
      <section id="nosotros" className="border-t border-white/[0.08] max-w-3xl mx-auto px-6 py-20 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-white">Quiénes somos</h2>
        <p className="mt-4 text-slate-400 leading-relaxed text-base">
          VortexAI nace con el firme objetivo de democratizar la inteligencia artificial para que cualquier tienda online, sin importar su tamaño, disponga de un asistente de ventas de primer nivel sin fricciones técnicas ni costes desmedidos.
        </p>
      </section>

      {/* CONTACTO */}
      <section id="contacto" className="bg-[#0E1017] border-t border-white/[0.08] py-28">
        <div className="max-w-md mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-white">¿Hablamos?</h2>
          <p className="mt-3 text-slate-400 text-center text-sm">¿Requieres un plan corporativo o adaptado a tu volumen? Escríbenos.</p>

          {enviado ? (
            <div className="mt-8 p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center text-emerald-400">
              ¡Mensaje enviado con éxito! Te responderemos en breve.
            </div>
          ) : (
            <form onSubmit={enviarContacto} className="mt-8 space-y-4">
              <input 
                required 
                placeholder="Nombre" 
                className="w-full bg-[#12141C] border border-white/[0.08] rounded-2xl px-5 py-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500 transition-colors" 
              />
              <input 
                required 
                type="email" 
                placeholder="Correo electrónico" 
                className="w-full bg-[#12141C] border border-white/[0.08] rounded-2xl px-5 py-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500 transition-colors" 
              />
              <textarea 
                required 
                placeholder="Cuéntanos brevemente sobre tu tienda online..." 
                rows={4} 
                className="w-full bg-[#12141C] border border-white/[0.08] rounded-2xl px-5 py-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500 transition-colors resize-none" 
              />
              <button 
                type="submit" 
                className="w-full bg-gradient-to-r from-rose-500 to-orange-500 text-white font-medium py-4 rounded-full shadow-lg shadow-rose-500/20 hover:opacity-95 transition-all"
              >
                Enviar mensaje
              </button>
            </form>
          )}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
        <span className="font-semibold text-white">Vortex<span className="text-rose-500">AI</span></span>
        <p>© 2026 VortexAI. Todos los derechos reservados.</p>
      </footer>
    </div>
  )
}

function VortexGraphic() {
  return (
    <div className="pointer-events-none absolute left-1/2 top-10 -translate-x-1/2 w-full max-w-5xl h-96 opacity-30 overflow-hidden flex items-center justify-center">
      <svg className="w-[800px] h-[400px]" viewBox="0 0 1000 500" fill="none" aria-hidden="true">
        {[...Array(6)].map((_, i) => (
          <ellipse 
            key={i} 
            cx="500" 
            cy="250" 
            rx={150 + i * 70} 
            ry={50 + i * 25} 
            stroke="url(#roseGradient)" 
            strokeOpacity={0.7 - i * 0.1} 
            strokeWidth="1.5" 
            strokeDasharray="4 8"
          />
        ))}
        <defs>
          <linearGradient id="roseGradient" x1="0" y1="0" x2="1000" y2="500" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F43F5E" />
            <stop offset="1" stopColor="#FB923C" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  )
}