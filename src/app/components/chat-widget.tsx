'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

type Mensaje = {
  rol: 'usuario' | 'bot'
  texto: string
}

export default function ChatWidget({
  tiendaId,
  modoPreview = false,
}: {
  tiendaId?: number | string
  modoPreview?: boolean
}) {
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

  // ============================================================
  // ESTADO DE REGLAS DE ESCAPE / HANDOVER
  // ============================================================

  const [fallbackIntentos, setFallbackIntentos] = useState(0)

  const [handover, setHandover] = useState<{
    action:
      | 'formulario'
      | 'whatsapp'
      | 'email'
    whatsappUrl?: string | null
    emailUrl?: string | null
  } | null>(null)

  const [formHandover, setFormHandover] = useState({
    nombre: '',
    email: '',
    mensaje: ''
  })

  const [enviandoHandover, setEnviandoHandover] =
    useState(false)

  const [handoverEnviado, setHandoverEnviado] =
    useState(false)

  const finRef = useRef<HTMLDivElement>(null)

  const carritoComprobado = useRef(false)
  const estadoRestaurado = useRef(false)
  const [estadoHidratado, setEstadoHidratado] = useState(false)

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

        if (data.mensaje_bienvenida && !estadoRestaurado.current) {

          setMensajes((prev) => {
            if (prev.length > 1) return prev
            if (prev.length === 1 && prev[0]?.texto === data.mensaje_bienvenida) return prev
            return [
              {
                rol: 'bot',
                texto: data.mensaje_bienvenida,
              },
            ]
          })

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
  // RESTAURAR EL ESTADO DEL CHAT
  // ============================================================
  useEffect(() => {
    if (typeof window === 'undefined' || !idActual || estadoRestaurado.current) return

    try {
      const key = `vortexai_chat_state_${String(idActual)}`
      const raw = window.sessionStorage.getItem(key)

      if (raw) {
        const estado = JSON.parse(raw)

        if (Array.isArray(estado.mensajes) && estado.mensajes.length > 0) {
          setMensajes(estado.mensajes)
        }

        if (typeof estado.input === 'string') setInput(estado.input)
        if (typeof estado.fallbackIntentos === 'number') setFallbackIntentos(estado.fallbackIntentos)
        if (estado.handover && typeof estado.handover === 'object') setHandover(estado.handover)
        if (estado.formHandover && typeof estado.formHandover === 'object') setFormHandover({
          nombre: String(estado.formHandover.nombre || ''),
          email: String(estado.formHandover.email || ''),
          mensaje: String(estado.formHandover.mensaje || ''),
        })
        if (estado.handoverEnviado === true) setHandoverEnviado(true)
      }
    } catch (error) {
      console.error('VortexAI: no se pudo restaurar el estado del chat:', error)
    } finally {
      estadoRestaurado.current = true
      setEstadoHidratado(true)
    }
  }, [idActual])

  // Guardar el estado para que un remount o recarga accidental no borre el formulario.
  useEffect(() => {
    if (typeof window === 'undefined' || !idActual || !estadoHidratado) return

    try {
      window.sessionStorage.setItem(
        `vortexai_chat_state_${String(idActual)}`,
        JSON.stringify({
          mensajes,
          input,
          fallbackIntentos,
          handover,
          formHandover,
          handoverEnviado,
        })
      )
    } catch (error) {
      console.error('VortexAI: no se pudo guardar el estado del chat:', error)
    }
  }, [idActual, estadoHidratado, mensajes, input, fallbackIntentos, handover, formHandover, handoverEnviado])

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
  // MODO PREVIEW
  // ============================================================
  // En el Overview el mismo ChatWidget se muestra abierto y ocupa
  // todo el contenedor. Usa exactamente el mismo backend y configuración.
  useEffect(() => {
    if (modoPreview) {
      setAbierto(true)
    }
  }, [modoPreview])


// COMPROBAR CARRITO ABANDONADO AL ENTRAR
// ============================================================

useEffect(() => {
  if (!idActual) return

  // Esperamos a que widget.js nos entregue el visitorId
  if (!visitorId) return

  // Evitamos comprobar el mismo carrito varias veces
  if (carritoComprobado.current) return

  carritoComprobado.current = true

  const comprobarCarritoAbandonado = async () => {
    try {
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

      if (!res.ok) {
        console.error(
          'VortexAI: error comprobando carrito abandonado:',
          res.status,
          res.statusText
        )

        return
      }

      const data = await res.json()

      console.log(
        'VortexAI: comprobación de carrito:',
        data
      )

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

        // Abrimos automáticamente el chatbot
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

}, [idActual, visitorId])



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

  setMensajes((prev) => [
    ...prev,
    {
      rol: 'bot',
      texto:
        '¡Espera! 👋 ¿Necesitas ayuda antes de irte? Estoy aquí para ayudarte con cualquier duda sobre nuestros productos.'
    }
  ])

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
      input.trim()

    setMensajes((prev) => [
      ...prev,
      {
        rol: 'usuario',
        texto: mensajeUsuario
      }
    ])

    setInput('')
    setCargando(true)
    setHandover(null)
    setHandoverEnviado(false)

    try {

      const res =
        await fetch(
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
              visitorId:
                visitorId,
              fallbackIntentos:
                fallbackIntentos
            })
          }
        )

      const data =
        await res.json()

      if (!res.ok) {
        throw new Error(
          data.error ||
          'Error del servidor'
        )
      }

      setMensajes((prev) => [
        ...prev,
        {
          rol: 'bot',
          texto:
            data.respuesta ||
            'Lo siento, ha ocurrido un error.'
        }
      ])

      setFallbackIntentos(
        Number(
          data.fallbackIntentos || 0
        )
      )

      if (data.handover === true) {
        const accion =
          data.handoverAction ||
          'formulario'

        const whatsappUrl =
          data.whatsappUrl || null

        const emailUrl =
          data.emailUrl || null

        // En producción, WhatsApp y Email redirigen directamente.
        // En Preview mantenemos el botón para no sacar al usuario del dashboard.
        if (!modoPreview && accion === 'whatsapp' && whatsappUrl) {
          window.location.href = whatsappUrl
          return
        }

        if (!modoPreview && accion === 'email' && emailUrl) {
          window.location.href = emailUrl
          return
        }

        setHandover({
          action: accion,
          whatsappUrl,
          emailUrl
        })
      } else {
        setHandover(null)
      }

    } catch (error) {

      console.error(
        'VortexAI: error enviando mensaje:',
        error
      )

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
  // FORMULARIO DE HANDOVER
  // ============================================================

  async function enviarFormularioHandover(
    e: React.FormEvent
  ) {

    e.preventDefault()

    if (
      !formHandover.nombre.trim() ||
      !formHandover.email.trim() ||
      !formHandover.mensaje.trim()
    ) {
      return
    }

    setEnviandoHandover(true)

    try {

      const res =
        await fetch(
          '/api/handover-lead',
          {
            method: 'POST',
            headers: {
              'Content-Type':
                'application/json'
            },
            body: JSON.stringify({
              tiendaId:
                idActual,
              visitorId:
                visitorId,
              nombre:
                formHandover.nombre.trim(),
              email:
                formHandover.email.trim(),
              mensaje:
                formHandover.mensaje.trim()
            })
          }
        )

      const data =
        await res.json()

      if (!res.ok) {
        throw new Error(
          data.error ||
          'No se pudo enviar el formulario'
        )
      }

      setHandoverEnviado(true)

      setMensajes((prev) => [
        ...prev,
        {
          rol: 'bot',
          texto:
            '✅ Hemos recibido tus datos. El equipo de la tienda podrá ponerse en contacto contigo.'
        }
      ])

      setFormHandover({
        nombre: '',
        email: '',
        mensaje: ''
      })

    } catch (error) {

      console.error(
        'VortexAI: error enviando formulario:',
        error
      )

      setMensajes((prev) => [
        ...prev,
        {
          rol: 'bot',
          texto:
            'No hemos podido enviar tus datos ahora mismo. Inténtalo de nuevo.'
        }
      ])

    } finally {

      setEnviandoHandover(false)

    }
  }

    // ============================================================
  // POSICIÓN DEL WIDGET
  // ============================================================

  const posicionContenedor = modoPreview
    ? 'relative w-full h-full'
    : posicion === 'izquierda'
      ? 'fixed bottom-4 left-4'
      : 'fixed bottom-4 right-4'

  const posicionVentana = modoPreview
    ? ''
    : posicion === 'izquierda'
      ? 'left-0'
      : 'right-0'

  // ============================================================
  // AVATAR
  // ============================================================

  const renderAvatarContent = (
    pequeno: boolean
  ) => {

    const tamano =
      pequeno
        ? 'w-7 h-7'
        : 'w-8 h-8'

    // Si avatar_url contiene una URL de imagen
    if (
      avatarUrl &&
      (
        avatarUrl.startsWith('http://') ||
        avatarUrl.startsWith('https://')
      )
    ) {
      return (
        <img
          src={avatarUrl}
          alt="Avatar"
          className={`${tamano} rounded-full object-cover`}
        />
      )
    }

    // Avatares predeterminados
    switch (
      avatarUrl.toLowerCase()
    ) {

      case 'moderno':
        return (
          <div
            className={`${tamano} rounded-full bg-white/20 flex items-center justify-center`}
          >
            🤖
          </div>
        )

      case 'minimalista':
        return (
          <div
            className={`${tamano} rounded-full bg-white/20 flex items-center justify-center`}
          >
            ✨
          </div>
        )

      case 'tienda':
        return (
          <div
            className={`${tamano} rounded-full bg-white/20 flex items-center justify-center`}
          >
            🛍️
          </div>
        )

      default:
        return (
          <div
            className={`${tamano} rounded-full bg-white/20 flex items-center justify-center`}
          >
            🤖
          </div>
        )
    }
  }


  // ============================================================
  // INTERFAZ
  // ============================================================

  return (
    <div
      className={`${posicionContenedor} z-[999999] pointer-events-auto bg-transparent`}
    >

      {abierto && (

        <div
          className={modoPreview
            ? 'relative w-full h-full bg-white border border-gray-200 rounded-xl shadow-2xl flex flex-col overflow-hidden'
            : `absolute bottom-20 ${posicionVentana} w-80 h-96 bg-white border border-gray-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-200`
          }
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

          {handover && !handoverEnviado && (
            <div className="bg-white border-t border-gray-200 p-3 space-y-2">

              {handover.action === 'whatsapp' && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-700">
                    Si necesitas ayuda de una persona, puedes contactar directamente con soporte.
                  </p>

                  {handover.whatsappUrl ? (
                    <a
                      href={handover.whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full text-center text-white px-3 py-2 rounded-xl text-sm font-medium"
                      style={{
                        backgroundColor:
                          colorPrimario
                      }}
                    >
                      📱 Contactar por WhatsApp
                    </a>
                  ) : (
                    <p className="text-xs text-red-500">
                      El WhatsApp de soporte todavía no está configurado.
                    </p>
                  )}
                </div>
              )}

              {handover.action === 'email' && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-700">
                    Puedes contactar directamente con el equipo de soporte.
                  </p>

                  {handover.emailUrl ? (
                    <a
                      href={handover.emailUrl}
                      className="block w-full text-center text-white px-3 py-2 rounded-xl text-sm font-medium"
                      style={{
                        backgroundColor:
                          colorPrimario
                      }}
                    >
                      ✉️ Contactar por email
                    </a>
                  ) : (
                    <p className="text-xs text-red-500">
                      El email de soporte todavía no está configurado.
                    </p>
                  )}
                </div>
              )}

              {handover.action === 'formulario' && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    void enviarFormularioHandover(e)
                  }}
                  className="space-y-2"
                >
                  <p className="text-xs font-medium text-gray-800">
                    Déjanos tus datos y el equipo podrá ayudarte.
                  </p>

                  <input
                    type="text"
                    required
                    value={
                      formHandover.nombre
                    }
                    onChange={(e) =>
                      setFormHandover(
                        (prev) => ({
                          ...prev,
                          nombre:
                            e.target.value
                        })
                      )
                    }
                    placeholder="Tu nombre"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs focus:outline-none"
                    style={{
                    borderColor:
                  colorPrimario,
                  color: '#000000',
                  backgroundColor: '#ffffff'
              }}
                  />

                  <input
                    type="email"
                    required
                    value={
                      formHandover.email
                    }
                    onChange={(e) =>
                      setFormHandover(
                        (prev) => ({
                          ...prev,
                          email:
                            e.target.value
                        })
                      )
                    }
                    placeholder="Tu email"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs focus:outline-none"
                    style={{
                      borderColor:
                        colorPrimario,
                        color: '#000000',
                        backgroundColor: '#ffffff'
              
                    }}
                  />

                  <textarea
                    required
                    rows={2}
                    value={
                      formHandover.mensaje
                    }
                    onChange={(e) =>
                      setFormHandover(
                        (prev) => ({
                          ...prev,
                          mensaje:
                            e.target.value
                        })
                      )
                    }
                    placeholder="¿En qué podemos ayudarte?"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs focus:outline-none resize-none"
                    style={{
                      borderColor:
                        colorPrimario,
                        color: '#000000',
                        backgroundColor: '#ffffff'
              
                    }}
                  />

                  <button
                    type="submit"
                    disabled={
                      enviandoHandover
                    }
                    className="w-full text-white px-3 py-2 rounded-xl text-sm font-medium disabled:opacity-50"
                    style={{
                      backgroundColor:
                        colorPrimario
                    }}
                  >
                    {enviandoHandover
                      ? 'Enviando...'
                      : 'Enviar mis datos'}
                  </button>
                </form>
              )}

            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault()
              e.stopPropagation()
              void enviarMensaje(e)
            }}
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
              className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm text-black focus:outline-none"
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

      {!modoPreview && (
      <button
        onClick={() => {

          setAbierto((prev) => !prev)

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
      )}

    </div>
  )
}