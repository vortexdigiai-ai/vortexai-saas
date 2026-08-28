import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const user_id = body.user_id || body.userKey || body.tiendaId;

    if (!user_id) {
      return NextResponse.json({ error: 'Falta el identificador de usuario' }, { status: 400 });
    }

    const updateData: Record<string, any> = {
      user_id: user_id,
      color_primario: body.color_primario || body.colorPrimario || '#4400ff',
      mensaje_bienvenida: body.mensaje_bienvenida || body.mensajeBienvenida || '¡Hola!',
      nombre_asistente: body.nombre_asistente || body.nombreAsistente || 'Asistente',
      posicion: body.posicion || 'derecha',
      avatar_url: body.avatar_url || body.avatarUrl || 'moderno'
    };

    // Comprobamos si ya existe el registro en la tabla 'tiendas'
    const { data: existente } = await supabase
      .from('tiendas')
      .select('user_id')
      .eq('user_id', user_id)
      .maybeSingle();

    let errorSupabase = null;

    if (existente) {
      const resUpdate = await supabase
        .from('tiendas')
        .update(updateData)
        .eq('user_id', user_id);
      errorSupabase = resUpdate.error;
    } else {
      const resInsert = await supabase
        .from('tiendas')
        .insert([updateData]);
      errorSupabase = resInsert.error;
    }

    if (errorSupabase) {
      return NextResponse.json({ error: errorSupabase.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
  }
}