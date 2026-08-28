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

    let data = null;

    if (tiendaId && tiendaId !== '1') {
      const resUser = await supabase
        .from('tiendas')
        .select('*')
        .eq('user_id', tiendaId)
        .maybeSingle();
      
      data = resUser.data;

      if (!data) {
        const resId = await supabase
          .from('tiendas')
          .select('*')
          .eq('id', tiendaId)
          .maybeSingle();
        data = resId.data;
      }
    }

    // RED DE SEGURIDAD ABSOLUTA: Si no encuentra ID específico, 
    // te devuelve directamente el último registro guardado en la base de datos.
    if (!data) {
      const resUltimo = await supabase
        .from('tiendas')
        .select('*')
        .limit(1)
        .maybeSingle();
      data = resUltimo.data;
    }

    if (!data) {
      return NextResponse.json({
        color_primario: '#4400ff',
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