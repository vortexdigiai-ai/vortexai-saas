import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 60

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ============================================================
// CONFIGURACIÓN
// ============================================================

// Shopify
const SHOPIFY_PRODUCTS_PER_PAGE = 250
const MAX_SHOPIFY_PRODUCTS = 10000

// Sitemaps
const MAX_SITEMAPS = 50
const MAX_SITEMAP_PRODUCT_URLS = 10000

// Para no provocar demasiadas peticiones simultáneas
const MAX_CONCURRENT_PRODUCT_PAGES = 12

// Número de productos que intentaremos enriquecer
// descargando su página individual.
// Los productos que no se puedan enriquecer igualmente
// se conservan usando su URL y un nombre generado.
const MAX_ENRICH_PRODUCT_PAGES = 1500

// ============================================================
// UTILIDADES
// ============================================================

function esperar(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

// ============================================================
// DESCARGAR URL CON TIMEOUT Y REINTENTOS
// ============================================================

async function descargarTexto(
  url: string,
  timeoutMs = 12000,
  reintentos = 2
): Promise<{
  ok: boolean
  status: number
  text: string
  contentType: string
}> {

  let ultimoError: unknown = null

  for (
    let intento = 0;
    intento <= reintentos;
    intento++
  ) {

    const controller = new AbortController()

    const timeout = setTimeout(
      () => controller.abort(),
      timeoutMs
    )

    try {

      const response = await fetch(
        url,
        {
          method: 'GET',

          headers: {
            'User-Agent':
              'Mozilla/5.0 (compatible; VortexAI/2.0; +https://vortexaiofficial.vercel.app)',

            Accept:
              'text/html,application/xhtml+xml,application/xml,text/xml,application/json',

            'Accept-Language':
              'es-ES,es;q=0.9,en;q=0.8',

            'Cache-Control':
              'no-cache'
          },

          cache: 'no-store',

          redirect: 'follow',

          signal: controller.signal
        }
      )

      const text =
        await response.text()

      // Reintentar errores temporales
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
        )

        continue
      }

      return {
        ok: response.ok,
        status: response.status,
        text,
        contentType:
          response.headers.get(
            'content-type'
          ) || ''
      }

    } catch (error) {

      ultimoError = error

      if (intento < reintentos) {

        await esperar(
          500 * (intento + 1)
        )

        continue
      }

    } finally {

      clearTimeout(timeout)

    }
  }

  console.error(
    'VortexAI: error descargando URL:',
    url,
    ultimoError
  )

  return {
    ok: false,
    status: 0,
    text: '',
    contentType: ''
  }
}

// ============================================================
// NORMALIZAR URL
// ============================================================

function normalizarUrl(
  url: string
): string {

  try {

    const resultado =
      new URL(url)

    resultado.hash = ''
    resultado.search = ''

    return resultado
      .toString()
      .replace(/\/$/, '')

  } catch {

    return url
      .split('?')[0]
      .split('#')[0]
      .replace(/\/$/, '')
  }
}

// ============================================================
// DECODIFICAR HTML BÁSICO
// ============================================================

function decodificarHtml(
  texto: string
): string {

  return texto
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&nbsp;/gi, ' ')
}

// ============================================================
// EXTRAER PRODUCTOS JSON-LD
// ============================================================

function extraerProductosJSONLD(
  html: string
): Record<string, any>[] {

  const productos: Record<string, any>[] = []

  const regex =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi

  let match

  while (
    (match = regex.exec(html)) !== null
  ) {

    try {

      const contenido =
        match[1].trim()

      if (!contenido) {
        continue
      }

      const datos =
        JSON.parse(contenido)

      const procesar = (
        item: any
      ) => {

        if (
          !item ||
          typeof item !== 'object'
        ) {
          return
        }

        // ======================================================
        // PRODUCT
        // ======================================================

        const tipos =
          Array.isArray(item['@type'])
            ? item['@type']
            : [item['@type']]

        if (
          tipos.includes('Product')
        ) {

          let precio = ''

          let moneda = ''

          let disponibilidad = ''

          if (
            item.offers &&
            typeof item.offers === 'object'
          ) {

            if (
              Array.isArray(item.offers)
            ) {

              const oferta =
                item.offers[0]

              precio =
                oferta?.price ||
                oferta?.lowPrice ||
                ''

              moneda =
                oferta?.priceCurrency ||
                ''

              disponibilidad =
                oferta?.availability ||
                ''

            } else {

              precio =
                item.offers.price ||
                item.offers.lowPrice ||
                ''

              moneda =
                item.offers.priceCurrency ||
                ''

              disponibilidad =
                item.offers.availability ||
                ''
            }
          }

          const imagen =
            Array.isArray(item.image)
              ? item.image[0]
              : item.image || ''

          productos.push({

            nombre:
              String(
                item.name || ''
              ).trim(),

            descripcion:
              String(
                item.description || ''
              ).trim(),

            imagen:
              typeof imagen === 'string'
                ? imagen
                : imagen?.url || '',

            url:
              String(
                item.url || ''
              ).trim(),

            sku:
              String(
                item.sku || ''
              ).trim(),

            marca:
              typeof item.brand === 'object'
                ? String(
                    item.brand?.name || ''
                  )
                : String(
                    item.brand || ''
                  ),

            precio:
              precio,

            moneda:
              moneda,

            disponibilidad:
              disponibilidad
          })

          return
        }

        // ======================================================
        // @GRAPH
        // ======================================================

        if (
          Array.isArray(
            item['@graph']
          )
        ) {

          item['@graph'].forEach(
            procesar
          )
        }

        // ======================================================
        // ITEM LIST
        // ======================================================

        if (
          Array.isArray(
            item.itemListElement
          )
        ) {

          item.itemListElement.forEach(
            (elemento: any) => {

              if (
                elemento?.item
              ) {
                procesar(
                  elemento.item
                )
              } else {
                procesar(
                  elemento
                )
              }
            }
          )
        }
      }

      if (
        Array.isArray(datos)
      ) {

        datos.forEach(
          procesar
        )

      } else {

        procesar(
          datos
        )
      }

    } catch {
      // Algunos JSON-LD de las webs no son válidos.
      // No deben romper la importación.
    }
  }

  return productos
}

// ============================================================
// EXTRAER ENLACES DE PRODUCTOS
// ============================================================

function extraerEnlacesProductos(
  html: string,
  baseUrl: string
): Record<string, any>[] {

  const productos: Record<string, any>[] = []

  const vistos =
    new Set<string>()

  // Shopify / WooCommerce / BigCommerce
  const patrones = [
    /<a[^>]+href=["']([^"']*\/products?\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
    /<a[^>]+href=["']([^"']*\/product\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
    /<a[^>]+href=["']([^"']*\/p\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
  ]

  for (
    const regex of patrones
  ) {

    let match

    while (
      (match = regex.exec(html)) !== null
    ) {

      try {

        const href =
          match[1]

        const contenido =
          match[2]

        const urlProducto =
          new URL(
            href,
            baseUrl
          ).toString()

        const urlLimpia =
          normalizarUrl(
            urlProducto
          )

        if (
          vistos.has(
            urlLimpia
          )
        ) {
          continue
        }

        vistos.add(
          urlLimpia
        )

        const nombre =
          decodificarHtml(
            contenido
              .replace(
                /<[^>]*>/g,
                ' '
              )
              .replace(
                /\s+/g,
                ' '
              )
              .trim()
          )

        if (!nombre) {
          continue
        }

        productos.push({

          nombre,

          descripcion:
            '',

          imagen:
            '',

          url:
            urlLimpia,

          sku:
            '',

          marca:
            '',

          precio:
            '',

          moneda:
            '',

          disponibilidad:
            ''
        })

      } catch {
        // Ignorar enlace inválido
      }
    }
  }

  return productos
}

// ============================================================
// ELIMINAR DUPLICADOS
// ============================================================

function eliminarDuplicados(
  productos: Record<string, any>[]
): Record<string, any>[] {

  const vistos =
    new Set<string>()

  return productos.filter(
    (producto) => {

      const url =
        String(
          producto.url || ''
        ).trim()

      const sku =
        String(
          producto.sku || ''
        ).trim()

      const nombre =
        String(
          producto.nombre || ''
        ).trim()

      const clave =
        normalizarUrl(
          url
        ) ||
        sku.toLowerCase() ||
        nombre.toLowerCase()

      if (!clave) {
        return false
      }

      if (
        vistos.has(
          clave
        )
      ) {
        return false
      }

      vistos.add(
        clave
      )

      return true
    }
  )
}

// ============================================================
// EXTRAER NOMBRE DESDE URL
// ============================================================

function nombreDesdeUrl(
  url: string
): string {

  try {

    const urlObj =
      new URL(url)

    const partes =
      urlObj.pathname
        .split('/')
        .filter(Boolean)

    const ultimo =
      partes[partes.length - 1] || ''

    const limpio =
      decodeURIComponent(
        ultimo
      )
        .replace(
          /\.(html?|php)$/i,
          ''
        )
        .replace(
          /[-_]+/g,
          ' '
        )
        .replace(
          /\s+/g,
          ' '
        )
        .trim()

    if (!limpio) {
      return 'Producto'
    }

    return limpio
      .replace(
        /\b\w/g,
        (letra) =>
          letra.toUpperCase()
      )

  } catch {

    return 'Producto'
  }
}

// ============================================================
// EXTRAER <loc> DE SITEMAPS
// ============================================================

function extraerLocsXML(
  xml: string
): string[] {

  const urls: string[] = []

  const regex =
    /<loc[^>]*>([\s\S]*?)<\/loc>/gi

  let match

  while (
    (match = regex.exec(xml)) !== null
  ) {

    const valor =
      decodificarHtml(
        match[1].trim()
      )

    if (valor) {
      urls.push(valor)
    }
  }

  return urls
}

// ============================================================
// DESCUBRIR SITEMAPS
// ============================================================

async function descubrirSitemaps(
  baseUrl: string
): Promise<string[]> {

  const origen =
    new URL(
      baseUrl
    ).origin

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

      `${origen}/product-sitemap.xml`,

      `${origen}/products-sitemap.xml`
    ])

  try {

    const robots =
      await descargarTexto(
        `${origen}/robots.txt`,
        8000,
        1
      )

    if (
      robots.ok
    ) {

      for (
        const linea of
        robots.text.split(
          /\r?\n/
        )
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
              .trim()

          if (sitemap) {

            candidatos.add(
              sitemap
            )
          }
        }
      }
    }

  } catch {
    // robots.txt es opcional
  }

  return Array.from(
    candidatos
  )
}

// ============================================================
// DETECTAR SI UNA URL PARECE DE PRODUCTO
// ============================================================

function pareceUrlProducto(
  url: string
): boolean {

  try {

    const urlObj =
      new URL(url)

    const pathname =
      urlObj.pathname.toLowerCase()

    return (

      /\/products?\//i.test(
        pathname
      ) ||

      /\/product[/-]/i.test(
        pathname
      ) ||

      /\/p\//i.test(
        pathname
      ) ||

      /\/item\//i.test(
        pathname
      ) ||

      /\/shop\/.+/i.test(
        pathname
      ) ||

      /\/products?-/.test(
        pathname
      )
    )

  } catch {

    return false
  }
}

// ============================================================
// DESCUBRIR PRODUCTOS MEDIANTE SITEMAPS
// ============================================================

async function descubrirProductosDesdeSitemaps(
  baseUrl: string,
  maxUrls = MAX_SITEMAP_PRODUCT_URLS
): Promise<string[]> {

  const sitemapsIniciales =
    await descubrirSitemaps(
      baseUrl
    )

  const pendientes =
    [...sitemapsIniciales]

  const visitados =
    new Set<string>()

  const urlsProducto =
    new Set<string>()

  const hostnameBase =
    new URL(
      baseUrl
    ).hostname

  while (

    pendientes.length > 0 &&

    urlsProducto.size <
      maxUrls &&

    visitados.size <
      MAX_SITEMAPS

  ) {

    const sitemapUrl =
      pendientes.shift()!

    const sitemapNormalizado =
      normalizarUrl(
        sitemapUrl
      )

    if (
      visitados.has(
        sitemapNormalizado
      )
    ) {
      continue
    }

    visitados.add(
      sitemapNormalizado
    )

    try {

      const respuesta =
        await descargarTexto(
          sitemapUrl,
          12000,
          2
        )

      if (
        !respuesta.ok ||
        !respuesta.text.trim()
      ) {
        continue
      }

      const locs =
        extraerLocsXML(
          respuesta.text
        )

      const sitemapEsDeProductos =
        /product/i.test(
          sitemapUrl
        )

      for (
        const loc of locs
      ) {

        if (
          urlsProducto.size >=
          maxUrls
        ) {
          break
        }

        const normalizada =
          normalizarUrl(
            loc
          )

        if (!normalizada) {
          continue
        }

        // ======================================================
        // SITEMAP INDEX
        // ======================================================

        if (

          /sitemap/i.test(
            normalizada
          ) ||

          /\.xml($|\?)/i.test(
            normalizada
          )

        ) {

          if (
            !visitados.has(
              normalizada
            )
          ) {

            pendientes.push(
              normalizada
            )
          }

          continue
        }

        // ======================================================
        // MISMA TIENDA
        // ======================================================

        try {

          const urlObj =
            new URL(
              normalizada
            )

          if (
            urlObj.hostname !==
            hostnameBase
          ) {
            continue
          }

          // ====================================================
          // PRODUCTO
          // ====================================================

          if (
            sitemapEsDeProductos ||
            pareceUrlProducto(
              normalizada
            )
          ) {

            urlsProducto.add(
              normalizada
            )
          }

        } catch {
          // URL inválida
        }
      }

    } catch {
      // Un sitemap fallido no debe detener el resto
    }
  }

  return Array.from(
    urlsProducto
  ).slice(
    0,
    maxUrls
  )
}

// ============================================================
// ENRIQUECER PRODUCTOS DESDE SUS PÁGINAS
// ============================================================

async function extraerProductosDesdeUrls(
  urls: string[],
  maxConcurrentes =
    MAX_CONCURRENT_PRODUCT_PAGES
): Promise<Record<string, any>[]> {

  const productos:
    Record<string, any>[] = []

  for (
    let inicio = 0;
    inicio < urls.length;
    inicio += maxConcurrentes
  ) {

    const lote =
      urls.slice(
        inicio,
        inicio + maxConcurrentes
      )

    const resultados =
      await Promise.all(

        lote.map(
          async (url) => {

            try {

              const respuesta =
                await descargarTexto(
                  url,
                  8000,
                  1
                )

              if (
                !respuesta.ok ||
                !respuesta.text.trim()
              ) {

                // Aunque no podamos leer la página,
                // conservamos el producto.
                return [{
                  nombre:
                    nombreDesdeUrl(
                      url
                    ),

                  descripcion:
                    '',

                  imagen:
                    '',

                  url:
                    url,

                  sku:
                    '',

                  marca:
                    '',

                  precio:
                    '',

                  moneda:
                    '',

                  disponibilidad:
                    ''
                }]

              }

              const encontrados =
                extraerProductosJSONLD(
                  respuesta.text
                )

              if (
                encontrados.length > 0
              ) {

                return encontrados
              }

              // Fallback: producto mínimo
              return [{
                nombre:
                  nombreDesdeUrl(
                    url
                  ),

                descripcion:
                  '',

                imagen:
                  '',

                url:
                  url,

                sku:
                  '',

                marca:
                  '',

                precio:
                  '',

                moneda:
                  '',

                disponibilidad:
                  ''
              }]

            } catch {

              return [{
                nombre:
                  nombreDesdeUrl(
                    url
                  ),

                descripcion:
                  '',

                imagen:
                  '',

                url:
                  url,

                sku:
                  '',

                marca:
                  '',

                precio:
                  '',

                moneda:
                  '',

                disponibilidad:
                  ''
              }]
            }
          }
        )
      )

    for (
      const resultado of
      resultados
    ) {

      productos.push(
        ...resultado
      )
    }

    // Pequeña pausa
    await esperar(50)
  }

  return productos
}

// ============================================================
// DETECTAR SHOPIFY
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
  )
}

// ============================================================
// MAPEAR PRODUCTO SHOPIFY
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
      : null

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

    ''

  let url = ''

  try {

    url =
      producto?.handle
        ? new URL(
            `/products/${producto.handle}`,
            baseUrl
          ).toString()
        : producto?.url || ''

  } catch {

    url =
      producto?.url || ''
  }

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

          : ''
  }
}

// ============================================================
// SHOPIFY: OBTENER CATÁLOGO COMPLETO
// ============================================================

async function intentarShopifyJson(
  baseUrl: string,
  maxProductos =
    MAX_SHOPIFY_PRODUCTS
): Promise<{

  productos:
    Record<string, any>[]

  detectado:
    boolean

  paginas:
    number

  endpointUsado:
    string | null

  limiteAlcanzado:
    boolean

}> {

  const endpoints = [

    new URL(
      '/products.json',
      baseUrl
    ).toString(),

    new URL(
      '/collections/all/products.json',
      baseUrl
    ).toString()
  ]

  let mejorResultado:
    Record<string, any>[] = []

  let mejorEndpoint:
    string | null = null

  let mejorPaginas = 0

  let detectado = false

  let limiteAlcanzado = false

  for (
    const endpointBase of
    endpoints
  ) {

    const productos:
      Record<string, any>[] = []

    const vistos =
      new Set<string>()

    let endpointFuncionando =
      false

    let paginasProcesadas =
      0

    for (
      let pagina = 1;

      pagina <=
      Math.ceil(
        maxProductos /
        SHOPIFY_PRODUCTS_PER_PAGE
      );

      pagina++
    ) {

      if (
        productos.length >=
        maxProductos
      ) {

        limiteAlcanzado =
          true

        break
      }

      try {

        const endpoint =
          new URL(
            endpointBase
          )

        endpoint.searchParams.set(
          'limit',
          String(
            SHOPIFY_PRODUCTS_PER_PAGE
          )
        )

        endpoint.searchParams.set(
          'page',
          String(
            pagina
          )
        )

        const respuesta =
          await descargarTexto(
            endpoint.toString(),
            12000,
            2
          )

        if (
          !respuesta.ok
        ) {

          // Si la primera página no funciona,
          // probamos el siguiente endpoint.
          if (
            pagina === 1
          ) {
            break
          }

          break
        }

        let datos: any

        try {

          datos =
            JSON.parse(
              respuesta.text
            )

        } catch {

          break
        }

        if (
          !Array.isArray(
            datos?.products
          )
        ) {

          break
        }

        detectado =
          true

        endpointFuncionando =
          true

        paginasProcesadas =
          pagina

        const productosPagina =
          datos.products

        if (
          productosPagina.length === 0
        ) {

          break
        }

        let nuevos = 0

        for (
          const producto of
          productosPagina
        ) {

          if (
            productos.length >=
            maxProductos
          ) {

            limiteAlcanzado =
              true

            break
          }

          const mapeado =
            mapearProductoShopify(
              producto,
              baseUrl
            )

          const clave =
            normalizarUrl(
              mapeado.url || ''
            ) ||

            String(
              mapeado.sku ||
              mapeado.nombre ||
              ''
            )
              .trim()
              .toLowerCase()

          if (
            !clave ||
            vistos.has(
              clave
            )
          ) {
            continue
          }

          vistos.add(
            clave
          )

          productos.push(
            mapeado
          )

          nuevos++
        }

        // Menos de 250 significa
        // que hemos llegado al final.
        if (
          productosPagina.length <
          SHOPIFY_PRODUCTS_PER_PAGE
        ) {
          break
        }

        // Si no aparecen productos nuevos,
        // evitamos un bucle infinito.
        if (
          nuevos === 0
        ) {
          break
        }

        await esperar(50)

      } catch (error) {

        console.error(
          'VortexAI: error leyendo Shopify:',
          endpointBase,
          pagina,
          error
        )

        break
      }
    }

    if (
      endpointFuncionando &&
      productos.length > 0
    ) {

      // Nos quedamos con el resultado
      // más completo.
      if (
        productos.length >
        mejorResultado.length
      ) {

        mejorResultado =
          productos

        mejorEndpoint =
          endpointBase

        mejorPaginas =
          paginasProcesadas
      }

      // Si hemos obtenido productos,
      // no necesitamos probar el segundo
      // endpoint salvo que haya obtenido más.
    }
  }

  return {

    productos:
      mejorResultado,

    detectado,

    paginas:
      mejorPaginas,

    endpointUsado:
      mejorEndpoint,

    limiteAlcanzado
  }
}

// ============================================================
// POST
// ============================================================

export async function POST(
  req: Request
) {

  try {

    // ========================================================
    // RECIBIR DATOS
    // ========================================================

    const body =
      await req.json()

    const url =
      String(
        body.url || ''
      ).trim()

    const userId =
      String(
        body.user_id || ''
      ).trim()

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
      )
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
      )
    }

    // ========================================================
    // NORMALIZAR URL
    // ========================================================

    let urlFinal =
      url

    if (
      !urlFinal.startsWith(
        'http://'
      ) &&
      !urlFinal.startsWith(
        'https://'
      )
    ) {

      urlFinal =
        `https://${urlFinal}`
    }

    try {

      const urlObj =
        new URL(
          urlFinal
        )

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
        )
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
      )
    }

    // ========================================================
    // DESCARGAR PÁGINA PRINCIPAL
    // ========================================================

    const respuestaPrincipal =
      await descargarTexto(
        urlFinal,
        15000,
        2
      )

    const html =
      respuestaPrincipal.text

    const paginaPrincipalDisponible =
      respuestaPrincipal.ok &&
      html.trim().length > 0

    // ========================================================
    // PRODUCTOS
    // ========================================================

    let productos:
      Record<string, any>[] = []

    let shopifyResultado:
      Awaited<
        ReturnType<
          typeof intentarShopifyJson
        >
      > | null = null

    // ========================================================
    // ESTRATEGIA 1
    // SHOPIFY JSON API
    //
    // Lo intentamos siempre.
    // Esto permite detectar tiendas Shopify
    // incluso si la página principal está protegida.
    // ========================================================

    shopifyResultado =
      await intentarShopifyJson(
        urlFinal
      )

    if (
      shopifyResultado.productos.length >
      0
    ) {

      productos =
        shopifyResultado.productos
    }

    // ========================================================
    // ESTRATEGIA 2
    // JSON-LD DE LA HOME
    // ========================================================

    if (
      productos.length === 0 &&
      paginaPrincipalDisponible
    ) {

      productos =
        extraerProductosJSONLD(
          html
        )
    }

    // ========================================================
    // ESTRATEGIA 3
    // SITEMAPS
    //
    // Muy importante para tiendas grandes.
    // ========================================================

    let urlsProductos:
      string[] = []

    if (
      productos.length <
      20
    ) {

      urlsProductos =
        await descubrirProductosDesdeSitemaps(
          urlFinal,
          MAX_SITEMAP_PRODUCT_URLS
        )

      if (
        urlsProductos.length >
        0
      ) {

        // ----------------------------------------------------
        // Si tenemos pocos productos,
        // enriquecemos páginas individuales.
        // ----------------------------------------------------

        const urlsParaEnriquecer =
          urlsProductos.slice(
            0,
            MAX_ENRICH_PRODUCT_PAGES
          )

        const productosEnriquecidos =
          await extraerProductosDesdeUrls(
            urlsParaEnriquecer,
            MAX_CONCURRENT_PRODUCT_PAGES
          )

        productos.push(
          ...productosEnriquecidos
        )

        // ----------------------------------------------------
        // IMPORTANTE:
        //
        // Para las URLs restantes no necesitamos descargar
        // una por una. Las añadimos como productos mínimos.
        //
        // Esto permite soportar catálogos enormes sin tener
        // que realizar miles de peticiones HTTP.
        // ----------------------------------------------------

        if (
          urlsProductos.length >
          urlsParaEnriquecer.length
        ) {

          const urlsRestantes =
            urlsProductos.slice(
              MAX_ENRICH_PRODUCT_PAGES
            )

          for (
            const urlProducto of
            urlsRestantes
          ) {

            productos.push({

              nombre:
                nombreDesdeUrl(
                  urlProducto
                ),

              descripcion:
                '',

              imagen:
                '',

              url:
                urlProducto,

              sku:
                '',

              marca:
                '',

              precio:
                '',

              moneda:
                '',

              disponibilidad:
                ''
            })
          }
        }
      }
    }

    // ========================================================
    // ESTRATEGIA 4
    // ENLACES DE LA PÁGINA PRINCIPAL
    // ========================================================

    if (
      paginaPrincipalDisponible
    ) {

      const productosEnlaces =
        extraerEnlacesProductos(
          html,
          urlFinal
        )

      productos.push(
        ...productosEnlaces
      )
    }

    // ========================================================
    // LIMPIAR DUPLICADOS
    // ========================================================

    productos =
      eliminarDuplicados(
        productos
      )

    // ========================================================
    // COMPROBAR RESULTADO
    // ========================================================

    if (
      productos.length === 0
    ) {

      let detalle =
        ''

      if (
        respuestaPrincipal.status
      ) {

        detalle =
          ` La página principal respondió con HTTP ${respuestaPrincipal.status}.`
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
      )
    }

    // ========================================================
    // BUSCAR TIENDA
    // ========================================================

    const {
      data: tiendaExistente,
      error: buscarError
    } =
      await supabase
        .from('tiendas')
        .select(
          'user_id'
        )
        .eq(
          'user_id',
          userId
        )
        .maybeSingle()

    if (
      buscarError
    ) {

      console.error(
        'VortexAI: error buscando tienda:',
        buscarError
      )

      return NextResponse.json(
        {
          error:
            'Error buscando la tienda: ' +
            buscarError.message
        },
        {
          status: 500
        }
      )
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
          )

      if (
        updateError
      ) {

        console.error(
          'VortexAI: error actualizando catálogo:',
          updateError
        )

        return NextResponse.json(
          {
            error:
              'Error guardando el catálogo: ' +
              updateError.message
          },
          {
            status: 500
          }
        )
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
                productos
            }

          ])

      if (
        insertError
      ) {

        console.error(
          'VortexAI: error creando tienda:',
          insertError
        )

        return NextResponse.json(
          {
            error:
              'Error creando la tienda: ' +
              insertError.message
          },
          {
            status: 500
          }
        )
      }
    }

    // ========================================================
    // MENSAJE FINAL
    // ========================================================

    const limiteShopify =
      Boolean(
        shopifyResultado?.limiteAlcanzado
      )

    let message =
      `Catálogo importado correctamente. Se han encontrado ${productos.length} productos.`

    if (
      shopifyResultado &&
      shopifyResultado.paginas > 1
    ) {

      message +=
        ` Se han procesado ${shopifyResultado.paginas} páginas del catálogo Shopify.`
    }

    if (
      limiteShopify
    ) {

      message +=
        ` Se ha alcanzado el límite máximo de ${MAX_SHOPIFY_PRODUCTS.toLocaleString('es-ES')} productos por importación.`
    }

    if (
      urlsProductos.length >
      0 &&
      shopifyResultado?.productos.length === 0
    ) {

      message +=
        ` Se han utilizado los sitemaps de la tienda para descubrir el catálogo.`
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
            : urlsProductos.length > 0
              ? 'sitemap'
              : 'web',

        paginas_shopify:
          shopifyResultado?.paginas ||
          0,

        limite_importacion_alcanzado:
          limiteShopify,

        urls_sitemap_encontradas:
          urlsProductos.length
      },
      {
        status: 200
      }
    )

  } catch (
    error: unknown
  ) {

    console.error(
      'VortexAI: error importando URL:',
      error
    )

    const mensaje =
      error instanceof Error
        ? error.message
        : 'Error desconocido'

    return NextResponse.json(
      {
        error:
          'Error procesando la URL: ' +
          mensaje
      },
      {
        status: 500
      }
    )
  }
}