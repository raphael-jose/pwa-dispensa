// ==================== Product Types ====================

export interface Product {
  id: string;
  barcode: string;
  name: string;
  brand: string;
  category: ProductCategory;
  quantityUnit: QuantityUnit;
  packageSize: string;
  imageUrl: string;
  ingredients: string;
  nutritionalInfo: string;
  source: ProductSource;
  localImage?: Blob;
  createdAt: Date;
  updatedAt: Date;
}

export interface PantryItem {
  id: string;
  productId: string;
  quantity: number;
  expirationDate: Date | null;
  purchaseDate: Date | null;
  openedDate: Date | null;
  location: PantryLocation;
  notes: string;
  batchNumber?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductBatch {
  id: string;
  pantryItemId: string;
  productId: string;
  quantity: number;
  expirationDate: Date | null;
  purchaseDate: Date | null;
  batchNumber?: string;
  createdAt: Date;
}

export interface Movement {
  id: string;
  productId: string;
  pantryItemId: string;
  type: MovementType;
  quantity: number;
  date: Date;
  notes: string;
  createdAt: Date;
}

// ==================== Enums ====================

export type ProductCategory =
  | 'alimentos'
  | 'bebidas'
  | 'limpeza'
  | 'higiene'
  | 'farmacia'
  | 'pet'
  | 'outros';

export type QuantityUnit = 'un' | 'kg' | 'g' | 'l' | 'ml' | 'cx' | 'pct';

export type ProductSource = 'openfoodfacts' | 'manual' | 'local';

export type MovementType = 'entrada' | 'consumo' | 'ajuste' | 'exclusao' | 'validade';

export type PantryLocation = 'despensa' | 'geladeira' | 'freezer' | 'armario' | 'outro';

export type ExpiryStatus = 'normal' | 'atencao' | 'critico' | 'vencido' | 'sem_validade';

// ==================== API Types ====================

export interface OpenFoodFactsProduct {
  code: string;
  product?: {
    product_name: string;
    brands: string;
    categories: string;
    image_front_url: string;
    ingredients_text: string;
    nutrition_grades: string;
    quantity: string;
  };
  status: number;
}

// ==================== Sync Types ====================

export interface SyncQueueItem {
  id: number;
  action: 'create' | 'update' | 'delete';
  table: 'products' | 'pantry_items' | 'movements';
  data: Record<string, unknown>;
  createdAt: Date;
  synced: boolean;
}

// ==================== Settings Types ====================

export interface AppSettings {
  expiryWarningDays: number;
  expiryCriticalDays: number;
  notificationsEnabled: boolean;
  notificationTime: string;
  darkMode: boolean;
  defaultLocation: PantryLocation;
  syncEnabled: boolean;
}

// ==================== UI Types ====================

export interface ExpiryFilter {
  all: boolean;
  vencidos: boolean;
  vencendo: boolean;
  emDia: boolean;
  semValidade: boolean;
}
