'use client'

import { useEffect, useRef, useState } from 'react'
import {
  ArrowRight,
  BarChart3,
  Bot,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  MessageSquare,
  MousePointerClick,
  PackageSearch,
  Play,
  ShieldCheck,
  Sparkles,
  Store,
  Zap,
} from 'lucide-react'

const plans = [
  {
    name: 'Free',
    price: '0',
    description: 'Para probar VortexAI antes de ponerlo en producción.',
    features: ['Configuración de la IA', 'Base de conocimiento', 'Pruebas del asistente', 'Sin widget en producción'],
  },
  {
    name: 'Starter',
    price: '49',
    description: 'El punto de entrada para tiendas que quieren automatizar soporte.',
    features: ['Widget en producción', 'Hasta 1.000 chats/mes', 'Detector de idioma', 'Exit Intent', 'Soporte estándar'],
  },
  {
    name: 'Growth',
    price: '99',
    description: 'Automatización comercial para crecer con cada conversación.',
    popular: true,
    features: ['Hasta 5.000 chats/mes', 'Todas las funciones IA', 'Personalización avanzada', 'Carritos abandonados', 'Analíticas avanzadas'],
  },
  {
    name: 'Pro',
    price: '249',
    description: 'Para marcas con mayor volumen y necesidades de conversión.',
    features: ['Chats ilimitados', 'Automatización avanzada', 'Analíticas completas', 'Soporte prioritario', 'Máxima personalización'],
  },
]

const faqs = [
  ['¿Necesito saber programar?', 'No. Configuras la base de conocimiento desde VortexAI y después instalas una sola línea de código en tu tienda.'],
  ['¿Con qué tiendas funciona?', 'El widget es una integración web universal. El importador de catálogo puede trabajar con Shopify y otras tiendas que expongan productos mediante JSON-LD, enlaces o sitemaps.'],
  ['¿La IA inventa respuestas?', 'El motor está configurado para responder utilizando la información disponible de la tienda y activar un fallback cuando no puede resolver una consulta.'],
  ['¿Puedo personalizar el chatbot?', 'Sí. Puedes cambiar identidad, color, avatar, posición, bienvenida y funciones comerciales según el plan.'],
  ['¿Qué pasa si un cliente necesita una persona?', 'Los flujos híbridos permiten derivar la conversación a formulario, WhatsApp o email cuando se alcanza el umbral configurado.'],
]

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [scrolled, setScrolled] = useState(false)
  const [customOpen, setCustomOpen] = useState(false)
  const [customSent, setCustomSent] = useState(false)
  const [custom, setCustom] = useState({ name: '', email: '', message: '' })
  const revealRef = useRef<HTMLElement[]>([])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    window.addEventListener('scroll', onScroll, { passive: true })

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('is-visible')
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -60px 0px' },
    )

    revealRef.current.forEach((el) => el && observer.observe(el))

    return () => {
      window.removeEventListener('scroll', onScroll)
      observer.disconnect()
    }
  }, [])

  const reveal = (el: HTMLElement | null) => {
    if (el && !revealRef.current.includes(el)) revealRef.current.push(el)
  }

  const submitCustom = (e: React.FormEvent) => {
    e.preventDefault()
    const subject = encodeURIComponent(`VortexAI Custom — ${custom.name}`)
    const body = encodeURIComponent(
      `Nombre: ${custom.name}\nEmail: ${custom.email}\n\nEmpresa / necesidades:\n${custom.message}`,
    )
    window.location.href = `mailto:contact@vortexaicom.com?subject=${subject}&body=${body}`
    setCustomSent(true)
  }

  return (
    <main className="landing-page">
      <nav className={`landing-nav ${scrolled ? 'landing-nav-scrolled' : ''}`}>
        <a href="#top" className="brand">
          <span className="brand-mark"><Sparkles size={16} /></span>
          Vortex<span>AI</span>
        </a>
        <div className="nav-links">
          <a href="#producto">Producto</a>
          <a href="#como-funciona">Cómo funciona</a>
          <a href="#precios">Precios</a>
          <a href="#custom">Custom</a>
          <a href="#faq">FAQ</a>
        </div>
        <div className="nav-actions">
          <a href="/login" className="nav-login">Iniciar sesión</a>
          <a href="/login" className="nav-cta">Empezar gratis <ArrowRight size={15} /></a>
        </div>
      </nav>

      <section id="top" className="hero-section">
        <div className="hero-noise" />
        <div className="hero-grid" />
        <div className="hero-orb hero-orb-one" />
        <div className="hero-orb hero-orb-two" />
        <div className="hero-content">
          <div className="eyebrow reveal" ref={reveal}>AI SALES INFRASTRUCTURE · BUILT FOR ECOMMERCE</div>
          <h1 className="hero-title reveal reveal-delay-1" ref={reveal}>
            Convierte cada
            <span> conversación </span>
            en una oportunidad.
          </h1>
          <p className="hero-copy reveal reveal-delay-2" ref={reveal}>
            VortexAI crea asistentes de IA que conocen tu catálogo, resuelven dudas,
            recuperan carritos y ayudan a vender. Sin montar un equipo de soporte.
          </p>
          <div className="hero-actions reveal reveal-delay-3" ref={reveal}>
            <a href="/login" className="button button-primary">Crear mi asistente <ArrowRight size={17} /></a>
            <a href="#producto" className="button button-ghost"><Play size={15} /> Ver cómo funciona</a>
          </div>
          <div className="hero-trust reveal reveal-delay-4" ref={reveal}>
            <span><ShieldCheck size={15} /> Instalación en minutos</span>
            <span><Zap size={15} /> Sin cambiar tu tienda</span>
            <span><BarChart3 size={15} /> Métricas reales</span>
          </div>
        </div>

        <div className="hero-dashboard reveal reveal-delay-2" ref={reveal}>
          <div className="hero-dashboard-glow" />
          <div className="mock-window">
            <div className="mock-topbar">
              <div className="mock-dots"><i /><i /><i /></div>
              <span>vortexai · dashboard</span>
              <span className="mock-live"><b /> LIVE</span>
            </div>
            <div className="mock-body">
              <aside className="mock-sidebar">
                <div className="mock-logo">V</div>
                <div className="mock-side-active" />
                <i /><i /><i /><i /><i />
              </aside>
              <div className="mock-main">
                <div className="mock-heading">
                  <div><small>OVERVIEW</small><h3>Tu asistente está trabajando.</h3></div>
                  <span className="mock-status"><b /> En producción</span>
                </div>
                <div className="mock-metrics">
                  <div><small>CONVERSACIONES</small><strong>1,284</strong><em>+18.4%</em></div>
                  <div><small>RESOLUCIÓN</small><strong>91.8%</strong><em>+6.2%</em></div>
                  <div><small>VISITANTES</small><strong>842</strong><em>+12.1%</em></div>
                </div>
                <div className="mock-lower">
                  <div className="mock-chart">
                    <small>ACTIVIDAD · 7 DÍAS</small>
                    <div className="fake-chart"><span /><span /><span /><span /><span /><span /><span /><span /></div>
                  </div>
                  <div className="mock-chat">
                    <div className="mini-chat-head"><span>✦</span> VortexAI <b>●</b></div>
                    <div className="mini-msg">Hola 👋 ¿Buscas algo en particular?</div>
                    <div className="mini-msg user">¿Cuánto tarda el envío?</div>
                    <div className="mini-msg">Los pedidos salen en 24h y llegan en 2–3 días.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="scroll-cue"><span /> Scroll para explorar</div>
      </section>

      <section className="marquee-section">
        <div className="marquee-track">
          <span>CATÁLOGO INTELIGENTE</span><b>✦</b><span>RECUPERACIÓN DE CARRITOS</span><b>✦</b>
          <span>EXIT INTENT</span><b>✦</b><span>IA COMERCIAL</span><b>✦</b>
          <span>ANALÍTICAS REALES</span><b>✦</b><span>HANDOVER HUMANO</span><b>✦</b>
        </div>
      </section>

      <section id="producto" className="section product-section">
        <div className="section-intro reveal" ref={reveal}>
          <div className="eyebrow">NO ES OTRO CHATBOT</div>
          <h2>Una capa inteligente entre tu tienda y cada cliente.</h2>
          <p>VortexAI combina conocimiento del catálogo, automatización y analítica en una experiencia diseñada para ecommerce.</p>
        </div>

        <div className="feature-grid">
          {[
            [PackageSearch, 'Catálogo que entiende', 'Importa productos desde CSV o URL y convierte tu información en una base de conocimiento lista para conversar.'],
            [Bot, 'Respuestas con contexto', 'El asistente utiliza catálogo, envíos, políticas y FAQs para responder con el contexto de tu tienda.'],
            [MousePointerClick, 'Recupera intención', 'Exit Intent y carritos abandonados intervienen en el momento en que una compra corre peligro.'],
            [CircleDollarSign, 'Diseñado para vender', 'Cross-selling, modo persuasivo y cupones permiten convertir soporte en oportunidades comerciales.'],
            [BarChart3, 'Datos de verdad', 'Visualiza conversaciones, visitantes, resolución, temas consultados y actividad sin métricas inventadas.'],
            [MessageSquare, 'Humano cuando toca', 'Si la IA no puede resolver una situación, el flujo híbrido puede derivar al equipo.'],
          ].map(([Icon, title, text], index) => {
            const FeatureIcon = Icon as typeof Bot
            return (
              <article className="feature-card reveal" ref={reveal} key={String(title)} style={{ ['--delay' as string]: `${index * 70}ms` }}>
                <span className="feature-number">0{index + 1}</span>
                <div className="feature-icon"><FeatureIcon size={20} /></div>
                <h3>{title as string}</h3>
                <p>{text as string}</p>
                <span className="feature-arrow"><ArrowRight size={16} /></span>
              </article>
            )
          })}
        </div>
      </section>

      <section id="como-funciona" className="section process-section">
        <div className="process-visual reveal" ref={reveal}>
          <div className="orbit orbit-a" />
          <div className="orbit orbit-b" />
          <div className="orbit-core"><Sparkles size={32} /></div>
          <div className="orbit-node node-a"><Store size={17} /></div>
          <div className="orbit-node node-b"><PackageSearch size={17} /></div>
          <div className="orbit-node node-c"><MessageSquare size={17} /></div>
          <div className="orbit-node node-d"><BarChart3 size={17} /></div>
        </div>
        <div className="process-copy reveal reveal-delay-1" ref={reveal}>
          <div className="eyebrow">EN 3 PASOS</div>
          <h2>De cero a asistente comercial sin rehacer tu ecommerce.</h2>
          {[
            ['01', 'Conecta tu conocimiento', 'Sube un CSV, importa tu tienda por URL y añade tus políticas y FAQs.'],
            ['02', 'Define el comportamiento', 'Activa las funciones IA que necesites y personaliza la identidad del asistente.'],
            ['03', 'Instala y mide', 'Copia una línea de código, publica el widget y observa el rendimiento real.'],
          ].map(([num, title, text]) => (
            <div className="process-step" key={num}>
              <span>{num}</span><div><h3>{title}</h3><p>{text}</p></div>
            </div>
          ))}
        </div>
      </section>

      <section className="section dark-panel-section">
        <div className="dark-panel reveal" ref={reveal}>
          <div>
            <div className="eyebrow">INTELIGENCIA + OPERACIÓN</div>
            <h2>Tu equipo deja de responder lo repetitivo y empieza a centrarse en lo importante.</h2>
            <p>VortexAI automatiza las preguntas que frenan la compra y mantiene una salida clara hacia una persona cuando hace falta.</p>
          </div>
          <div className="panel-stats">
            <div><strong>24/7</strong><span>disponibilidad</span></div>
            <div><strong>1 línea</strong><span>para instalar</span></div>
            <div><strong>100%</strong><span>métricas reales</span></div>
          </div>
        </div>
      </section>

      <section className="section testimonial-section">
        <div className="section-intro reveal" ref={reveal}>
          <div className="eyebrow">EXPERIENCIA</div>
          <h2>Una experiencia que se siente como producto, no como plugin.</h2>
        </div>
        <div className="testimonial-grid">
          {[
            ['“', 'Por fin podemos enseñar el catálogo al asistente sin mantener respuestas manuales para cada producto.', 'Equipo ecommerce', 'Retail'],
            ['“', 'La parte que más nos interesa es tener conversaciones y resolución en un mismo lugar, sin inventarnos los datos.', 'Operaciones', 'DTC Brand'],
            ['“', 'La instalación es sencilla, pero lo potente está en lo que puedes activar después: recuperación, cross-selling y handover.', 'Growth', 'Online Store'],
          ].map(([quote, text, author, role]) => (
            <article className="testimonial-card reveal" ref={reveal} key={author}>
              <span className="quote">{quote}</span><p>{text}</p><div><strong>{author}</strong><span>{role}</span></div>
            </article>
          ))}
        </div>
      </section>

      <section id="precios" className="section pricing-section">
        <div className="section-intro reveal" ref={reveal}>
          <div className="eyebrow">PRECIOS</div>
          <h2>Empieza pequeño. Escala cuando el chatbot empiece a aportar.</h2>
          <p>Sin planes confusos. Elige el nivel que encaje con el volumen y la madurez de tu tienda.</p>
        </div>
        <div className="pricing-grid">
          {plans.map((plan, index) => (
            <article className={`pricing-card reveal ${plan.popular ? 'pricing-featured' : ''}`} ref={reveal} key={plan.name} style={{ ['--delay' as string]: `${index * 80}ms` }}>
              {plan.popular && <div className="popular-pill">MÁS ELEGIDO</div>}
              <div className="pricing-name">{plan.name}</div>
              <p>{plan.description}</p>
              <div className="price"><span>€</span>{plan.price}<small>/mes</small></div>
              <div className="pricing-divider" />
              <ul>{plan.features.map(f => <li key={f}><Check size={15} />{f}</li>)}</ul>
              <a href="/login" className={`pricing-button ${plan.popular ? 'button-primary' : 'button-ghost'}`}>
                {plan.name === 'Free' ? 'Probar gratis' : `Elegir ${plan.name}`} <ArrowRight size={15} />
              </a>
            </article>
          ))}
          <article className="pricing-card pricing-custom reveal" ref={reveal}>
            <div className="pricing-name">Custom</div>
            <p>Para equipos con integraciones, volumen o requisitos específicos.</p>
            <div className="price custom-price">A medida</div>
            <div className="pricing-divider" />
            <ul><li><Check size={15} />Integraciones a medida</li><li><Check size={15} />ERP / CRM</li><li><Check size={15} />SLA y soporte dedicado</li></ul>
            <button className="pricing-button button-ghost" onClick={() => setCustomOpen(true)}>Solicitar plan Custom <ArrowRight size={15} /></button>
          </article>
        </div>
      </section>

      <section id="custom" className="section custom-section">
        <div className="custom-panel reveal" ref={reveal}>
          <div className="custom-copy">
            <div className="eyebrow">CUSTOM / ENTERPRISE</div>
            <h2>Una configuración diseñada para tu negocio.</h2>
            <p>Si necesitas integraciones, más volumen, requisitos específicos o un flujo comercial personalizado, cuéntanos tu caso y prepararemos una propuesta.</p>
            <div className="custom-points">
              <span>Integraciones ERP / CRM</span><span>Volumen personalizado</span><span>SLA y soporte dedicado</span><span>Arquitectura a medida</span>
            </div>
          </div>
          <form className="custom-inline-form" onSubmit={submitCustom}>
            {!customSent ? <>
              <label>Nombre<input required placeholder="Tu nombre" value={custom.name} onChange={e => setCustom({ ...custom, name: e.target.value })} /></label>
              <label>Email corporativo<input required type="email" placeholder="nombre@empresa.com" value={custom.email} onChange={e => setCustom({ ...custom, email: e.target.value })} /></label>
              <label>Cuéntanos tu caso<textarea required rows={5} placeholder="Volumen, integraciones, necesidades..." value={custom.message} onChange={e => setCustom({ ...custom, message: e.target.value })} /></label>
              <button className="button button-primary" type="submit">Solicitar contacto <ArrowRight size={16} /></button>
              <small>También puedes escribir directamente a contact@vortexaicom.com.</small>
            </> : <div className="success-state inline"><Check size={28} /><h3>Solicitud preparada.</h3><p>Se ha abierto tu cliente de correo con la información rellenada.</p></div>}
          </form>
        </div>
      </section>

      <section id="faq" className="section faq-section">
        <div className="section-intro reveal" ref={reveal}>
          <div className="eyebrow">FAQ</div><h2>Preguntas frecuentes.</h2>
        </div>
        <div className="faq-list">
          {faqs.map(([q, a], index) => (
            <div className={`faq-item ${openFaq === index ? 'faq-open' : ''} reveal`} ref={reveal} key={q}>
              <button onClick={() => setOpenFaq(openFaq === index ? null : index)}>
                <span>{q}</span><ChevronDown size={18} />
              </button>
              <div className="faq-answer"><p>{a}</p></div>
            </div>
          ))}
        </div>
      </section>

      <section className="final-cta">
        <div className="final-cta-glow" />
        <div className="eyebrow">READY WHEN YOU ARE</div>
        <h2>Haz que tu tienda responda.<br /><span>Y también venda.</span></h2>
        <p>Empieza gratis y construye tu primer asistente de ecommerce con VortexAI.</p>
        <a href="/login" className="button button-primary">Crear mi asistente <ArrowRight size={17} /></a>
      </section>

      <footer className="landing-footer">
        <a href="#top" className="brand"><span className="brand-mark"><Sparkles size={15} /></span>Vortex<span>AI</span></a>
        <div><span>© 2026 VortexAI</span><a href="/login">Acceso</a><a href="#faq">FAQ</a><a href="mailto:contact@vortexaicom.com">Contacto</a></div>
      </footer>

      {customOpen && (
        <div className="modal-backdrop" onMouseDown={() => setCustomOpen(false)}>
          <div className="custom-modal" onMouseDown={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setCustomOpen(false)}>×</button>
            {!customSent ? (
              <>
                <div className="eyebrow">CUSTOM / ENTERPRISE</div>
                <h3>Cuéntanos qué necesitas.</h3>
                <p>Te responderemos desde <strong>contact@vortexaicom.com</strong>.</p>
                <form onSubmit={submitCustom}>
                  <input required placeholder="Nombre" value={custom.name} onChange={e => setCustom({ ...custom, name: e.target.value })} />
                  <input required type="email" placeholder="Email corporativo" value={custom.email} onChange={e => setCustom({ ...custom, email: e.target.value })} />
                  <textarea required rows={5} placeholder="Volumen, integraciones, necesidades..." value={custom.message} onChange={e => setCustom({ ...custom, message: e.target.value })} />
                  <button className="button button-primary" type="submit">Preparar solicitud <ArrowRight size={16} /></button>
                </form>
              </>
            ) : (
              <div className="success-state"><Check size={28} /><h3>Solicitud preparada.</h3><p>Se ha abierto tu cliente de correo para completar el contacto.</p><button className="button button-ghost" onClick={() => setCustomOpen(false)}>Cerrar</button></div>
            )}
          </div>
        </div>
      )}
    </main>
  )
}
