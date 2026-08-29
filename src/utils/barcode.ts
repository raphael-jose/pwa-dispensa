/**
 * Barcode utilities for Brazilian products
 * GS1 prefix ranges for Brazil: 789, 790
 */

// GS1 Company Prefix ranges that indicate product category (Brazilian products)
// These are approximate - actual mapping depends on the company
const CATEGORY_PREFIXES: Record<string, { category: string; description: string }[]> = {
  // Food & Beverages (most common)
  '789': [
    { category: 'alimentos', description: 'Alimentos' },
    { category: 'bebidas', description: 'Bebidas' },
  ],
  '790': [
    { category: 'alimentos', description: 'Alimentos' },
    { category: 'bebidas', description: 'Bebidas' },
  ],
};

// Common Brazilian product companies by prefix (approximate)
const COMPANY_HINTS: Record<string, string[]> = {
  '7891': ['Coca-Cola', 'FEMSA'],
  '7892': ['Ambev', 'Brahma', 'Skol'],
  '7893': ['Nestlé', 'Maggi'],
  '7894': ['Unilever', 'Omo', 'Dove'],
  '7895': ['P&G', 'Tição', 'Rey'],
  '7896': ['BRF', 'Sadia', 'Perdigão'],
  '7897': ['JBS', 'Seara'],
  '7898': ['Piracanjuba', 'Itambé'],
  '7899': ['Aurora', 'Seara'],
  '7900': ['Camil', 'Tio João'],
  '7901': ['Leite Moça', 'Nestlé'],
  '7902': ['Danone', 'Actimel'],
  '7903': ['Coca-Cola FEMSA'],
  '7904': ['Heineken', 'Ambev'],
  '7905': ['Unilever', 'Knorr'],
  '7906': ['P&G', 'Head & Shoulders'],
  '7907': ['Colgate-Palmolive'],
  '7908': ['Johnson & Johnson'],
  '7909': ['Reckitt Benckiser', 'Detran'],
  '7910': ['Henkel', 'Dixan'],
};

export interface BarcodeInfo {
  barcode: string;
  isBrazilian: boolean;
  suggestedCategory: string | null;
  suggestedBrand: string | null;
  prefix: string;
  description: string;
}

export function analyzeBarcode(barcode: string): BarcodeInfo {
  const cleaned = barcode.replace(/\s/g, '');

  // Check if Brazilian (prefix 789 or 790)
  const isBrazilian = cleaned.startsWith('789') || cleaned.startsWith('790');

  // Get first 4 digits for company lookup
  const prefix4 = cleaned.substring(0, 4);
  const prefix3 = cleaned.substring(0, 3);

  // Look up category
  let suggestedCategory: string | null = null;
  if (CATEGORY_PREFIXES[prefix3]) {
    const categories = CATEGORY_PREFIXES[prefix3];
    // Default to alimentos for Brazilian barcodes
    suggestedCategory = categories[0]?.category || null;
  }

  // Look up brand hints
  let suggestedBrand: string | null = null;
  if (COMPANY_HINTS[prefix4]) {
    suggestedBrand = COMPANY_HINTS[prefix4][0];
  } else if (COMPANY_HINTS[prefix3]) {
    suggestedBrand = COMPANY_HINTS[prefix3][0];
  }

  return {
    barcode: cleaned,
    isBrazilian,
    suggestedCategory,
    suggestedBrand,
    prefix: prefix3,
    description: isBrazilian ? `Produto brasileiro (prefixo ${prefix3})` : 'Produto internacional',
  };
}

/**
 * Get default expiration days based on product category
 */
export function getDefaultExpirationDays(category: string): number | null {
  switch (category) {
    case 'alimentos':
      return 180; // 6 months
    case 'bebidas':
      return 365; // 1 year
    case 'limpeza':
      return 730; // 2 years
    case 'higiene':
      return 730; // 2 years
    case 'farmacia':
      return 365; // 1 year
    case 'pet':
      return 365; // 1 year
    case 'descartaveis':
      return null; // No expiration
    default:
      return null;
  }
}

/**
 * Format expiration info for display
 */
export function formatExpirationInfo(expirationDate: string | Date): {
  daysLeft: number;
  status: 'expired' | 'critical' | 'warning' | 'ok';
  label: string;
  color: string;
} {
  const exp = typeof expirationDate === 'string' ? new Date(expirationDate + 'T12:00:00') : expirationDate;
  const now = new Date();
  const diff = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diff < 0) {
    return { daysLeft: diff, status: 'expired', label: `Vencido há ${Math.abs(diff)} dias`, color: 'red' };
  }
  if (diff === 0) {
    return { daysLeft: 0, status: 'critical', label: 'Vence hoje', color: 'orange' };
  }
  if (diff <= 7) {
    return { daysLeft: diff, status: 'critical', label: `Vence em ${diff} dias`, color: 'orange' };
  }
  if (diff <= 30) {
    return { daysLeft: diff, status: 'warning', label: `Vence em ${diff} dias`, color: 'yellow' };
  }
  return { daysLeft: diff, status: 'ok', label: `Vence em ${diff} dias`, color: 'green' };
}
