import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ============================================================
// CORS
// ============================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// ============================================================
// PREFLIGHT CORS
// ============================================================

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

// ============================================================
// POST
// RECIBIR / ACTUALIZAR CARRITO
// ============================================================

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const tiendaId =
      body.tiendaId ||
      body.user_id ||
      body.userKey;

    const visitorId =
      body.visitorId ||
      body.visitor_id;

    const cart =
      body.cart ||
      body.carrito ||
      {};

    // ----------------------------------------------------------
    // VALIDACIONES
    // ----------------------------------------------------------

    if (!tiendaId) {
      return NextResponse.json(
        {
          error: 'Falta el identificador de la tienda',
        },
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    if (!visitorId) {
      return NextResponse.json(
        {
          error: 'Falta el identificador del visitante',
        },
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    if (!cart || typeof cart !== 'object') {
      return NextResponse.json(
        {
          error: 'Los datos del carrito no son válidos',
        },
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    // ----------------------------------------------------------
    // COMPROBAR QUE LA TIENDA EXISTE
    // ----------------------------------------------------------

    const { data: tienda, error: tiendaError } = await supabase
      .from('tiendas')
      .select('user_id, carrito_abandonado')
      .eq('user_id', tiendaId)
      .maybeSingle();

    if (tiendaError) {
      console.error(
        'VortexAI: error comprobando tienda:',
        tiendaError
      );

      return NextResponse.json(
        {
          error: tiendaError.message,
        },
        {
          status: 500,
          headers: corsHeaders,
        }
      );
    }

    if (!tienda) {
      return NextResponse.json(
        {
          error: 'La tienda no existe',
        },
        {
          status: 404,
          headers: corsHeaders,
        }
      );
    }

    // ----------------------------------------------------------
    // COMPROBAR SI CARRITO ABANDONADO ESTÁ ACTIVADO
    // ----------------------------------------------------------

    if (tienda.carrito_abandonado !== true) {
      return NextResponse.json(
        {
          success: true,
          enabled: false,
          message:
            'La función de carrito abandonado está desactivada',
        },
        {
          status: 200,
          headers: corsHeaders,
        }
      );
    }

    // ----------------------------------------------------------
    // EXTRAER ITEMS
    // ----------------------------------------------------------

    const items = Array.isArray(cart.items)
      ? cart.items
      : Array.isArray(cart.productos)
        ? cart.productos
        : [];

    // ----------------------------------------------------------
    // TOTAL
    // ----------------------------------------------------------

    let total = Number(cart.total || 0);

    if (!total && items.length > 0) {
      total = items.reduce((sum: number, item: any) => {
        const precio = Number(
          item.precio ??
            item.price ??
            0
        );

        const cantidad = Number(
          item.cantidad ??
            item.quantity ??
            1
        );

        return sum + precio * cantidad;
      }, 0);
    }

    // ----------------------------------------------------------
    // MONEDA
    // ----------------------------------------------------------

    const currency =
      cart.currency ||
      cart.moneda ||
      'EUR';

    // ----------------------------------------------------------
    // URL DEL CARRITO
    // ----------------------------------------------------------

    const cartUrl =
      cart.cart_url ||
      cart.cartUrl ||
      null;

    // ----------------------------------------------------------
    // BUSCAR CARRITO EXISTENTE
    // ----------------------------------------------------------

    const { data: existente, error: buscarError } =
      await supabase
        .from('carritos')
        .select('id, estado')
        .eq('tienda_id', tiendaId)
        .eq('visitor_id', visitorId)
        .maybeSingle();

    if (buscarError) {
      console.error(
        'VortexAI: error buscando carrito:',
        buscarError
      );

      return NextResponse.json(
        {
          error: buscarError.message,
        },
        {
          status: 500,
          headers: corsHeaders,
        }
      );
    }

    // ----------------------------------------------------------
    // DATOS A GUARDAR
    // ----------------------------------------------------------

    const carritoData = {
      tienda_id: tiendaId,
      visitor_id: visitorId,
      items: items,
      total: total,
      currency: currency,
      cart_url: cartUrl,
      estado: 'active',
      updated_at: new Date().toISOString(),
      abandoned_at: null,
      recovered_at: null,
    };

    // ----------------------------------------------------------
    // ACTUALIZAR CARRITO EXISTENTE
    // ----------------------------------------------------------

    if (existente) {
      const { error: updateError } = await supabase
        .from('carritos')
        .update(carritoData)
        .eq('id', existente.id);

      if (updateError) {
        console.error(
          'VortexAI: error actualizando carrito:',
          updateError
        );

        return NextResponse.json(
          {
            error: updateError.message,
          },
          {
            status: 500,
            headers: corsHeaders,
          }
        );
      }

      return NextResponse.json(
        {
          success: true,
          action: 'updated',
          visitorId: visitorId,
        },
        {
          status: 200,
          headers: corsHeaders,
        }
      );
    }

    // ----------------------------------------------------------
    // CREAR NUEVO CARRITO
    // ----------------------------------------------------------

    const { error: insertError } = await supabase
      .from('carritos')
      .insert([carritoData]);

    if (insertError) {
      console.error(
        'VortexAI: error creando carrito:',
        insertError
      );

      return NextResponse.json(
        {
          error: insertError.message,
        },
        {
          status: 500,
          headers: corsHeaders,
        }
      );
    }

    return NextResponse.json(
      {
        success: true,
        action: 'created',
        visitorId: visitorId,
      },
      {
        status: 201,
        headers: corsHeaders,
      }
    );

  } catch (error: any) {
    console.error(
      'VortexAI: error interno en /api/carrito:',
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          'Error interno del servidor',
      },
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
}

// ============================================================
// DELETE
// MARCAR CARRITO COMO RECUPERADO / VACIADO
// ============================================================

export async function DELETE(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const tiendaId =
      body.tiendaId ||
      body.user_id ||
      body.userKey;

    const visitorId =
      body.visitorId ||
      body.visitor_id;

    if (!tiendaId || !visitorId) {
      return NextResponse.json(
        {
          error: 'Faltan datos del carrito',
        },
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    const { error } = await supabase
      .from('carritos')
      .update({
        items: [],
        total: 0,
        estado: 'recuperado',
        recovered_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('tienda_id', tiendaId)
      .eq('visitor_id', visitorId);

    if (error) {
      console.error(
        'VortexAI: error recuperando carrito:',
        error
      );

      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 500,
          headers: corsHeaders,
        }
      );
    }

    return NextResponse.json(
      {
        success: true,
      },
      {
        status: 200,
        headers: corsHeaders,
      }
    );

  } catch (error: any) {
    console.error(
      'VortexAI: error interno recuperando carrito:',
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          'Error interno del servidor',
      },
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
}