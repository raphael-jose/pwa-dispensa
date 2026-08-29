// ==================== Product ====================

export type ProductCategory =
  | 'alimentos'
  | 'bebidas'
  | 'limpeza'
  | 'higiene'
  | 'farmacia'
  | 'pet'
  | 'descartaveis'
  | 'outros';

export interface Product {
  id: string;
  barcode: string;
  name: string;
  brand: string;
  category: ProductCategory;
  quantityUnit: string;
  packageSize: string;
  imageUrl: string;
  ingredients: string;
  nutritionalInfo: string;
  source: string;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== Pantry ====================

export type PantryLocation = 'despensa' | 'geladeira' | 'freezer' | 'armario' | 'outro';

export interface PantryItem {
  id: string;
  productId: string;
  quantity: number;
  expirationDate: Date | null;
  purchaseDate: Date | null;
  openedDate: Date | null;
  location: PantryLocation;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== Batches ====================

export interface ProductBatch {
  id: string;
  pantryItemId: string;
  productId: string;
  quantity: number;
  expirationDate: Date | null;
  purchaseDate: Date | null;
  createdAt: Date;
}

// ==================== Movements ====================

export type MovementType = 'entrada' | 'consumo' | 'ajuste' | 'exclusao' | 'validade';

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

// ==================== Sync ====================

export interface SyncQueueItem {
  id?: number;
  action: 'create' | 'update' | 'delete';
  table: string;
  data: Record<string, unknown>;
  createdAt: Date;
  synced: boolean;
}

// ==================== Settings ====================

export interface AppSettings {
  expiryWarningDays: number;
  expiryCriticalDays: number;
  notificationsEnabled: boolean;
  notificationTime: string;
  darkMode: boolean;
  defaultLocation: PantryLocation;
  syncEnabled: boolean;
}

// ==================== Expiry ====================

export type ExpiryStatus = 'vencido' | 'critico' | 'atencao' | 'normal' | 'sem_validade';

export type ExpiryFilter = {
  all: boolean;
  vencidos: boolean;
  vencendo: boolean;
  emDia: boolean;
  semValidade: boolean;
};

// ==================== Open Food Facts ====================

export interface OpenFoodFactsProduct {
  status: number;
  product?: {
    product_name?: string;
    brands?: string;
    categories?: string;
    image_front_url?: string;
    ingredients_text?: string;
    quantity?: string;
    code?: string;
  };
}
