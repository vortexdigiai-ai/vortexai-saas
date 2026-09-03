-- VortexAI production hardening for the existing schema.
-- Run after taking a DB backup. Do not execute blindly on an unrelated project.

-- Ensure cart tenant_id uses the same tenant key currently used by the cart API (owner UUID).
-- Existing carritos.tienda_id is UUID and intentionally maps to tiendas.user_id.

create index if not exists tiendas_user_id_idx on public.tiendas(user_id);
create index if not exists interacciones_chat_tienda_created_idx on public.interacciones_chat(tienda_id, created_at desc);
create index if not exists interacciones_chat_conversation_idx on public.interacciones_chat(conversation_id, created_at asc);
create index if not exists carritos_tienda_updated_idx on public.carritos(tienda_id, updated_at desc);

-- Prevent duplicate carts per visitor/tenant when the application uses upsert.
create unique index if not exists carritos_tienda_visitor_uidx on public.carritos(tienda_id, visitor_id);

-- Tighten chat RLS. The application server uses service role; dashboard uses authenticated owner.
alter table public.interacciones_chat enable row level security;

drop policy if exists "Permitir lectura de interacciones" on public.interacciones_chat;
drop policy if exists "Permitir insercion de interacciones" on public.interacciones_chat;

create policy "owner reads own chat" on public.interacciones_chat
for select to authenticated
using (user_id = auth.uid());

create policy "owner inserts own chat" on public.interacciones_chat
for insert to authenticated
with check (user_id = auth.uid());

alter table public.carritos enable row level security;
drop policy if exists "owner reads own carts" on public.carritos;
create policy "owner reads own carts" on public.carritos
for select to authenticated
using (tienda_id = auth.uid());

-- The service role used by API routes bypasses RLS.
