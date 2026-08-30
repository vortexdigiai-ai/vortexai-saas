import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const {
      mensaje,
      tiendaId,
      visitorId,
    } = body

    if (!mensaje || !tiendaId) {
      return NextResponse.json(
        { error: 'Falta mensaje o tiendaId' },
        { status: 400 }
      )
    }

    // ============================================================
    // CLIENTE SUPABASE ADMIN
    // ============================================================

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // ============================================================
    // OBTENER CONFIGURACIÓN DE LA TIENDA
    // ============================================================

    const { data: tienda, error } = await supabase
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

    if (error || !tienda) {
      return NextResponse.json(
        { error: 'Tienda no encontrada' },
        { status: 404 }
      )
    }

    // ============================================================
    // CATÁLOGO
    // ============================================================

    const catalogoTexto = JSON.stringify(
      tienda.productos_json || []
    )

    // ============================================================
    // CARRITO DEL VISITANTE
    // ============================================================

    let carritoTexto = ''

    if (
      tienda.carrito_abandonado === true &&
      visitorId
    ) {

      const { data: carrito, error: carritoError } =
        await supabase
          .from('carritos')
          .select(`
            items,
            total,
            currency,
            cart_url,
            estado,
            updated_at,
            abandoned_at
          `)
          .eq('tienda_id', tiendaId)
          .eq('visitor_id', visitorId)
          .in('estado', ['active', 'abandoned'])
          .order('updated_at', {
            ascending: false
          })
          .limit(1)
          .maybeSingle()

      if (carritoError) {

        console.error(
          'Error obteniendo carrito:',
          carritoError
        )

      } else if (carrito) {

        carritoTexto = JSON.stringify({
          items: carrito.items || [],
          total: carrito.total,
          currency: carrito.currency,
          cart_url: carrito.cart_url,
          estado: carrito.estado,
          updated_at: carrito.updated_at,
          abandoned_at: carrito.abandoned_at
        })

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
    // FUNCIÓN CARRITO ABANDONADO
    // ============================================================

    if (tienda.carrito_abandonado) {

      instruccionesFunciones += `
- CARRITO ABANDONADO: Puedes utilizar la información del carrito proporcionada por el sistema para ayudar al cliente con los productos que tiene actualmente en su carrito o que dejó anteriormente.

IMPORTANTE SOBRE EL CARRITO:
- Solo utiliza productos que aparezcan realmente en los datos del carrito.
- No inventes productos, cantidades, precios, descuentos ni gastos de envío.
- Si el carrito contiene una URL de recuperación, puedes indicársela al cliente cuando sea apropiado.
- No afirmes que un carrito está abandonado si el sistema no indica que su estado es "abandoned".
- Si el estado es "active", considera que es un carrito actual.
- Si no existe información del carrito, no inventes que el cliente tiene productos en el carrito.
`

    }

    // ============================================================
    // CONTEXTO DEL CARRITO
    // ============================================================

    let contextoCarrito = ''

    if (tienda.carrito_abandonado === true) {

      contextoCarrito = carritoTexto
        ? `
INFORMACIÓN REAL DEL CARRITO DEL VISITANTE:

${carritoTexto}

Esta información procede directamente del sistema de carritos de la tienda.
`
        : `
INFORMACIÓN DEL CARRITO:

No hay información disponible actualmente sobre el carrito de este visitante.

No debes asumir que tiene productos en el carrito.
`

    }

    // ============================================================
    // PETICIÓN A ANTHROPIC
    // ============================================================

    const respuesta = await anthropic.messages.create({

      model: 'claude-sonnet-4-5',

      max_tokens: 500,

      system: `
Eres el asistente de ventas de la tienda "${tienda.nombre_tienda || 'Virtual'}".

============================================================
CATÁLOGO DE PRODUCTOS
============================================================

Responde a las preguntas del cliente usando SOLO la información disponible en este catálogo:

${catalogoTexto}

Si no tienes la información necesaria, dilo con sinceridad y no te la inventes.

Sé amable, breve y natural, como un buen dependiente de tienda.

============================================================
FUNCIONES IA ACTIVADAS
============================================================

${instruccionesFunciones || 'No hay funciones IA avanzadas activadas.'}

============================================================
${contextoCarrito}
============================================================

REGLAS IMPORTANTES:

- Solo puedes utilizar las funciones que aparecen en "FUNCIONES IA ACTIVADAS".
- Si una función no aparece, no debes comportarte como si estuviera activada.
- Nunca inventes información.
- Nunca inventes productos, precios, descuentos, stock, cantidades o promociones.
- La información del carrito procede del sistema y debe tratarse como información real.
- Si el cliente pregunta algo que no puedes confirmar, dilo claramente.
`,

      messages: [
        {
          role: 'user',
          content: mensaje,
        },
      ],

    })

    // ============================================================
    // EXTRAER RESPUESTA
    // ============================================================

    const primerBloque =
      respuesta.content[0]

    const textoRespuesta =
      primerBloque &&
      primerBloque.type === 'text'
        ? primerBloque.text
        : ''

    return NextResponse.json({
      respuesta: textoRespuesta,
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