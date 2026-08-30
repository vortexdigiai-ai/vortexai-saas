import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(req: NextRequest) {
  try {
    // ============================================================
    // RECIBIR DATOS
    // ============================================================

    const body = await req.json()

    const mensaje = body.mensaje
    const tiendaId = body.tiendaId
    const visitorId =
      body.visitorId ||
      body.visitor_id

    if (!mensaje || !tiendaId) {
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
    // CATÁLOGO
    // ============================================================

    const catalogoTexto =
      JSON.stringify(
        tienda.productos_json || []
      )

    // ============================================================
    // CARRITO DEL VISITANTE
    // ============================================================

    let carrito: any = null

    if (
      tienda.carrito_abandonado === true &&
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
      tienda.carrito_abandonado === true &&
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
    // FUNCIONES IA
    // ============================================================

    let instruccionesFunciones = ''

    if (tienda.detector_idioma) {

      instruccionesFunciones += `
- DETECCIÓN DE IDIOMA: Detecta automáticamente el idioma en el que escribe el cliente y responde en ese mismo idioma.
`

    }

    if (tienda.cross_selling) {

      instruccionesFunciones += `
- CROSS-SELLING: Cuando sea relevante, recomienda productos complementarios del catálogo que puedan combinarse con el producto que está consultando el cliente. No inventes productos y no fuerces recomendaciones cuando no sean útiles.
`

    }

    if (tienda.modo_persuasivo) {

      instruccionesFunciones += `
- MODO URGENCIA Y ESCASEZ: Puedes mencionar información de stock limitado o disponibilidad reducida SOLO cuando esa información aparezca realmente en el catálogo. Nunca inventes escasez, unidades disponibles o promociones.
`

    }

    if (tienda.analisis_sentimiento) {

      instruccionesFunciones += `
- ANÁLISIS DE SENTIMIENTO: Detecta si el cliente muestra frustración, enfado, duda o satisfacción y adapta el tono de la respuesta. Si está frustrado, responde con especial empatía y claridad.
`

    }

    if (tienda.cupones_flash) {

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

Responde a las preguntas del cliente usando SOLO la información disponible en este catálogo de productos:

${catalogoTexto}

Si no tienes la información necesaria, dilo con sinceridad y no te la inventes.

Sé amable, breve y natural, como un buen dependiente de tienda.

FUNCIONES IA ACTIVADAS PARA ESTA TIENDA:
${instruccionesFunciones || 'No hay funciones IA avanzadas activadas.'}

${instruccionesCarrito}

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
            content: mensaje
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

    return NextResponse.json({
      respuesta: textoRespuesta
    })

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
        status: 500
      }
    )
  }
}