import { lookupProductByBarcode, type ProductLookupResult } from './openFoodFacts';
import { lookupByGTIN, hasCredentials } from './osccbr';

export type { ProductLookupResult };

// Local cache for known products (barcode → product info)
const LOCAL_CACHE_KEY = 'despensa_local_products';

function getLocalCache(): Record<string, { name: string; brand: string; category: string; imageUrl?: string }> {
  try {
    const data = localStorage.getItem(LOCAL_CACHE_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

export function saveToLocalCache(barcode: string, data: { name: string; brand: string; category: string; imageUrl?: string }) {
  try {
    const cache = getLocalCache();
    cache[barcode] = data;
    localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore storage errors
  }
}

export function clearLocalCache() {
  localStorage.removeItem(LOCAL_CACHE_KEY);
}

/**
 * ProductProvider - abstraction layer for product lookup APIs.
 * Chain: Local Cache → OSCBR (Brazilian) → Open Food Facts → Open Beauty Facts → Open Products Facts
 */

export async function lookupProduct(barcode: string): Promise<ProductLookupResult> {
  // 1. Check local cache first (instant, no network)
  const cache = getLocalCache();
  if (cache[barcode]) {
    const cached = cache[barcode];
    console.log('[Provider] Produto encontrado no cache local:', cached.name);
    return {
      found: true,
      barcode,
      name: cached.name,
      brand: cached.brand,
      category: cached.category,
      imageUrl: cached.imageUrl,
      source: 'local_cache'
    };
  }

  // 2. Try OSCBR API (best for Brazilian products)
  if (hasCredentials()) {
    console.log('[Provider] Tentando OSCBR API...');
    try {
      const result = await lookupByGTIN(barcode);
      if (result.found) {
        console.log('[Provider] ✅ OSCBR:', result.name);
        return {
          found: true,
          barcode,
          name: result.name || '',
          brand: result.brand || '',
          category: result.category || 'outros',
          imageUrl: result.imageUrl || '',
          source: 'osccbr'
        };
      }
    } catch (err) {
      console.error('[Provider] OSCBR erro:', err);
    }
  }

  // 3. Try Open Food Facts → Beauty → Products
  console.log('[Provider] Tentando Open Food Facts...');
  return lookupProductByBarcode(barcode);
}

export function validateBarcode(code: string): { valid: boolean; type: string } {
  const cleaned = code.replace(/\s/g, '');

  // EAN-13
  if (/^\d{13}$/.test(cleaned)) {
    return { valid: true, type: 'EAN-13' };
  }

  // EAN-8
  if (/^\d{8}$/.test(cleaned)) {
    return { valid: true, type: 'EAN-8' };
  }

  // UPC-A
  if (/^\d{12}$/.test(cleaned)) {
    return { valid: true, type: 'UPC-A' };
  }

  // UPC-E
  if (/^\d{6,8}$/.test(cleaned)) {
    return { valid: true, type: 'UPC-E' };
  }

  // Code 128
  if (/^[A-Za-z0-9\-\. \/\+\%]+$/.test(cleaned) && cleaned.length >= 3) {
    return { valid: true, type: 'Code 128' };
  }

  // QR Code (any content)
  if (cleaned.length >= 2) {
    return { valid: true, type: 'QR Code' };
  }

  return { valid: false, type: 'unknown' };
}
