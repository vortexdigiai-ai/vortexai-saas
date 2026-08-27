import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('archivo_csv') as File;
    const userId = formData.get('user_id') as string;
    const nombreTienda = formData.get('nombre_tienda') as string;

    if (!file) {
      return NextResponse.json({ error: 'No se ha subido ningún archivo.' }, { status: 400 });
    }

    // Leemos el contenido del archivo CSV como texto plano
    const bufferText = await file.text();

    // Procesamos el CSV con JavaScript nativo (sin dependencias externas)
    const lines = bufferText.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length === 0) {
      return NextResponse.json({ error: 'El archivo CSV está vacío.' }, { status: 400 });
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
    
    const records = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
      const obj: Record<string, string> = {};
      headers.forEach((header, index) => {
        obj[header] = values[index] || '';
      });
      return obj;
    });

    // Guardamos o actualizamos en Supabase
    const { error } = await supabase
      .from('tu_tabla') // Asegúrate de cambiar esto por el nombre real de tu tabla
      .upsert([
        {
          user_id: userId,
          nombre_tienda: nombreTienda,
          productos_json: records,
        }
      ], { onConflict: ['user_id'] });

    if (error) {
      console.error('Error de Supabase:', error);
      return NextResponse.json({ error: 'Error al guardar en la base de datos: ' + error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, total_productos: records.length });

  } catch (err: any) {
    console.error('Error procesando CSV:', err);
    return NextResponse.json({ error: 'Hubo un error al procesar el archivo: ' + err.message }, { status: 500 });
  }
}