'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Bot,
  Boxes,
  Check,
  ChevronDown,
  Clipboard,
  Code2,
  Copy,
  Database,
  ExternalLink,
  FileText,
  GitFork,
  Globe2,
  LayoutDashboard,
  LifeBuoy,
  Lock,
  LogOut,
  Menu,
  MessageSquare,
  Mail,
  Palette,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  TrendingUp,
  Upload,
  Users,
  X,
  Zap,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import ChatWidget from '../components/chat-widget'

type Tab = 'overview' | 'catalogo' | 'ia' | 'personalizacion' | 'flujos' | 'analiticas' | 'conversaciones' | 'widget' | 'planes' | 'ajustes'
type Plan = 'free' | 'starter' | 'growth' | 'pro' | 'custom'
type Metric = { totalChats: number; mensajes: number; visitantes: number; resueltas: number; noResueltas: number; tasaResolucion: number }

const PLAN_LEVEL: Record<Plan, number> = { free: 0, starter: 1, growth: 2, pro: 3, custom: 4 }

const NAV: { id: Tab; label: string; icon: typeof LayoutDashboard; section: string }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, section: 'Workspace' },
  { id: 'catalogo', label: 'Catálogo & conocimiento', icon: Database, section: 'Workspace' },
  { id: 'ia', label: 'Funciones IA', icon: Sparkles, section: 'Workspace' },
  { id: 'personalizacion', label: 'Personalización', icon: Palette, section: 'Workspace' },
  { id: 'flujos', label: 'Flujos híbridos', icon: GitFork, section: 'Workspace' },
  { id: 'analiticas', label: 'Analíticas', icon: BarChart3, section: 'Intelligence' },
  { id: 'conversaciones', label: 'Conversaciones', icon: MessageSquare, section: 'Intelligence' },
  { id: 'widget', label: 'Widget & instalación', icon: Code2, section: 'Deployment' },
  { id: 'planes', label: 'Planes', icon: TrendingUp, section: 'Account' },
  { id: 'ajustes', label: 'Ajustes', icon: Settings, section: 'Account' },
]

const features = [
  { key: 'detector_idioma', title: 'Detector de idioma', description: 'Detecta el idioma de la conversación y adapta la respuesta.', min: 'starter' as Plan },
  { key: 'exit_intent', title: 'Exit Intent', description: 'Activa el asistente cuando el visitante muestra intención de abandonar.', min: 'growth' as Plan },
  { key: 'cross_selling', title: 'Cross-selling', description: 'Sugiere productos relacionados cuando existe una oportunidad clara.', min: 'growth' as Plan },
  { key: 'modo_persuasivo', title: 'Modo persuasivo', description: 'Aumenta el enfoque comercial sin perder las reglas de conocimiento.', min: 'growth' as Plan },
  { key: 'carrito_abandonado', title: 'Carritos abandonados', description: 'Detecta carritos inactivos y puede activar el contexto de recuperación.', min: 'pro' as Plan },
  { key: 'analisis_sentimiento', title: 'Análisis de sentimiento', description: 'Ayuda a detectar frustración y priorizar el handover.', min: 'pro' as Plan },
  { key: 'cupones_flash', title: 'Cupones flash', description: 'Permite utilizar el flujo de cupones cuando esté configurado.', min: 'pro' as Plan },
]

const emptyMetric: Metric = { totalChats: 0, mensajes: 0, visitantes: 0, resueltas: 0, noResueltas: 0, tasaResolucion: 0 }

function formatNumber(n: number) { return n.toLocaleString('es-ES') }
function rangeStart(range: string) {
  const d = new Date()
  if (range === '24h') d.setHours(d.getHours() - 24)
  else d.setDate(d.getDate() - (range === '30d' ? 30 : 7))
  return d
}
function classify(text: string) {
  const t = text.toLowerCase()
  if (/env[ií]o|entrega|llega|plazo|transporte/.test(t)) return 'Envíos'
  if (/devol|cambio|reembolso|garant[ií]a/.test(t)) return 'Devoluciones'
  if (/precio|coste|€|descuento|cup[oó]n|oferta/.test(t)) return 'Precios'
  if (/producto|talla|color|stock|disponib|caracter[ií]st/.test(t)) return 'Productos'
  return 'Generales'
}

export default function DashboardPage() {
  const [userId, setUserId] = useState('')
  const [tab, setTab] = useState<Tab>('overview')
  const [mobileNav, setMobileNav] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [range, setRange] = useState('7d')
  const [metrics, setMetrics] = useState<Metric>(emptyMetric)
  const [previousMetrics, setPreviousMetrics] = useState<Metric>(emptyMetric)
  const [topics, setTopics] = useState<{ name: string; count: number }[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [logSearch, setLogSearch] = useState('')
  const [logLoading, setLogLoading] = useState(false)
  const [config, setConfig] = useState<any>({})
  const [catalogCount, setCatalogCount] = useState(0)
  const [csv, setCsv] = useState<File | null>(null)
  const [csvLoading, setCsvLoading] = useState(false)
  const [url, setUrl] = useState('')
  const [urlLoading, setUrlLoading] = useState(false)
  const [widgetCopied, setWidgetCopied] = useState(false)
  const [customOpen, setCustomOpen] = useState(false)
  const [custom, setCustom] = useState({ name: '', email: '', message: '' })

  const currentPlan = (String(config.plan || 'free').toLowerCase() as Plan)
  const planLevel = PLAN_LEVEL[currentPlan] ?? 0

  const updateConfig = (key: string, value: any) => setConfig((prev: any) => ({ ...prev, [key]: value }))

  const loadStore = useCallback(async (id: string) => {
    const { data } = await supabase.from('tiendas').select('*').eq('user_id', id).maybeSingle()
    if (data) {
      setConfig(data)
      setCatalogCount(Array.isArray(data.productos_json) ? data.productos_json.length : 0)
    } else {
      setConfig({ user_id: id, plan: 'free', detector_idioma: true, cross_selling: true, color_primario: '#ff5b6e', nombre_asistente: 'Asistente Virtual IA', posicion: 'derecha', avatar_url: 'moderno' })
    }
  }, [])

  const computeMetrics = useCallback(async (id: string, selectedRange: string, previous = false) => {
    const currentStart = rangeStart(selectedRange)
    const end = previous ? new Date(currentStart) : new Date()
    const start = previous ? new Date(currentStart) : new Date(currentStart)
    if (previous) {
      const span = end.getTime() - start.getTime()
      start.setTime(start.getTime() - span)
    }
    const { data, error } = await supabase
      .from('interacciones_chat')
      .select('id, created_at, conversation_id, visitor_id, remitente, texto, resuelta')
      .eq('user_id', id)
      .gte('created_at', start.toISOString())
      .lt('created_at', end.toISOString())
      .order('created_at', { ascending: false })
      .limit(5000)

    if (error || !data) return emptyMetric
    const byConversation = new Map<string, any[]>()
    data.forEach(row => {
      if (!row.conversation_id) return
      const key = String(row.conversation_id)
      if (!byConversation.has(key)) byConversation.set(key, [])
      byConversation.get(key)!.push(row)
    })
    let resolved = 0
    let unresolved = 0
    byConversation.forEach(rows => {
      const latest = [...rows].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
      if (latest.resuelta === true) resolved++
      else unresolved++
    })
    const visitors = new Set(data.map(x => x.visitor_id).filter(Boolean).map(String)).size
    const totalChats = byConversation.size
    return {
      totalChats,
      mensajes: data.length,
      visitantes: visitors,
      resueltas: resolved,
      noResueltas: unresolved,
      tasaResolucion: totalChats ? Math.round((resolved / totalChats) * 1000) / 10 : 0,
    }
  }, [])

  const loadAnalytics = useCallback(async (id: string, selectedRange: string) => {
    setLoading(true)
    const [now, prev] = await Promise.all([computeMetrics(id, selectedRange), computeMetrics(id, selectedRange, true)])
    setMetrics(now); setPreviousMetrics(prev)

    const start = rangeStart(selectedRange)
    const { data } = await supabase.from('interacciones_chat').select('texto, remitente').eq('user_id', id).gte('created_at', start.toISOString()).limit(5000)
    const counts: Record<string, number> = {}
    ;(data || []).filter(row => row.remitente === 'user' || row.remitente === 'usuario' || row.remitente === 'cliente').forEach(row => { const topic = classify(row.texto || ''); counts[topic] = (counts[topic] || 0) + 1 })
    setTopics(Object.entries(counts).sort((a,b) => b[1]-a[1]).map(([name,count]) => ({ name, count })))
    setLoading(false)
  }, [computeMetrics])

  useEffect(() => {
    let active = true
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !active) { setLoading(false); return }
      setUserId(user.id)
      await loadStore(user.id)
      await loadAnalytics(user.id, range)
    })()
    return () => { active = false }
  }, [loadStore, loadAnalytics, range])

  useEffect(() => {
    if (!userId) return
    const channel = supabase.channel(`vortex-dashboard-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'interacciones_chat', filter: `user_id=eq.${userId}` }, () => loadAnalytics(userId, range))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId, range, loadAnalytics])

  const save = async () => {
    setSaving(true); setNotice('')
    try {
      const payload = {
        user_id: userId,
        color_primario: config.color_primario || '#ff5b6e',
        mensaje_bienvenida: config.mensaje_bienvenida || '¡Hola! 👋 ¿Cómo puedo ayudarte?',
        nombre_asistente: config.nombre_asistente || 'Asistente Virtual IA',
        posicion: config.posicion || 'derecha',
        avatar_url: config.avatar_url || 'moderno',
        tiempos_envio: config.tiempos_envio || '',
        politicas: config.politicas || '',
        faqs: config.faqs || '',
        accion_fallback: config.accion_fallback || 'formulario',
        whatsapp_soporte: config.whatsapp_soporte || '',
        email_soporte: config.email_soporte || '',
        umbral_frustracion: Number(config.umbral_frustracion || 2),
        mensaje_fallback: config.mensaje_fallback || 'No tengo esa información exacta. Podemos derivarte a una persona.',
        detector_idioma: config.detector_idioma !== false,
        exit_intent: config.exit_intent === true,
        cross_selling: config.cross_selling !== false,
        modo_persuasivo: config.modo_persuasivo === true,
        carrito_abandonado: config.carrito_abandonado === true,
        analisis_sentimiento: config.analisis_sentimiento === true,
        cupones_flash: config.cupones_flash === true,
      }
      const res = await fetch('/api/guardar-config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar')
      setConfig((prev: any) => ({ ...prev, ...payload }))
      window.dispatchEvent(new Event('configuracionActualizada'))
      setNotice('Cambios guardados y aplicados.')
    } catch (e: any) {
      setNotice(e.message || 'Error al guardar.')
    } finally { setSaving(false) }
  }

  const uploadCsv = async () => {
    if (!csv) return setNotice('Selecciona un CSV primero.')
    setCsvLoading(true); setNotice('')
    try {
      const fd = new FormData()
      fd.append('archivo_csv', csv); fd.append('user_id', userId)
      const res = await fetch('/api/upload-csv', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'No se pudo importar el CSV')
      setCatalogCount(Number(data.total_productos || 0))
      setNotice(`Catálogo actualizado: ${Number(data.total_productos || 0).toLocaleString('es-ES')} productos.`)
      await loadStore(userId)
    } catch (e: any) { setNotice(e.message || 'Error importando CSV.') }
    finally { setCsvLoading(false) }
  }

  const importUrl = async () => {
    if (!url.trim()) return setNotice('Introduce la URL de tu tienda.')
    setUrlLoading(true); setNotice('')
    try {
      const normalized = /^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`
      new URL(normalized)
      const res = await fetch('/api/import-url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: normalized, user_id: userId }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'No se pudo importar la tienda')
      setCatalogCount(Number(data.total_productos || 0))
      setNotice(`Importación completada: ${Number(data.total_productos || 0).toLocaleString('es-ES')} productos.`)
      await loadStore(userId)
    } catch (e: any) { setNotice(e.message || 'Error importando la tienda.') }
    finally { setUrlLoading(false) }
  }

  const loadLogs = useCallback(async () => {
    if (!userId) return
    setLogLoading(true)
    const { data } = await supabase.from('interacciones_chat').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(500)
    setLogs(data || []); setLogLoading(false)
  }, [userId])

  useEffect(() => { if (tab === 'conversaciones') loadLogs() }, [tab, loadLogs])

  const filteredLogs = useMemo(() => logs.filter(row => {
    const q = logSearch.toLowerCase().trim()
    return !q || String(row.texto || '').toLowerCase().includes(q) || String(row.visitor_id || '').toLowerCase().includes(q)
  }), [logs, logSearch])

  const widgetCode = useMemo(() => {
    if (!userId) return ''
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    return `<script src="${origin}/widget.js" data-tienda-id="${userId}" async></script>`
  }, [userId])

  const copyWidget = async () => {
    if (!widgetCode) return
    try { await navigator.clipboard.writeText(widgetCode); setWidgetCopied(true); setTimeout(() => setWidgetCopied(false), 2200) }
    catch { setNotice('No se pudo copiar automáticamente. Selecciona el código manualmente.') }
  }

  const planLocked = (min: Plan) => planLevel < PLAN_LEVEL[min]
  const changeTab = (next: Tab) => { setTab(next); setMobileNav(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  const metricDelta = (now: number, prev: number) => {
    if (!prev) return now ? '+100%' : '—'
    const delta = ((now - prev) / prev) * 100
    return `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%`
  }

  const storeName = config.nombre_tienda || 'Mi tienda online'
  const health = Math.min(100, Math.round(
    (catalogCount > 0 ? 35 : 0) +
    (config.tiempos_envio ? 15 : 0) +
    (config.politicas ? 15 : 0) +
    (config.faqs ? 10 : 0) +
    (config.nombre_asistente ? 10 : 0) +
    (config.mensaje_bienvenida ? 5 : 0) +
    (config.plan && config.plan !== 'free' ? 10 : 0),
  ))

  const SectionTitle = ({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) => (
    <div className="vx-page-head">
      <div><span className="vx-eyebrow">{eyebrow}</span><h1>{title}</h1>{description && <p>{description}</p>}</div>
    </div>
  )

  const Card = ({ children, className = '' }: { children: ReactNode; className?: string }) => <section className={`vx-card ${className}`}>{children}</section>

  const Toggle = ({ feature }: { feature: typeof features[number] }) => {
    const locked = planLocked(feature.min)
    const value = config[feature.key] === true
    return (
      <button
        type="button"
        disabled={locked}
        onClick={() => updateConfig(feature.key, !value)}
        className={`vx-toggle-row ${locked ? 'vx-locked' : ''}`}
      >
        <div className="vx-toggle-icon">{value ? <ToggleRight size={23} /> : <ToggleLeft size={23} />}</div>
        <div className="vx-toggle-copy"><strong>{feature.title}</strong><span>{feature.description}</span></div>
        <div className={`vx-switch ${value ? 'on' : ''}`}><span /></div>
        {locked && <Lock size={14} className="vx-lock" />}
      </button>
    )
  }

  const inputClass = 'vx-input'

  return (
    <div className="vx-dashboard">
      <aside className={`vx-sidebar ${mobileNav ? 'open' : ''}`}>
        <div className="vx-sidebar-top">
          <div className="vx-brand-row">
            <a href="/" className="vx-brand"><span><Sparkles size={15} /></span>Vortex<span>AI</span></a>
            <button className="vx-mobile-close" onClick={() => setMobileNav(false)}><X size={18} /></button>
          </div>
          <div className="vx-plan-pill">{currentPlan}</div>
          {(['Workspace','Intelligence','Deployment','Account'] as const).map(section => (
            <div className="vx-nav-group" key={section}>
              <small>{section}</small>
              {NAV.filter(n => n.section === section).map(item => {
                const Icon = item.icon
                return <button key={item.id} onClick={() => changeTab(item.id)} className={`vx-nav-item ${tab === item.id ? 'active' : ''}`}><Icon size={17} /><span>{item.label}</span>{item.id === 'widget' && planLocked('starter') && <Lock size={12} />}</button>
              })}
            </div>
          ))}
        </div>
        <div className="vx-sidebar-bottom">
          <div className="vx-support-card"><LifeBuoy size={16} /><div><strong>¿Necesitas ayuda?</strong><span>contact@vortexaicom.com</span></div></div>
          <a href="/login" className="vx-nav-item vx-logout"><LogOut size={17} />Cerrar sesión</a>
        </div>
      </aside>

      <div className="vx-main">
        <header className="vx-topbar">
          <button className="vx-mobile-menu" onClick={() => setMobileNav(true)}><Menu size={20} /></button>
          <div className="vx-breadcrumb"><span>Workspace</span><ChevronDown size={13} /><strong>{NAV.find(x => x.id === tab)?.label}</strong></div>
          <div className="vx-top-actions">
            <span className="vx-live"><i /> Sistema operativo</span>
            <button onClick={() => loadAnalytics(userId, range)} title="Actualizar"><RefreshCw size={16} /></button>
            <a href="/" title="Ir a VortexAI"><ExternalLink size={16} /></a>
          </div>
        </header>

        <main className="vx-content">
          {notice && <div className="vx-notice"><Check size={16} />{notice}<button onClick={() => setNotice('')}><X size={14} /></button></div>}

          {loading && !userId ? (
            <div className="vx-loading"><div className="vx-spinner" /><p>Sincronizando tu workspace…</p></div>
          ) : (
            <>
              {tab === 'overview' && (
                <>
                  <SectionTitle eyebrow="Overview" title={`Buenos días. Tu asistente está listo.`} description={`${storeName} · visión general de actividad, salud del conocimiento y experiencia del cliente.`} />
                  <div className="vx-hero-grid">
                    <Card className="vx-overview-hero">
                      <div className="vx-hero-kicker"><span className="vx-status-dot" /> En producción</div>
                      <h2>Una IA que conoce tu tienda.</h2>
                      <p>Catálogo, políticas, conversaciones y automatizaciones en un único sistema.</p>
                      <div className="vx-hero-actions"><button className="vx-btn primary" onClick={() => changeTab('personalizacion')}>Personalizar asistente <ArrowUpRight size={15} /></button><button className="vx-btn ghost" onClick={() => changeTab('widget')}>Instalar widget</button></div>
                      <div className="vx-hero-tags"><span><ShieldCheck size={13} /> Base de conocimiento</span><span><Activity size={13} /> Datos en vivo</span><span><Zap size={13} /> Automatización</span></div>
                    </Card>
                    <Card className="vx-health">
                      <div className="vx-card-head"><div><span className="vx-eyebrow">Configuración</span><h3>{health}<small>/100</small></h3></div><span className="vx-health-ring" style={{ ['--health' as string]: `${health * 3.6}deg` }}><span>{health}</span></span></div>
                      <p>Indicador de preparación del asistente. No se presenta como una métrica de rendimiento comercial.</p>
                      <div className="vx-progress"><span style={{ width: `${health}%` }} /></div>
                      <button className="vx-link" onClick={() => changeTab('catalogo')}>Mejorar configuración <ArrowUpRight size={14} /></button>
                    </Card>
                  </div>

                  <div className="vx-metric-grid">
                    {([
                      { label: 'Conversaciones', value: metrics.totalChats, delta: metricDelta(metrics.totalChats, previousMetrics.totalChats), Icon: MessageSquare },
                      { label: 'Mensajes procesados', value: metrics.mensajes, delta: metricDelta(metrics.mensajes, previousMetrics.mensajes), Icon: Activity },
                      { label: 'Visitantes únicos', value: metrics.visitantes, delta: metricDelta(metrics.visitantes, previousMetrics.visitantes), Icon: Users },
                      { label: 'Resolución', value: `${metrics.tasaResolucion}%`, delta: metricDelta(metrics.tasaResolucion, previousMetrics.tasaResolucion), Icon: Check },
                    ] as Array<{ label: string; value: ReactNode; delta: string; Icon: typeof Activity }>).map(({ label, value, delta, Icon }) => (
                      <Card className="vx-metric" key={label}>
                        <div className="vx-metric-icon"><Icon size={17} /></div>
                        <span>{label}</span>
                        <strong>{value}</strong>
                        <small>{delta} vs periodo anterior</small>
                      </Card>
                    ))}
                  </div>

                  <div className="vx-two-col">
                    <Card><div className="vx-card-head"><div><span className="vx-eyebrow">Actividad</span><h3>Temas consultados</h3></div><button className="vx-icon-btn" onClick={() => changeTab('analiticas')}><ArrowUpRight size={16} /></button></div>{topics.length ? <div className="vx-topic-list">{topics.slice(0,5).map((x,i) => <div className="vx-topic" key={x.name}><div><span>{String(i+1).padStart(2,'0')}</span><strong>{x.name}</strong></div><b>{formatNumber(x.count)}</b></div>)}</div> : <div className="vx-empty"><BarChart3 size={22}/><span>Aún no hay suficientes conversaciones para mostrar actividad.</span></div>}</Card>
                    <Card><div className="vx-card-head"><div><span className="vx-eyebrow">Experiencia</span><h3>Preview en vivo</h3></div><span className="vx-live small"><i /> Preview</span></div><div className="vx-preview"><ChatWidget tiendaId={userId} modoPreview /></div></Card>
                  </div>
                </>
              )}

              {tab === 'catalogo' && (
                <>
                  <SectionTitle eyebrow="Knowledge base" title="Catálogo & conocimiento" description="Alimenta al asistente con productos, envíos, devoluciones y FAQs." />
                  <div className="vx-import-grid">
                    <Card><div className="vx-card-head"><div><span className="vx-eyebrow">CSV</span><h3>Importar catálogo</h3></div><Upload size={18}/></div><p className="vx-muted">Carga un CSV compatible con tu catálogo actual.</p><input className={inputClass} type="file" accept=".csv,text/csv" onChange={e => setCsv(e.target.files?.[0] || null)} /><button className="vx-btn primary full" disabled={csvLoading} onClick={uploadCsv}>{csvLoading ? 'Procesando…' : 'Importar CSV'} <Upload size={15}/></button></Card>
                    <Card><div className="vx-card-head"><div><span className="vx-eyebrow">URL</span><h3>Importación automática</h3></div><Globe2 size={18}/></div><p className="vx-muted">Busca productos en Shopify, JSON-LD, enlaces y sitemaps.</p><input className={inputClass} placeholder="https://tu-tienda.com" value={url} onChange={e => setUrl(e.target.value)} /><button className="vx-btn primary full" disabled={urlLoading} onClick={importUrl}>{urlLoading ? 'Analizando tienda…' : 'Importar desde URL'} <ArrowUpRight size={15}/></button></Card>
                  </div>
                  <Card><div className="vx-card-head"><div><span className="vx-eyebrow">Knowledge</span><h3>{formatNumber(catalogCount)} productos indexados</h3></div><Boxes size={20}/></div><div className="vx-kb-grid"><label>Envíos<textarea className={inputClass} rows={5} value={config.tiempos_envio || ''} onChange={e => updateConfig('tiempos_envio', e.target.value)} placeholder="Plazos, costes, zonas…" /></label><label>Políticas<textarea className={inputClass} rows={5} value={config.politicas || ''} onChange={e => updateConfig('politicas', e.target.value)} placeholder="Devoluciones, cambios, garantías…" /></label><label>FAQs<textarea className={inputClass} rows={5} value={config.faqs || ''} onChange={e => updateConfig('faqs', e.target.value)} placeholder="Preguntas frecuentes…" /></label></div><div className="vx-save-row"><span>Los cambios de conocimiento se aplican al guardar.</span><button className="vx-btn primary" disabled={saving} onClick={save}>{saving ? 'Guardando…' : 'Guardar conocimiento'} <Check size={15}/></button></div></Card>
                </>
              )}

              {tab === 'ia' && (
                <>
                  <SectionTitle eyebrow="AI engine" title="Funciones IA" description="Activa capacidades comerciales según el plan de tu cuenta." />
                  <div className="vx-feature-grid">{features.map(feature => <Card key={feature.key}><Toggle feature={feature} /></Card>)}</div>
                  <Card className="vx-save-banner"><div><span className="vx-eyebrow">Aplicar cambios</span><h3>Las funciones se guardan en la configuración de tu tienda.</h3></div><button className="vx-btn primary" disabled={saving} onClick={save}>{saving ? 'Guardando…' : 'Guardar funciones'} <Check size={15}/></button></Card>
                </>
              )}

              {tab === 'personalizacion' && (
                <>
                  <SectionTitle eyebrow="Brand system" title="Personalización avanzada" description="Haz que el asistente parezca una parte nativa de la marca." />
                  {planLocked('growth') ? <Card className="vx-locked-panel"><Lock size={24}/><h3>Disponible desde Growth</h3><p>La personalización avanzada se desbloquea en Growth, Pro y Custom.</p><button className="vx-btn primary" onClick={() => changeTab('planes')}>Ver planes <ArrowUpRight size={15}/></button></Card> :
                    <div className="vx-settings-grid"><Card><span className="vx-eyebrow">Identidad</span><h3>Cómo se presenta la IA</h3><label>Nombre del asistente<input className={inputClass} value={config.nombre_asistente || ''} onChange={e => updateConfig('nombre_asistente', e.target.value)} /></label><label>Mensaje de bienvenida<textarea className={inputClass} rows={4} value={config.mensaje_bienvenida || ''} onChange={e => updateConfig('mensaje_bienvenida', e.target.value)} /></label><label>Posición<div className="vx-segment"><button className={config.posicion === 'izquierda' ? 'active' : ''} onClick={() => updateConfig('posicion','izquierda')}>Izquierda</button><button className={config.posicion !== 'izquierda' ? 'active' : ''} onClick={() => updateConfig('posicion','derecha')}>Derecha</button></div></label></Card><Card><span className="vx-eyebrow">Visual</span><h3>Marca del widget</h3><label>Color principal<div className="vx-color-row"><input type="color" value={config.color_primario || '#ff5b6e'} onChange={e => updateConfig('color_primario', e.target.value)} /><input className={inputClass} value={config.color_primario || '#ff5b6e'} onChange={e => updateConfig('color_primario', e.target.value)} /></div></label><label>Avatar<select className={inputClass} value={config.avatar_url || 'moderno'} onChange={e => updateConfig('avatar_url', e.target.value)}><option value="moderno">Robot moderno</option><option value="sparkle">✨ Chispa IA</option><option value="tienda">🛍️ Tienda</option></select></label><div className="vx-mini-preview"><ChatWidget tiendaId={userId} modoPreview /></div></Card><div className="vx-save-row span-2"><span>La preview usa la configuración real de tu tienda.</span><button className="vx-btn primary" disabled={saving} onClick={save}>{saving ? 'Guardando…' : 'Guardar y aplicar'} <Check size={15}/></button></div></div>}
                </>
              )}

              {tab === 'flujos' && (
                <>
                  <SectionTitle eyebrow="Human handover" title="Flujos híbridos" description="Diseña qué ocurre cuando la IA no puede resolver una consulta. Cada canal se conecta de verdad con el visitante." />

                  <div className="vx-flow-hero">
                    <div className="vx-flow-hero-icon"><GitFork size={19} /></div>
                    <div><strong>Derivación inteligente</strong><span>Después del número de intentos configurado, VortexAI deja de insistir y muestra el canal de contacto que hayas elegido.</span></div>
                    <div className="vx-flow-status"><i /> Activo</div>
                  </div>

                  <div className="vx-settings-grid vx-flow-grid">
                    <Card className="vx-flow-card">
                      <div className="vx-card-head">
                        <div><span className="vx-eyebrow">Fallback</span><h3>Canal de contacto</h3></div>
                        <ShieldCheck size={18} />
                      </div>
                      <p className="vx-muted">Elige dónde debe llevar al cliente cuando la IA no pueda resolver su consulta.</p>

                      <div className="vx-channel-grid">
                        <button type="button" className={`vx-channel ${config.accion_fallback === 'formulario' || !config.accion_fallback ? 'active' : ''}`} onClick={() => updateConfig('accion_fallback','formulario')}>
                          <FileText size={18}/><span><strong>Formulario</strong><small>Captura los datos del lead</small></span><Check size={15} />
                        </button>
                        <button type="button" className={`vx-channel ${config.accion_fallback === 'whatsapp' ? 'active' : ''}`} onClick={() => updateConfig('accion_fallback','whatsapp')}>
                          <MessageSquare size={18}/><span><strong>WhatsApp</strong><small>Abre una conversación directa</small></span><Check size={15} />
                        </button>
                        <button type="button" className={`vx-channel ${config.accion_fallback === 'email' ? 'active' : ''}`} onClick={() => updateConfig('accion_fallback','email')}>
                          <Mail size={18}/><span><strong>Email</strong><small>Abre el correo del cliente</small></span><Check size={15} />
                        </button>
                      </div>

                      {config.accion_fallback === 'whatsapp' && (
                        <div className="vx-channel-config">
                          <label>WhatsApp de soporte<input className={inputClass} value={config.whatsapp_soporte || ''} onChange={e => updateConfig('whatsapp_soporte', e.target.value)} placeholder="+34 600 000 000" inputMode="tel" /></label>
                          <div className="vx-inline-help"><span>Usa el número con prefijo internacional.</span>{String(config.whatsapp_soporte || '').replace(/\D/g,'').length >= 9 && <a href={`https://wa.me/${String(config.whatsapp_soporte).replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer">Probar WhatsApp <ArrowUpRight size={12}/></a>}</div>
                        </div>
                      )}

                      {config.accion_fallback === 'email' && (
                        <div className="vx-channel-config">
                          <label>Email de soporte<input className={inputClass} type="email" value={config.email_soporte || ''} onChange={e => updateConfig('email_soporte', e.target.value)} placeholder="soporte@tutienda.com" /></label>
                          <div className="vx-inline-help"><span>Se abrirá el cliente de correo del visitante.</span>{String(config.email_soporte || '').includes('@') && <a href={`mailto:${String(config.email_soporte).trim()}`} target="_blank" rel="noopener noreferrer">Probar email <ArrowUpRight size={12}/></a>}</div>
                        </div>
                      )}

                      {config.accion_fallback === 'formulario' || !config.accion_fallback ? (
                        <div className="vx-form-info"><FileText size={15}/><span>El formulario recoge nombre, email y consulta y guarda el lead en tus conversaciones.</span></div>
                      ) : null}

                      <label>Mensaje de fallback<textarea className={inputClass} rows={4} value={config.mensaje_fallback || ''} onChange={e => updateConfig('mensaje_fallback', e.target.value)} placeholder="No he podido resolverlo. Te pongo en contacto con nuestro equipo." /></label>
                    </Card>

                    <Card className="vx-flow-card">
                      <div className="vx-card-head">
                        <div><span className="vx-eyebrow">Frustration guard</span><h3>Cuándo derivar</h3></div>
                        <Activity size={18} />
                      </div>
                      <p className="vx-muted">Controla cuántas respuestas sin resolver deben producirse antes de mostrar el canal humano.</p>
                      <label>Intentos fallidos<select className={inputClass} value={String(config.umbral_frustracion || 2)} onChange={e => updateConfig('umbral_frustracion', Number(e.target.value))}><option value="1">Después de 1 intento</option><option value="2">Después de 2 intentos</option><option value="3">Después de 3 intentos</option></select></label>
                      <div className="vx-threshold">
                        {[1,2,3].map(n => <div key={n} className={`vx-threshold-step ${Number(config.umbral_frustracion || 2) >= n ? 'active' : ''}`}><span>{n}</span><small>{n === 1 ? 'Primera duda' : n === 2 ? 'Segundo intento' : 'Derivación'}</small></div>)}
                      </div>
                      <div className="vx-callout"><ShieldCheck size={17}/><p>El motor conserva el contexto de la conversación para que el cliente no tenga que repetir toda su consulta.</p></div>
                      <div className="vx-flow-test"><span><strong>¿Quieres comprobarlo?</strong> Guarda la configuración y prueba una pregunta que no exista en el catálogo.</span><span className="vx-flow-badge">Canal: {config.accion_fallback === 'whatsapp' ? 'WhatsApp' : config.accion_fallback === 'email' ? 'Email' : 'Formulario'}</span></div>
                    </Card>

                    <div className="vx-save-row span-2 vx-flow-save"><div><strong>Listo para producción</strong><span>Los cambios se guardan en Supabase y se aplican al motor de conversación.</span></div><button className="vx-btn primary" disabled={saving} onClick={save}>{saving ? 'Guardando…' : 'Guardar y aplicar'} <Check size={15}/></button></div>
                  </div>
                </>
              )}

              {tab === 'analiticas' && (
                <>
                  <SectionTitle eyebrow="Analytics" title="Analíticas de rendimiento" description="Datos calculados a partir de las interacciones reales registradas por VortexAI." />
                  <div className="vx-range"><button className={range === '24h' ? 'active' : ''} onClick={() => setRange('24h')}>24h</button><button className={range === '7d' ? 'active' : ''} onClick={() => setRange('7d')}>7 días</button><button className={range === '30d' ? 'active' : ''} onClick={() => setRange('30d')}>30 días</button></div>
                  <div className="vx-metric-grid">
                    <Card className="vx-metric"><span>Conversaciones</span><strong>{formatNumber(metrics.totalChats)}</strong><small>{metricDelta(metrics.totalChats, previousMetrics.totalChats)} vs anterior</small></Card>
                    <Card className="vx-metric"><span>Mensajes</span><strong>{formatNumber(metrics.mensajes)}</strong><small>{metricDelta(metrics.mensajes, previousMetrics.mensajes)} vs anterior</small></Card>
                    <Card className="vx-metric"><span>Visitantes</span><strong>{formatNumber(metrics.visitantes)}</strong><small>{metricDelta(metrics.visitantes, previousMetrics.visitantes)} vs anterior</small></Card>
                    <Card className="vx-metric"><span>Resolución</span><strong>{metrics.tasaResolucion}%</strong><small>{formatNumber(metrics.resueltas)} resueltas · {formatNumber(metrics.noResueltas)} sin resolver</small></Card>
                  </div>
                  <div className="vx-two-col"><Card><div className="vx-card-head"><div><span className="vx-eyebrow">Topics</span><h3>Qué preguntan tus clientes</h3></div></div>{topics.length ? <div className="vx-topic-list">{topics.map((x,i) => <div className="vx-topic" key={x.name}><div><span>{String(i+1).padStart(2,'0')}</span><strong>{x.name}</strong></div><b>{formatNumber(x.count)}</b></div>)}</div> : <div className="vx-empty"><BarChart3 size={22}/><span>Sin datos todavía.</span></div>}</Card><Card><div className="vx-card-head"><div><span className="vx-eyebrow">Export</span><h3>Exportar conversaciones</h3></div><FileText size={18}/></div><p className="vx-muted">Genera un CSV con las interacciones reales de tu cuenta.</p><button className="vx-btn primary full" onClick={async () => { const { data } = await supabase.from('interacciones_chat').select('created_at,conversation_id,visitor_id,remitente,texto,resuelta').eq('user_id', userId).order('created_at',{ascending:false}).limit(5000); if (!data?.length) return setNotice('No hay datos suficientes para exportar.'); const header='Fecha,Conversacion,Visitante,Remitente,Resuelta,Mensaje\\n'; const body=data.map(r=>[new Date(r.created_at).toISOString(),r.conversation_id||'',r.visitor_id||'',r.remitente||'',String(r.resuelta ?? ''),`"${String(r.texto||'').replace(/"/g,'""')}"`].join(',')).join('\\n'); const blob=new Blob([header+body],{type:'text/csv;charset=utf-8'}); const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`vortexai-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(a.href) }}>Descargar CSV <DownloadIcon /></button></Card></div>
                </>
              )}

              {tab === 'conversaciones' && (
                <>
                  <SectionTitle eyebrow="Live conversations" title="Conversaciones" description="Historial real de interacciones procesadas por tu asistente." />
                  <Card><div className="vx-toolbar"><div className="vx-search"><Search size={15}/><input placeholder="Buscar mensaje o visitante…" value={logSearch} onChange={e => setLogSearch(e.target.value)} /></div><button className="vx-btn ghost" onClick={loadLogs}><RefreshCw size={15}/> Actualizar</button></div>{logLoading ? <div className="vx-empty">Cargando conversaciones…</div> : filteredLogs.length ? <div className="vx-table-wrap"><table className="vx-table"><thead><tr><th>Fecha</th><th>Remitente</th><th>Conversación</th><th>Mensaje</th><th>Estado</th></tr></thead><tbody>{filteredLogs.map((row,i)=><tr key={row.id || i}><td>{new Date(row.created_at).toLocaleString('es-ES')}</td><td><span className={`vx-badge ${row.remitente === 'ai' ? 'ai' : 'user'}`}>{row.remitente}</span></td><td className="mono">{row.conversation_id ? String(row.conversation_id).slice(0,8) : '—'}</td><td className="message-cell">{row.texto}</td><td>{row.resuelta === true ? <span className="vx-resolved">Resuelta</span> : <span className="vx-unresolved">Pendiente</span>}</td></tr>)}</tbody></table></div> : <div className="vx-empty"><MessageSquare size={22}/><span>No hay conversaciones registradas todavía.</span></div>}</Card>
                </>
              )}

              {tab === 'widget' && (
                <>
                  <SectionTitle eyebrow="Deployment" title="Widget & instalación" description="Conecta el asistente a cualquier ecommerce mediante una integración universal." />
                  {planLocked('starter') ? <Card className="vx-locked-panel"><Lock size={24}/><h3>Widget bloqueado en Free</h3><p>El widget de producción está disponible desde Starter.</p><button className="vx-btn primary" onClick={() => changeTab('planes')}>Actualizar plan <ArrowUpRight size={15}/></button></Card> :
                    <><Card><div className="vx-card-head"><div><span className="vx-eyebrow">Universal embed</span><h3>Tu código de instalación</h3></div><Code2 size={20}/></div><p className="vx-muted">Pega esta línea antes de &lt;/body&gt; en tu ecommerce.</p><div className="vx-code"><code>{widgetCode}</code><button onClick={copyWidget}>{widgetCopied ? <Check size={17}/> : <Copy size={17}/>}<span>{widgetCopied ? 'Copiado' : 'Copiar'}</span></button></div></Card><div className="vx-install-grid"><Card><Globe2 size={19}/><h3>Shopify</h3><p>Temas → Editar código → theme.liquid → antes de &lt;/body&gt;.</p></Card><Card><Database size={19}/><h3>WooCommerce</h3><p>Usa el footer de tu tema o un plugin de inserción de scripts.</p></Card><Card><Code2 size={19}/><h3>Custom</h3><p>Compatible con HTML, React, Next.js, Vue y otras aplicaciones web.</p></Card></div></>}
                </>
              )}

              {tab === 'planes' && (
                <>
                  <SectionTitle eyebrow="Account" title="Planes" description="Gestiona tu suscripción. Los planes de pago te llevan directamente a Stripe." />
                  <div className="vx-plans">{[
                    { id: 'free' as Plan, name: 'Free', price: '0', desc: 'Prueba y configuración', href: '' },
                    { id: 'starter' as Plan, name: 'Starter', price: '49', desc: 'Widget + automatización', href: 'https://buy.stripe.com/5kQcMY3K76wE9hJ5Jq7ss02' },
                    { id: 'growth' as Plan, name: 'Growth', price: '99', desc: 'IA comercial avanzada', href: 'https://buy.stripe.com/7sY9AM80ndZ60Ld3Bi7ss03' },
                    { id: 'pro' as Plan, name: 'Pro', price: '249', desc: 'Automatización completa', href: 'https://buy.stripe.com/fZu4gs5Sf5sAalNc7O7ss04' },
                    { id: 'custom' as Plan, name: 'Custom', price: 'A medida', desc: 'Enterprise', href: '' },
                  ].map((plan) => <Card key={plan.id} className={`vx-plan-card ${currentPlan === plan.id ? 'selected' : ''}`}><span className="vx-eyebrow">{plan.name}</span><strong>{plan.price === '0' ? '€0' : plan.price === 'A medida' ? 'A medida' : `€${plan.price}`}<small>{plan.price !== 'A medida' && '/mes'}</small></strong><p>{plan.desc}</p>{currentPlan === plan.id ? <span className="vx-current-plan"><Check size={13}/> Plan actual</span> : plan.id === 'free' ? <span className="vx-muted">Plan gratuito</span> : plan.id === 'custom' ? <button className="vx-btn ghost full" onClick={() => setCustomOpen(true)}>Contactar</button> : <a className="vx-btn primary full" href={plan.href} target="_self" rel="noopener noreferrer">Continuar con {plan.name} <ExternalLink size={13}/></a>}</Card>)}</div>
                  <Card className="vx-plan-note"><ShieldCheck size={17}/><p>Starter 49 €, Growth 99 € y Pro 249 € al mes. El checkout se realiza en Stripe. El plan de la cuenta debe actualizarse mediante el flujo de suscripción/webhook correspondiente; no se cambia manualmente desde este panel.</p></Card>
                </>
              )}

              {tab === 'ajustes' && (
                <>
                  <SectionTitle eyebrow="Settings" title="Ajustes de cuenta" description="Información de tu workspace y configuración operativa." />
                  <div className="vx-settings-grid"><Card><span className="vx-eyebrow">Workspace</span><h3>Identidad</h3><label>Nombre de tienda<input className={inputClass} value={config.nombre_tienda || ''} onChange={e => updateConfig('nombre_tienda', e.target.value)} placeholder="Mi tienda" /></label><label>Plan actual<div className="vx-readonly">{currentPlan}</div></label><label>User ID<div className="vx-readonly mono">{userId}</div></label></Card><Card><span className="vx-eyebrow">Seguridad</span><h3>Estado</h3><div className="vx-security"><ShieldCheck size={20}/><div><strong>Conexión Supabase activa</strong><span>La cuenta se identifica mediante la sesión autenticada.</span></div></div><div className="vx-security"><Lock size={20}/><div><strong>Configuración protegida</strong><span>Los secretos del backend no se exponen en este panel.</span></div></div></Card><div className="vx-save-row span-2"><span>El nombre de tienda se mantiene local a tu configuración actual.</span><button className="vx-btn primary" onClick={save} disabled={saving}>{saving ? 'Guardando…' : 'Guardar ajustes'} <Check size={15}/></button></div></div>
                </>
              )}
            </>
          )}
        </main>
      </div>

      {customOpen && <div className="vx-modal-backdrop" onMouseDown={() => setCustomOpen(false)}><div className="vx-modal" onMouseDown={e => e.stopPropagation()}><button onClick={() => setCustomOpen(false)} className="vx-modal-close"><X size={18}/></button><span className="vx-eyebrow">CUSTOM / ENTERPRISE</span><h2>Hablemos de tu caso.</h2><p>Se preparará un correo para <strong>contact@vortexaicom.com</strong>.</p><form onSubmit={e => { e.preventDefault(); const subject=encodeURIComponent(`VortexAI Custom — ${custom.name}`); const body=encodeURIComponent(`Nombre: ${custom.name}\nEmail: ${custom.email}\n\n${custom.message}`); window.location.href=`mailto:contact@vortexaicom.com?subject=${subject}&body=${body}`; setCustomOpen(false) }}><input className={inputClass} required placeholder="Nombre" value={custom.name} onChange={e => setCustom({...custom,name:e.target.value})}/><input className={inputClass} required type="email" placeholder="Email" value={custom.email} onChange={e => setCustom({...custom,email:e.target.value})}/><textarea className={inputClass} required rows={5} placeholder="Necesidades, volumen, integraciones…" value={custom.message} onChange={e => setCustom({...custom,message:e.target.value})}/><button className="vx-btn primary full">Preparar solicitud <ArrowUpRight size={15}/></button></form></div></div>}
    </div>
  )
}

function DownloadIcon() { return <Clipboard size={15} /> }
