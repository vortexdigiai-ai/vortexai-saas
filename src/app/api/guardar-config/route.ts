import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Aceptamos tanto user_id como tiendaId para máxima compatibilidad
    const user_id = body.user_id || body.tiendaId;

    if (!user_id) {
      return NextResponse.json({ error: 'Falta el ID de usuario o tienda' }, { status: 400 });
    }

    // Construimos el objeto dinámicamente solo con los campos presentes
    // para evitar sobrescribir con undefined los datos de otras pestañas.
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

    // Mapeo seguro con soporte dual (snake_case / camelCase)
    const color = body.color_primario || body.colorPrimario;
    if (color !== undefined) updateData.color_primario = color;

    const bienvenida = body.mensaje_bienvenida || body.mensajeBienvenida;
    if (bienvenida !== undefined) updateData.mensaje_bienvenida = bienvenida;

    const avatar = body.avatar_url || body.avatarUrl;
    if (avatar !== undefined) updateData.avatar_url = avatar;

    if (body.posicion !== undefined) {
      updateData.posicion = body.posicion;
    }

    const nombre = body.nombre_asistente || body.nombreAsistente;
    if (nombre !== undefined) {
      updateData.nombre_asistente = nombre;
    }

    // Ejecutamos el upsert asegurando el conflicto por user_id
    const { error } = await supabase
      .from('tiendas')
      .upsert(updateData, { onConflict: 'user_id' });

    if (error) {
      console.error('Error en Supabase (guardar-config):', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error crítico en API guardar-config:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}