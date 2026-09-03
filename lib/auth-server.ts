import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { supabaseAdmin } from './supabase';

export async function getAuthUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{cookies:{getAll(){return cookieStore.getAll()},setAll(){}}});
  const { data:{user} } = await supabase.auth.getUser();
  return user;
}
export async function getAuthTenant() {
  const user = await getAuthUser(); if(!user) return null;
  const { data } = await supabaseAdmin().from('tiendas').select('*').eq('user_id',user.id).maybeSingle();
  return data ? {user,tienda:data} : null;
}
