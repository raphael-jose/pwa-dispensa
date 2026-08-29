import type { OpenFoodFactsProduct } from '@/types';

const BASE_URL = 'https://world.openfoodfacts.org/api/v2';

export interface ProductLookupResult {
  found: boolean;
  barcode: string;
  name?: string;
  brand?: string;
  category?: string;
  imageUrl?: string;
  ingredients?: string;
  quantity?: string;
}

export async function lookupProductByBarcode(barcode: string): Promise<ProductLookupResult> {
  const url = `${BASE_URL}/product/${barcode}?fields=code,product_name,brands,categories,image_front_url,ingredients_text,quantity&lc=pt`;
  
  try {
    console.log('[OFF] Buscando produto:', barcode, url);
    
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(15000)
    });

    console.log('[OFF] Status:', response.status);

    if (!response.ok) {
      console.log('[OFF] Response not OK:', response.status);
      return { found: false, barcode };
    }

    const data: OpenFoodFactsProduct = await response.json();
    console.log('[OFF] Dados recebidos:', data);

    if (data.status !== 1 || !data.product) {
      console.log('[OFF] Produto não encontrado na OFF');
      return { found: false, barcode };
    }

    const p = data.product;
    return {
      found: true,
      barcode,
      name: p.product_name || '',
      brand: p.brands || '',
      category: mapCategory(p.categories || ''),
      imageUrl: p.image_front_url || '',
      ingredients: p.ingredients_text || '',
      quantity: p.quantity || ''
    };
  } catch (err) {
    console.error('[OFF] Erro na busca:', err);
    return { found: false, barcode };
  }
}

function mapCategory(offCategories: string): string {
  const lower = offCategories.toLowerCase();
  if (lower.includes('aliment') || lower.includes('food') || lower.includes('cereal') || lower.includes('legume') || lower.includes('fruta')) return 'alimentos';
  if (lower.includes('boisson') || lower.includes('drink') || lower.includes('água') || lower.includes('suco')) return 'bebidas';
  if (lower.includes('clean') || lower.includes('lave') || lower.includes('detergent')) return 'limpeza';
  if (lower.includes('hygien') || lower.includes('sabon') || lower.includes('higiene')) return 'higiene';
  if (lower.includes('medic') || lower.includes('farmac') || lower.includes('pharm')) return 'farmacia';
  if (lower.includes('pet') || lower.includes('animal')) return 'pet';
  return 'outros';
}
