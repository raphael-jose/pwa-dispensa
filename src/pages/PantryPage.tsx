import { useEffect, useState, useMemo } from 'react';
import { Search, Plus, Filter, Minus, Trash2, Edit3, Package } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { getAllPantryItems, consumePantryItem, deletePantryItem, getExpiryStatus, db } from '@/database';
import type { PantryItem, Product, ProductCategory } from '@/types';

interface PantryItemWithProduct extends PantryItem {
  product?: Product;
}

const CATEGORIES: { value: ProductCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'alimentos', label: '🍎 Alimentos' },
  { value: 'bebidas', label: '🥤 Bebidas' },
  { value: 'limpeza', label: '🧹 Limpeza' },
  { value: 'higiene', label: '🧴 Higiene' },
  { value: 'farmacia', label: '💊 Farmácia' },
  { value: 'pet', label: '🐾 Pet' },
  { value: 'outros', label: '📦 Outros' }
];

const LOCATIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'despensa', label: '📦 Despensa' },
  { value: 'geladeira', label: '❄️ Geladeira' },
  { value: 'freezer', label: '🧊 Freezer' },
  { value: 'armario', label: '🗄️ Armário' },
  { value: 'outro', label: '📌 Outro' }
];

const EXPIRY_FILTERS = [
  { key: 'all', label: 'Todos' },
  { key: 'vencidos', label: '🔴 Vencidos' },
  { key: 'vencendo', label: '🟡 Vencendo' },
  { key: 'emDia', label: '🟢 Em dia' },
  { key: 'semValidade', label: '⚪ Sem validade' }
] as const;

export default function PantryPage() {
  const { settings, setScannerOpen } = useAppStore();
  const [items, setItems] = useState<PantryItemWithProduct[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ProductCategory | 'all'>('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [expiryFilter, setExpiryFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    const pantryItems = await getAllPantryItems();
    const itemsWithProducts = await Promise.all(
      pantryItems.map(async (item) => {
        const product = await db.products.get(item.productId);
        return { ...item, product };
      })
    );
    setItems(itemsWithProducts);
  }

  const filtered = useMemo(() => {
    return items.filter(item => {
      const product = item.product;
      if (!product) return false;

      // Search
      if (search) {
        const q = search.toLowerCase();
        const matchesSearch =
          product.name.toLowerCase().includes(q) ||
          product.brand.toLowerCase().includes(q) ||
          product.barcode.includes(q);
        if (!matchesSearch) return false;
      }

      // Category
      if (categoryFilter !== 'all' && product.category !== categoryFilter) return false;

      // Location
      if (locationFilter !== 'all' && item.location !== locationFilter) return false;

      // Expiry
      if (expiryFilter !== 'all') {
        const status = getExpiryStatus(item.expirationDate, settings);
        if (expiryFilter === 'vencidos' && status.status !== 'vencido') return false;
        if (expiryFilter === 'vencendo' && status.status !== 'critico' && status.status !== 'atencao') return false;
        if (expiryFilter === 'emDia' && status.status !== 'normal') return false;
        if (expiryFilter === 'semValidade' && status.status !== 'sem_validade') return false;
      }

      return true;
    });
  }, [items, search, categoryFilter, locationFilter, expiryFilter, settings]);

  async function handleConsume(id: string) {
    try {
      await consumePantryItem(id, 1);
      await loadItems();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao consumir');
    }
  }

  async function handleDelete(id: string) {
    if (confirm('Remover este item da despensa?')) {
      await deletePantryItem(id);
      await loadItems();
    }
  }

  const expiryColorMap: Record<string, string> = {
    red: 'border-red-400',
    orange: 'border-orange-400',
    yellow: 'border-yellow-400',
    green: 'border-green-400',
    gray: 'border-gray-300'
  };

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Despensa</h1>
        <button onClick={() => setScannerOpen(true)} className="p-2 bg-brand-600 text-white rounded-xl">
          <Plus size={20} />
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar produto..."
          className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-gray-900 dark:text-white"
        />
      </div>

      {/* Filter toggle */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400"
      >
        <Filter size={16} />
        {showFilters ? 'Ocultar filtros' : 'Mostrar filtros'}
      </button>

      {/* Filters */}
      {showFilters && (
        <div className="space-y-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">Categoria</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {CATEGORIES.map(c => (
                <button
                  key={c.value}
                  onClick={() => setCategoryFilter(c.value)}
                  className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                    categoryFilter === c.value
                      ? 'bg-brand-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">Local</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {LOCATIONS.map(l => (
                <button
                  key={l.value}
                  onClick={() => setLocationFilter(l.value)}
                  className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                    locationFilter === l.value
                      ? 'bg-brand-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">Validade</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {EXPIRY_FILTERS.map(f => (
                <button
                  key={f.key}
                  onClick={() => setExpiryFilter(f.key)}
                  className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                    expiryFilter === f.key
                      ? 'bg-brand-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Items list */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Package size={48} className="mx-auto mb-3 opacity-50" />
          <p className="text-lg">Nenhum item encontrado</p>
          <button
            onClick={() => setScannerOpen(true)}
            className="mt-4 px-6 py-3 bg-brand-600 text-white rounded-xl font-medium"
          >
            Escanear produto
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(item => {
            const product = item.product!;
            const expiry = getExpiryStatus(item.expirationDate, settings);

            return (
              <div
                key={item.id}
                className={`flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl border-l-4 shadow-sm ${expiryColorMap[expiry.color]}`}
              >
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt="" className="w-12 h-12 rounded-lg object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <Package size={20} className="text-gray-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white truncate">{product.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {product.brand} • {item.location}
                  </p>
                  {item.expirationDate && (
                    <p className={`text-xs font-medium ${
                      expiry.color === 'red' ? 'text-red-600' :
                      expiry.color === 'orange' ? 'text-orange-600' :
                      expiry.color === 'yellow' ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {expiry.label}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleConsume(item.id)}
                    className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="w-8 text-center font-bold text-gray-900 dark:text-white">{item.quantity}</span>
                  <button className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">
                    <Plus size={16} />
                  </button>
                </div>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-2 text-red-400 hover:text-red-600"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
