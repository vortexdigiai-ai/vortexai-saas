import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================================
// CONFIGURACIÓN DEL IMPORTADOR
// ============================================================

// Shopify permite hasta 250 productos por página.
// Limitamos la importación automática a 10.000 productos por
// una sola ejecución para evitar respuestas gigantes y timeouts.
const SHOPIFY_PRODUCTS_PER_PAGE = 250;
const MAX_SHOPIFY_PRODUCTS = 10000;
const MAX_SHOPIFY_PAGES = Math.ceil(
  MAX_SHOPIFY_PRODUCTS / SHOPIFY_PRODUCTS_PER_PAGE
);

// Para tiendas no Shopify.
// No significa que siempre vayamos a descargar todas estas URLs:
// es simplemente el máximo permitido por el descubrimiento.
const MAX_SITEMAP_PRODUCT_URLS = 5000;

// Número máximo de páginas de sitemap que procesamos.
const MAX_SITEMAPS = 50;

// Número de páginas de producto que descargamos simultáneamente.
const MAX_CONCURRENT_PRODUCT_PAGES = 8;

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
// ESPERAR
// ============================================================

function esperar(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

// ============================================================
// DESCARGAR TEXTO CON TIMEOUT Y REINTENTOS
// ============================================================

async function descargarTexto(
  url: string,
  timeoutMs = 12000,
  reintentos = 2
): Promise<{
  ok: boolean;
  status: number;
  text: string;
}> {

  let ultimoError: unknown = null;

  for (
    let intento = 0;
    intento <= reintentos;
    intento++
  ) {

    const controller =
      new AbortController();

    const timeout =
      setTimeout(
        () => controller.abort(),
        timeoutMs
      );

    try {

      const response =
        await fetch(url, {

          method: 'GET',

          headers: {

            'User-Agent':
              'Mozilla/5.0 (compatible; VortexAI/1.0; +https://vortexaiofficial.vercel.app)',

            Accept:
              'text/html,application/xhtml+xml,application/xml,text/xml,application/json',

            'Accept-Language':
              'es-ES,es;q=0.9,en;q=0.8',

            'Cache-Control':
              'no-cache'
          },

          cache: 'no-store',

          redirect: 'follow',

          signal: controller.signal,
        });

      const text =
        await response.text();

      // Reintentamos errores temporales
      if (
        (
          response.status === 429 ||
          response.status === 500 ||
          response.status === 502 ||
          response.status === 503 ||
          response.status === 504
        ) &&
        intento < reintentos
      ) {

        await esperar(
          500 * (intento + 1)
        );

        continue;
      }

      return {

        ok: response.ok,

        status: response.status,

        text,
      };

    } catch (error) {

      ultimoError = error;

      if (intento < reintentos) {

        await esperar(
          500 * (intento + 1)
        );

        continue;
      }

    } finally {

      clearTimeout(timeout);
    }
  }

  console.error(
    'VortexAI: error descargando URL:',
    url,
    ultimoError
  );

  return {

    ok: false,

    status: 0,

    text: '',
  };
}

// ============================================================
// NORMALIZAR URL
// ============================================================

function normalizarUrl(url: string): string {

  try {

    const resultado =
      new URL(url);

    resultado.hash = '';

    resultado.search = '';

    return resultado
      .toString()
      .replace(/\/$/, '');

  } catch {

    return url
      .split('?')[0]
      .split('#')[0]
      .replace(/\/$/, '');
  }
}

// ============================================================
// EXTRAER <loc> DE SITEMAPS
// ============================================================

function extraerLocsXML(
  xml: string
): string[] {

  const urls: string[] = [];

  const regex =
    /<loc[^>]*>([\s\S]*?)<\/loc>/gi;

  let match;

  while (
    (match = regex.exec(xml)) !== null
  ) {

    const valor =
      match[1]
        .trim()
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#x27;/g, "'")
        .replace(/&quot;/g, '"');

    if (valor) {
      urls.push(valor);
    }
  }

  return urls;
}

// ============================================================
// DESCUBRIR SITEMAPS
// ============================================================

async function descubrirSitemaps(
  baseUrl: string
): Promise<string[]> {

  const origen =
    new URL(baseUrl).origin;

  const candidatos =
    new Set<string>([

      `${origen}/sitemap.xml`,

      `${origen}/sitemap_index.xml`,

      `${origen}/sitemap_products.xml`,

      `${origen}/sitemap_products_1.xml`,

      `${origen}/sitemap_products_2.xml`,

      `${origen}/sitemap_products_3.xml`,

      `${origen}/sitemap_products_4.xml`,

      `${origen}/sitemap_products_5.xml`,
    ]);

  try {

    const robots =
      await descargarTexto(
        `${origen}/robots.txt`,
        8000,
        1
      );

    if (robots.ok) {

      for (
        const linea of
        robots.text.split(/\r?\n/)
      ) {

        if (
          /^\s*sitemap\s*:/i.test(
            linea
          )
        ) {

          const sitemap =
            linea
              .replace(
                /^\s*sitemap\s*:/i,
                ''
              )
              .trim();

          if (sitemap) {
            candidatos.add(
              sitemap
            );
          }
        }
      }
    }

  } catch {
    // robots.txt es opcional.
  }

  return Array.from(
    candidatos
  );
}

// ============================================================
// DESCUBRIR URLS DE PRODUCTOS MEDIANTE SITEMAPS
// ============================================================

async function descubrirProductosDesdeSitemaps(
  baseUrl: string,
  maxUrls = MAX_SITEMAP_PRODUCT_URLS
): Promise<string[]> {

  const sitemapsIniciales =
    await descubrirSitemaps(
      baseUrl
    );

  const sitemapsPendientes =
    [...sitemapsIniciales];

  const sitemapsVisitados =
    new Set<string>();

  const urlsProducto =
    new Set<string>();

  const hostnameBase =
    new URL(baseUrl).hostname;

  while (
    sitemapsPendientes.length > 0 &&
    urlsProducto.size < maxUrls &&
    sitemapsVisitados.size < MAX_SITEMAPS
  ) {

    const sitemapUrl =
      sitemapsPendientes.shift()!;

    const sitemapNormalizado =
      normalizarUrl(
        sitemapUrl
      );

    if (
      sitemapsVisitados.has(
        sitemapNormalizado
      )
    ) {
      continue;
    }

    sitemapsVisitados.add(
      sitemapNormalizado
    );

    try {

      const respuesta =
        await descargarTexto(
          sitemapUrl,
          12000,
          2
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

      for (
        const loc of locs
      ) {

        if (
          urlsProducto.size >=
          maxUrls
        ) {
          break;
        }

        const normalizada =
          normalizarUrl(loc);

        // Un sitemap puede apuntar
        // a otros sitemaps.
        if (
          /sitemap/i.test(
            normalizada
          ) ||
          /\.xml($|\?)/i.test(
            normalizada
          )
        ) {

          if (
            !sitemapsVisitados.has(
              normalizada
            )
          ) {

            sitemapsPendientes.push(
              normalizada
            );
          }

          continue;
        }

        try {

          const urlObj =
            new URL(
              normalizada
            );

          const mismaTienda =
            urlObj.hostname ===
            hostnameBase;

          if (!mismaTienda) {
            continue;
          }

          const esProducto =
            /\/products?\//i.test(
              urlObj.pathname
            ) ||
            /\/product[/-]/i.test(
              urlObj.pathname
            ) ||
            /\/p\//i.test(
              urlObj.pathname
            );

          if (esProducto) {

            urlsProducto.add(
              normalizada
            );
          }

        } catch {
          // URL inválida.
        }
      }

    } catch {
      // Un sitemap inaccesible no debe impedir probar los demás.
    }
  }

  return Array.from(
    urlsProducto
  ).slice(
    0,
    maxUrls
  );
}

// ============================================================
// SHOPIFY: MAPEAR PRODUCTO
// ============================================================

function mapearProductoShopify(
  producto: any,
  baseUrl: string
): Record<string, any> {

  const primeraVariante =
    Array.isArray(
      producto?.variants
    )
      ? producto.variants[0]
      : null;

  const imagen =
    producto?.image?.src ||
    producto?.featured_image ||
    (
      Array.isArray(
        producto?.images
      )
        ? producto.images[0]?.src
        : ''
    ) ||
    '';

  const url =
    producto?.handle
      ? new URL(
          `/products/${producto.handle}`,
          baseUrl
        ).toString()
      : producto?.url || '';

  return {

    nombre:
      producto?.title ||
      producto?.name ||
      '',

    descripcion:
      producto?.body_html ||
      producto?.description ||
      '',

    imagen,

    url,

    sku:
      primeraVariante?.sku ||
      '',

    marca:
      producto?.vendor ||
      '',

    precio:
      primeraVariante?.price ||
      producto?.price ||
      '',

    moneda:
      producto?.currency ||
      '',

    disponibilidad:
      primeraVariante?.available === true
        ? 'https://schema.org/InStock'
        : primeraVariante?.available === false
          ? 'https://schema.org/OutOfStock'
          : '',
  };
}

// ============================================================
// SHOPIFY: OBTENER CATÁLOGO COMPLETO
// ============================================================

async function intentarShopifyJson(
  baseUrl: string,
  maxProductos = MAX_SHOPIFY_PRODUCTS
): Promise<{
  productos: Record<string, any>[];
  detectado: boolean;
  paginas: number;
  endpointUsado: string | null;
  limiteAlcanzado: boolean;
}> {

  const productos:
    Record<string, any>[] = [];

  const vistos =
    new Set<string>();

  const endpoints = [

    new URL(
      '/products.json',
      baseUrl
    ).toString(),

    new URL(
      '/collections/all/products.json',
      baseUrl
    ).toString()
  ];

  let endpointUsado:
    string | null = null;

  let paginas = 0;

  let detectado = false;

  let limiteAlcanzado = false;

  for (
    const endpointBase of endpoints
  ) {

    productos.length = 0;
    vistos.clear();

    let endpointFuncionando =
      false;

    let detenerEsteEndpoint =
      false;

    for (
      let pagina = 1;
      pagina <= MAX_SHOPIFY_PAGES;
      pagina++
    ) {

      if (
        productos.length >=
        maxProductos
      ) {

        limiteAlcanzado =
          true;

        break;
      }

      try {

        const endpoint =
          new URL(
            endpointBase
          );

        endpoint.searchParams.set(
          'limit',
          String(
            SHOPIFY_PRODUCTS_PER_PAGE
          )
        );

        endpoint.searchParams.set(
          'page',
          String(pagina)
        );

        const respuesta =
          await descargarTexto(
            endpoint.toString(),
            15000,
            2
          );

        if (!respuesta.ok) {

          // Si la primera página responde
          // 404/403/etc., probamos el siguiente
          // endpoint Shopify.
          if (pagina === 1) {

            if (
              respuesta.status === 401 ||
              respuesta.status === 403 ||
              respuesta.status === 404
            ) {

              detenerEsteEndpoint =
                true;

              break;
            }
          }

          detenerEsteEndpoint =
            true;

          break;
        }

        let datos: any;

        try {

          datos =
            JSON.parse(
              respuesta.text
            );

        } catch {

          if (pagina === 1) {
            detenerEsteEndpoint =
              true;
          }

          break;
        }

        if (
          !Array.isArray(
            datos?.products
          )
        ) {

          if (pagina === 1) {
            detenerEsteEndpoint =
              true;
          }

          break;
        }

        detectado = true;
        endpointFuncionando = true;
        paginas = pagina;

        const productosPagina =
          datos.products;

        if (
          productosPagina.length === 0
        ) {
          break;
        }

        let nuevos = 0;

        for (
          const producto of
          productosPagina
        ) {

          if (
            productos.length >=
            maxProductos
          ) {

            limiteAlcanzado =
              true;

            break;
          }

          const mapeado =
            mapearProductoShopify(
              producto,
              baseUrl
            );

          const clave =
            normalizarUrl(
              mapeado.url || ''
            ) ||
            String(
              mapeado.sku ||
              mapeado.nombre
            )
              .trim()
              .toLowerCase();

          if (
            !clave ||
            vistos.has(clave)
          ) {
            continue;
          }

          vistos.add(
            clave
          );

          productos.push(
            mapeado
          );

          nuevos++;
        }

        // Si Shopify devuelve menos de 250,
        // hemos llegado al final.
        if (
          productosPagina.length <
          SHOPIFY_PRODUCTS_PER_PAGE
        ) {
          break;
        }

        // Protección ante respuestas repetidas.
        if (
          nuevos === 0
        ) {
          break;
        }

        // Pequeña pausa para no disparar
        // demasiadas peticiones consecutivas.
        await esperar(100);

      } catch (error) {

        console.error(
          'VortexAI: error leyendo Shopify:',
          endpointBase,
          pagina,
          error
        );

        break;
      }
    }

    if (
      endpointFuncionando &&
      productos.length > 0
    ) {

      endpointUsado =
        endpointBase;

      break;
    }

    if (
      detenerEsteEndpoint
    ) {
      continue;
    }
  }

  return {

    productos,

    detectado,

    paginas,

    endpointUsado,

    limiteAlcanzado
  };
}

// ============================================================
// ENRIQUECER URLS DE PRODUCTO CON JSON-LD
// ============================================================

async function extraerProductosDesdeUrls(
  urls: string[],
  maxConcurrentes =
    MAX_CONCURRENT_PRODUCT_PAGES
): Promise<Record<string, any>[]> {

  const productos:
    Record<string, any>[] = [];

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
                  10000,
                  1
                );

              if (
                !respuesta.ok ||
                !respuesta.text.trim()
              ) {
                return [];
              }

              return extraerProductosJSONLD(
                respuesta.text
              );

            } catch {

              return [];
            }
          }
        )
      );

    for (
      const resultado of
      resultados
    ) {

      productos.push(
        ...resultado
      );
    }
  }

  return productos;
}

// ============================================================
// DETECTAR SI PARECE SHOPIFY
// ============================================================

function detectarShopify(
  html: string
): boolean {

  return (
    /cdn\.shopify\.com/i.test(
      html
    ) ||

    /Shopify\.theme/i.test(
      html
    ) ||

    /shopify-section/i.test(
      html
    ) ||

    /Shopify/i.test(
      html
    ) ||

    /myshopify\.com/i.test(
      html
    )
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
    // VALIDAR URL
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

    let urlFinal =
      url;

    if (
      !urlFinal.startsWith(
        'http://'
      ) &&
      !urlFinal.startsWith(
        'https://'
      )
    ) {

      urlFinal =
        `https://${urlFinal}`;
    }

    try {

      const urlObj =
        new URL(
          urlFinal
        );

      if (
        urlObj.protocol !==
          'http:' &&
        urlObj.protocol !==
          'https:'
      ) {

        return NextResponse.json(
          {
            error:
              'La URL debe utilizar HTTP o HTTPS.'
          },
          {
            status: 400
          }
        );
      }

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
    // DESCARGAR PÁGINA PRINCIPAL
    // ========================================================

    const respuestaPrincipal =
      await descargarTexto(
        urlFinal,
        15000,
        2
      );

    const html =
      respuestaPrincipal.text;

    const paginaPrincipalDisponible =
      respuestaPrincipal.ok &&
      html.trim().length > 0;

    // ========================================================
    // ESTRATEGIA 1: SHOPIFY JSON API
    //
    // IMPORTANTE:
    // No dependemos de que la página principal cargue.
    // Algunas tiendas grandes/protegidas bloquean la home
    // pero permiten /products.json.
    // ========================================================

    let productos:
      Record<string, any>[] = [];

    let shopifyResultado:
      Awaited<
        ReturnType<
          typeof intentarShopifyJson
        >
      > | null = null;

    const pareceShopify =
      paginaPrincipalDisponible &&
      detectarShopify(
        html
      );

    // Intentamos Shopify si:
    // 1. La home parece Shopify.
    // 2. O la home falló, porque queremos comprobar
    //    directamente el endpoint público.
    // 3. O simplemente queremos permitir detección
    //    aunque la home no contenga las marcas habituales.

    if (
      pareceShopify ||
      !paginaPrincipalDisponible
    ) {

      shopifyResultado =
        await intentarShopifyJson(
          urlFinal
        );

      if (
        shopifyResultado.productos.length >
        0
      ) {

        productos =
          shopifyResultado.productos;
      }
    }

    // ========================================================
    // ESTRATEGIA 2: JSON-LD DE LA PÁGINA PRINCIPAL
    // ========================================================

    if (
      productos.length === 0 &&
      paginaPrincipalDisponible
    ) {

      productos =
        extraerProductosJSONLD(
          html
        );
    }

    // ========================================================
    // ESTRATEGIA 3: SITEMAPS + JSON-LD
    // ========================================================

    if (
      productos.length < 20
    ) {

      const urlsProductos =
        await descubrirProductosDesdeSitemaps(
          urlFinal,
          MAX_SITEMAP_PRODUCT_URLS
        );

      if (
        urlsProductos.length > 0
      ) {

        const productosSitemap =
          await extraerProductosDesdeUrls(
            urlsProductos,
            MAX_CONCURRENT_PRODUCT_PAGES
          );

        productos.push(
          ...productosSitemap
        );
      }
    }

    // ========================================================
    // ESTRATEGIA 4: ENLACES DE PRODUCTOS
    // ========================================================

    if (
      paginaPrincipalDisponible
    ) {

      const productosEnlaces =
        extraerEnlacesProductos(
          html,
          urlFinal
        );

      productos.push(
        ...productosEnlaces
      );
    }

    // ========================================================
    // ELIMINAR DUPLICADOS
    // ========================================================

    productos =
      eliminarDuplicados(
        productos
      );

    // ========================================================
    // SI NO HAY PRODUCTOS
    // ========================================================

    if (
      productos.length === 0
    ) {

      let detalle =
        '';

      if (
        respuestaPrincipal.status
      ) {

        detalle =
          ` La página principal respondió con HTTP ${respuestaPrincipal.status}.`;
      }

      return NextResponse.json(
        {
          error:
            'No se han encontrado productos automáticamente.' +
            detalle +
            ' La tienda puede bloquear la extracción, requerir JavaScript, utilizar protección anti-bot o no exponer un catálogo público. Puedes utilizar el CSV.'
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

    if (
      buscarError
    ) {

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
          status: 500
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
        error: updateError
      } =
        await supabase
          .from('tiendas')
          .update({
            productos_json:
              productos
          })
          .eq(
            'user_id',
            userId
          );

      if (
        updateError
      ) {

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
            status: 500
          }
        );
      }

    } else {

      const {
        error: insertError
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
            }
          ]);

      if (
        insertError
      ) {

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
            status: 500
          }
        );
      }
    }

    // ========================================================
    // INFORMACIÓN DEL RESULTADO
    // ========================================================

    const advertenciaLimite =
      Boolean(
        shopifyResultado?.limiteAlcanzado
      );

    let message =
      `Catálogo importado correctamente. Se han encontrado ${productos.length} productos.`;

    if (
      advertenciaLimite
    ) {

      message +=
        ` Se ha alcanzado el límite de ${MAX_SHOPIFY_PRODUCTS.toLocaleString('es-ES')} productos por importación automática.`;
    }

    if (
      shopifyResultado &&
      shopifyResultado.paginas > 1
    ) {

      message +=
        ` Se han procesado ${shopifyResultado.paginas} páginas del catálogo Shopify.`;
    }

    // ========================================================
    // RESPUESTA
    // ========================================================

    return NextResponse.json(
      {
        success:
          true,

        total_productos:
          productos.length,

        productos,

        message,

        fuente:
          shopifyResultado?.endpointUsado
            ? 'shopify'
            : 'web',

        paginas_shopify:
          shopifyResultado?.paginas ||
          0,

        limite_importacion_alcanzado:
          advertenciaLimite
      },
      {
        status: 200
      }
    );

  } catch (
    error: unknown
  ) {

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