import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { mensaje, tiendaId } = body

    if (!mensaje || !tiendaId) {
      return NextResponse.json(
        { error: 'Falta mensaje o tiendaId' },
        { status: 400 }
      )
    }

    // Cliente "admin" de verdad: usa la Service Role Key, que se salta
    // las políticas de RLS. Solo puede vivir aquí, en código de servidor.
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

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

    const catalogoTexto = JSON.stringify(tienda.productos_json || [])

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

    const respuesta = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 500,
      system: `Eres el asistente de ventas de la tienda "${tienda.nombre_tienda || 'Virtual'}".

Responde a las preguntas del cliente usando SOLO la información disponible en este catálogo de productos:

${catalogoTexto}

Si no tienes la información necesaria, dilo con sinceridad y no te la inventes.

Sé amable, breve y natural, como un buen dependiente de tienda.

FUNCIONES IA ACTIVADAS PARA ESTA TIENDA:
${instruccionesFunciones || 'No hay funciones IA avanzadas activadas.'}

IMPORTANTE:
Solo puedes utilizar las funciones que aparecen en "FUNCIONES IA ACTIVADAS PARA ESTA TIENDA". Si una función no aparece, no debes comportarte como si estuviera activada.`,
      messages: [{ role: 'user', content: mensaje }],
    })

    // Extracción segura del texto de la respuesta de Anthropic
    const primerBloque = respuesta.content[0]
    const textoRespuesta =
      primerBloque && primerBloque.type === 'text' ? primerBloque.text : ''

    return NextResponse.json({ respuesta: textoRespuesta })
  } catch (err: any) {
    console.error('Error en la ruta de chat:', err)
    return NextResponse.json(
      { error: err.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}