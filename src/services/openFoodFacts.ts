import type { OpenFoodFactsProduct } from '@/types';

// ==================== API Base URLs ====================
const OFF_URL = 'https://world.openfoodfacts.org/api/v2';
const OBF_URL = 'https://world.openbeautyfacts.org/api/v2';
const OPF_URL = 'https://world.openproductsfacts.org/api/v2';

export interface ProductLookupResult {
  found: boolean;
  barcode: string;
  name?: string;
  brand?: string;
  category?: string;
  imageUrl?: string;
  ingredients?: string;
  quantity?: string;
  source?: string;
}

// ==================== Lookup chain ====================

export async function lookupProductByBarcode(barcode: string): Promise<ProductLookupResult> {
  console.log('[API] Iniciando busca para:', barcode);

  // 1. Try Open Food Facts (alimentos)
  const offResult = await tryAPI(OFF_URL, barcode, 'openfoodfacts');
  if (offResult.found) return offResult;

  // 2. Try Open Beauty Facts (higiene/limpeza/cosméticos)
  const obfResult = await tryAPI(OBF_URL, barcode, 'openbeautyfacts');
  if (obfResult.found) return obfResult;

  // 3. Try Open Products Facts (produtos gerais)
  const opfResult = await tryAPI(OPF_URL, barcode, 'openproductsfacts');
  if (opfResult.found) return opfResult;

  console.log('[API] Produto não encontrado em nenhuma base');
  return { found: false, barcode };
}

async function tryAPI(baseUrl: string, barcode: string, source: string): Promise<ProductLookupResult> {
  const url = `${baseUrl}/product/${barcode}?fields=code,product_name,brands,categories,image_front_url,ingredients_text,quantity&lc=pt`;

  try {
    console.log(`[API] Buscando em ${source}:`, barcode);

    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000)
    });

    if (!response.ok) {
      console.log(`[API] ${source}: HTTP ${response.status}`);
      return { found: false, barcode };
    }

    const data: OpenFoodFactsProduct = await response.json();

    if (data.status !== 1 || !data.product) {
      console.log(`[API] ${source}: Produto não encontrado`);
      return { found: false, barcode };
    }

    const p = data.product;
    const name = p.product_name || '';

    // Skip empty results
    if (!name || name.trim() === '') {
      console.log(`[API] ${source}: Produto encontrado mas sem nome`);
      return { found: false, barcode };
    }

    console.log(`[API] ✅ Encontrado em ${source}:`, name);

    return {
      found: true,
      barcode,
      name,
      brand: p.brands || '',
      category: mapCategory(p.categories || '', source),
      imageUrl: p.image_front_url || '',
      ingredients: p.ingredients_text || '',
      quantity: p.quantity || '',
      source
    };
  } catch (err) {
    console.error(`[API] ${source}: Erro`, err);
    return { found: false, barcode };
  }
}

// ==================== Category mapping ====================

function mapCategory(offCategories: string, source: string): string {
  const lower = offCategories.toLowerCase();

  // Source hints
  if (source === 'openbeautyfacts') {
    if (lower.includes('hair') || lower.includes('shampo') || lower.includes('cabelo')) return 'higiene';
    if (lower.includes('skin') || lower.includes('pele') || lower.includes('creme')) return 'higiene';
    if (lower.includes('soap') || lower.includes('sabon')) return 'higiene';
    if (lower.includes('detergent') || lower.includes('clean') || lower.includes('limpe')) return 'limpeza';
    if (lower.includes('laundry') || lower.includes('roupa')) return 'limpeza';
    if (lower.includes('tooth') || lower.includes('dente')) return 'higiene';
    return 'higiene';
  }

  if (source === 'openproductsfacts') {
    if (lower.includes('clean') || lower.includes('limpe') || lower.includes('detergent')) return 'limpeza';
    if (lower.includes('hygien') || lower.includes('higiene') || lower.includes('sabon')) return 'higiene';
    if (lower.includes('pet') || lower.includes('animal')) return 'pet';
    return 'outros';
  }

  // OFF category mapping
  if (lower.includes('aliment') || lower.includes('food') || lower.includes('cereal') ||
      lower.includes('legume') || lower.includes('fruta') || lower.includes('carne') ||
      lower.includes('peixe') || lower.includes('lactic') || lower.includes('pão') ||
      lower.includes('arroz') || lower.includes('feijão')) return 'alimentos';
  if (lower.includes('boisson') || lower.includes('drink') || lower.includes('água') ||
      lower.includes('suco') || lower.includes('café') || lower.includes('chá')) return 'bebidas';
  if (lower.includes('clean') || lower.includes('lave') || lower.includes('detergent') ||
      lower.includes('desinfec') || lower.includes('limpe')) return 'limpeza';
  if (lower.includes('hygien') || lower.includes('sabon') || lower.includes('higiene') ||
      lower.includes('shampo') || lower.includes('creme')) return 'higiene';
  if (lower.includes('medic') || lower.includes('farmac') || lower.includes('pharm')) return 'farmacia';
  if (lower.includes('pet') || lower.includes('animal')) return 'pet';
  return 'outros';
}
