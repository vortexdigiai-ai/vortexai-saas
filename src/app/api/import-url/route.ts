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
// EXTRAER ENLACES DE PRODUCTOS DEL HTML
// ============================================================

function extraerEnlacesProductos(
  html: string,
  baseUrl: string
): Record<string, any>[] {
  const productos: Record<string, any>[] = [];
  const vistos = new Set<string>();

  const regex =
    /<a[^>]+href=["']([^"']*\/products\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

  let match;

  while ((match = regex.exec(html)) !== null) {
    try {
      const href = match[1];
      const contenido = match[2];

      const urlProducto = new URL(
        href,
        baseUrl
      ).toString();

      const urlLimpia =
        urlProducto.split('?')[0];

      if (vistos.has(urlLimpia)) {
        continue;
      }

      vistos.add(urlLimpia);

      const nombre = contenido
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (!nombre) {
        continue;
      }

      productos.push({
        nombre,
        descripcion: '',
        imagen: '',
        url: urlLimpia,
        sku: '',
        marca: '',
        precio: '',
        moneda: '',
        disponibilidad: ''
      });

    } catch {
      // Ignorar enlaces inválidos
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
// DESCARGAR TEXTO CON TIMEOUT
// ============================================================

async function descargarTexto(
  url: string,
  timeoutMs = 12000
): Promise<{ ok: boolean; status: number; text: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; VortexAI/1.0; +https://vortexaiofficial.vercel.app)',
        Accept: 'text/html,application/xhtml+xml,application/xml,text/xml,application/json',
      },
      cache: 'no-store',
      signal: controller.signal,
    });

    const text = await response.text();

    return {
      ok: response.ok,
      status: response.status,
      text,
    };
  } finally {
    clearTimeout(timeout);
  }
}

// ============================================================
// NORMALIZAR URL DE PRODUCTO
// ============================================================

function normalizarUrl(url: string): string {
  try {
    const resultado = new URL(url);
    resultado.hash = '';
    resultado.search = '';
    return resultado.toString().replace(/\/$/, '');
  } catch {
    return url.split('?')[0].split('#')[0].replace(/\/$/, '');
  }
}

// ============================================================
// EXTRAER <loc> DE SITEMAPS
// ============================================================

function extraerLocsXML(xml: string): string[] {
  const urls: string[] = [];
  const regex = /<loc[^>]*>([\s\S]*?)<\/loc>/gi;
  let match;

  while ((match = regex.exec(xml)) !== null) {
    const valor = match[1]
      .trim()
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#x27;/g, "'")
      .replace(/&quot;/g, '"');

    if (valor) urls.push(valor);
  }

  return urls;
}

// ============================================================
// DESCUBRIR SITEMAPS
// ============================================================

async function descubrirSitemaps(baseUrl: string): Promise<string[]> {
  const origen = new URL(baseUrl).origin;
  const candidatos = new Set<string>([
    `${origen}/sitemap.xml`,
    `${origen}/sitemap_index.xml`,
    `${origen}/sitemap_products.xml`,
    `${origen}/sitemap_products_1.xml`,
  ]);

  try {
    const robots = await descargarTexto(`${origen}/robots.txt`, 8000);

    if (robots.ok) {
      for (const linea of robots.text.split(/\r?\n/)) {
        if (/^\s*sitemap\s*:/i.test(linea)) {
          const sitemap = linea
            .replace(/^\s*sitemap\s*:/i, '')
            .trim();

          if (sitemap) candidatos.add(sitemap);
        }
      }
    }
  } catch {
    // robots.txt es opcional.
  }

  return Array.from(candidatos);
}

// ============================================================
// DESCUBRIR URLS DE PRODUCTOS MEDIANTE SITEMAPS
// ============================================================

async function descubrirProductosDesdeSitemaps(
  baseUrl: string,
  maxUrls = 5000
): Promise<string[]> {
  const sitemapsIniciales = await descubrirSitemaps(baseUrl);
  const sitemapsPendientes = [...sitemapsIniciales];
  const sitemapsVisitados = new Set<string>();
  const urlsProducto = new Set<string>();

  while (
    sitemapsPendientes.length > 0 &&
    urlsProducto.size < maxUrls &&
    sitemapsVisitados.size < 30
  ) {
    const sitemapUrl = sitemapsPendientes.shift()!;
    const sitemapNormalizado = normalizarUrl(sitemapUrl);

    if (sitemapsVisitados.has(sitemapNormalizado)) continue;
    sitemapsVisitados.add(sitemapNormalizado);

    try {
      const respuesta = await descargarTexto(sitemapUrl, 12000);
      if (!respuesta.ok || !respuesta.text.trim()) continue;

      const locs = extraerLocsXML(respuesta.text);

      for (const loc of locs) {
        if (urlsProducto.size >= maxUrls) break;

        const normalizada = normalizarUrl(loc);

        // Un sitemap puede apuntar a otros sitemaps.
        if (/sitemap/i.test(normalizada) || /\.xml($|\?)/i.test(normalizada)) {
          if (!sitemapsVisitados.has(normalizada)) {
            sitemapsPendientes.push(normalizada);
          }
          continue;
        }

        try {
          const urlObj = new URL(normalizada);
          const mismaTienda = urlObj.hostname === new URL(baseUrl).hostname;

          if (!mismaTienda) continue;

          const esProducto =
            /\/products?\//i.test(urlObj.pathname) ||
            /\/product[/-]/i.test(urlObj.pathname) ||
            /\/p\//i.test(urlObj.pathname);

          if (esProducto) urlsProducto.add(normalizada);
        } catch {
          // URL inválida.
        }
      }
    } catch {
      // Un sitemap inaccesible no debe impedir probar los demás.
    }
  }

  return Array.from(urlsProducto).slice(0, maxUrls);
}

// ============================================================
// SHOPIFY: OBTENER CATÁLOGO DIRECTAMENTE CUANDO ESTÁ EXPUESTO
// ============================================================

function mapearProductoShopify(producto: any, baseUrl: string): Record<string, any> {
  const primeraVariante = Array.isArray(producto?.variants)
    ? producto.variants[0]
    : null;

  const imagen =
    producto?.image?.src ||
    producto?.featured_image ||
    (Array.isArray(producto?.images) ? producto.images[0]?.src : '') ||
    '';

  const url = producto?.handle
    ? new URL(`/products/${producto.handle}`, baseUrl).toString()
    : producto?.url || '';

  return {
    nombre: producto?.title || producto?.name || '',
    descripcion: producto?.body_html || producto?.description || '',
    imagen,
    url,
    sku: primeraVariante?.sku || '',
    marca: producto?.vendor || '',
    precio:
      primeraVariante?.price ||
      producto?.price ||
      '',
    moneda: producto?.currency || '',
    disponibilidad:
      primeraVariante?.available === true
        ? 'https://schema.org/InStock'
        : primeraVariante?.available === false
          ? 'https://schema.org/OutOfStock'
          : '',
  };
}

async function intentarShopifyJson(
  baseUrl: string,
  maxPaginas = 20
): Promise<Record<string, any>[]> {
  const productos: Record<string, any>[] = [];
  const vistos = new Set<string>();

  for (let pagina = 1; pagina <= maxPaginas; pagina++) {
    try {
      const endpoint = new URL('/products.json', baseUrl);
      endpoint.searchParams.set('limit', '250');
      endpoint.searchParams.set('page', String(pagina));

      const respuesta = await descargarTexto(endpoint.toString(), 12000);

      if (!respuesta.ok) break;

      let datos: any;
      try {
        datos = JSON.parse(respuesta.text);
      } catch {
        break;
      }

      if (!Array.isArray(datos?.products) || datos.products.length === 0) {
        break;
      }

      let nuevos = 0;

      for (const producto of datos.products) {
        const mapeado = mapearProductoShopify(producto, baseUrl);
        const clave = normalizarUrl(mapeado.url || '') || String(mapeado.nombre);

        if (!clave || vistos.has(clave)) continue;

        vistos.add(clave);
        productos.push(mapeado);
        nuevos++;
      }

      if (nuevos === 0 || datos.products.length < 250) break;
    } catch {
      break;
    }
  }

  return productos;
}

// ============================================================
// ENRIQUECER URLS DE PRODUCTO CON JSON-LD
// ============================================================

async function extraerProductosDesdeUrls(
  urls: string[],
  maxConcurrentes = 8
): Promise<Record<string, any>[]> {
  const productos: Record<string, any>[] = [];

  for (let inicio = 0; inicio < urls.length; inicio += maxConcurrentes) {
    const lote = urls.slice(inicio, inicio + maxConcurrentes);

    const resultados = await Promise.all(
      lote.map(async (url) => {
        try {
          const respuesta = await descargarTexto(url, 10000);
          if (!respuesta.ok || !respuesta.text.trim()) return [];
          return extraerProductosJSONLD(respuesta.text);
        } catch {
          return [];
        }
      })
    );

    for (const resultado of resultados) {
      productos.push(...resultado);
    }
  }

  return productos;
}

// ============================================================
// POST
// ============================================================

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const url = String(body.url || '').trim();
    const userId = String(body.user_id || '').trim();

    if (!url) {
      return NextResponse.json(
        { error: 'Falta la URL de la tienda.' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Falta el identificador de la tienda.' },
        { status: 400 }
      );
    }

    let urlFinal = url;

    if (
      !urlFinal.startsWith('http://') &&
      !urlFinal.startsWith('https://')
    ) {
      urlFinal = `https://${urlFinal}`;
    }

    try {
      new URL(urlFinal);
    } catch {
      return NextResponse.json(
        { error: 'La URL introducida no es válida.' },
        { status: 400 }
      );
    }

    const respuestaPrincipal = await descargarTexto(urlFinal, 15000);

    if (!respuestaPrincipal.ok) {
      return NextResponse.json(
        {
          error: `No se pudo acceder a la tienda. Código HTTP: ${respuestaPrincipal.status}`,
        },
        { status: 400 }
      );
    }

    const html = respuestaPrincipal.text;

    if (!html.trim()) {
      return NextResponse.json(
        { error: 'La página no contiene contenido.' },
        { status: 400 }
      );
    }

    // ========================================================
    // ESTRATEGIA 1: SHOPIFY JSON API
    // ========================================================

    let productos: Record<string, any>[] = [];

    const pareceShopify =
      /cdn\.shopify\.com/i.test(html) ||
      /Shopify\.theme/i.test(html) ||
      /shopify-section/i.test(html) ||
      /Shopify/i.test(html);

    if (pareceShopify) {
      productos = await intentarShopifyJson(urlFinal, 20);
    }

    // ========================================================
    // ESTRATEGIA 2: JSON-LD DE LA PÁGINA PRINCIPAL
    // ========================================================

    if (productos.length === 0) {
      productos = extraerProductosJSONLD(html);
    }

    // ========================================================
    // ESTRATEGIA 3: SITEMAPS + JSON-LD DE PRODUCTOS
    // ========================================================

    if (productos.length < 20) {
      const urlsProductos = await descubrirProductosDesdeSitemaps(
        urlFinal,
        5000
      );

      if (urlsProductos.length > 0) {
        const productosSitemap = await extraerProductosDesdeUrls(
          urlsProductos,
          8
        );

        productos.push(...productosSitemap);
      }
    }

    // ========================================================
    // ESTRATEGIA 4: ENLACES DE PRODUCTOS DE LA PÁGINA PRINCIPAL
    // ========================================================

    if (productos.length === 0) {
      productos = extraerEnlacesProductos(html, urlFinal);
    } else {
      // Aunque ya tengamos productos, añadimos enlaces simples que puedan
      // contener productos que no expongan JSON-LD.
      productos.push(...extraerEnlacesProductos(html, urlFinal));
    }

    productos = eliminarDuplicados(productos);

    if (productos.length === 0) {
      return NextResponse.json(
        {
          error:
            'No se han encontrado productos automáticamente. La tienda puede bloquear la extracción, requerir JavaScript o no exponer un catálogo público. Puedes utilizar el CSV.',
        },
        { status: 422 }
      );
    }

    // ========================================================
    // BUSCAR TIENDA
    // ========================================================

    const {
      data: tiendaExistente,
      error: buscarError,
    } = await supabase
      .from('tiendas')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (buscarError) {
      console.error('VortexAI: error buscando tienda:', buscarError);

      return NextResponse.json(
        {
          error:
            'Error buscando la tienda: ' + buscarError.message,
        },
        { status: 500 }
      );
    }

    // ========================================================
    // GUARDAR CATÁLOGO
    // ========================================================

    if (tiendaExistente) {
      const { error: updateError } = await supabase
        .from('tiendas')
        .update({ productos_json: productos })
        .eq('user_id', userId);

      if (updateError) {
        console.error(
          'VortexAI: error actualizando catálogo:',
          updateError
        );

        return NextResponse.json(
          {
            error:
              'Error guardando el catálogo: ' + updateError.message,
          },
          { status: 500 }
        );
      }
    } else {
      const { error: insertError } = await supabase
        .from('tiendas')
        .insert([
          {
            user_id: userId,
            nombre_tienda: 'Mi Tienda',
            productos_json: productos,
          },
        ]);

      if (insertError) {
        console.error(
          'VortexAI: error creando tienda:',
          insertError
        );

        return NextResponse.json(
          {
            error:
              'Error creando la tienda: ' + insertError.message,
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      {
        success: true,
        total_productos: productos.length,
        productos,
        message:
          `Catálogo importado correctamente. Se han encontrado ${productos.length} productos.`,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('VortexAI: error importando URL:', error);

    const mensaje =
      error instanceof Error
        ? error.message
        : 'Error desconocido';

    return NextResponse.json(
      {
        error: 'Error procesando la URL: ' + mensaje,
      },
      { status: 500 }
    );
  }
}
