import { useEffect, useState } from 'react';
import { Package, CheckCircle, AlertTriangle, Clock, XCircle, Search, Camera } from 'lucide-react';
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
    { icon: Package, label: 'Total de itens', value: stats.totalItems, color: 'text-brand-600', bg: 'bg-brand-50 dark:bg-brand-900/20' },
    { icon: CheckCircle, label: 'Em dia', value: stats.emDia, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
    { icon: Clock, label: 'Vencendo', value: stats.vencendo + stats.critico, color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
    { icon: XCircle, label: 'Vencidos', value: stats.vencidos, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' }
  ];

  const expiryColorMap: Record<string, string> = {
    red: 'border-l-red-500 bg-red-50 dark:bg-red-900/20',
    orange: 'border-l-orange-500 bg-orange-50 dark:bg-orange-900/20',
    yellow: 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20',
    green: 'border-l-green-500 bg-green-50 dark:bg-green-900/20',
    gray: 'border-l-gray-400 bg-gray-50 dark:bg-gray-800'
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
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Minha Despensa</h1>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => setCurrentPage('pantry')}
          className="flex-1 flex items-center justify-center gap-2 p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow"
        >
          <Search size={20} className="text-brand-600" />
          <span className="font-medium text-gray-700 dark:text-gray-200">Buscar</span>
        </button>
        <button
          onClick={() => setScannerOpen(true)}
          className="flex-1 flex items-center justify-center gap-2 p-4 bg-brand-600 text-white rounded-2xl shadow-sm hover:bg-brand-700 transition-colors"
        >
          <Camera size={20} />
          <span className="font-medium">Escanear</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        {statCards.map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className={`p-4 rounded-2xl ${bg}`}>
            <div className="flex items-center gap-2 mb-1">
              <Icon size={18} className={color} />
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</span>
            </div>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Upcoming expiry */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Próximos vencimentos</h2>
          <button
            onClick={() => setCurrentPage('pantry')}
            className="text-sm text-brand-600 font-medium"
          >
            Ver todos
          </button>
        </div>

        {upcoming.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Package size={32} className="mx-auto mb-2 opacity-50" />
            <p>Nenhum produto com validade cadastrada</p>
          </div>
        ) : (
          <div className="space-y-2">
            {upcoming.map(({ item, product, expiry }) => (
              <div
                key={item.id}
                className={`flex items-center gap-3 p-3 rounded-xl border-l-4 ${expiryColorMap[expiry.color]}`}
              >
                <div className={`w-3 h-3 rounded-full ${expiryDotMap[expiry.color]}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white truncate">
                    {product?.name || 'Produto'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{expiry.label}</p>
                </div>
                {item.quantity > 1 && (
                  <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-full">
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
