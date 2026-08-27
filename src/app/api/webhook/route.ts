import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Inicializamos Stripe y Supabase con las claves de tus variables de entorno
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-28.acacia' as any,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Tus 3 Price IDs que guardaste en Stripe
const PRICE_STARTER = 'price_1U8HNI4BKoMqdBrq4rVw96P3';
const PRICE_GROWTH = 'price_1U8HPf4BKoMqdBrqX5nNTVq8';
const PRICE_PRO = 'price_1U8HRO4BKoMqdBrqWiVP5gIv';

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature') as string;

  let event: Stripe.Event;

  try {
    // Verificamos que la petición viene de Stripe de forma segura
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Cuando se actualiza una suscripción o se paga con éxito una factura
  if (event.type === 'customer.subscription.updated' || event.type === 'invoice.payment_succeeded') {
    const subscription = event.data.object as any;
    
    const customerId = subscription.customer;
    const priceId = subscription.items?.data[0]?.price?.id || subscription.lines?.data[0]?.price?.id;

    // Determinamos qué plan es según el código de precio
    let nuevoPlan = 'free';
    if (priceId === PRICE_STARTER) nuevoPlan = 'starter';
    if (priceId === PRICE_GROWTH) nuevoPlan = 'growth';
    if (priceId === PRICE_PRO) nuevoPlan = 'pro';

    // Actualizamos la base de datos en Supabase
    // (Buscamos al usuario por su 'stripe_customer_id' y le cambiamos el plan)
    const { error } = await supabase
      .from('profiles') // Cambia 'profiles' por el nombre real de tu tabla de usuarios en Supabase
      .update({ plan: nuevoPlan })
      .eq('stripe_customer_id', customerId);

    if (error) {
      console.error('Error al actualizar Supabase:', error);
      return NextResponse.json({ error: 'Error actualizando base de datos' }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}