import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const user_id = body.user_id || body.tiendaId;

    if (!user_id) {
      return NextResponse.json({ error: 'Falta el ID de usuario o tienda' }, { status: 400 });
    }

    const updateData: Record<string, any> = { user_id };

    const camposPosibles = [
      'tiempos_envio', 
      'politicas', 
      'faqs', 
      'exit_intent', 
      'cross_selling',       
      'modo_persuasivo', 
      'detector_idioma',     
      'carrito_abandonado',  
      'analisis_sentimiento',
      'cupones_flash',       
      'plan'
    ];

    for (const campo of camposPosibles) {
      if (body[campo] !== undefined) {
        updateData[campo] = body[campo];
      }
    }

    // Mapeo seguro de diseño
    if (body.color_primario || body.colorPrimario) {
      updateData.color_primario = body.color_primario || body.colorPrimario;
    }
    if (body.mensaje_bienvenida || body.mensajeBienvenida) {
      updateData.mensaje_bienvenida = body.mensaje_bienvenida || body.mensajeBienvenida;
    }
    if (body.avatar_url || body.avatarUrl) {
      updateData.avatar_url = body.avatar_url || body.avatarUrl;
    }
    if (body.posicion !== undefined) {
      updateData.posicion = body.posicion;
    }
    if (body.nombre_asistente || body.nombreAsistente) {
      updateData.nombre_asistente = body.nombre_asistente || body.nombreAsistente;
    }

    // Comprobamos si la tienda ya existe para decidir si hacemos insert o update
    const { data: tiendaExistente } = await supabase
      .from('tiendas')
      .select('user_id')
      .eq('user_id', user_id)
      .maybeSingle();

    let errorSupabase = null;

    if (tiendaExistente) {
      // Si existe, actualizamos
      const resUpdate = await supabase
        .from('tiendas')
        .update(updateData)
        .eq('user_id', user_id);
      errorSupabase = resUpdate.error;
    } else {
      // Si no existe, insertamos con los campos obligatorios cubiertos
      const resInsert = await supabase
        .from('tiendas')
        .insert([updateData]);
      errorSupabase = resInsert.error;
    }

    if (errorSupabase) {
      console.error('Error de Supabase al guardar:', errorSupabase);
      return NextResponse.json({ error: errorSupabase.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error crítico en API guardar-config:', err);
    return NextResponse.json({ error: err.message || 'Error interno del servidor' }, { status: 500 });
  }
}