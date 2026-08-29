import { getSupabase, isSupabaseConfigured, getCurrentUser } from '@/services/supabase';
import { getPendingSyncItems, markSynced, getAllProducts, getAllPantryItems } from '@/database';
import type { Product, PantryItem } from '@/types';

let syncInterval: ReturnType<typeof setInterval> | null = null;

export function startAutoSync(intervalMs = 30000) {
  if (syncInterval) return;

  syncInterval = setInterval(async () => {
    if (navigator.onLine && isSupabaseConfigured()) {
      await syncPendingChanges();
    }
  }, intervalMs);

  // Also sync when coming back online
  window.addEventListener('online', () => {
    if (isSupabaseConfigured()) {
      syncPendingChanges();
    }
  });
}

export function stopAutoSync() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}

export async function syncPendingChanges(): Promise<'synced' | 'error' | 'offline' | 'not_configured'> {
  if (!navigator.onLine) return 'offline';
  if (!isSupabaseConfigured()) return 'not_configured';

  const client = getSupabase();
  if (!client) return 'not_configured';

  const user = await getCurrentUser();
  if (!user) return 'not_configured';

  try {
    const pendingItems = await getPendingSyncItems();

    for (const item of pendingItems) {
      try {
        const table = item.table === 'products' ? 'products' : 'pantry_items';

        if (item.action === 'delete') {
          await client.from(table).delete().eq('id', item.data.id);
        } else if (item.action === 'create' || item.action === 'update') {
          await client.from(table).upsert(
            { ...item.data, user_id: user.id },
            { onConflict: 'id' }
          );
        }
      } catch {
        // Continue with other items
      }
    }

    // Mark all as synced
    const ids = pendingItems.map(i => i.id).filter((id): id is number => id !== undefined);
    if (ids.length > 0) {
      await markSynced(ids);
    }

    return 'synced';
  } catch {
    return 'error';
  }
}

export async function pullFromSupabase(): Promise<{ products: Product[]; pantryItems: PantryItem[] }> {
  if (!isSupabaseConfigured()) return { products: [], pantryItems: [] };

  const client = getSupabase();
  if (!client) return { products: [], pantryItems: [] };

  const user = await getCurrentUser();
  if (!user) return { products: [], pantryItems: [] };

  try {
    const [productsData, pantryData] = await Promise.all([
      client.from('products').select('*').eq('user_id', user.id),
      client.from('pantry_items').select('*').eq('user_id', user.id)
    ]);

    return {
      products: (productsData.data || []) as Product[],
      pantryItems: (pantryData.data || []) as PantryItem[]
    };
  } catch {
    return { products: [], pantryItems: [] };
  }
}

export async function fullSync(): Promise<'synced' | 'error' | 'offline' | 'not_configured'> {
  if (!navigator.onLine) return 'offline';
  if (!isSupabaseConfigured()) return 'not_configured';

  try {
    // Push local changes
    const pushResult = await syncPendingChanges();
    if (pushResult === 'error') return 'error';

    // Pull remote changes
    const remote = await pullFromSupabase();

    // Here you would merge remote data with local IndexedDB
    // For now, we just push local changes

    return 'synced';
  } catch {
    return 'error';
  }
}
