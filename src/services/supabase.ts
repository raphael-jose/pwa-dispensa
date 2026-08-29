import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey || supabaseAnonKey === 'YOUR_ANON_KEY_HERE') {
    return null;
  }

  if (!supabase) {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    });
  }

  return supabase;
}

export function isSupabaseConfigured(): boolean {
  return !!supabaseUrl && !!supabaseAnonKey && supabaseAnonKey !== 'YOUR_ANON_KEY_HERE';
}

// ==================== Auth ====================

export async function signIn(email: string, password: string) {
  const client = getSupabase();
  if (!client) throw new Error('Supabase não configurado');
  return client.auth.signInWithPassword({ email, password });
}

export async function signUp(email: string, password: string) {
  const client = getSupabase();
  if (!client) throw new Error('Supabase não configurado');
  return client.auth.signUp({ email, password });
}

export async function signOut() {
  const client = getSupabase();
  if (!client) return;
  return client.auth.signOut();
}

export async function getCurrentUser() {
  const client = getSupabase();
  if (!client) return null;
  const { data } = await client.auth.getUser();
  return data.user;
}

// ==================== Products Sync ====================

export async function syncProductsToSupabase(products: Record<string, unknown>[]) {
  const client = getSupabase();
  if (!client) return;
  const user = await getCurrentUser();
  if (!user) return;

  for (const product of products) {
    const { id, ...rest } = product;
    await client
      .from('products')
      .upsert({ ...rest, id, user_id: user.id }, { onConflict: 'id' });
  }
}

export async function syncPantryItemsToSupabase(items: Record<string, unknown>[]) {
  const client = getSupabase();
  if (!client) return;
  const user = await getCurrentUser();
  if (!user) return;

  for (const item of items) {
    const { id, ...rest } = item;
    await client
      .from('pantry_items')
      .upsert({ ...rest, id, user_id: user.id }, { onConflict: 'id' });
  }
}

export async function fetchProductsFromSupabase() {
  const client = getSupabase();
  if (!client) return [];
  const user = await getCurrentUser();
  if (!user) return [];

  const { data } = await client
    .from('products')
    .select('*')
    .eq('user_id', user.id);

  return data || [];
}

export async function fetchPantryItemsFromSupabase() {
  const client = getSupabase();
  if (!client) return [];
  const user = await getCurrentUser();
  if (!user) return [];

  const { data } = await client
    .from('pantry_items')
    .select('*')
    .eq('user_id', user.id);

  return data || [];
}
