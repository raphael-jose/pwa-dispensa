import Dexie, { type EntityTable } from 'dexie';
import type { Product, PantryItem, ProductBatch, Movement, SyncQueueItem, AppSettings } from '@/types';

// ==================== Database Schema ====================

const db = new Dexie('DespensaDB') as Dexie & {
  products: EntityTable<Product, 'id'>;
  pantryItems: EntityTable<PantryItem, 'id'>;
  productBatches: EntityTable<ProductBatch, 'id'>;
  movements: EntityTable<Movement, 'id'>;
  syncQueue: EntityTable<SyncQueueItem, 'id'>;
  settings: EntityTable<AppSettings & { key: string }, 'key'>;
};

db.version(1).stores({
  products: 'id, barcode, name, brand, category, source, createdAt',
  pantryItems: 'id, productId, expirationDate, location, createdAt',
  productBatches: 'id, pantryItemId, productId, expirationDate',
  movements: 'id, productId, pantryItemId, type, date, createdAt',
  syncQueue: 'id, synced, createdAt',
  settings: 'key'
});

export default db;

// ==================== Product CRUD ====================

export async function createProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
  const now = new Date();
  const newProduct: Product = {
    ...product,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now
  };
  await db.products.add(newProduct);
  await addToSyncQueue('create', 'products', newProduct);
  return newProduct;
}

export async function updateProduct(id: string, updates: Partial<Product>): Promise<void> {
  const existing = await db.products.get(id);
  if (!existing) throw new Error('Produto não encontrado');
  await db.products.update(id, { ...updates, updatedAt: new Date() });
  await addToSyncQueue('update', 'products', { id, ...updates });
}

export async function deleteProduct(id: string): Promise<void> {
  await db.products.delete(id);
  await addToSyncQueue('delete', 'products', { id });
}

export async function getProductByBarcode(barcode: string): Promise<Product | undefined> {
  return db.products.where('barcode').equals(barcode).first();
}

export async function getAllProducts(): Promise<Product[]> {
  return db.products.toArray();
}

export async function searchProducts(query: string): Promise<Product[]> {
  const lower = query.toLowerCase();
  return db.products
    .filter(p =>
      p.name.toLowerCase().includes(lower) ||
      p.brand.toLowerCase().includes(lower) ||
      p.barcode.includes(lower)
    )
    .toArray();
}

// ==================== Pantry Items CRUD ====================

export async function createPantryItem(item: Omit<PantryItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<PantryItem> {
  const now = new Date();
  const newItem: PantryItem = {
    ...item,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now
  };
  await db.pantryItems.add(newItem);

  // Also create a batch if expiration date exists
  if (item.expirationDate) {
    await db.productBatches.add({
      id: crypto.randomUUID(),
      pantryItemId: newItem.id,
      productId: item.productId,
      quantity: item.quantity,
      expirationDate: item.expirationDate,
      purchaseDate: item.purchaseDate,
      createdAt: now
    });
  }

  // Record movement
  await createMovement({
    productId: item.productId,
    pantryItemId: newItem.id,
    type: 'entrada',
    quantity: item.quantity,
    notes: 'Produto adicionado à despensa'
  });

  await addToSyncQueue('create', 'pantry_items', newItem);
  return newItem;
}

export async function updatePantryItem(id: string, updates: Partial<PantryItem>): Promise<void> {
  await db.pantryItems.update(id, { ...updates, updatedAt: new Date() });
  await addToSyncQueue('update', 'pantry_items', { id, ...updates });
}

export async function deletePantryItem(id: string): Promise<void> {
  const item = await db.pantryItems.get(id);
  if (item) {
    await createMovement({
      productId: item.productId,
      pantryItemId: id,
      type: 'exclusao',
      quantity: item.quantity,
      notes: 'Produto removido da despensa'
    });
  }
  await db.pantryItems.delete(id);
  await db.productBatches.where('pantryItemId').equals(id).delete();
  await addToSyncQueue('delete', 'pantry_items', { id });
}

export async function consumePantryItem(id: string, amount: number): Promise<void> {
  const item = await db.pantryItems.get(id);
  if (!item) throw new Error('Item não encontrado');
  if (amount > item.quantity) throw new Error('Quantidade insuficiente');

  const newQuantity = item.quantity - amount;

  if (newQuantity <= 0) {
    await deletePantryItem(id);
  } else {
    await db.pantryItems.update(id, { quantity: newQuantity, updatedAt: new Date() });
  }

  await createMovement({
    productId: item.productId,
    pantryItemId: id,
    type: 'consumo',
    quantity: amount,
    notes: `${amount} unidade(s) consumida(s)`
  });

  await addToSyncQueue('update', 'pantry_items', { id, quantity: newQuantity });
}

export async function getAllPantryItems(): Promise<PantryItem[]> {
  return db.pantryItems.toArray();
}

export async function getPantryItemById(id: string): Promise<PantryItem | undefined> {
  return db.pantryItems.get(id);
}

export async function getPantryItemsByProduct(productId: string): Promise<PantryItem[]> {
  return db.pantryItems.where('productId').equals(productId).toArray();
}

// ==================== Movements ====================

async function createMovement(movement: Omit<Movement, 'id' | 'date' | 'createdAt'>): Promise<void> {
  await db.movements.add({
    ...movement,
    id: crypto.randomUUID(),
    date: new Date(),
    createdAt: new Date()
  });
}

export async function getMovements(limit = 100): Promise<Movement[]> {
  return db.movements.orderBy('date').reverse().limit(limit).toArray();
}

export async function getMovementsByProduct(productId: string): Promise<Movement[]> {
  return db.movements.where('productId').equals(productId).reverse().sortBy('date');
}

// ==================== Settings ====================

const DEFAULT_SETTINGS: AppSettings = {
  expiryWarningDays: 7,
  expiryCriticalDays: 3,
  notificationsEnabled: true,
  notificationTime: '09:00',
  darkMode: false,
  defaultLocation: 'despensa',
  syncEnabled: false
};

export async function getSettings(): Promise<AppSettings> {
  const stored = await db.settings.get('app-settings');
  return stored ? { ...DEFAULT_SETTINGS, ...stored } : DEFAULT_SETTINGS;
}

export async function updateSettings(updates: Partial<AppSettings>): Promise<void> {
  const current = await getSettings();
  const merged = { ...current, ...updates, key: 'app-settings' as const };
  await db.settings.put(merged);
}

// ==================== Sync Queue ====================

async function addToSyncQueue(action: SyncQueueItem['action'], table: SyncQueueItem['table'], data: unknown): Promise<void> {
  await db.syncQueue.add({
    action,
    table,
    data: data as Record<string, unknown>,
    createdAt: new Date(),
    synced: false
  });
}

export async function getPendingSyncItems(): Promise<SyncQueueItem[]> {
  return db.syncQueue.where('synced').equals(0).toArray();
}

export async function markSynced(ids: number[]): Promise<void> {
  await db.syncQueue.where('id').anyOf(ids).modify({ synced: true });
}

// ==================== Statistics ====================

export async function getDashboardStats() {
  const items = await getAllPantryItems();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const warningDays = (await getSettings()).expiryWarningDays;
  const criticalDays = (await getSettings()).expiryCriticalDays;

  let totalItems = 0;
  let emDia = 0;
  let vencendo = 0;
  let critico = 0;
  let vencidos = 0;
  let semValidade = 0;

  for (const item of items) {
    totalItems += item.quantity;
    if (!item.expirationDate) {
      semValidade++;
      continue;
    }

    const expiry = new Date(item.expirationDate);
    expiry.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      vencidos += item.quantity;
    } else if (diffDays <= criticalDays) {
      critico += item.quantity;
    } else if (diffDays <= warningDays) {
      vencendo += item.quantity;
    } else {
      emDia += item.quantity;
    }
  }

  return { totalItems, emDia, vencendo, critico, vencidos, semValidade, totalUniqueItems: items.length };
}

// ==================== Expiry Helpers ====================

export function getExpiryStatus(expirationDate: Date | null, settings?: AppSettings): { status: import('@/types').ExpiryStatus; daysLeft: number | null; label: string; color: string } {
  if (!expirationDate) {
    return { status: 'sem_validade', daysLeft: null, label: 'Sem validade', color: 'gray' };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expirationDate);
  expiry.setHours(0, 0, 0, 0);
  const daysLeft = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const warningDays = settings?.expiryWarningDays ?? 7;
  const criticalDays = settings?.expiryCriticalDays ?? 3;

  if (daysLeft < 0) {
    return { status: 'vencido', daysLeft, label: `Vencido há ${Math.abs(daysLeft)} dia(s)`, color: 'red' };
  }
  if (daysLeft === 0) {
    return { status: 'critico', daysLeft: 0, label: 'Vence hoje', color: 'orange' };
  }
  if (daysLeft <= criticalDays) {
    return { status: 'critico', daysLeft, label: `Vence em ${daysLeft} dia(s)`, color: 'orange' };
  }
  if (daysLeft <= warningDays) {
    return { status: 'atencao', daysLeft, label: `Vence em ${daysLeft} dia(s)`, color: 'yellow' };
  }
  return { status: 'normal', daysLeft, label: `Vence em ${daysLeft} dia(s)`, color: 'green' };
}

export { db };
