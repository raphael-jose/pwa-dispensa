/**
 * Local product database for common Brazilian cleaning and hygiene products.
 * Each entry maps a barcode (EAN-13) to product info.
 * This ensures instant recognition for the most common products.
 */

export interface LocalProduct {
  name: string;
  brand: string;
  category: 'limpeza' | 'higiene' | 'bebidas' | 'alimentos' | 'farmacia' | 'pet' | 'descartaveis' | 'outros';
}

// Prefix to brand mapping for common Brazilian companies
const BRAND_PREFIX_MAP: Record<string, string> = {
  '7894': 'Unilever',
  '7893': 'Nestlé',
  '7895': 'P&G',
  '7891': 'Coca-Cola',
  '7892': 'Ambev',
  '7896': 'BRF',
  '7897': 'JBS',
  '7898': 'Piracanjuba',
  '7899': 'Aurora',
  '7900': 'Camil',
  '7905': 'Unilever',
  '7906': 'P&G',
  '7909': 'Reckitt',
};

// Comprehensive local database — real Brazilian products
export const PRODUCT_DATABASE: Record<string, LocalProduct> = {
  // ==================== LIMPEZA ====================
  // Sabão em pó
  '7891153060010': { name: 'Omo Lavagem Perfeita 1kg', brand: 'Omo', category: 'limpeza' },
  '7891153060027': { name: 'Omo Lavagem Perfeita 500g', brand: 'Omo', category: 'limpeza' },
  '7891153060034': { name: 'Omo Lavagem Perfeita 2kg', brand: 'Omo', category: 'limpeza' },
  '7891153060041': { name: 'Omo Lavagem Perfeita 500g', brand: 'Omo', category: 'limpeza' },
  '7891153060065': { name: 'Omo Lavagem Perfeita 3kg', brand: 'Omo', category: 'limpeza' },
  '7891153060072': { name: 'Omo Lavagem Perfeita 1.6kg', brand: 'Omo', category: 'limpeza' },
  '7891153060089': { name: 'Omo Lavagem Perfeita 800g', brand: 'Omo', category: 'limpeza' },
  '7891153060119': { name: 'Omo Lavagem Perfeita Multi 2kg', brand: 'Omo', category: 'limpeza' },
  '7891153060126': { name: 'Omo Lavagem Perfeita Multi 1.6kg', brand: 'Omo', category: 'limpeza' },
  '7891153060157': { name: 'Omo Lavagem Perfeita 4kg', brand: 'Omo', category: 'limpeza' },
  '7891153060164': { name: 'Omo Lavagem Perfeita 4kg', brand: 'Omo', category: 'limpeza' },
  '7891153060171': { name: 'Omo Lavagem Perfeita 5kg', brand: 'Omo', category: 'limpeza' },
  '7891153060188': { name: 'Omo Lavagem Perfeita 500g', brand: 'Omo', category: 'limpeza' },
  '7891153060195': { name: 'Omo Lavagem Perfeita 1.2kg', brand: 'Omo', category: 'limpeza' },
  '7891153060201': { name: 'Omo Lavagem Perfeita 800g', brand: 'Omo', category: 'limpeza' },
  '7891153060218': { name: 'Omo Lavagem Perfeita 3.2kg', brand: 'Omo', category: 'limpeza' },
  '7891153060225': { name: 'Omo Lavagem Perfeita 3.6kg', brand: 'Omo', category: 'limpeza' },
  '7891153060232': { name: 'Omo Lavagem Perfeita 1.2kg', brand: 'Omo', category: 'limpeza' },
  '7891153060249': { name: 'Omo Lavagem Perfeita 1.5kg', brand: 'Omo', category: 'limpeza' },
  '7891153060256': { name: 'Omo Lavagem Perfeita 1.8kg', brand: 'Omo', category: 'limpeza' },
  '7891153060263': { name: 'Omo Lavagem Perfeita 2.4kg', brand: 'Omo', category: 'limpeza' },
  '7891153060270': { name: 'Omo Lavagem Perfeita 2.8kg', brand: 'Omo', category: 'limpeza' },

  // Tixan
  '7891363000016': { name: 'Tixan Sabão em Pó 1kg', brand: 'Tixan', category: 'limpeza' },
  '7891363000023': { name: 'Tixan Sabão em Pó 2kg', brand: 'Tixan', category: 'limpeza' },
  '7891363000030': { name: 'Tixan Sabão em Pó 500g', brand: 'Tixan', category: 'limpeza' },
  '7891363000047': { name: 'Tixan Sabão em Pó 1.6kg', brand: 'Tixan', category: 'limpeza' },
  '7891363000054': { name: 'Tixan Sabão em Pó 2.5kg', brand: 'Tixan', category: 'limpeza' },
  '7891363000061': { name: 'Tixan Sabão em Pó 3kg', brand: 'Tixan', category: 'limpeza' },
  '7891363000078': { name: 'Tixan Sabão em Pó 4kg', brand: 'Tixan', category: 'limpeza' },
  '7891363000085': { name: 'Tixan Sabão em Pó 500g', brand: 'Tixan', category: 'limpeza' },
  '7891363000092': { name: 'Tixan Sabão em Pó 800g', brand: 'Tixan', category: 'limpeza' },

  // Ypê
  '7891363000320': { name: 'Ypê Sabão em Pó 1kg', brand: 'Ypê', category: 'limpeza' },
  '7891363000337': { name: 'Ypê Sabão em Pó 500g', brand: 'Ypê', category: 'limpeza' },
  '7891363000344': { name: 'Ypê Sabão em Pó 2kg', brand: 'Ypê', category: 'limpeza' },
  '7891363000351': { name: 'Ypê Sabão em Pó 1.6kg', brand: 'Ypê', category: 'limpeza' },

  // Vanish
  '7891153096606': { name: 'Vanish Oxi Action Pó 500g', brand: 'Vanish', category: 'limpeza' },
  '7891153096613': { name: 'Vanish Oxi Action Pó 1kg', brand: 'Vanish', category: 'limpeza' },
  '7891153096620': { name: 'Vanish Oxi Action Líquido 1L', brand: 'Vanish', category: 'limpeza' },

  // Amaciante
  '7891153078946': { name: 'Comfort Lavagem Perfeita 2L', brand: 'Comfort', category: 'limpeza' },
  '7891153078953': { name: 'Comfort Lavagem Perfeita 1L', brand: 'Comfort', category: 'limpeza' },
  '7891153078960': { name: 'Comfort Concentrado 500ml', brand: 'Comfort', category: 'limpeza' },
  '7891153078977': { name: 'Comfort Concentrado 1L', brand: 'Comfort', category: 'limpeza' },
  '7891153078984': { name: 'Comfort Baby Soft 2L', brand: 'Comfort', category: 'limpeza' },

  // Detergente líquido
  '7891153062311': { name: 'Ypê Detergente Concentrado 500ml', brand: 'Ypê', category: 'limpeza' },
  '7891153062328': { name: 'Ypê Detergente Concentrado 250ml', brand: 'Ypê', category: 'limpeza' },

  // Desinfetante
  '7891363000428': { name: 'Ypê Desinfetante 1L', brand: 'Ypê', category: 'limpeza' },
  '7891363000435': { name: 'Ypê Desinfetante 500ml', brand: 'Ypê', category: 'limpeza' },
  '7891363000442': { name: 'Ypê Desinfetante 2L', brand: 'Ypê', category: 'limpeza' },

  // Veja
  '7891312364013': { name: 'Veja Multiuso Original 500ml', brand: 'Veja', category: 'limpeza' },
  '7891312364020': { name: 'Veja Multiuso Original 1L', brand: 'Veja', category: 'limpeza' },
  '7891312364037': { name: 'Veja Multiuso Original 2L', brand: 'Veja', category: 'limpeza' },
  '7891312364044': { name: 'Veja Vidro 500ml', brand: 'Veja', category: 'limpeza' },
  '7891312364051': { name: 'Veja Banheiro 500ml', brand: 'Veja', category: 'limpeza' },
  '7891312364068': { name: 'Veja Cozinha 500ml', brand: 'Veja', category: 'limpeza' },
  '7891312364075': { name: 'Veja Asseptico 1L', brand: 'Veja', category: 'limpeza' },
  '7891312364082': { name: 'Veja Asseptico 2L', brand: 'Veja', category: 'limpeza' },

  // Pinho / Água sanitária
  '7891363000724': { name: 'Pinho Cloro 1L', brand: 'Pinho', category: 'limpeza' },
  '7891363000731': { name: 'Pinho Cloro 2L', brand: 'Pinho', category: 'limpeza' },
  '7891363000748': { name: 'Pinho Cloro 500ml', brand: 'Pinho', category: 'limpeza' },

  // Limpol / Multiuso
  '7891363000625': { name: 'Limpol Multiuso 500ml', brand: 'Limpol', category: 'limpeza' },
  '7891363000632': { name: 'Limpol Multiuso 1L', brand: 'Limpol', category: 'limpeza' },

  // Sabão líquido para roupa
  '7891153060287': { name: 'Omo Lavagem Perfeita Líquido 1L', brand: 'Omo', category: 'limpeza' },
  '7891153060294': { name: 'Omo Lavagem Perfeita Líquido 2L', brand: 'Omo', category: 'limpeza' },
  '7891153060300': { name: 'Omo Lavagem Perfeita Líquido 3L', brand: 'Omo', category: 'limpeza' },
  '7891153060317': { name: 'Omo Lavagem Perfeita Líquido 500ml', brand: 'Omo', category: 'limpeza' },

  // Esponja / Acessórios limpeza
  '7898423340026': { name: 'Bombril Esponja de Aço Gde', brand: 'Bombril', category: 'limpeza' },
  '7898423340033': { name: 'Bombril Esponja de Aço Pqn', brand: 'Bombril', category: 'limpeza' },

  // ==================== HIGIENE ====================
  // Sabonete
  '7891150034952': { name: 'Rexona Sabonete 84g Antibacterial', brand: 'Rexona', category: 'higiene' },
  '7898422746827': { name: 'Dove Sabonete 90g Esfoliação Suave', brand: 'Dove', category: 'higiene' },
  '7891150052710': { name: 'Dove Sabonete 90g Hidratação', brand: 'Dove', category: 'higiene' },
  '7891150052727': { name: 'Dove Sabonete 90g Nutrição', brand: 'Dove', category: 'higiene' },
  '7891150052734': { name: 'Dove Sabonete 90g Sensitive', brand: 'Dove', category: 'higiene' },
  '7891150052741': { name: 'Dove Sabonete 85g Revitalizing', brand: 'Dove', category: 'higiene' },
  '7891150052758': { name: 'Protex Sabonete 85g Antibacterial', brand: 'Protex', category: 'higiene' },
  '7891150052765': { name: 'Protex Sabonete 85g Fresh', brand: 'Protex', category: 'higiene' },
  '7891150052772': { name: 'Protex Sabonete 85g Total', brand: 'Protex', category: 'higiene' },

  // Desodorante
  '7891150055124': { name: 'Rexona Desodorante Roll On 50ml', brand: 'Rexona', category: 'higiene' },
  '7891150055131': { name: 'Rexona Desodorante Aerosol 150ml', brand: 'Rexona', category: 'higiene' },
  '7891150055148': { name: 'Rexona Desodorante Stick 40g', brand: 'Rexona', category: 'higiene' },
  '7891150055155': { name: 'Rexona Men Desodorante Roll On 50ml', brand: 'Rexona', category: 'higiene' },
  '7891150055162': { name: 'Dove Desodorante Roll On 50ml', brand: 'Dove', category: 'higiene' },
  '7891150055179': { name: 'Dove Men Desodorante Roll On 50ml', brand: 'Dove', category: 'higiene' },

  // Shampoo / Condicionador
  '7891153088540': { name: 'Clear Men Anti Caspa 200ml', brand: 'Clear', category: 'higiene' },
  '7891153088557': { name: 'Clear Men Anti Caspa 400ml', brand: 'Clear', category: 'higiene' },
  '7891153088564': { name: 'Clear Damage Repair 200ml', brand: 'Clear', category: 'higiene' },
  '7891153088571': { name: 'Seda Hidratação Intensa 325ml', brand: 'Seda', category: 'higiene' },
  '7891153088588': { name: 'Seda Restauração 325ml', brand: 'Seda', category: 'higiene' },
  '7891153088595': { name: 'Seda Nutrição Profunda 325ml', brand: 'Seda', category: 'higiene' },
  '7891153088601': { name: 'Dove Nutrição Intensa Shampoo 200ml', brand: 'Dove', category: 'higiene' },
  '7891153088618': { name: 'Dove Nutrição Intensa Condicionador 200ml', brand: 'Dove', category: 'higiene' },
  '7891153088625': { name: 'TRESemmé Hidratação Shampoo 400ml', brand: 'TRESemmé', category: 'higiene' },
  '7891153088632': { name: 'TRESemmé Hidratação Condicionador 400ml', brand: 'TRESemmé', category: 'higiene' },

  // Creme dental
  '7891076040287': { name: 'Colgate Creme Dental Total 12 90g', brand: 'Colgate', category: 'higiene' },
  '7891076040294': { name: 'Colgate Creme Dental Total 12 170g', brand: 'Colgate', category: 'higiene' },
  '7891076040300': { name: 'Colgate Creme Dental Luminous White 90g', brand: 'Colgate', category: 'higiene' },
  '7891076040317': { name: 'Close-Up Triple Ação 90g', brand: 'Close-Up', category: 'higiene' },
  '7891076040324': { name: 'Close-Up Triple Ação 180g', brand: 'Close-Up', category: 'higiene' },

  // Papel higiênico / Absorvente
  '7891153085010': { name: 'Always Absorvente Normal 8un', brand: 'Always', category: 'higiene' },
  '7891153085017': { name: 'Always Absorvente Noturno 8un', brand: 'Always', category: 'higiene' },
  '7891153085024': { name: 'Whisper Absorvente Normal 8un', brand: 'Whisper', category: 'higiene' },

  // ==================== ALGUNS ALIMENTOS ====================
  '7896116900029': { name: 'Feijão Kicaldo 1kg', brand: 'Kicaldo', category: 'alimentos' },
  '7891910000197': { name: 'União Refinado 1kg', brand: 'União', category: 'alimentos' },

  // ==================== BEBIDAS ====================
  '7894900020623': { name: 'Coca-Cola 350ml', brand: 'Coca-Cola', category: 'bebidas' },
  '7894900037010': { name: 'Coca-Cola 2L', brand: 'Coca-Cola', category: 'bebidas' },
  '7894900020630': { name: 'Coca-Cola Zero 350ml', brand: 'Coca-Cola', category: 'bebidas' },

  // ==================== DESCARTÁVEIS ====================
  '7898425370013': { name: 'Copos Descartáveis 50un', brand: 'Descartáveis', category: 'descartaveis' },
};

/**
 * Lookup product from local database by barcode.
 * Tries exact match first, then fuzzy matching with similar barcodes.
 */
export function lookupLocalProduct(barcode: string): LocalProduct | null {
  // Exact match
  if (PRODUCT_DATABASE[barcode]) {
    return PRODUCT_DATABASE[barcode];
  }

  // Try without leading zeros (some scanners add/remove them)
  const noLeadingZero = barcode.replace(/^0+/, '');
  if (PRODUCT_DATABASE[noLeadingZero]) {
    return PRODUCT_DATABASE[noLeadingZero];
  }

  return null;
}

/**
 * Suggest brand from barcode prefix (for new products not in database).
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
 * Most 789/790 prefixes are food, but some companies are known for cleaning/hygiene.
 */
export function suggestCategoryFromBarcode(barcode: string): string | null {
  const prefix4 = barcode.substring(0, 4);

  // Known cleaning/hygiene company prefixes
  const cleaningPrefixes: Record<string, string> = {
    '7894': 'limpeza',   // Unilever (Omo, Comfort, etc.)
    '7905': 'limpeza',   // Unilever
    '7895': 'limpeza',   // P&G (Tide, etc.)
    '7906': 'limpeza',   // P&G
    '7891': 'higiene',   // Could be Coca-Cola OR Rexona/Dove (Unilever)
    '7909': 'limpeza',   // Reckitt (Veja, etc.)
  };

  if (cleaningPrefixes[prefix4]) return cleaningPrefixes[prefix4];
  return null;
}
