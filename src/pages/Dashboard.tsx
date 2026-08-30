import { useEffect, useState } from 'react';
import { Package, CheckCircle, AlertTriangle, Clock, XCircle, Search, Camera, ShoppingCart, Warehouse, BarChart3 } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { getDashboardStats, getAllPantryItems, getExpiryStatus, db } from '@/database';
import type { PantryItem } from '@/types';

export default function Dashboard() {
  const { setCurrentPage, setScannerOpen, settings } = useAppStore();
  const [stats, setStats] = useState({ totalItems: 0, emDia: 0, vencendo: 0, critico: 0, vencidos: 0, semValidade: 0, totalUniqueItems: 0 });
  const [upcoming, setUpcoming] = useState<{ item: PantryItem; product: { name: string; imageUrl: string } | undefined; expiry: ReturnType<typeof getExpiryStatus> }[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const s = await getDashboardStats();
    setStats(s);

    const items = await getAllPantryItems();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const withExpiry = items
      .filter(i => i.expirationDate)
      .map(i => ({
        item: i,
        expiry: getExpiryStatus(i.expirationDate, settings),
        sortDate: new Date(i.expirationDate!).getTime()
      }))
      .sort((a, b) => a.sortDate - b.sortDate)
      .slice(0, 5);

    const itemsWithProducts = await Promise.all(
      withExpiry.map(async (entry) => {
        const product = await db.products.get(entry.item.productId);
        return { ...entry, product: product ? { name: product.name, imageUrl: product.imageUrl } : undefined };
      })
    );

    setUpcoming(itemsWithProducts);
  }

  const statCards = [
    { icon: Package, label: 'Total', value: stats.totalItems, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-100 dark:border-emerald-800/30' },
    { icon: CheckCircle, label: 'Em dia', value: stats.emDia, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-100 dark:border-green-800/30' },
    { icon: AlertTriangle, label: 'Vencendo', value: stats.vencendo + stats.critico, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-100 dark:border-amber-800/30' },
    { icon: XCircle, label: 'Vencidos', value: stats.vencidos, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-100 dark:border-red-800/30' }
  ];

  const expiryColorMap: Record<string, string> = {
    red: 'border-l-red-500 bg-red-50/80 dark:bg-red-900/15',
    orange: 'border-l-orange-500 bg-orange-50/80 dark:bg-orange-900/15',
    yellow: 'border-l-yellow-500 bg-yellow-50/80 dark:bg-yellow-900/15',
    green: 'border-l-green-500 bg-green-50/80 dark:bg-green-900/15',
    gray: 'border-l-gray-400 bg-gray-50 dark:bg-gray-800/50'
  };

  const expiryDotMap: Record<string, string> = {
    red: 'bg-red-500',
    orange: 'bg-orange-500',
    yellow: 'bg-yellow-500',
    green: 'bg-green-500',
    gray: 'bg-gray-400'
  };

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
          <Warehouse size={22} className="text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Minha Despensa</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">{stats.totalUniqueItems} produtos cadastrados</p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => setCurrentPage('pantry')}
          className="flex-1 flex items-center justify-center gap-2.5 p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 hover:shadow-md transition-all active:scale-[0.98]"
        >
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
            <Search size={18} className="text-blue-600 dark:text-blue-400" />
          </div>
          <span className="font-medium text-gray-700 dark:text-gray-200">Buscar</span>
        </button>
        <button
          onClick={() => setScannerOpen(true)}
          className="flex-1 flex items-center justify-center gap-2.5 p-4 bg-emerald-600 text-white rounded-2xl shadow-sm hover:bg-emerald-700 transition-colors active:scale-[0.98]"
        >
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
            <Camera size={18} />
          </div>
          <span className="font-medium">Escanear</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        {statCards.map(({ icon: Icon, label, value, color, bg, border }) => (
          <div key={label} className={`p-4 rounded-2xl ${bg} border ${border} transition-all`}>
            <div className="flex items-center gap-2 mb-2">
              <Icon size={16} className={color} />
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</span>
            </div>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Upcoming expiry */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Próximos vencimentos</h2>
          </div>
          <button
            onClick={() => setCurrentPage('pantry')}
            className="text-sm text-emerald-600 dark:text-emerald-400 font-medium"
          >
            Ver todos
          </button>
        </div>

        {upcoming.length === 0 ? (
          <div className="text-center py-8 text-gray-400 dark:text-gray-500">
            <Package size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nenhum produto com validade cadastrada</p>
          </div>
        ) : (
          <div className="space-y-2">
            {upcoming.map(({ item, product, expiry }) => (
              <div
                key={item.id}
                className={`flex items-center gap-3 p-3.5 rounded-xl border-l-4 ${expiryColorMap[expiry.color]} transition-all`}
              >
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${expiryDotMap[expiry.color]}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white truncate text-sm">
                    {product?.name || 'Produto'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{expiry.label}</p>
                </div>
                {item.quantity > 1 && (
                  <span className="text-xs bg-gray-200/80 dark:bg-gray-700/80 px-2 py-1 rounded-full font-medium text-gray-600 dark:text-gray-300">
                    x{item.quantity}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
