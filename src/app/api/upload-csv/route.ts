import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================================
// PARSER CSV
// ============================================================

function parseCSV(text: string): Record<string, string>[] {
  const rows: string[][] = [];

  let row: string[] = [];
  let value = '';
  let dentroDeComillas = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const siguiente = text[i + 1];

    if (char === '"') {
      if (dentroDeComillas && siguiente === '"') {
        value += '"';
        i++;
      } else {
        dentroDeComillas = !dentroDeComillas;
      }

      continue;
    }

    if (char === ',' && !dentroDeComillas) {
      row.push(value.trim());
      value = '';
      continue;
    }

    if (
      (char === '\n' || char === '\r') &&
      !dentroDeComillas
    ) {
      if (char === '\r' && siguiente === '\n') {
        i++;
      }

      row.push(value.trim());
      value = '';

      if (row.some((campo) => campo !== '')) {
        rows.push(row);
      }

      row = [];
      continue;
    }

    value += char;
  }

  if (value !== '' || row.length > 0) {
    row.push(value.trim());

    if (row.some((campo) => campo !== '')) {
      rows.push(row);
    }
  }

  if (rows.length === 0) {
    return [];
  }

  const headers = rows[0].map((header) =>
    header
      .replace(/^\uFEFF/, '')
      .trim()
  );

  const records = rows
    .slice(1)
    .map((values) => {
      const obj: Record<string, string> = {};

      headers.forEach((header, index) => {
        if (!header) {
          return;
        }

        obj[header] =
          values[index] !== undefined
            ? values[index].trim()
            : '';
      });

      return obj;
    })
    .filter((obj) =>
      Object.values(obj).some(
        (value) => value !== ''
      )
    );

  return records;
}

// ============================================================
// POST
// ============================================================

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const file = formData.get(
      'archivo_csv'
    ) as File | null;

    const userId = String(
      formData.get('user_id') || ''
    ).trim();

    const nombreTienda = String(
      formData.get('nombre_tienda') || ''
    ).trim();

    // ========================================================
    // VALIDACIONES
    // ========================================================

    if (!file) {
      return NextResponse.json(
        {
          error: 'No se ha subido ningún archivo.'
        },
        {
          status: 400
        }
      );
    }

    if (!userId) {
      return NextResponse.json(
        {
          error: 'Falta el identificador de la tienda.'
        },
        {
          status: 400
        }
      );
    }

    // ========================================================
    // EXTENSIÓN
    // ========================================================

    if (!file.name.toLowerCase().endsWith('.csv')) {
      return NextResponse.json(
        {
          error: 'El archivo debe ser un CSV.'
        },
        {
          status: 400
        }
      );
    }

    // ========================================================
    // LEER CSV
    // ========================================================

    const bufferText = await file.text();

    if (!bufferText.trim()) {
      return NextResponse.json(
        {
          error: 'El archivo CSV está vacío.'
        },
        {
          status: 400
        }
      );
    }

    // ========================================================
    // PARSEAR CSV
    // ========================================================

    const records = parseCSV(bufferText);

    if (records.length === 0) {
      return NextResponse.json(
        {
          error:
            'No se encontraron productos válidos en el CSV.'
        },
        {
          status: 400
        }
      );
    }

    // ========================================================
    // BUSCAR TIENDA
    // ========================================================

    const {
      data: tiendaExistente,
      error: buscarError
    } = await supabase
      .from('tiendas')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (buscarError) {
      console.error(
        'Error buscando tienda:',
        buscarError
      );

      return NextResponse.json(
        {
          error:
            'Error buscando la tienda: ' +
            buscarError.message
        },
        {
          status: 500
        }
      );
    }

    // ========================================================
    // ACTUALIZAR TIENDA
    // ========================================================

    if (tiendaExistente) {
      const {
        error: updateError
      } = await supabase
        .from('tiendas')
        .update({
          nombre_tienda:
            nombreTienda || 'Mi Tienda',
          productos_json: records
        })
        .eq('user_id', userId);

      if (updateError) {
        console.error(
          'Error actualizando productos:',
          updateError
        );

        return NextResponse.json(
          {
            error:
              'Error al guardar el catálogo: ' +
              updateError.message
          },
          {
            status: 500
          }
        );
      }
    } else {
      // ======================================================
      // CREAR TIENDA
      // ======================================================

      const {
        error: insertError
      } = await supabase
        .from('tiendas')
        .insert([
          {
            user_id: userId,
            nombre_tienda:
              nombreTienda || 'Mi Tienda',
            productos_json: records
          }
        ]);

      if (insertError) {
        console.error(
          'Error creando tienda:',
          insertError
        );

        return NextResponse.json(
          {
            error:
              'Error al crear la tienda: ' +
              insertError.message
          },
          {
            status: 500
          }
        );
      }
    }

    // ========================================================
    // RESPUESTA
    // ========================================================

    return NextResponse.json(
      {
        success: true,
        total_productos: records.length,
        message:
          'Catálogo subido y guardado correctamente.'
      },
      {
        status: 200
      }
    );

  } catch (err: unknown) {
    console.error(
      'Error procesando CSV:',
      err
    );

    const mensaje =
      err instanceof Error
        ? err.message
        : 'Error desconocido';

    return NextResponse.json(
      {
        error:
          'Hubo un error al procesar el archivo: ' +
          mensaje
      },
      {
        status: 500
      }
    );
  }
}