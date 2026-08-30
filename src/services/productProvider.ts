import { lookupProductByBarcode, type ProductLookupResult } from './openFoodFacts';
import { lookupByGTIN, hasCredentials } from './osccbr';
import { suggestBrandFromBarcode, suggestCategoryFromBarcode } from './productDatabase';

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
  try {
    localStorage.removeItem(LOCAL_CACHE_KEY);
  } catch {
    // Ignore
  }
}

export function removeFromLocalCache(barcode: string) {
  try {
    const cache = getLocalCache();
    delete cache[barcode];
    localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore
  }
}

/**
 * ProductProvider - abstraction layer for product lookup.
 * Chain: User Cache → Built-in Database → OSCBR → Open Food Facts → Beauty → Products
 */

export async function lookupProduct(barcode: string): Promise<ProductLookupResult> {
  // 1. Check user's saved cache first (products they already scanned)
  const cache = getLocalCache();
  if (cache[barcode]) {
    const cached = cache[barcode];
    console.log('[Provider] ✅ Cache do usuário:', cached.name);
    return {
      found: true,
      barcode,
      name: cached.name,
      brand: cached.brand,
      category: cached.category,
      imageUrl: cached.imageUrl,
      source: 'user_cache'
    };
  }

  // 2. Try OSCBR API (if user configured credentials)
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

  // 3. Try Open Food Facts → Beauty → Products (international APIs)
  console.log('[Provider] Tentando Open Food Facts...');
  try {
    const result = await lookupProductByBarcode(barcode);
    if (result.found) {
      return result;
    }
  } catch (err) {
    console.error('[Provider] API externa erro:', err);
  }

  // 4. Not found anywhere — suggest brand/category from barcode prefix
  console.log('[Provider] ❌ Não encontrado em nenhuma base (OpenBeautyFacts, OpenProductsFacts, OSCBR, OpenFoodFacts)');
  const suggestedBrand = suggestBrandFromBarcode(barcode);
  const suggestedCategory = suggestCategoryFromBarcode(barcode);

  // For Brazilian barcodes, default suggestion is 'higiene' (app focus)
  const isBrazilian = barcode.startsWith('789') || barcode.startsWith('790');
  return {
    found: false,
    barcode,
    brand: suggestedBrand || '',
    category: suggestedCategory || (isBrazilian ? 'higiene' : 'outros'),
    source: 'prefix_hint'
  };
}

export function validateBarcode(code: string): { valid: boolean; type: string } {
  const cleaned = code.replace(/\s/g, '');

  if (/^\d{13}$/.test(cleaned)) return { valid: true, type: 'EAN-13' };
  if (/^\d{8}$/.test(cleaned)) return { valid: true, type: 'EAN-8' };
  if (/^\d{12}$/.test(cleaned)) return { valid: true, type: 'UPC-A' };
  if (/^\d{6,8}$/.test(cleaned)) return { valid: true, type: 'UPC-E' };
  if (/^[A-Za-z0-9\-\. \/\+\%]+$/.test(cleaned) && cleaned.length >= 3) return { valid: true, type: 'Code 128' };
  if (cleaned.length >= 2) return { valid: true, type: 'QR Code' };

  return { valid: false, type: 'unknown' };
}
