import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ============================================================
// GET
// MARCAR COMO ABANDONADOS LOS CARRITOS SIN ACTIVIDAD > 30 MIN
// ============================================================

export async function GET(req: Request) {
  try {

    // ----------------------------------------------------------
    // SEGURIDAD
    // ----------------------------------------------------------

    const authHeader =
      req.headers.get('authorization')

    const cronSecret =
      process.env.CRON_SECRET

    if (
      cronSecret &&
      authHeader !== `Bearer ${cronSecret}`
    ) {
      return NextResponse.json(
        {
          error: 'No autorizado'
        },
        {
          status: 401
        }
      )
    }

    // ----------------------------------------------------------
    // CALCULAR LÍMITE DE 30 MINUTOS
    // ----------------------------------------------------------

    const ahora = new Date()

    const limite = new Date(
      ahora.getTime() -
      30 * 60 * 1000
    )

    // ----------------------------------------------------------
    // BUSCAR CARRITOS ACTIVOS SIN ACTIVIDAD
    // ----------------------------------------------------------

    const {
      data: carritos,
      error: buscarError
    } = await supabase
      .from('carritos')
      .select(`
        id,
        tienda_id,
        visitor_id,
        updated_at,
        estado
      `)
      .eq('estado', 'active')
      .lt(
        'updated_at',
        limite.toISOString()
      )

    if (buscarError) {

      console.error(
        'VortexAI: error buscando carritos abandonados:',
        buscarError
      )

      return NextResponse.json(
        {
          error: buscarError.message
        },
        {
          status: 500
        }
      )
    }

    // ----------------------------------------------------------
    // SI NO HAY CARRITOS
    // ----------------------------------------------------------

    if (!carritos || carritos.length === 0) {

      return NextResponse.json({
        success: true,
        procesados: 0,
        mensaje:
          'No hay carritos que deban marcarse como abandonados'
      })

    }

    // ----------------------------------------------------------
    // MARCAR CARRITOS COMO ABANDONADOS
    // ----------------------------------------------------------

    const carritoIds =
      carritos.map(
        (carrito) => carrito.id
      )

    const {
      data: actualizados,
      error: updateError
    } = await supabase
      .from('carritos')
      .update({
        estado: 'abandoned',
        abandoned_at:
          ahora.toISOString(),
        updated_at:
          ahora.toISOString()
      })
      .in(
        'id',
        carritoIds
      )
      .eq(
        'estado',
        'active'
      )
      .select('id')

    if (updateError) {

      console.error(
        'VortexAI: error marcando carritos como abandonados:',
        updateError
      )

      return NextResponse.json(
        {
          error: updateError.message
        },
        {
          status: 500
        }
      )
    }

    // ----------------------------------------------------------
    // RESPUESTA
    // ----------------------------------------------------------

    return NextResponse.json({
      success: true,
      procesados:
        actualizados?.length || 0,
      limite:
        limite.toISOString(),
      ahora:
        ahora.toISOString()
    })

  } catch (error: any) {

    console.error(
      'VortexAI: error interno en carrito-abandonado:',
      error
    )

    return NextResponse.json(
      {
        error:
          error?.message ||
          'Error interno del servidor'
      },
      {
        status: 500
      }
    )
  }
}