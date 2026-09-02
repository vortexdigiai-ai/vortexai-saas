import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const tiendaId =
      String(body.tiendaId || '').trim()

    const visitorId =
      String(body.visitorId || '').trim()

    const conversationId =
      String(body.conversationId || '').trim()

    const nombre =
      String(body.nombre || '').trim()

    const email =
      String(body.email || '').trim()

    const mensaje =
      String(body.mensaje || '').trim()

    if (
      !tiendaId ||
      !nombre ||
      !email ||
      !mensaje
    ) {
      return NextResponse.json(
        {
          error:
            'Faltan datos obligatorios.'
        },
        {
          status: 400
        }
      )
    }

    const emailValido =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
      )

    if (!emailValido) {
      return NextResponse.json(
        {
          error:
            'El email introducido no es válido.'
        },
        {
          status: 400
        }
      )
    }

    const textoLead = [
      '📩 NUEVO LEAD / HANDOVER',
      '',
      `Nombre: ${nombre}`,
      `Email: ${email}`,
      visitorId
        ? `Visitor ID: ${visitorId}`
        : '',
      conversationId
        ? `Conversación: ${conversationId}`
        : '',
      '',
      `Mensaje: ${mensaje}`
    ]
      .filter(Boolean)
      .join('\n')

    const { error } =
      await supabase
        .from('interacciones_chat')
        .insert([
          {
            user_id:
              tiendaId,
            remitente:
              'lead',
            texto:
              textoLead
          }
        ])

    if (error) {
      console.error(
        'VortexAI: error guardando lead:',
        error
      )

      return NextResponse.json(
        {
          error:
            'No se pudo guardar la solicitud.'
        },
        {
          status: 500
        }
      )
    }

    return NextResponse.json({
      success: true
    })

  } catch (error: unknown) {

    console.error(
      'VortexAI: error en handover-lead:',
      error
    )

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Error interno'
      },
      {
        status: 500
      }
    )
  }
}
