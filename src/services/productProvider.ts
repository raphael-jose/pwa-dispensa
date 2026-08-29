import { lookupProductByBarcode, type ProductLookupResult } from './openFoodFacts';

export type { ProductLookupResult };

/**
 * ProductProvider - abstraction layer for product lookup APIs.
 * Chains through: Open Food Facts → Open Beauty Facts → Open Products Facts
 */

export async function lookupProduct(barcode: string): Promise<ProductLookupResult> {
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
  if (/^[A-Za-z0-9\-\.\ \$\/\+\%]+$/.test(cleaned) && cleaned.length >= 3) {
    return { valid: true, type: 'Code 128' };
  }

  // QR Code (any content)
  if (cleaned.length >= 2) {
    return { valid: true, type: 'QR Code' };
  }

  return { valid: false, type: 'unknown' };
}
