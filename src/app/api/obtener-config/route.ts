import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const tiendaId =
      searchParams.get('tiendaId') ||
      searchParams.get('user_id') ||
      searchParams.get('userKey');

    if (!tiendaId) {
      return NextResponse.json(
        { error: 'Falta el identificador de la tienda' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('tiendas')
      .select(`
        user_id,
        nombre_tienda,
        color_primario,
        mensaje_bienvenida,
        nombre_asistente,
        posicion,
        avatar_url,
        tiempos_envio,
        politicas,
        faqs,
        accion_fallback,
        whatsapp_soporte,
        email_soporte,
        umbral_frustracion,
        mensaje_fallback,
        detector_idioma,
        exit_intent,
        cross_selling,
        modo_persuasivo,
        carrito_abandonado,
        analisis_sentimiento,
        cupones_flash,
        plan
      `)
      .eq('user_id', tiendaId)
      .maybeSingle();

    if (error) {
      console.error('Error obteniendo configuración:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'No se encontró configuración para esta tienda' },
        { status: 404 }
      );
    }

    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (err: unknown) {
    console.error('Error interno obteniendo configuración:', err);

    const mensaje =
      err instanceof Error ? err.message : 'Error interno';

    return NextResponse.json(
      { error: mensaje },
      { status: 500 }
    );
  }
}
