# VortexAI — rebuild

SaaS multi-tenant para chatbots IA de ecommerce.

## 1. Instalación
```bash
npm install
cp .env.example .env.local
npm run dev
```

## 2. Variables
Completa `.env.local` con Supabase, Anthropic, Stripe y Resend. Nunca subas secretos a Git.

## 3. Supabase
El proyecto está preparado para el esquema existente de VortexAI. Antes de producción, aplica la migración `supabase/production-migration.sql` y revisa las políticas RLS.

## 4. Stripe
El checkout se crea en servidor y lleva `user_id`, `tienda_id` y `plan` en metadata. Configura el webhook apuntando a `/api/stripe-webhook` y usa el secreto del endpoint.

## 5. Email
El formulario de handover usa Resend desde servidor. El destinatario se obtiene del email de la cuenta Supabase del propietario de la tienda, con `email_soporte` como fallback.

## 6. Widget
La instalación usa `/widget.js` y un `data-tienda-id`. No hay un tenant por defecto: si falta el ID, el widget no se monta.

## Nota
Este rebuild evita datos ficticios en analíticas y no incluye claves privadas. Para producción hay que completar la migración RLS y validar las integraciones con las credenciales reales del proyecto.
