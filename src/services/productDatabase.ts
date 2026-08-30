/**
 * Helper utilities for barcode analysis and category detection.
 * 
 * IMPORTANT: We do NOT include a hardcoded product database with barcode mappings.
 * Barcode numbers are NOT product names — a barcode identifies a product type,
 * and the same barcode can represent different sizes/packaging of the same product.
 * 
 * Product identification is done via:
 * 1. User's own saved cache (previously scanned products)
 * 2. External APIs (Open Food Facts, Open Beauty Facts, etc.)
 * 3. Manual entry by the user
 */

// GS1 prefix to company/brand mapping for Brazilian products
const BRAND_PREFIX_MAP: Record<string, string> = {
  '7894': 'Unilever',
  '7893': 'Nestlé',
  '7895': 'P&G',
  '7891': 'Diversos (BR)',
  '7892': 'Ambev',
  '7896': 'BRF / Diversos',
  '7897': 'JBS',
  '7898': 'Piracanjuba / Diversos',
  '7899': 'Aurora / Diversos',
  '7900': 'Camil',
  '7905': 'Unilever',
  '7906': 'P&G',
  '7909': 'Reckitt',
};

/**
 * Suggest brand from barcode prefix (for new products not in cache).
 */
export function suggestBrandFromBarcode(barcode: string): string | null {
  const prefix4 = barcode.substring(0, 4);
  const prefix3 = barcode.substring(0, 3);

  if (BRAND_PREFIX_MAP[prefix4]) return BRAND_PREFIX_MAP[prefix4];
  if (BRAND_PREFIX_MAP[prefix3]) return BRAND_PREFIX_MAP[prefix3];
  return null;
}

/**
 * Get category suggestion from barcode prefix.
 */
export function suggestCategoryFromBarcode(barcode: string): string | null {
  // No automatic category suggestion from prefix alone
  // because the same company (e.g. Unilever) makes food AND cleaning products
  return null;
}

/**
 * Analyze a scanned barcode and return useful info.
 */
export function analyzeBarcode(barcode: string): {
  code: string;
  type: string;
  isBrazilian: boolean;
  description: string;
  suggestedBrand: string | null;
  suggestedCategory: string | null;
} {
  const cleaned = barcode.replace(/\s/g, '');

  // Determine barcode type
  let type = 'Desconhecido';
  if (/^\d{13}$/.test(cleaned)) type = 'EAN-13';
  else if (/^\d{8}$/.test(cleaned)) type = 'EAN-8';
  else if (/^\d{12}$/.test(cleaned)) type = 'UPC-A';
  else if (/^\d{14}$/.test(cleaned)) type = 'GTIN-14';
  else if (/^\d+$/.test(cleaned)) type = `GTIN (${cleaned.length} dígitos)`;

  // Check if Brazilian
  const isBrazilian = cleaned.startsWith('789') || cleaned.startsWith('790');

  // Build description
  let description = `${type}`;
  if (isBrazilian) {
    description += ' — Produto brasileiro';
  }

  const suggestedBrand = suggestBrandFromBarcode(cleaned);
  const suggestedCategory = suggestCategoryFromBarcode(cleaned);

  return {
    code: cleaned,
    type,
    isBrazilian,
    description,
    suggestedBrand,
    suggestedCategory,
  };
}

/**
 * Get default expiration days for a product category.
 */
export function getDefaultExpirationDays(category: string): number | null {
  const defaults: Record<string, number> = {
    alimentos: 180,
    bebidas: 365,
    limpeza: 730,    // 2 years
    higiene: 730,    // 2 years
    farmacia: 365,
    pet: 365,
    descartaveis: 0,  // no expiration
    outros: 365,
  };
  return defaults[category] ?? null;
}

/**
 * Format expiration date info for display.
 */
export function formatExpirationInfo(dateStr: string): { label: string; color: string } | null {
  if (!dateStr) return null;

  const date = new Date(dateStr + 'T12:00:00');
  if (isNaN(date.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  const diffMs = date.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { label: `Vencido há ${Math.abs(diffDays)} dia(s)`, color: 'red' };
  }
  if (diffDays === 0) {
    return { label: 'Vence hoje', color: 'red' };
  }
  if (diffDays <= 3) {
    return { label: `Vence em ${diffDays} dia(s) ⚠️`, color: 'red' };
  }
  if (diffDays <= 7) {
    return { label: `Vence em ${diffDays} dia(s)`, color: 'orange' };
  }
  if (diffDays <= 30) {
    return { label: `Vence em ${diffDays} dia(s)`, color: 'yellow' };
  }
  return { label: `Vence em ${diffDays} dia(s)`, color: 'green' };
}
