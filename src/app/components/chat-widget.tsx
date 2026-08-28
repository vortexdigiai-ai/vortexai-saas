'use client'

import { useState, useRef, useEffect } from 'react'

type Mensaje = {
  rol: 'usuario' | 'bot'
  texto: string
}

export default function ChatWidget({ tiendaId }: { tiendaId: number }) {
  const [abierto, setAbierto] = useState(false)
  const [nombreAsistente, setNombreAsistente] = useState('Asistente de la tienda')
  const [mensajeBienvenida, setMensajeBienvenida] = useState('¡Hola! ¿En qué puedo ayudarte hoy?')
  const [colorPrimario, setColorPrimario] = useState('#000000')
  const [posicion, setPosicion] = useState<'derecha' | 'izquierda'>('derecha')

  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [input, setInput] = useState('')
  const [cargando, setCargando] = useState(false)
  const finRef = useRef<HTMLDivElement>(null)

  // Función para consultar la configuración a Supabase
  useEffect(() => {
    async function cargarConfiguracion() {
      try {
        const res = await fetch(`/api/obtener-config?tiendaId=${tiendaId}`)
        if (!res.ok) return
        const data = await res.json()

        if (data) {
          if (data.nombre_asistente) setNombreAsistente(data.nombre_asistente)
          if (data.mensaje_bienvenida && mensajes.length <= 1) {
            setMensajeBienvenida(data.mensaje_bienvenida)
            setMensajes([{ rol: 'bot', texto: data.mensaje_bienvenida }])
          }
          if (data.color_primario) setColorPrimario(data.color_primario)
          
          if (data.posicion) {
            const posLimpia = data.posicion.toString().toLowerCase().trim()
            if (posLimpia === 'izquierda' || posLimpia === 'left') {
              setPosicion('izquierda')
            } else {
              setPosicion('derecha')
            }
          }
        }
      } catch (err) {
        console.error('Error sincronizando widget:', err)
      }
    }

    if (!tiendaId) return

    // Carga inicial
    cargarConfiguracion()

    // Sincronización en tiempo real cada 3 segundos sin recargar la página
    const intervalo = setInterval(cargarConfiguracion, 3000)
    return () => clearInterval(intervalo)
  }, [tiendaId])

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes])

  async function enviarMensaje(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim()) return

    const mensajeUsuario = input
    setMensajes((prev) => [...prev, { rol: 'usuario', texto: mensajeUsuario }])
    setInput('')
    setCargando(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensaje: mensajeUsuario, tiendaId }),
      })
      const data = await res.json()

      setMensajes((prev) => [
        ...prev,
        { rol: 'bot', texto: data.respuesta || 'Lo siento, ha ocurrido un error.' },
      ])
    } catch {
      setMensajes((prev) => [
        ...prev,
        { rol: 'bot', texto: 'Lo siento, ha ocurrido un error de conexión.' },
      ])
    } finally {
      setCargando(false)
    }
  }

  // Clases dinámicas exactas según la posición (izquierda o derecha)
  const posicionContenedor = posicion === 'izquierda' ? 'fixed bottom-6 left-6' : 'fixed bottom-6 right-6'
  const posicionVentana = posicion === 'izquierda' ? 'left-0' : 'right-0'

  return (
    <div className={`${posicionContenedor} z-[999999] pointer-events-auto bg-transparent`}>
      {abierto && (
        <div className={`absolute bottom-20 ${posicionVentana} w-80 h-96 bg-white border border-gray-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-200`}>
          <div 
            className="text-white px-4 py-3 font-medium flex justify-between items-center text-sm"
            style={{ backgroundColor: colorPrimario }}
          >
            <span>{nombreAsistente}</span>
            <button 
              onClick={() => setAbierto(false)}
              className="text-white/80 hover:text-white text-base font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50">
            {mensajes.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] px-3 py-2 rounded-xl text-sm ${
                  m.rol === 'usuario'
                    ? 'text-white ml-auto rounded-br-none'
                    : 'bg-white border border-gray-200 text-gray-900 rounded-bl-none shadow-sm'
                }`}
                style={m.rol === 'usuario' ? { backgroundColor: colorPrimario } : {}}
              >
                {m.texto}
              </div>
            ))}
            {cargando && (
              <div className="bg-white border border-gray-200 text-gray-500 text-sm px-3 py-2 rounded-xl rounded-bl-none max-w-[85%] shadow-sm">
                Escribiendo...
              </div>
            )}
            <div ref={finRef} />
          </div>

          <form onSubmit={enviarMensaje} className="bg-white border-t border-gray-200 p-2.5 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu mensaje..."
              className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none"
              style={{ borderColor: colorPrimario }}
            />
            <button
              type="submit"
              disabled={cargando}
              className="text-white px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50 cursor-pointer"
              style={{ backgroundColor: colorPrimario }}
            >
              Enviar
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => setAbierto(!abierto)}
        className="text-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-2xl hover:scale-105 transition-transform cursor-pointer"
        style={{ backgroundColor: colorPrimario }}
        aria-label="Abrir chat"
      >
        {abierto ? '✕' : '💬'}
      </button>
    </div>
  )
}