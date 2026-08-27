'use client'

import { useState, useRef, useEffect } from 'react'

type Mensaje = {
  rol: 'usuario' | 'bot'
  texto: string
}

export default function ChatWidget({ tiendaId }: { tiendaId: number }) {
  const [abierto, setAbierto] = useState(false)
  const [mensajes, setMensajes] = useState<Mensaje[]>([
    { rol: 'bot', texto: '¡Hola! ¿En qué puedo ayudarte hoy?' },
  ])
  const [input, setInput] = useState('')
  const [cargando, setCargando] = useState(false)
  const finRef = useRef<HTMLDivElement>(null)

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

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {abierto && (
        <div className="w-80 h-96 bg-white border border-gray-200 rounded-xl shadow-xl flex flex-col mb-3 overflow-hidden">
          <div className="bg-black text-white px-4 py-3 font-medium">
            Asistente de la tienda
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {mensajes.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] px-3 py-2 rounded-lg text-sm ${
                  m.rol === 'usuario'
                    ? 'bg-black text-white ml-auto'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                {m.texto}
              </div>
            ))}
            {cargando && (
              <div className="bg-gray-100 text-gray-500 text-sm px-3 py-2 rounded-lg max-w-[85%]">
                Escribiendo...
              </div>
            )}
            <div ref={finRef} />
          </div>

          <form onSubmit={enviarMensaje} className="border-t border-gray-200 p-2 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu mensaje..."
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={cargando}
              className="bg-black text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
            >
              Enviar
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => setAbierto(!abierto)}
        className="bg-black text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-2xl hover:bg-gray-800 transition"
      >
        {abierto ? '✕' : '💬'}
      </button>
    </div>
  )
}