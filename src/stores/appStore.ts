import { create } from 'zustand';
import type { Product, PantryItem, AppSettings, ProductCategory, ExpiryFilter } from '@/types';

interface AppState {
  // Navigation
  currentPage: string;
  setCurrentPage: (page: string) => void;

  // Products
  products: Product[];
  setProducts: (products: Product[]) => void;
  addProduct: (product: Product) => void;
  updateProductInStore: (id: string, updates: Partial<Product>) => void;

  // Pantry
  pantryItems: PantryItem[];
  setPantryItems: (items: PantryItem[]) => void;
  addPantryItem: (item: PantryItem) => void;
  updatePantryItemInStore: (id: string, updates: Partial<PantryItem>) => void;

  // Scanner
  scannerOpen: boolean;
  setScannerOpen: (open: boolean) => void;
  lastScannedBarcode: string;
  setLastScannedBarcode: (code: string) => void;

  // Filters
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  categoryFilter: ProductCategory | 'all';
  setCategoryFilter: (cat: ProductCategory | 'all') => void;
  expiryFilter: ExpiryFilter;
  setExpiryFilter: (filter: ExpiryFilter) => void;
  locationFilter: string;
  setLocationFilter: (loc: string) => void;

  // Settings
  settings: AppSettings;
  setSettings: (settings: AppSettings) => void;

  // Sync status
  isOnline: boolean;
  setIsOnline: (online: boolean) => void;
  syncStatus: 'synced' | 'syncing' | 'offline';
  setSyncStatus: (status: 'synced' | 'syncing' | 'offline') => void;

  // Modal
  modalOpen: boolean;
  setModalOpen: (open: boolean) => void;
  modalContent: React.ReactNode | null;
  setModalContent: (content: React.ReactNode | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentPage: 'dashboard',
  setCurrentPage: (page) => set({ currentPage: page }),

  products: [],
  setProducts: (products) => set({ products }),
  addProduct: (product) => set((state) => ({ products: [...state.products, product] })),
  updateProductInStore: (id, updates) =>
    set((state) => ({
      products: state.products.map((p) => (p.id === id ? { ...p, ...updates } : p))
    })),

  pantryItems: [],
  setPantryItems: (items) => set({ pantryItems: items }),
  addPantryItem: (item) => set((state) => ({ pantryItems: [...state.pantryItems, item] })),
  updatePantryItemInStore: (id, updates) =>
    set((state) => ({
      pantryItems: state.pantryItems.map((i) => (i.id === id ? { ...i, ...updates } : i))
    })),

  scannerOpen: false,
  setScannerOpen: (open) => set({ scannerOpen: open }),
  lastScannedBarcode: '',
  setLastScannedBarcode: (code) => set({ lastScannedBarcode: code }),

  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  categoryFilter: 'all',
  setCategoryFilter: (cat) => set({ categoryFilter: cat }),
  expiryFilter: { all: true, vencidos: false, vencendo: false, emDia: false, semValidade: false },
  setExpiryFilter: (filter) => set({ expiryFilter: filter }),
  locationFilter: 'all',
  setLocationFilter: (loc) => set({ locationFilter: loc }),

  settings: {
    expiryWarningDays: 7,
    expiryCriticalDays: 3,
    notificationsEnabled: true,
    notificationTime: '09:00',
    darkMode: false,
    defaultLocation: 'despensa',
    syncEnabled: false
  },
  setSettings: (settings) => set({ settings }),

  isOnline: navigator.onLine,
  setIsOnline: (online) => set({ isOnline: online }),
  syncStatus: navigator.onLine ? 'synced' : 'offline',
  setSyncStatus: (status) => set({ syncStatus: status }),

  modalOpen: false,
  setModalOpen: (open) => set({ modalOpen: open }),
  modalContent: null,
  setModalContent: (content) => set({ modalContent: content })
}));
