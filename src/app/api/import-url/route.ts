import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Vercel/Next.js puede limitar la duración real según el plan.
// Este valor permite que el runtime utilice hasta 60 s cuando el entorno lo permita.
export const maxDuration = 60;

const USER_AGENT =
  'Mozilla/5.0 (compatible; VortexAI/1.0; +https://vortexaiofficial.vercel.app)';

const MAX_PRODUCTOS = 10000;
const MAX_SITEMAPS = 30;
const MAX_URLS_SITEMAP = 10000;
const MAX_CONCURRENTES = 12;
const TIMEOUT_PAGINA_MS = 10000;

// ============================================================
// TIPOS
// ============================================================

type Producto = Record<string, any>;

// ============================================================
// UTILIDADES
// ============================================================

function normalizarUrl(url: string, baseUrl?: string): string {
  try {
    const absoluta = new URL(
      url,
      baseUrl || undefined
    );

    absoluta.hash = '';
    absoluta.search = '';

    return absoluta.toString();
  } catch {
    return '';
  }
}

function nombreDesdeUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const ultimo = pathname
      .split('/')
      .filter(Boolean)
      .pop();

    if (!ultimo) {
      return 'Producto';
    }

    return decodeURIComponent(ultimo)
      .replace(/\.(html?|php)$/i, '')
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (letra) => letra.toUpperCase());
  } catch {
    return 'Producto';
  }
}

function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function descargarTexto(
  url: string,
  timeoutMs = TIMEOUT_PAGINA_MS,
  reintentos = 1
): Promise<{
  ok: boolean;
  text: string;
  finalUrl: string;
  status: number;
}> {
  let ultimoStatus = 0;

  for (let intento = 0; intento <= reintentos; intento++) {
    const controller = new AbortController();

    const timeout = setTimeout(
      () => controller.abort(),
      timeoutMs
    );

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': USER_AGENT,
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        cache: 'no-store',
        redirect: 'follow',
        signal: controller.signal,
      });

      ultimoStatus = response.status;

      if (!response.ok) {
        if (
          intento < reintentos &&
          (response.status === 408 ||
            response.status === 425 ||
            response.status === 429 ||
            response.status >= 500)
        ) {
          await esperar(250 * (intento + 1));
          continue;
        }

        return {
          ok: false,
          text: '',
          finalUrl: response.url || url,
          status: response.status,
        };
      }

      const text = await response.text();

      return {
        ok: true,
        text,
        finalUrl: response.url || url,
        status: response.status,
      };
    } catch {
      if (intento < reintentos) {
        await esperar(250 * (intento + 1));
        continue;
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    ok: false,
    text: '',
    finalUrl: url,
    status: ultimoStatus,
  };
}

// ============================================================
// NORMALIZAR PRODUCTO
// ============================================================

function normalizarProducto(
  item: any,
  urlFallback = ''
): Producto | null {
  if (!item || typeof item !== 'object') {
    return null;
  }

  const ofertas = Array.isArray(item.offers)
    ? item.offers[0]
    : item.offers || {};

  const imagenRaw = Array.isArray(item.image)
    ? item.image[0]
    : item.image || '';

  const imagen =
    typeof imagenRaw === 'string'
      ? imagenRaw
      : imagenRaw?.url || '';

  const marca =
    typeof item.brand === 'object'
      ? item.brand?.name || ''
      : item.brand || '';

  const url =
    normalizarUrl(
      String(item.url || '').trim(),
      urlFallback
    ) || urlFallback;

  const nombre = String(
    item.name || ''
  ).trim();

  if (!nombre && !url) {
    return null;
  }

  return {
    nombre:
      nombre || nombreDesdeUrl(url),

    descripcion:
      typeof item.description === 'string'
        ? item.description.trim()
        : '',

    imagen:
      typeof imagen === 'string'
        ? imagen
        : '',

    url,

    sku:
      String(item.sku || '').trim(),

    marca:
      String(marca || '').trim(),

    precio:
      ofertas?.price ??
      ofertas?.lowPrice ??
      '',

    moneda:
      ofertas?.priceCurrency ||
      '',

    disponibilidad:
      ofertas?.availability ||
      '',
  };
}

// ============================================================
// EXTRAER PRODUCTOS JSON-LD
// ============================================================

function extraerProductosJSONLD(
  html: string,
  baseUrl = ''
): Producto[] {
  const productos: Producto[] = [];

  const regex =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

  let match: RegExpExecArray | null;

  while (
    (match = regex.exec(html)) !== null
  ) {
    try {
      const contenido = match[1]
        .trim()
        // Algunos sitios incluyen comentarios HTML dentro del JSON-LD.
        .replace(/^<!--/, '')
        .replace(/-->$/, '')
        .trim();

      if (!contenido) {
        continue;
      }

      const datos = JSON.parse(contenido);

      const procesar = (item: any): void => {
        if (!item) {
          return;
        }

        if (Array.isArray(item)) {
          item.forEach(procesar);
          return;
        }

        if (typeof item !== 'object') {
          return;
        }

        const tipos = Array.isArray(item['@type'])
          ? item['@type']
          : [item['@type']];

        if (
          tipos.some(
            (tipo: any) =>
              String(tipo).toLowerCase() === 'product'
          )
        ) {
          const producto =
            normalizarProducto(
              item,
              baseUrl
            );

          if (producto) {
            productos.push(producto);
          }
        }

        if (Array.isArray(item['@graph'])) {
          item['@graph'].forEach(procesar);
        }

        // Algunos CMS meten Product dentro de otras propiedades.
        if (
          item.mainEntity &&
          typeof item.mainEntity === 'object'
        ) {
          procesar(item.mainEntity);
        }

        if (
          item.item &&
          typeof item.item === 'object'
        ) {
          procesar(item.item);
        }

        if (
          item.itemListElement &&
          Array.isArray(item.itemListElement)
        ) {
          item.itemListElement.forEach(
            procesar
          );
        }
      };

      procesar(datos);
    } catch {
      // Un bloque JSON-LD inválido no debe impedir procesar los demás.
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
): Producto[] {
  const productos: Producto[] = [];
  const vistos = new Set<string>();

  const regex =
    /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

  let match: RegExpExecArray | null;

  while (
    (match = regex.exec(html)) !== null
  ) {
    try {
      const href = match[1];

      const urlProducto =
        normalizarUrl(href, baseUrl);

      if (!urlProducto) {
        continue;
      }

      const urlObj =
        new URL(urlProducto);

      const path =
        urlObj.pathname.toLowerCase();

      // Shopify / WooCommerce y rutas habituales.
      const pareceProducto =
        path.includes('/products/') ||
        path.includes('/product/') ||
        path.includes('/producto/') ||
        path.includes('/shop/');

      if (!pareceProducto) {
        continue;
      }

      const urlLimpia =
        urlProducto.split('?')[0];

      if (vistos.has(urlLimpia)) {
        continue;
      }

      vistos.add(urlLimpia);

      const contenido =
        match[2]
          .replace(/<script[\s\S]*?<\/script>/gi, ' ')
          .replace(/<style[\s\S]*?<\/style>/gi, ' ')
          .replace(/<[^>]*>/g, ' ')
          .replace(/&nbsp;/gi, ' ')
          .replace(/&amp;/gi, '&')
          .replace(/\s+/g, ' ')
          .trim();

      const nombre =
        contenido ||
        nombreDesdeUrl(urlLimpia);

      productos.push({
        nombre,
        descripcion: '',
        imagen: '',
        url: urlLimpia,
        sku: '',
        marca: '',
        precio: '',
        moneda: '',
        disponibilidad: '',
      });
    } catch {
      // Ignorar enlaces inválidos.
    }
  }

  return productos;
}

// ============================================================
// EXTRAER URLS DE SITEMAP XML
// ============================================================

function extraerLocsXML(xml: string): string[] {
  const urls: string[] = [];

  const regex =
    /<loc[^>]*>\s*([\s\S]*?)\s*<\/loc>/gi;

  let match: RegExpExecArray | null;

  while (
    (match = regex.exec(xml)) !== null
  ) {
    const valor = match[1]
      .replace(/<!\[CDATA\[/g, '')
      .replace(/\]\]>/g, '')
      .trim();

    if (valor) {
      urls.push(valor);
    }
  }

  return urls;
}

function esSitemapIndice(xml: string): boolean {
  return /<sitemapindex\b/i.test(xml);
}

// ============================================================
// DESCUBRIR SITEMAPS
// ============================================================

async function descubrirSitemaps(
  urlBase: string
): Promise<string[]> {
  const origen =
    new URL(urlBase).origin;

  const candidatos = new Set<string>();

  const robotsUrl =
    `${origen}/robots.txt`;

  const robots =
    await descargarTexto(
      robotsUrl,
      8000,
      1
    );

  if (robots.ok) {
    for (
      const linea of robots.text.split(/\r?\n/)
    ) {
      if (
        /^sitemap\s*:/i.test(linea)
      ) {
        const valor =
          linea
            .split(':')
            .slice(1)
            .join(':')
            .trim();

        const sitemap =
          normalizarUrl(valor);

        if (sitemap) {
          candidatos.add(sitemap);
        }
      }
    }
  }

  const habituales = [
    '/sitemap.xml',
    '/sitemap_index.xml',
    '/sitemap-index.xml',
    '/sitemap_products_1.xml',
  ];

  for (const ruta of habituales) {
    candidatos.add(
      `${origen}${ruta}`
    );
  }

  return Array.from(candidatos);
}

// ============================================================
// RECORRER SITEMAPS
// ============================================================

async function obtenerUrlsDesdeSitemaps(
  urlBase: string
): Promise<string[]> {
  const pendientes =
    await descubrirSitemaps(urlBase);

  const procesados =
    new Set<string>();

  const urlsProducto =
    new Set<string>();

  let indice = 0;

  while (
    indice < pendientes.length &&
    procesados.size < MAX_SITEMAPS &&
    urlsProducto.size < MAX_URLS_SITEMAP
  ) {
    const sitemap =
      pendientes[indice++];

    if (procesados.has(sitemap)) {
      continue;
    }

    procesados.add(sitemap);

    const respuesta =
      await descargarTexto(
        sitemap,
        10000,
        1
      );

    if (
      !respuesta.ok ||
      !respuesta.text.trim()
    ) {
      continue;
    }

    const locs =
      extraerLocsXML(
        respuesta.text
      );

    if (
      esSitemapIndice(
        respuesta.text
      )
    ) {
      for (const loc of locs) {
        if (
          pendientes.length >=
          MAX_SITEMAPS * 5
        ) {
          break;
        }

        const normalizada =
          normalizarUrl(loc);

        if (
          normalizada &&
          !procesados.has(normalizada) &&
          !pendientes.includes(normalizada)
        ) {
          pendientes.push(
            normalizada
          );
        }
      }

      continue;
    }

    for (const loc of locs) {
      if (
        urlsProducto.size >=
        MAX_URLS_SITEMAP
      ) {
        break;
      }

      const normalizada =
        normalizarUrl(loc);

      if (!normalizada) {
        continue;
      }

      const path =
        new URL(normalizada)
          .pathname
          .toLowerCase();

      // Los sitemaps de producto de Shopify suelen
      // contener /products/. Para otros CMS aceptamos
      // rutas comunes de producto.
      if (
        path.includes('/products/') ||
        path.includes('/product/') ||
        path.includes('/producto/') ||
        path.includes('/shop/')
      ) {
        urlsProducto.add(
          normalizada
        );
      }
    }
  }

  return Array.from(
    urlsProducto
  ).slice(
    0,
    MAX_URLS_SITEMAP
  );
}

// ============================================================
// EXTRAER PRODUCTOS DESDE URLS
// ============================================================

async function extraerProductosDesdeUrls(
  urls: string[],
  maxConcurrentes = MAX_CONCURRENTES
): Promise<Producto[]> {
  const productos: Producto[] = [];

  for (
    let inicio = 0;
    inicio < urls.length;
    inicio += maxConcurrentes
  ) {
    const lote =
      urls.slice(
        inicio,
        inicio + maxConcurrentes
      );

    const resultados =
      await Promise.all(
        lote.map(
          async (url) => {
            try {
              const respuesta =
                await descargarTexto(
                  url,
                  TIMEOUT_PAGINA_MS,
                  1
                );

              if (
                !respuesta.ok ||
                !respuesta.text.trim()
              ) {
                return [
                  {
                    nombre:
                      nombreDesdeUrl(url),
                    descripcion: '',
                    imagen: '',
                    url,
                    sku: '',
                    marca: '',
                    precio: '',
                    moneda: '',
                    disponibilidad: '',
                  },
                ];
              }

              const encontrados =
                extraerProductosJSONLD(
                  respuesta.text,
                  respuesta.finalUrl || url
                );

              if (
                encontrados.length > 0
              ) {
                return encontrados;
              }

              return [
                {
                  nombre:
                    nombreDesdeUrl(url),
                  descripcion: '',
                  imagen: '',
                  url,
                  sku: '',
                  marca: '',
                  precio: '',
                  moneda: '',
                  disponibilidad: '',
                },
              ];
            } catch {
              return [
                {
                  nombre:
                    nombreDesdeUrl(url),
                  descripcion: '',
                  imagen: '',
                  url,
                  sku: '',
                  marca: '',
                  precio: '',
                  moneda: '',
                  disponibilidad: '',
                },
              ];
            }
          }
        )
      );

    for (
      const resultado of resultados
    ) {
      productos.push(
        ...resultado
      );

      if (
        productos.length >=
        MAX_PRODUCTOS
      ) {
        return productos.slice(
          0,
          MAX_PRODUCTOS
        );
      }
    }

    // Pequeña pausa para no bombardear el servidor de la tienda.
    await esperar(50);
  }

  return productos;
}

// ============================================================
// SHOPIFY: PRODUCTOS.JSON
// ============================================================

function convertirShopifyProducto(
  item: any,
  baseUrl: string
): Producto | null {
  if (
    !item ||
    typeof item !== 'object'
  ) {
    return null;
  }

  const imagen =
    item.image?.src ||
    item.images?.[0]?.src ||
    '';

  const variante =
    Array.isArray(item.variants)
      ? item.variants[0]
      : null;

  const url =
    normalizarUrl(
      `/products/${item.handle || ''}`,
      baseUrl
    );

  if (
    !url &&
    !item.title
  ) {
    return null;
  }

  return {
    nombre:
      String(
        item.title ||
        nombreDesdeUrl(url)
      ).trim(),

    descripcion:
      String(
        item.body_html ||
        item.bodyHtml ||
        ''
      )
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim(),

    imagen:
      String(imagen || ''),

    url,

    sku:
      String(
        variante?.sku ||
        ''
      ).trim(),

    marca:
      String(
        item.vendor ||
        ''
      ).trim(),

    precio:
      variante?.price ??
      '',

    moneda:
      '',

    disponibilidad:
      variante?.available === false
        ? 'https://schema.org/OutOfStock'
        : 'https://schema.org/InStock',
  };
}

async function intentarShopify(
  urlBase: string
): Promise<Producto[]> {
  const origen =
    new URL(urlBase).origin;

  const productos: Producto[] = [];

  // Shopify expone /products.json. La consulta
  // devuelve hasta 250 productos por página en tiendas
  // que permiten este endpoint públicamente.
  // Probamos varias páginas hasta que no haya más.
  const limitePorPagina = 250;

  for (
    let pagina = 1;
    pagina <= 40;
    pagina++
  ) {
    if (
      productos.length >=
      MAX_PRODUCTOS
    ) {
      break;
    }

    const endpoint =
      `${origen}/products.json?limit=${limitePorPagina}&page=${pagina}`;

    const respuesta =
      await descargarTexto(
        endpoint,
        10000,
        1
      );

    if (
      !respuesta.ok ||
      !respuesta.text.trim()
    ) {
      break;
    }

    try {
      const datos =
        JSON.parse(
          respuesta.text
        );

      if (
        !Array.isArray(
          datos.products
        )
      ) {
        break;
      }

      const paginaProductos =
        datos.products
          .map(
            (item: any) =>
              convertirShopifyProducto(
                item,
                origen
              )
          )
          .filter(
            (
              item: Producto | null
            ): item is Producto =>
              item !== null
          );

      productos.push(
        ...paginaProductos
      );

      if (
        datos.products.length <
        limitePorPagina
      ) {
        break;
      }
    } catch {
      break;
    }
  }

  return productos.slice(
    0,
    MAX_PRODUCTOS
  );
}

// ============================================================
// LIMPIAR DUPLICADOS
// ============================================================

function eliminarDuplicados(
  productos: Producto[]
): Producto[] {
  const vistos =
    new Set<string>();

  return productos.filter(
    (producto) => {
      const url =
        normalizarUrl(
          String(
            producto.url || ''
          )
        );

      const sku =
        String(
          producto.sku || ''
        )
          .trim()
          .toLowerCase();

      const nombre =
        String(
          producto.nombre || ''
        )
          .trim()
          .toLowerCase();

      const clave =
        url ||
        (sku
          ? `sku:${sku}`
          : nombre
            ? `nombre:${nombre}`
            : '');

      if (!clave) {
        return false;
      }

      if (
        vistos.has(clave)
      ) {
        return false;
      }

      vistos.add(clave);
      return true;
    }
  );
}

// ============================================================
// POST
// ============================================================

export async function POST(
  req: Request
) {
  try {
    const body =
      await req.json();

    const url =
      String(
        body.url || ''
      ).trim();

    const userId =
      String(
        body.user_id || ''
      ).trim();

    // ========================================================
    // VALIDACIONES
    // ========================================================

    if (!url) {
      return NextResponse.json(
        {
          error:
            'Falta la URL de la tienda.',
        },
        {
          status: 400,
        }
      );
    }

    if (!userId) {
      return NextResponse.json(
        {
          error:
            'Falta el identificador de la tienda.',
        },
        {
          status: 400,
        }
      );
    }

    let urlFinal =
      url;

    if (
      !/^https?:\/\//i.test(
        urlFinal
      )
    ) {
      urlFinal =
        `https://${urlFinal}`;
    }

    try {
      const urlObj =
        new URL(urlFinal);

      if (
        !['http:', 'https:'].includes(
          urlObj.protocol
        )
      ) {
        throw new Error(
          'Protocolo no permitido'
        );
      }

      urlFinal =
        urlObj.toString();
    } catch {
      return NextResponse.json(
        {
          error:
            'La URL introducida no es válida.',
        },
        {
          status: 400,
        }
      );
    }

    // ========================================================
    // 1. INTENTAR SHOPIFY
    // ========================================================

    let productos: Producto[] = [];

    try {
      productos =
        await intentarShopify(
          urlFinal
        );
    } catch (error) {
      console.warn(
        'VortexAI: Shopify no disponible, continuando con otros métodos:',
        error
      );
    }

    // ========================================================
    // 2. DESCARGAR PÁGINA PRINCIPAL
    // ========================================================

    const paginaPrincipal =
      await descargarTexto(
        urlFinal,
        TIMEOUT_PAGINA_MS,
        1
      );

    if (
      paginaPrincipal.ok &&
      paginaPrincipal.text.trim()
    ) {
      const html =
        paginaPrincipal.text;

      // JSON-LD de la página principal.
      productos.push(
        ...extraerProductosJSONLD(
          html,
          paginaPrincipal.finalUrl ||
            urlFinal
        )
      );

      // Enlaces de productos como fallback.
      if (
        productos.length < MAX_PRODUCTOS
      ) {
        productos.push(
          ...extraerEnlacesProductos(
            html,
            paginaPrincipal.finalUrl ||
              urlFinal
          )
        );
      }
    }

    productos =
      eliminarDuplicados(
        productos
      );

    // ========================================================
    // 3. SITEMAP PARA CATÁLOGOS GRANDES
    // ========================================================

    if (
      productos.length <
        MAX_PRODUCTOS
    ) {
      try {
        const urlsSitemap =
          await obtenerUrlsDesdeSitemaps(
            urlFinal
          );

        const urlsNuevas =
          urlsSitemap.filter(
            (urlProducto) =>
              !productos.some(
                (producto) =>
                  normalizarUrl(
                    String(
                      producto.url ||
                        ''
                    )
                  ) ===
                  normalizarUrl(
                    urlProducto
                  )
              )
          );

        const restantes =
          Math.max(
            0,
            MAX_PRODUCTOS -
              productos.length
          );

        if (
          urlsNuevas.length > 0 &&
          restantes > 0
        ) {
          const extraidos =
            await extraerProductosDesdeUrls(
              urlsNuevas.slice(
                0,
                restantes
              )
            );

          productos.push(
            ...extraidos
          );
        }
      } catch (error) {
        console.warn(
          'VortexAI: error procesando sitemap:',
          error
        );
      }
    }

    productos =
      eliminarDuplicados(
        productos
      ).slice(
        0,
        MAX_PRODUCTOS
      );

    // ========================================================
    // COMPROBAR RESULTADO
    // ========================================================

    if (
      productos.length === 0
    ) {
      const mensajePagina =
        paginaPrincipal.ok
          ? 'No se han encontrado productos automáticamente en esta tienda. Puede que la tienda cargue el catálogo mediante JavaScript o bloquee la extracción.'
          : `No se pudo acceder a la tienda${paginaPrincipal.status ? ` (HTTP ${paginaPrincipal.status})` : ''}.`;

      return NextResponse.json(
        {
          error:
            `${mensajePagina} Prueba con una URL de producto o utiliza el CSV.`,
        },
        {
          status: 422,
        }
      );
    }

    // ========================================================
    // BUSCAR TIENDA
    // ========================================================

    const {
      data: tiendaExistente,
      error: buscarError,
    } =
      await supabase
        .from('tiendas')
        .select('user_id')
        .eq(
          'user_id',
          userId
        )
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
            buscarError.message,
        },
        {
          status: 500,
        }
      );
    }

    // ========================================================
    // GUARDAR CATÁLOGO
    // ========================================================

    if (
      tiendaExistente
    ) {
      const {
        error: updateError,
      } =
        await supabase
          .from('tiendas')
          .update({
            productos_json:
              productos,
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
              updateError.message,
          },
          {
            status: 500,
          }
        );
      }
    } else {
      const {
        error: insertError,
      } =
        await supabase
          .from('tiendas')
          .insert([
            {
              user_id:
                userId,
              nombre_tienda:
                'Mi Tienda',
              productos_json:
                productos,
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
              'Error creando la tienda: ' +
              insertError.message,
          },
          {
            status: 500,
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
          `Productos extraídos y guardados correctamente. Total: ${productos.length}.`,
      },
      {
        status: 200,
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
          mensaje,
      },
      {
        status: 500,
      }
    );
  }
}
