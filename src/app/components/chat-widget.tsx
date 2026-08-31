'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

type Mensaje = {
  rol: 'usuario' | 'bot'
  texto: string
}

export default function ChatWidget({ tiendaId }: { tiendaId?: number | string }) {
  const [abierto, setAbierto] = useState(false)
  const [nombreAsistente, setNombreAsistente] = useState('Asistente Virtual IA')
  const [colorPrimario, setColorPrimario] = useState('#f43f5e')
  const [posicion, setPosicion] = useState<'derecha' | 'izquierda'>('derecha')
  const [avatarUrl, setAvatarUrl] = useState('default')

  // ============================================================
  // VISITOR ID
  // ============================================================

  const [visitorId, setVisitorId] = useState<string | null>(null)

  // ============================================================
  // EXIT INTENT
  // ============================================================

  const [exitIntent, setExitIntent] = useState(false)

  const exitIntentDisparado = useRef(false)

  // ============================================================
  // MENSAJES
  // ============================================================

  const [mensajes, setMensajes] = useState<Mensaje[]>([
    {
      rol: 'bot',
      texto: '¡Hola! ¿Cómo puedo ayudarte hoy?'
    }
  ])

  const [input, setInput] = useState('')
  const [cargando, setCargando] = useState(false)

  const finRef = useRef<HTMLDivElement>(null)

  // ============================================================
  // OBTENER ID REAL DE LA TIENDA
  // ============================================================

  const obtenerTiendaIdReal = useCallback(() => {

    if (tiendaId) {
      return tiendaId
    }

    if (typeof window !== 'undefined') {

      const params = new URLSearchParams(
        window.location.search
      )

      const idParam =
        params.get('tiendaId') ||
        params.get('user_id')

      if (idParam) {
        return idParam
      }

      const paths =
        window.location.pathname.split('/')

      const posibleId =
        paths[paths.length - 1]

      if (
        posibleId &&
        posibleId !== 'dashboard'
      ) {
        return posibleId
      }
    }

    return '1'

  }, [tiendaId])

  const idActual = obtenerTiendaIdReal()

  // ============================================================
  // CARGAR CONFIGURACIÓN DE LA TIENDA
  // ============================================================

  const cargarConfiguracion = useCallback(async () => {

    try {

      const res = await fetch(
        `/api/obtener-config?tiendaId=${encodeURIComponent(
          String(idActual)
        )}&t=${Date.now()}`,
        {
          cache: 'no-store',
        }
      )

      if (!res.ok) {

        console.error(
          'Error obteniendo configuración:',
          res.status,
          res.statusText
        )

        return
      }

      const data = await res.json()

      console.log(
        'Configuración recibida por el widget:',
        data
      )

      if (data && !data.error) {

        if (data.nombre_asistente) {

          setNombreAsistente(
            data.nombre_asistente
          )

        }

        if (data.color_primario) {

          setColorPrimario(
            data.color_primario
          )

        }

        if (data.avatar_url) {

          setAvatarUrl(
            data.avatar_url
          )

        }

        if (data.posicion) {

          const posLimpia =
            data.posicion
              .toString()
              .toLowerCase()
              .trim()

          setPosicion(
            posLimpia.includes('izq')
              ? 'izquierda'
              : 'derecha'
          )

        }

        // ======================================================
        // EXIT INTENT
        // ======================================================

        setExitIntent(
          data.exit_intent === true
        )

        // ======================================================
        // MENSAJE DE BIENVENIDA
        // ======================================================

        if (data.mensaje_bienvenida) {

          setMensajes([
            {
              rol: 'bot',
              texto:
                data.mensaje_bienvenida,
            },
          ])

        }

      }

    } catch (err) {

      console.error(
        'Error sincronizando configuración del widget:',
        err
      )

    }

  }, [idActual])

  // ============================================================
  // INICIALIZAR CONFIGURACIÓN
  // ============================================================

  useEffect(() => {

    cargarConfiguracion()

    const handleStorageUpdate = () => {
      cargarConfiguracion()
    }

    window.addEventListener(
      'configuracionActualizada',
      handleStorageUpdate
    )

    return () => {

      window.removeEventListener(
        'configuracionActualizada',
        handleStorageUpdate
      )

    }

  }, [cargarConfiguracion])

    // ============================================================
  // COMPROBAR CARRITO ABANDONADO AL ENTRAR
  // ============================================================

    useEffect(() => {
    if (!idActual) return

    const comprobarCarritoAbandonado = async () => {
      try {
        const visitorId =
          typeof window !== 'undefined'
            ? localStorage.getItem('vortexai_visitor_id')
            : null

        if (!visitorId) return

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            mensaje: '',
            tiendaId: idActual,
            visitorId: visitorId,
            inicioWidget: true
          })
        })

        if (!res.ok) return

        const data = await res.json()

        if (
          data.carritoAbandonado === true &&
          data.respuesta
        ) {
          setMensajes((prev) => [
            ...prev,
            {
              rol: 'bot',
              texto: data.respuesta
            }
          ])

          setAbierto(true)
        }
      } catch (error) {
        console.error(
          'VortexAI: error comprobando carrito abandonado:',
          error
        )
      }
    }

    comprobarCarritoAbandonado()
  }, [idActual])

  // ============================================================
  // RECIBIR VISITOR ID DESDE widget.js
  // ============================================================

  useEffect(() => {

    const recibirVisitorId = (
      event: MessageEvent
    ) => {

      if (
        !event.data ||
        typeof event.data !== 'object'
      ) {
        return
      }

      if (
        event.data.type !==
        'VORTEXAI_VISITOR'
      ) {
        return
      }

      if (!event.data.visitorId) {
        return
      }

      setVisitorId(
        event.data.visitorId
      )

      console.log(
        'VortexAI: visitorId recibido:',
        event.data.visitorId
      )

    }

    window.addEventListener(
      'message',
      recibirVisitorId
    )

    // ========================================================
    // AVISAR A widget.js DE QUE EL IFRAME ESTÁ LISTO
    // ========================================================

    window.parent.postMessage(
      {
        type:
          'VORTEXAI_WIDGET_READY'
      },
      '*'
    )

    return () => {

      window.removeEventListener(
        'message',
        recibirVisitorId
      )

    }

  }, [])

  // ============================================================
  // EXIT INTENT
  // ============================================================

  useEffect(() => {

    if (!exitIntent) {
      return
    }

    const detectarExitIntent = (
      event: MouseEvent
    ) => {

      if (
        exitIntentDisparado.current
      ) {
        return
      }

      if (event.clientY <= 10) {

        exitIntentDisparado.current =
          true

        setAbierto(true)

      }

    }

    document.addEventListener(
      'mousemove',
      detectarExitIntent
    )

    return () => {

      document.removeEventListener(
        'mousemove',
        detectarExitIntent
      )

    }

  }, [exitIntent])

  // ============================================================
  // SCROLL AUTOMÁTICO
  // ============================================================

  useEffect(() => {

    finRef.current?.scrollIntoView({
      behavior: 'smooth'
    })

  }, [mensajes, abierto])

  // ============================================================
  // ENVIAR MENSAJE
  // ============================================================

  async function enviarMensaje(
    e: React.FormEvent
  ) {

    e.preventDefault()

    if (!input.trim()) {
      return
    }

    const mensajeUsuario =
      input

    setMensajes((prev) => [
      ...prev,
      {
        rol: 'usuario',
        texto: mensajeUsuario
      }
    ])

    setInput('')
    setCargando(true)

    try {

      const res = await fetch(
        '/api/chat',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json'
          },

          body: JSON.stringify({
            mensaje:
              mensajeUsuario,

            tiendaId:
              idActual,

            // NUEVO:
            // enviamos el visitante
            // identificado por widget.js
            visitorId:
              visitorId
          }),
        }
      )

      const data =
        await res.json()

      setMensajes((prev) => [
        ...prev,
        {
          rol: 'bot',
          texto:
            data.respuesta ||
            data.error ||
            'Lo siento, ha ocurrido un error.'
        },
      ])

    } catch {

      setMensajes((prev) => [
        ...prev,
        {
          rol: 'bot',
          texto:
            'Lo siento, ha ocurrido un error de conexión.'
        }
      ])

    } finally {

      setCargando(false)

    }

  }

  // ============================================================
  // AVATAR
  // ============================================================

  const renderAvatarContent = (
    esCabecera = false
  ) => {

    if (
      avatarUrl.startsWith('http://') ||
      avatarUrl.startsWith('https://')
    ) {

      return (
        <img
          src={avatarUrl}
          alt="Avatar"
          className={`${
            esCabecera
              ? 'w-6 h-6'
              : 'w-full h-full'
          } rounded-full object-cover bg-white`}
        />
      )

    }

    if (avatarUrl === 'sparkle') {

      return (
        <span
          className={
            esCabecera
              ? 'text-base'
              : 'text-2xl'
          }
        >
          ✨
        </span>
      )

    }

    return (
      <span
        className={
          esCabecera
            ? 'text-base'
            : 'text-2xl'
        }
      >
        🤖
      </span>
    )

  }

  // ============================================================
  // POSICIÓN
  // ============================================================

  const posicionContenedor =
    posicion === 'izquierda'
      ? 'fixed bottom-6 left-6'
      : 'fixed bottom-6 right-6'

  const posicionVentana =
    posicion === 'izquierda'
      ? 'left-0'
      : 'right-0'

  // ============================================================
  // INTERFAZ
  // ============================================================

  return (
    <div
      className={`${posicionContenedor} z-[999999] pointer-events-auto bg-transparent`}
    >

      {abierto && (

        <div
          className={`absolute bottom-20 ${posicionVentana} w-80 h-96 bg-white border border-gray-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-200`}
        >

          {/* ==================================================
              CABECERA
          ================================================== */}

          <div
            className="text-white px-4 py-3 font-medium flex justify-between items-center text-sm transition-colors duration-300"
            style={{
              backgroundColor:
                colorPrimario
            }}
          >

            <div className="flex items-center gap-2">

              {renderAvatarContent(true)}

              <span>
                {nombreAsistente}
              </span>

            </div>

            <button
              onClick={() =>
                setAbierto(false)
              }
              className="text-white/80 hover:text-white text-base font-bold cursor-pointer"
            >
              ✕
            </button>

          </div>

          {/* ==================================================
              MENSAJES
          ================================================== */}

          <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50">

            {mensajes.map((m, i) => (

              <div
                key={i}
                className={`max-w-[85%] px-3 py-2 rounded-xl text-sm ${
                  m.rol === 'usuario'
                    ? 'text-white ml-auto rounded-br-none'
                    : 'bg-white border border-gray-200 text-gray-900 rounded-bl-none shadow-sm'
                }`}
                style={
                  m.rol === 'usuario'
                    ? {
                        backgroundColor:
                          colorPrimario
                      }
                    : {}
                }
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

          {/* ==================================================
              INPUT
          ================================================== */}

          <form
            onSubmit={enviarMensaje}
            className="bg-white border-t border-gray-200 p-2.5 flex gap-2"
          >

            <input
              type="text"
              value={input}
              onChange={(e) =>
                setInput(
                  e.target.value
                )
              }
              placeholder="Escribe tu mensaje..."
              className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none"
              style={{
                borderColor:
                  colorPrimario
              }}
            />

            <button
              type="submit"
              disabled={cargando}
              className="text-white px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50 cursor-pointer transition-colors duration-300"
              style={{
                backgroundColor:
                  colorPrimario
              }}
            >
              Enviar
            </button>

          </form>

        </div>

      )}

      {/* ======================================================
          BOTÓN DEL CHAT
      ====================================================== */}

      <button
        onClick={() => {

          setAbierto(!abierto)

          if (!abierto) {
            cargarConfiguracion()
          }

        }}
        className="text-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center hover:scale-105 transition-all duration-300 cursor-pointer overflow-hidden border-2 border-white/20"
        style={{
          backgroundColor:
            colorPrimario
        }}
        aria-label="Abrir chat"
      >

        {abierto
          ? '✕'
          : renderAvatarContent(false)}

      </button>

    </div>
  )
}