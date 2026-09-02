import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  })
}

export async function POST(req: NextRequest) {
  try {
    // ============================================================
    // RECIBIR DATOS
    // ============================================================

    const body = await req.json()

const mensaje = body.mensaje || ''
const tiendaId = body.tiendaId
const visitorId =
  body.visitorId ||
  body.visitor_id

const inicioWidget =
  body.inicioWidget === true

if ((!mensaje && !inicioWidget) || !tiendaId) {
      return NextResponse.json(
        {
          error: 'Falta mensaje o tiendaId'
        },
        {
          status: 400
        }
      )
    }

    // ============================================================
    // SUPABASE ADMIN
    // ============================================================

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // ============================================================
    // OBTENER CONFIGURACIÓN DE LA TIENDA
    // ============================================================

    const {
      data: tienda,
      error: tiendaError
    } = await supabase
      .from('tiendas')
      .select(`
        nombre_tienda,
        productos_json,
        tiempos_envio,
        politicas,
        faqs,
        plan,
        detector_idioma,
        exit_intent,
        cross_selling,
        modo_persuasivo,
        carrito_abandonado,
        analisis_sentimiento,
        cupones_flash
      `)
      .eq('user_id', tiendaId)
      .single()

    if (tiendaError || !tienda) {
      return NextResponse.json(
        {
          error: 'Tienda no encontrada'
        },
        {
          status: 404
        }
      )
    }

    // ============================================================
    // PLAN Y LÍMITES REALES
    // ============================================================
    const PLAN_LEVEL: Record<string, number> = {
      free: 0,
      starter: 1,
      growth: 2,
      pro: 3,
      custom: 4,
    }

    const plan = String(tienda.plan || 'free').trim().toLowerCase()
    const nivelPlan = PLAN_LEVEL[plan] ?? 0
    const modoPreview = body.modoPreview === true

    // Límites de mensajes de cliente por mes. Pro y Custom no tienen
    // límite técnico definido en este nivel de producto.
    const limiteMensual: Record<string, number | null> = {
      free: 100,
      starter: 1000,
      growth: 5000,
      pro: null,
      custom: null,
    }

    const limite = limiteMensual[plan] ?? 100

    if (!inicioWidget && mensaje.trim() && limite !== null && !modoPreview) {
      const ahora = new Date()
      const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1)

      const { count: mensajesUsados, error: limiteError } = await supabase
        .from('interacciones_chat')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', String(tiendaId))
        .eq('remitente', 'user')
        .gte('created_at', inicioMes.toISOString())

      if (limiteError) {
        console.error('VortexAI: error comprobando límite mensual:', limiteError)
      } else if ((mensajesUsados || 0) >= limite) {
        return NextResponse.json(
          {
            error: `Has alcanzado el límite de ${limite.toLocaleString('es-ES')} mensajes de cliente de tu plan ${plan}. Actualiza tu suscripción para continuar.`,
            codigo: 'PLAN_LIMIT_REACHED',
            plan,
            limiteMensual: limite,
          },
          { status: 402, headers: corsHeaders }
        )
      }
    }

    // Las funciones se calculan con el plan real, incluso si una fila
    // antigua de Supabase todavía conserva un booleano activado.
    const featureEnabled = (feature: keyof typeof featureMinPlan) =>
      nivelPlan >= featureMinPlan[feature] && tienda[feature] === true

    const featureMinPlan = {
      detector_idioma: 1,
      exit_intent: 2,
      cross_selling: 2,
      modo_persuasivo: 2,
      carrito_abandonado: 3,
      analisis_sentimiento: 3,
      cupones_flash: 3,
    } as const

    const detectorIdiomaActivo = featureEnabled('detector_idioma')
    const exitIntentActivo = featureEnabled('exit_intent')
    const crossSellingActivo = featureEnabled('cross_selling')
    const modoPersuasivoActivo = featureEnabled('modo_persuasivo')
    const carritoAbandonadoActivo = featureEnabled('carrito_abandonado')
    const analisisSentimientoActivo = featureEnabled('analisis_sentimiento')
    const cuponesFlashActivo = featureEnabled('cupones_flash')

    // ============================================================
    // CATÁLOGO
    // ============================================================

    const catalogoTexto =
      JSON.stringify(
        tienda.productos_json || []
      )

    // ============================================================
    // POLÍTICAS Y BASE DE CONOCIMIENTO
    // ============================================================

    const politicasTexto = `
TIEMPOS Y COSTES DE ENVÍO:
${tienda.tiempos_envio || 'No hay información de envíos configurada.'}

POLÍTICAS DE DEVOLUCIÓN:
${tienda.politicas || 'No hay información de devoluciones configurada.'}

FAQS PERSONALIZADAS:
${tienda.faqs || 'No hay FAQs personalizadas configuradas.'}
`

    // ============================================================
    // CARRITO DEL VISITANTE
    // ============================================================

    let carrito: any = null

    if (
      carritoAbandonadoActivo &&
      visitorId
    ) {

      const {
        data: carritoEncontrado,
        error: carritoError
      } = await supabase
        .from('carritos')
        .select(`
          id,
          tienda_id,
          visitor_id,
          items,
          total,
          currency,
          cart_url,
          estado,
          created_at,
          updated_at,
          abandoned_at,
          recovered_at
        `)
        .eq('tienda_id', tiendaId)
        .eq('visitor_id', visitorId)
        .maybeSingle()

      if (carritoError) {

        console.error(
          'VortexAI: error obteniendo carrito:',
          carritoError
        )

      } else if (carritoEncontrado) {

        carrito = carritoEncontrado

        // ========================================================
        // COMPROBAR SI EL CARRITO ACTIVE LLEVA MÁS DE 30 MINUTOS
        // ========================================================

        if (
          carrito.estado === 'active' &&
          carrito.updated_at
        ) {

          const ultimaActualizacion =
            new Date(
              carrito.updated_at
            ).getTime()

          const ahora =
            Date.now()

          const treintaMinutos =
            30 * 60 * 1000

          const tiempoSinActividad =
            ahora -
            ultimaActualizacion

          // ------------------------------------------------------
          // MARCAR COMO ABANDONADO
          // ------------------------------------------------------

          if (
            tiempoSinActividad >=
            treintaMinutos
          ) {

            const {
              data: carritoAbandonado,
              error: abandonarError
            } = await supabase
              .from('carritos')
              .update({
                estado: 'abandoned',
                abandoned_at:
                  new Date().toISOString(),
                updated_at:
                  carrito.updated_at
              })
              .eq(
                'id',
                carrito.id
              )
              .eq(
                'estado',
                'active'
              )
              .select(`
                id,
                tienda_id,
                visitor_id,
                items,
                total,
                currency,
                cart_url,
                estado,
                created_at,
                updated_at,
                abandoned_at,
                recovered_at
              `)
              .maybeSingle()

            if (abandonarError) {

              console.error(
                'VortexAI: error marcando carrito como abandonado:',
                abandonarError
              )

            } else if (
              carritoAbandonado
            ) {

              carrito =
                carritoAbandonado

            }

          }

        }

      }

    }

    // ============================================================
    // INFORMACIÓN DEL CARRITO PARA LA IA
    // ============================================================

    let instruccionesCarrito = ''

    if (
      carritoAbandonadoActivo &&
      carrito
    ) {

      if (
        carrito.estado === 'abandoned' &&
        Array.isArray(carrito.items) &&
        carrito.items.length > 0
      ) {

        instruccionesCarrito = `
CARRITO DEL CLIENTE:

El cliente tiene actualmente un carrito que fue abandonado.

Estado:
${carrito.estado}

Productos:
${JSON.stringify(carrito.items)}

Total:
${carrito.total} ${carrito.currency}

URL DEL CARRITO:
${carrito.cart_url || 'No disponible'}

Fecha de abandono:
${carrito.abandoned_at || 'No disponible'}

REGLAS DEL CARRITO ABANDONADO:

- Puedes mencionar al cliente que tiene productos pendientes en su carrito.
- Puedes animarle de forma natural a completar su compra.
- Puedes utilizar los productos, cantidades, precios y total proporcionados.
- Puedes utilizar la URL del carrito si es relevante para ayudarle a volver a su compra.
- NO inventes productos.
- NO inventes descuentos.
- NO inventes códigos de cupón.
- NO inventes precios.
- NO inventes información sobre stock.
- No afirmes que el pedido está reservado.
- No afirmes que la compra se ha realizado.
- El carrito sigue siendo una oportunidad de compra, no una compra completada.
`

      } else if (
        carrito.estado === 'active' &&
        Array.isArray(carrito.items) &&
        carrito.items.length > 0
      ) {

        instruccionesCarrito = `
CARRITO ACTUAL DEL CLIENTE:

El cliente tiene un carrito activo.

Productos:
${JSON.stringify(carrito.items)}

Total:
${carrito.total} ${carrito.currency}

URL DEL CARRITO:
${carrito.cart_url || 'No disponible'}

REGLAS:

- Puedes responder preguntas sobre el contenido actual del carrito.
- Puedes utilizar los productos, cantidades, precios y total proporcionados.
- NO inventes productos, precios, descuentos ni stock.
`

      }

    }

    // ============================================================
    // MENSAJE AUTOMÁTICO DE CARRITO ABANDONADO
    // ============================================================

    let recordatorioCarrito = ''

    if (
      inicioWidget &&
      carritoAbandonadoActivo &&
      carrito &&
      carrito.estado === 'abandoned' &&
      Array.isArray(carrito.items) &&
      carrito.items.length > 0
    ) {
      recordatorioCarrito = `
El cliente acaba de volver a la tienda.

Tiene un carrito que abandonó anteriormente.

Debes comenzar tu respuesta recordándole de forma natural que dejó productos en su carrito y ofrecerle continuar con la compra.

Puedes utilizar los datos reales del carrito:

Productos:
${JSON.stringify(carrito.items)}

Total:
${carrito.total} ${carrito.currency}

URL DEL CARRITO:
${carrito.cart_url || 'No disponible'}

IMPORTANTE:
- No inventes productos.
- No inventes descuentos.
- No inventes códigos de cupón.
- No inventes precios.
- No inventes stock.
- No afirmes que el pedido está reservado.
- No afirmes que la compra ya se ha realizado.
- Sé natural y no demasiado insistente.
- Si existe una URL del carrito, puedes invitar al cliente a continuar con su compra.
`
    }

    // ============================================================
    // FUNCIONES IA
    // ============================================================

    let instruccionesFunciones = ''

    if (detectorIdiomaActivo) {

      instruccionesFunciones += `
- DETECCIÓN DE IDIOMA: Detecta automáticamente el idioma en el que escribe el cliente y responde en ese mismo idioma.
`

    }

    if (crossSellingActivo) {

      instruccionesFunciones += `
- CROSS-SELLING: Cuando sea relevante, recomienda productos complementarios del catálogo que puedan combinarse con el producto que está consultando el cliente. No inventes productos y no fuerces recomendaciones cuando no sean útiles.
`

    }

    if (modoPersuasivoActivo) {

      instruccionesFunciones += `
- MODO URGENCIA Y ESCASEZ: Puedes mencionar información de stock limitado o disponibilidad reducida SOLO cuando esa información aparezca realmente en el catálogo. Nunca inventes escasez, unidades disponibles o promociones.
`

    }

    if (analisisSentimientoActivo) {

      instruccionesFunciones += `
- ANÁLISIS DE SENTIMIENTO: Detecta si el cliente muestra frustración, enfado, duda o satisfacción y adapta el tono de la respuesta. Si está frustrado, responde con especial empatía y claridad.
`

    }

    if (cuponesFlashActivo) {

      instruccionesFunciones += `
- CUPONES: Si el cliente expresa dudas relacionadas con la compra o el precio, puedes sugerir que existe una posibilidad de descuento, pero NO inventes códigos de cupón ni porcentajes de descuento que no hayan sido proporcionados por el sistema.
`

    }

    // ============================================================
    // LLAMADA A ANTHROPIC
    // ============================================================

    const respuesta =
      await anthropic.messages.create({

        model: 'claude-sonnet-4-5',

        max_tokens: 500,

        system: `
Eres el asistente de ventas de la tienda "${tienda.nombre_tienda || 'Virtual'}".

Responde a las preguntas del cliente usando SOLO la información disponible en la base de conocimiento de esta tienda.

CATÁLOGO DE PRODUCTOS:
${catalogoTexto}

POLÍTICAS Y FAQS DE LA TIENDA:
${politicasTexto}

Si no tienes la información necesaria, dilo con sinceridad y no te la inventes.

Cuando el cliente pregunte por envíos, plazos, costes de envío, devoluciones, cambios o una FAQ, utiliza la información correspondiente de POLÍTICAS Y FAQS DE LA TIENDA. No respondas que no tienes acceso a esa información si sí aparece ahí.

Sé amable, breve y natural, como un buen dependiente de tienda.

FUNCIONES IA ACTIVADAS PARA ESTA TIENDA:
${instruccionesFunciones || 'No hay funciones IA avanzadas activadas.'}

${instruccionesCarrito}

${recordatorioCarrito}

IMPORTANTE:

Solo puedes utilizar las funciones que aparecen en "FUNCIONES IA ACTIVADAS PARA ESTA TIENDA".

Si una función no aparece, no debes comportarte como si estuviera activada.

IMPORTANTE SOBRE EL CARRITO:

La información del carrito procede directamente del sistema.

Debes tratar los datos del carrito como información real proporcionada por la tienda.

Nunca inventes información que no aparezca en los datos proporcionados.
`,

        messages: [
  {
    role: 'user',
    content:
      inicioWidget
        ? 'El cliente acaba de entrar en la tienda. Saluda al cliente y, si tiene un carrito abandonado, recuérdaselo siguiendo las instrucciones proporcionadas.'
        : mensaje
  }
]

      })

    // ============================================================
    // EXTRAER TEXTO
    // ============================================================

    const primerBloque =
      respuesta.content[0]

    const textoRespuesta =
      primerBloque &&
      primerBloque.type === 'text'
        ? primerBloque.text
        : ''

    // ============================================================
    // RESPUESTA
    // ============================================================

    return NextResponse.json(
  {
    respuesta: textoRespuesta,
    carritoAbandonado:
      carrito?.estado === 'abandoned' &&
      Array.isArray(carrito.items) &&
      carrito.items.length > 0,
    carritoUrl:
      carrito?.estado === 'abandoned'
        ? carrito.cart_url || null
        : null
  },
  {
    status: 200,
    headers: corsHeaders,
  }
)

  } catch (err: any) {

    console.error(
      'Error en la ruta de chat:',
      err
    )

    return NextResponse.json(
  {
    error:
      err.message ||
      'Error interno del servidor'
  },
  {
    status: 500,
    headers: corsHeaders,
  }
)
  }
}