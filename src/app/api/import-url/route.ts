import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================================
// EXTRAER PRODUCTOS JSON-LD
// ============================================================

function extraerProductosJSONLD(
  html: string
): Record<string, any>[] {

  const productos: Record<string, any>[] = [];

  const regex =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

  let match;

  while ((match = regex.exec(html)) !== null) {

    try {

      const contenido = match[1].trim();

      if (!contenido) {
        continue;
      }

      const datos = JSON.parse(contenido);

      const procesar = (item: any) => {

        if (!item || typeof item !== 'object') {
          return;
        }

        // Product directo
        if (
          item['@type'] === 'Product' ||
          (
            Array.isArray(item['@type']) &&
            item['@type'].includes('Product')
          )
        ) {

          productos.push({
            nombre:
              item.name || '',

            descripcion:
              item.description || '',

            imagen:
              Array.isArray(item.image)
                ? item.image[0]
                : item.image || '',

            url:
              item.url || '',

            sku:
              item.sku || '',

            marca:
              typeof item.brand === 'object'
                ? item.brand?.name || ''
                : item.brand || '',

            precio:
              item.offers?.price ||
              item.offers?.lowPrice ||
              '',

            moneda:
              item.offers?.priceCurrency ||
              '',

            disponibilidad:
              item.offers?.availability ||
              '',
          });

          return;
        }

        // @graph
        if (Array.isArray(item['@graph'])) {
          item['@graph'].forEach(procesar);
        }

        // Arrays
        if (Array.isArray(item)) {
          item.forEach(procesar);
        }
      };

      procesar(datos);

    } catch {
      // Ignoramos JSON-LD que no sea válido
    }
  }

  return productos;
}

// ============================================================
// LIMPIAR DUPLICADOS
// ============================================================

function eliminarDuplicados(
  productos: Record<string, any>[]
) {

  const vistos = new Set<string>();

  return productos.filter((producto) => {

    const clave =
      String(
        producto.url ||
        producto.sku ||
        producto.nombre
      )
        .trim()
        .toLowerCase();

    if (!clave) {
      return true;
    }

    if (vistos.has(clave)) {
      return false;
    }

    vistos.add(clave);

    return true;
  });
}

// ============================================================
// POST
// ============================================================

export async function POST(req: Request) {

  try {

    const body = await req.json();

    const url = String(
      body.url || ''
    ).trim();

    const userId = String(
      body.user_id || ''
    ).trim();

    // ========================================================
    // VALIDACIONES
    // ========================================================

    if (!url) {

      return NextResponse.json(
        {
          error:
            'Falta la URL de la tienda.'
        },
        {
          status: 400
        }
      );
    }

    if (!userId) {

      return NextResponse.json(
        {
          error:
            'Falta el identificador de la tienda.'
        },
        {
          status: 400
        }
      );
    }

    let urlFinal = url;

    if (
      !urlFinal.startsWith('http://') &&
      !urlFinal.startsWith('https://')
    ) {

      urlFinal =
        `https://${urlFinal}`;
    }

    // ========================================================
    // COMPROBAR URL
    // ========================================================

    try {

      new URL(urlFinal);

    } catch {

      return NextResponse.json(
        {
          error:
            'La URL introducida no es válida.'
        },
        {
          status: 400
        }
      );
    }

    // ========================================================
    // DESCARGAR WEB
    // ========================================================

    const response = await fetch(
      urlFinal,
      {
        method: 'GET',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; VortexAI/1.0; +https://vortexaiofficial.vercel.app)',
          'Accept':
            'text/html,application/xhtml+xml',
        },
        cache: 'no-store',
      }
    );

    if (!response.ok) {

      return NextResponse.json(
        {
          error:
            `No se pudo acceder a la tienda. Código HTTP: ${response.status}`
        },
        {
          status: 400
        }
      );
    }

    const html =
      await response.text();

    if (!html.trim()) {

      return NextResponse.json(
        {
          error:
            'La página no contiene contenido.'
        },
        {
          status: 400
        }
      );
    }

    // ========================================================
    // EXTRAER PRODUCTOS
    // ========================================================

    let productos =
      extraerProductosJSONLD(html);

    productos =
      eliminarDuplicados(productos);

    // ========================================================
    // COMPROBAR RESULTADO
    // ========================================================

    if (productos.length === 0) {

      return NextResponse.json(
        {
          error:
            'No se han encontrado productos automáticamente en esta página. Prueba con una URL de producto o utiliza el CSV.'
        },
        {
          status: 422
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
        'VortexAI: error buscando tienda:',
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
    // GUARDAR CATÁLOGO
    // ========================================================

    if (tiendaExistente) {

      const {
        error: updateError
      } = await supabase
        .from('tiendas')
        .update({
          productos_json:
            productos
        })
        .eq(
          'user_id',
          userId
        );

      if (updateError) {

        console.error(
          'VortexAI: error actualizando catálogo:',
          updateError
        );

        return NextResponse.json(
          {
            error:
              'Error guardando el catálogo: ' +
              updateError.message
          },
          {
            status: 500
          }
        );
      }

    } else {

      const {
        error: insertError
      } = await supabase
        .from('tiendas')
        .insert([
          {
            user_id:
              userId,

            nombre_tienda:
              'Mi Tienda',

            productos_json:
              productos,
          }
        ]);

      if (insertError) {

        console.error(
          'VortexAI: error creando tienda:',
          insertError
        );

        return NextResponse.json(
          {
            error:
              'Error creando la tienda: ' +
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

        total_productos:
          productos.length,

        productos,

        message:
          'Productos extraídos y guardados correctamente.'
      },
      {
        status: 200
      }
    );

  } catch (error: unknown) {

    console.error(
      'VortexAI: error importando URL:',
      error
    );

    const mensaje =
      error instanceof Error
        ? error.message
        : 'Error desconocido';

    return NextResponse.json(
      {
        error:
          'Error procesando la URL: ' +
          mensaje
      },
      {
        status: 500
      }
    );
  }
}