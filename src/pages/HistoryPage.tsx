import { useEffect, useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, Settings, Trash2, Edit3, Clock, Package } from 'lucide-react';
import { getMovements, db } from '@/database';
import type { Movement, Product } from '@/types';
import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MovementWithProduct extends Movement {
  product?: Product;
}

const TYPE_ICONS: Record<string, { icon: typeof ArrowDownCircle; color: string; label: string }> = {
  entrada: { icon: ArrowDownCircle, color: 'text-green-600', label: 'Entrada' },
  consumo: { icon: ArrowUpCircle, color: 'text-red-600', label: 'Consumo' },
  ajuste: { icon: Settings, color: 'text-blue-600', label: 'Ajuste' },
  exclusao: { icon: Trash2, color: 'text-gray-500', label: 'Exclusão' },
  validade: { icon: Edit3, color: 'text-orange-600', label: 'Validade' }
};

export default function HistoryPage() {
  const [movements, setMovements] = useState<MovementWithProduct[]>([]);

  useEffect(() => {
    loadMovements();
  }, []);

  async function loadMovements() {
    const raw = await getMovements(200);
    const withProducts = await Promise.all(
      raw.map(async (m) => {
        const product = await db.products.get(m.productId);
        return { ...m, product };
      })
    );
    setMovements(withProducts);
  }

  function groupByDate(items: MovementWithProduct[]) {
    const groups: Record<string, MovementWithProduct[]> = {};
    for (const item of items) {
      const date = new Date(item.date);
      let key: string;
      if (isToday(date)) {
        key = 'Hoje';
      } else if (isYesterday(date)) {
        key = 'Ontem';
      } else {
        key = format(date, "dd/MM/yyyy", { locale: ptBR });
      }
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }
    return groups;
  }

  const grouped = groupByDate(movements);

  return (
    <div className="space-y-4 pb-24">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Histórico</h1>

      {movements.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Clock size={48} className="mx-auto mb-3 opacity-50" />
          <p className="text-lg">Nenhum movimento registrado</p>
        </div>
      ) : (
        Object.entries(grouped).map(([date, items]) => (
          <div key={date}>
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">{date}</h2>
            <div className="space-y-2">
              {items.map(item => {
                const typeInfo = TYPE_ICONS[item.type] || TYPE_ICONS.entrada;
                const Icon = typeInfo.icon;

                return (
                  <div key={item.id} className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-700`}>
                      <Icon size={18} className={typeInfo.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {item.product?.name || 'Produto'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {typeInfo.label} • {item.quantity} unidade(s)
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">
                        {format(new Date(item.date), 'HH:mm', { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
