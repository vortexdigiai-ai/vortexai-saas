import { supabaseAdmin } from './supabase';

export async function getTenantById(id: string) {
  const db = supabaseAdmin();
  const numeric = /^\d+$/.test(id) ? Number(id) : NaN;
  if (Number.isFinite(numeric)) {
    const { data } = await db.from('tiendas').select('*').eq('id', numeric).maybeSingle();
    return data;
  }
  const { data } = await db.from('tiendas').select('*').eq('user_id', id).maybeSingle();
  return data;
}

export async function getOwnerEmail(userId: string) {
  const { data } = await supabaseAdmin().auth.admin.getUserById(userId);
  return data.user?.email ?? null;
}
