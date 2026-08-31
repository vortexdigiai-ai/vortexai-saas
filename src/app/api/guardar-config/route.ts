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
      return NextResponse.json(
        { error: 'Falta el identificador de usuario' },
        { status: 400 }
      );
    }

    const updateData: Record<string, any> = {
      user_id: user_id,

      // PERSONALIZACIÓN
      color_primario:
        body.color_primario ||
        body.colorPrimario ||
        '#4400ff',

      mensaje_bienvenida:
        body.mensaje_bienvenida ||
        body.mensajeBienvenida ||
        '¡Hola!',

      nombre_asistente:
        body.nombre_asistente ||
        body.nombreAsistente ||
        'Asistente',

      posicion:
        body.posicion ||
        'derecha',

      avatar_url:
        body.avatar_url ||
        body.avatarUrl ||
        'moderno',

      // POLÍTICAS Y BASE DE CONOCIMIENTO
      tiempos_envio:
        typeof body.tiempos_envio === 'string'
          ? body.tiempos_envio
          : '',

      politicas:
        typeof body.politicas === 'string'
          ? body.politicas
          : '',

      faqs:
        typeof body.faqs === 'string'
          ? body.faqs
          : '',

      // FUNCIONES IA
      detector_idioma:
        typeof body.detector_idioma === 'boolean'
          ? body.detector_idioma
          : true,

      exit_intent:
        typeof body.exit_intent === 'boolean'
          ? body.exit_intent
          : false,

      cross_selling:
        typeof body.cross_selling === 'boolean'
          ? body.cross_selling
          : true,

      modo_persuasivo:
        typeof body.modo_persuasivo === 'boolean'
          ? body.modo_persuasivo
          : false,

      carrito_abandonado:
        typeof body.carrito_abandonado === 'boolean'
          ? body.carrito_abandonado
          : false,

      analisis_sentimiento:
        typeof body.analisis_sentimiento === 'boolean'
          ? body.analisis_sentimiento
          : false,

      cupones_flash:
        typeof body.cupones_flash === 'boolean'
          ? body.cupones_flash
          : false,
    };

    // Comprobamos si ya existe el registro en la tabla 'tiendas'
    const { data: existente, error: buscarError } = await supabase
      .from('tiendas')
      .select('user_id')
      .eq('user_id', user_id)
      .maybeSingle();

    if (buscarError) {
      return NextResponse.json(
        { error: buscarError.message },
        { status: 500 }
      );
    }

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
      console.error('VortexAI: error guardando configuración:', errorSupabase);

      return NextResponse.json(
        { error: errorSupabase.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const mensaje =
      err instanceof Error
        ? err.message
        : 'Error interno';

    console.error('VortexAI: error en guardar-config:', err);

    return NextResponse.json(
      { error: mensaje },
      { status: 500 }
    );
  }
}
