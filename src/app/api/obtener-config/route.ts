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
      .select(
  'user_id, color_primario, mensaje_bienvenida, nombre_asistente, posicion, avatar_url, exit_intent'
)
      
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
  } catch (err: any) {
    console.error('Error interno obteniendo configuración:', err);

    return NextResponse.json(
      { error: err.message || 'Error interno' },
      { status: 500 }
    );
  }
}