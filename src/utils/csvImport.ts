/**
 * CSV Import utility for bulk product loading
 * Expected CSV format:
 * barcode, name, brand, category, expiration_date, quantity, location
 */

import { createProduct, createPantryItem, getProductByBarcode } from '@/database';
import { saveToLocalCache } from '@/services/productProvider';
import type { ProductCategory, PantryLocation } from '@/types';

export interface ImportResult {
  success: number;
  skipped: number;
  errors: string[];
}

/**
 * Parse CSV text into rows
 */
export function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  // Parse header
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));

  // Parse rows
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/['"]/g, ''));
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });
    rows.push(row);
  }

  return rows;
}

/**
 * Map CSV row to product data
 */
function mapRowToProduct(row: Record<string, string>) {
  const barcode = row.barcode || row.ean || row.gtin || row.codigo || row['código'] || '';
  const name = row.name || row.nome || row.produto || row.descricao || row['descrição'] || '';
  const brand = row.brand || row.marca || row.fabricante || '';
  const category = mapCategory(row.category || row.categoria || row.tipo || 'outros');
  const imageUrl = row.image || row.foto || row.imagem || row['image_url'] || '';

  return { barcode, name, brand, category, imageUrl };
}

/**
 * Map CSV row to pantry item data
 */
function mapRowToPantryItem(row: Record<string, string>) {
  const quantity = parseInt(row.quantity || row.quantidade || row.qtd || '1') || 1;
  const expirationDate = row.expiration_date || row.validade || row['data_validade'] || row.vencimento || '';
  const location = mapLocation(row.location || row.local || row.destino || 'despensa');
  const notes = row.notes || row.obs || row.observacoes || row['observações'] || '';

  return { quantity, expirationDate, location, notes };
}

/**
 * Map category string to ProductCategory
 */
function mapCategory(cat: string): ProductCategory {
  const lower = cat.toLowerCase().trim();

  if (lower.includes('aliment') || lower.includes('food') || lower.includes('comida')) return 'alimentos';
  if (lower.includes('bebida') || lower.includes('drink') || lower.includes('suco')) return 'bebidas';
  if (lower.includes('limpe') || lower.includes('clean') || lower.includes('detergent')) return 'limpeza';
  if (lower.includes('higiene') || lower.includes('hygien') || lower.includes('sabon')) return 'higiene';
  if (lower.includes('farm') || lower.includes('medic') || lower.includes('remedio')) return 'farmacia';
  if (lower.includes('pet') || lower.includes('animal')) return 'pet';
  if (lower.includes('descart') || lower.includes('descarta')) return 'descartaveis';

  return 'outros';
}

/**
 * Map location string to PantryLocation
 */
function mapLocation(loc: string): PantryLocation {
  const lower = loc.toLowerCase().trim();

  if (lower.includes('gelad') || lower.includes('fridge')) return 'geladeira';
  if (lower.includes('freezer') || lower.includes('congel')) return 'freezer';
  if (lower.includes('armar') || lower.includes('cabinet')) return 'armario';
  if (lower.includes('despens') || lower.includes('pantry')) return 'despensa';

  return 'outro';
}

/**
 * Import products from parsed CSV rows
 */
export async function importProducts(rows: Record<string, string>[]): Promise<ImportResult> {
  const result: ImportResult = {
    success: 0,
    skipped: 0,
    errors: []
  };

  for (const row of rows) {
    try {
      const productData = mapRowToProduct(row);
      const pantryData = mapRowToPantryItem(row);

      // Skip rows without name
      if (!productData.name) {
        result.errors.push(`Linha ${result.success + result.skipped + 1}: Nome obrigatório`);
        continue;
      }

      // Check if product already exists by barcode
      let productId: string;
      if (productData.barcode) {
        const existing = await getProductByBarcode(productData.barcode);
        if (existing) {
          // Product exists, just add to pantry
          productId = existing.id;
          result.skipped++;
        } else {
          // Create new product
          const product = await createProduct({
            barcode: productData.barcode,
            name: productData.name,
            brand: productData.brand,
            category: productData.category,
            quantityUnit: 'un',
            packageSize: '',
            imageUrl: productData.imageUrl,
            ingredients: '',
            nutritionalInfo: '',
            source: 'csv_import',
          });
          productId = product.id;

          // Save to local cache
          saveToLocalCache(productData.barcode, {
            name: productData.name,
            brand: productData.brand,
            category: productData.category,
          });
        }
      } else {
        // No barcode, create product without it
        const product = await createProduct({
          barcode: '',
          name: productData.name,
          brand: productData.brand,
          category: productData.category,
          quantityUnit: 'un',
          packageSize: '',
          imageUrl: productData.imageUrl,
          ingredients: '',
          nutritionalInfo: '',
          source: 'csv_import',
        });
        productId = product.id;
      }

      // Create pantry item
      let expDate: Date | null = null;
      if (pantryData.expirationDate) {
        // Try parsing various date formats
        const parsed = parseDate(pantryData.expirationDate);
        if (parsed) expDate = parsed;
      }

      await createPantryItem({
        productId,
        quantity: pantryData.quantity,
        expirationDate: expDate,
        purchaseDate: new Date(),
        openedDate: null,
        location: pantryData.location,
        notes: pantryData.notes,
      });

      result.success++;
    } catch (err: any) {
      result.errors.push(`Erro: ${err.message}`);
    }
  }

  return result;
}

/**
 * Parse various date formats common in Brazil
 */
function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  // Try DD/MM/YYYY
  const brMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (brMatch) {
    const [, day, month, year] = brMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) return date;
  }

  // Try YYYY-MM-DD
  const isoMatch = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const date = new Date(dateStr + 'T12:00:00');
    if (!isNaN(date.getTime())) return date;
  }

  // Try MM/YYYY
  const monthYearMatch = dateStr.match(/^(\d{1,2})\/(\d{4})$/);
  if (monthYearMatch) {
    const [, month, year] = monthYearMatch;
    // Use last day of month
    const date = new Date(parseInt(year), parseInt(month), 0);
    if (!isNaN(date.getTime())) return date;
  }

  return null;
}

/**
 * Generate a sample CSV template
 */
export function getCSVTemplate(): string {
  return `barcode,nome,marca,categoria,validade,quantidade,local,observacoes
7891234567890,Sabão em Pó Omo,Unilever,limpeza,12/2027,1,despensa,
7891234567891,Leite Integral Piracanjuba,Piracanjuba,alimentos,15/09/2026,2,geladeira,
7891234567892,Shampoo Dove,Dove,higiene,01/2028,1,armario,
,Arroz Tipo 1 Camil,Camil,alimentos,,5,despensa,comprado no atacado
7891234567893,Álcool Gel 70%,Hetfield,farmacia,20/12/2026,3,despensa,`;
}
