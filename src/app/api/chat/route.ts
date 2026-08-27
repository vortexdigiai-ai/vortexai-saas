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
      .select('nombre_tienda, productos_json')
      .eq('id', tiendaId)
      .single()

    if (error || !tienda) {
      return NextResponse.json(
        { error: 'Tienda no encontrada' },
        { status: 404 }
      )
    }

    const catalogoTexto = JSON.stringify(tienda.productos_json || [])

    const respuesta = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 500,
      system: `Eres el asistente de ventas de la tienda "${tienda.nombre_tienda || 'Virtual'}". 
Responde a las preguntas del cliente usando SOLO la información de este catálogo de productos: ${catalogoTexto}. 
Si no tienes la información, dilo con sinceridad, no te la inventes. 
Sé amable, breve y natural, como un buen dependiente de tienda.`,
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