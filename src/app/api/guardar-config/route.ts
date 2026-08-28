import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tiendaId = searchParams.get('tiendaId');

    if (!tiendaId) {
      return NextResponse.json({ error: 'Falta el tiendaId' }, { status: 400 });
    }

    // Buscamos primero por user_id
    let { data, error } = await supabase
      .from('tiendas')
      .select('*')
      .eq('user_id', tiendaId)
      .maybeSingle();

    // Si no lo encuentra por user_id, probamos por si la tabla usa otra columna de identificación
    if (!data) {
      const altQuery = await supabase
        .from('tiendas')
        .select('*')
        .eq('id', tiendaId)
        .maybeSingle();
      data = altQuery.data;
    }

    if (!data) {
      // Si de verdad no existe la fila en Supabase, devolvemos valores por defecto limpios en vez de error 500
      return NextResponse.json({
        color_primario: '#f43f5e',
        nombre_asistente: 'Asistente Virtual IA',
        mensaje_bienvenida: '¡Hola! ¿Cómo puedo ayudarte hoy?',
        posicion: 'derecha',
        avatar_url: 'moderno'
      });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}