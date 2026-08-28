import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      user_id, 
      tiempos_envio, 
      politicas, 
      faqs, 
      exit_intent, 
      cross_selling,       
      modo_persuasivo, 
      detector_idioma,     
      carrito_abandonado,  
      analisis_sentimiento,
      cupones_flash,       
      plan,
      color_primario,
      mensaje_bienvenida,
      avatar_url,
      posicion,            
      nombre_asistente,
      // Capturamos variantes por si el frontend las manda en camelCase
      nombreAsistente,
      colorPrimario,
      mensajeBienvenida,
      avatarUrl
    } = body;

    if (!user_id) {
      return NextResponse.json({ error: 'Falta el ID de usuario' }, { status: 400 });
    }

    const { error } = await supabase
      .from('tiendas')
      .upsert(
        {
          user_id,
          tiempos_envio,
          politicas,
          faqs,
          exit_intent,
          cross_selling,       
          modo_persuasivo,
          detector_idioma,     
          carrito_abandonado,  
          analisis_sentimiento,
          cupones_flash,       
          plan: plan || 'starter',
          color_primario: color_primario || colorPrimario || '#f43f5e',
          mensaje_bienvenida: mensaje_bienvenida || mensajeBienvenida || '¡Hola! ¿Cómo puedo ayudarte hoy?',
          avatar_url: avatar_url || avatarUrl || 'default',
          posicion: posicion || 'derecha',
          nombre_asistente: nombre_asistente || nombreAsistente || 'Asistente Virtual IA',
        },
        { onConflict: 'user_id' }
      );

    if (error) {
      console.error('Error Supabase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}