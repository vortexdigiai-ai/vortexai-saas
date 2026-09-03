import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const tiendaId = String(body.tiendaId || '').trim()
    const visitorId = String(body.visitorId || '').trim()
    const nombre = String(body.nombre || '').trim()
    const email = String(body.email || '').trim()
    const mensaje = String(body.mensaje || '').trim()

    if (!tiendaId || !nombre || !email || !mensaje) {
      return NextResponse.json(
        { error: 'Faltan datos obligatorios.' },
        { status: 400 }
      )
    }

    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

    if (!emailValido) {
      return NextResponse.json(
        { error: 'El email introducido no es válido.' },
        { status: 400 }
      )
    }

    // El destinatario principal es el email con el que se creó la cuenta.
    // Como respaldo usamos el email de soporte configurado en la tienda.
    const { data: tienda, error: tiendaError } = await supabase
      .from('tiendas')
      .select('email_soporte')
      .eq('user_id', tiendaId)
      .maybeSingle()

    if (tiendaError) {
      console.error('VortexAI: error obteniendo configuración de email:', tiendaError)
    }

    let destinatario = ''

    try {
      const { data: authData, error: authError } =
        await supabase.auth.admin.getUserById(tiendaId)

      if (!authError && authData.user?.email) {
        destinatario = authData.user.email.trim()
      }
    } catch (authError) {
      console.error('VortexAI: error obteniendo email de la cuenta:', authError)
    }

    if (!destinatario && typeof tienda?.email_soporte === 'string') {
      destinatario = tienda.email_soporte.trim()
    }

    if (!destinatario || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destinatario)) {
      return NextResponse.json(
        {
          error:
            'No se ha podido determinar el email de destino de esta tienda.'
        },
        { status: 400 }
      )
    }

    const textoLead = [
      '📩 NUEVO LEAD / HANDOVER',
      '',
      `Nombre: ${nombre}`,
      `Email: ${email}`,
      visitorId ? `Visitor ID: ${visitorId}` : '',
      '',
      `Mensaje: ${mensaje}`
    ]
      .filter(Boolean)
      .join('\n')

    // El envío de email es la operación principal. El registro en Supabase
    // se hace después como copia de seguridad y nunca bloqueará la entrega.

    const resendApiKey = process.env.RESEND_API_KEY?.trim()
    const resendFrom = (
      process.env.RESEND_FROM_EMAIL ||
      process.env.EMAIL_FROM ||
      ''
    ).trim()

    if (!resendApiKey || !resendFrom) {
      console.error(
        'VortexAI: faltan RESEND_API_KEY y/o RESEND_FROM_EMAIL para enviar handovers.'
      )

      return NextResponse.json(
        {
          error:
            'El envío de email no está configurado todavía. Añade RESEND_API_KEY y RESEND_FROM_EMAIL en Vercel.'
        },
        { status: 500 }
      )
    }

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: resendFrom,
        to: [destinatario],
        reply_to: email,
        subject: `Nuevo contacto desde tu chatbot — ${nombre}`,
        text: [
          'Has recibido un nuevo contacto desde VortexAI.',
          '',
          `Nombre: ${nombre}`,
          `Email: ${email}`,
          visitorId ? `Visitor ID: ${visitorId}` : '',
          '',
          'Mensaje:',
          mensaje
        ]
          .filter(Boolean)
          .join('\n'),
        html: `
          <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;max-width:640px">
            <h2 style="margin:0 0 20px">Nuevo contacto desde tu chatbot</h2>
            <p style="margin:0 0 8px"><strong>Nombre:</strong> ${escapeHtml(nombre)}</p>
            <p style="margin:0 0 8px"><strong>Email:</strong> ${escapeHtml(email)}</p>
            ${visitorId ? `<p style="margin:0 0 20px"><strong>Visitor ID:</strong> ${escapeHtml(visitorId)}</p>` : ''}
            <div style="background:#f3f4f6;border-radius:12px;padding:16px;margin-top:20px">
              <p style="margin:0 0 8px"><strong>Mensaje</strong></p>
              <p style="margin:0;white-space:pre-wrap">${escapeHtml(mensaje)}</p>
            </div>
          </div>
        `
      })
    })

    if (!emailResponse.ok) {
      const detalle = await emailResponse.text()
      console.error('VortexAI: error de Resend:', emailResponse.status, detalle)

      return NextResponse.json(
        {
          error:
            'No se ha podido entregar el email ahora mismo. La solicitud no se ha marcado como enviada.'
        },
        { status: 502 }
      )
    }

    const { error: guardarError } = await supabase
      .from('interacciones_chat')
      .insert([
        {
          user_id: tiendaId,
          remitente: 'lead',
          texto: textoLead
        }
      ])

    if (guardarError) {
      console.error('VortexAI: email enviado, pero no se pudo guardar el lead:', guardarError)
    }

    return NextResponse.json({
      success: true,
      enviadoA: destinatario
    })
  } catch (error: unknown) {
    console.error('VortexAI: error en handover-lead:', error)

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Error interno'
      },
      { status: 500 }
    )
  }
}
