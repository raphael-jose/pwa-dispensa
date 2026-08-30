import { useEffect, useState } from 'react';
import { Search, Package, Plus, Minus, Trash2, Filter, ChevronDown, Apple, Droplets, SprayCan, Sparkles, Pill, PawPrint, Box, FileText, CheckCircle, AlertTriangle } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { getAllPantryItems, consumePantryItem, deletePantryItem, updatePantryItem, db } from '@/database';
import { getExpiryStatus } from '@/database';
import type { PantryItem, Product, ProductCategory, ExpiryStatus } from '@/types';

interface PantryItemWithProduct extends PantryItem {
  product?: Product;
}

const CATEGORY_ICONS: Record<string, typeof Apple> = {
  alimentos: Apple,
  bebidas: Droplets,
  limpeza: SprayCan,
  higiene: Sparkles,
  farmacia: Pill,
  pet: PawPrint,
  descartaveis: Box,
  outros: FileText,
};

const CATEGORIES: { value: ProductCategory | 'all'; label: string; icon?: typeof Apple }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'alimentos', label: 'Alimentos', icon: Apple },
  { value: 'bebidas', label: 'Bebidas', icon: Droplets },
  { value: 'limpeza', label: 'Limpeza', icon: SprayCan },
  { value: 'higiene', label: 'Higiene', icon: Sparkles },
  { value: 'farmacia', label: 'Farmácia', icon: Pill },
  { value: 'pet', label: 'Pet', icon: PawPrint },
  { value: 'descartaveis', label: 'Descartáveis', icon: Box },
  { value: 'outros', label: 'Outros', icon: FileText },
];

export default function PantryPage() {
  const { settings } = useAppStore();
  const [items, setItems] = useState<PantryItemWithProduct[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ProductCategory | 'all'>('all');
  const [expiryFilter, setExpiryFilter] = useState<'all' | ExpiryStatus>('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    const pantryItems = await getAllPantryItems();
    const withProducts = await Promise.all(
      pantryItems.map(async (item) => {
        const product = await db.products.get(item.productId);
        return { ...item, product };
      })
    );
    setItems(withProducts);
  }

  function filterItems() {
    return items.filter((item) => {
      const product = item.product;
      if (!product) return false;

      if (search) {
        const q = search.toLowerCase();
        if (
          !product.name.toLowerCase().includes(q) &&
          !product.brand.toLowerCase().includes(q) &&
          !product.barcode.includes(q) &&
          !product.category.toLowerCase().includes(q)
        ) return false;
      }

      if (categoryFilter !== 'all' && product.category !== categoryFilter) return false;

      if (expiryFilter !== 'all') {
        const status = getExpiryStatus(item.expirationDate, settings);
        if (status.status !== expiryFilter) return false;
      }

      return true;
    });
  }

  async function handleConsume(id: string, amount: number) {
    try {
      await consumePantryItem(id, amount);
      await loadItems();
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleDelete(id: string) {
    if (confirm('Remover este item da despensa?')) {
      await deletePantryItem(id);
      await loadItems();
    }
  }

  const filtered = filterItems();

  return (
    <div className="space-y-4 pb-24">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Despensa</h1>

      {/* Search */}
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar produto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
        />
      </div>

      {/* Filter toggle */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
      >
        <Filter size={16} />
        <span>Filtros</span>
        <ChevronDown size={14} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
      </button>

      {/* Filters */}
      {showFilters && (
        <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
          {/* Categories */}
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => {
              const CatIcon = cat.icon;
              return (
                <button
                  key={cat.value}
                  onClick={() => setCategoryFilter(cat.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
                    categoryFilter === cat.value
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {CatIcon && <CatIcon size={12} />}
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Expiry filters */}
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'all' as const, label: 'Todos', icon: Package },
              { value: 'vencido' as const, label: 'Vencidos', icon: Trash2, color: 'red' },
              { value: 'critico' as const, label: 'Críticos', icon: AlertTriangle, color: 'orange' },
              { value: 'atencao' as const, label: 'Atenção', icon: Filter, color: 'yellow' },
              { value: 'normal' as const, label: 'OK', icon: CheckCircle, color: 'green' },
              { value: 'sem_validade' as const, label: 'Sem data', icon: FileText },
            ].map((f) => {
              const FIcon = f.icon;
              return (
                <button
                  key={f.value}
                  onClick={() => setExpiryFilter(f.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
                    expiryFilter === f.value
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  <FIcon size={12} />
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Items */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500">
          <Package size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-lg">Nenhum item encontrado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => {
            const product = item.product;
            if (!product) return null;

            const expiry = getExpiryStatus(item.expirationDate, settings);
            const CatIcon = CATEGORY_ICONS[product.category] || Package;

            const statusColors: Record<string, string> = {
              red: 'border-l-red-500 bg-red-50/50 dark:bg-red-900/10',
              orange: 'border-l-orange-500 bg-orange-50/50 dark:bg-orange-900/10',
              yellow: 'border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-900/10',
              green: 'border-l-green-500 bg-green-50/50 dark:bg-green-900/10',
              gray: 'border-l-gray-300 bg-white dark:bg-gray-800/80',
            };

            return (
              <div
                key={item.id}
                className={`p-3 rounded-xl border-l-4 border border-gray-100 dark:border-gray-700/50 ${statusColors[expiry.color]} transition-all hover:shadow-sm`}
              >
                <div className="flex items-start gap-3">
                  {/* Image / Icon */}
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt="" className="w-11 h-11 rounded-xl object-cover" />
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-gray-100 dark:bg-gray-700/50 flex items-center justify-center">
                      <CatIcon size={18} className="text-gray-400 dark:text-gray-500" />
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate text-sm">{product.name}</p>
                    {product.brand && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">{product.brand}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-400 dark:text-gray-500 capitalize">{item.location}</span>
                      {expiry.label && (
                        <span className={`text-xs font-medium ${
                          expiry.color === 'red' ? 'text-red-600 dark:text-red-400' :
                          expiry.color === 'orange' ? 'text-orange-600 dark:text-orange-400' :
                          expiry.color === 'yellow' ? 'text-yellow-600 dark:text-yellow-400' :
                          expiry.color === 'green' ? 'text-green-600 dark:text-green-400' :
                          'text-gray-400 dark:text-gray-500'
                        }`}>
                          {expiry.label}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quantity controls */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleConsume(item.id, 1)}
                      disabled={item.quantity <= 1}
                      className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-900/20 text-red-500 flex items-center justify-center disabled:opacity-20 active:scale-90 transition-all"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-7 text-center font-bold text-gray-900 dark:text-white text-sm">{item.quantity}</span>
                    <button
                      onClick={() => updatePantryItem(item.id, { quantity: item.quantity + 1 }).then(loadItems)}
                      className="w-8 h-8 rounded-full bg-green-50 dark:bg-green-900/20 text-green-500 flex items-center justify-center active:scale-90 transition-all"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                {/* Delete */}
                <div className="flex justify-end mt-1.5">
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-xs text-gray-400 hover:text-red-500 dark:hover:text-red-400 flex items-center gap-1 transition-colors"
                  >
                    <Trash2 size={11} /> Remover
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
