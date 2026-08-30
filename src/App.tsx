import { useEffect } from 'react';
import { Home, Package, ScanBarcode, Clock, Settings, Warehouse, CloudOff, Cloud, RefreshCw } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { getAllProducts, getAllPantryItems, getSettings, db } from '@/database';
import { startAutoSync } from '@/sync';
import Dashboard from '@/pages/Dashboard';
import PantryPage from '@/pages/PantryPage';
import ScannerPage from '@/pages/ScannerPage';
import HistoryPage from '@/pages/HistoryPage';
import SettingsPage from '@/pages/SettingsPage';

const NAV_ITEMS = [
  { id: 'dashboard', icon: Home, label: 'Início' },
  { id: 'pantry', icon: Package, label: 'Despensa' },
  { id: 'scanner', icon: ScanBarcode, label: 'Escanear', isSpecial: true },
  { id: 'history', icon: Clock, label: 'Histórico' },
  { id: 'settings', icon: Settings, label: 'Config' }
];

export default function App() {
  const { currentPage, setCurrentPage, setProducts, setPantryItems, setSettings, settings, syncStatus } = useAppStore();
  const { scannerOpen, setScannerOpen } = useAppStore();

  // Load data on mount
  useEffect(() => {
    loadData();
    setupOnlineListener();
    loadTheme();
    startAutoSync(30000);
  }, []);

  async function loadData() {
    try {
      const products = await getAllProducts();
      const items = await getAllPantryItems();
      const settings = await getSettings();
      setProducts(products);
      setPantryItems(items);
      setSettings(settings);
    } catch (err) {
      console.error('Error loading data:', err);
    }
  }

  function setupOnlineListener() {
    const updateOnline = () => {
      useAppStore.getState().setIsOnline(navigator.onLine);
      useAppStore.getState().setSyncStatus(navigator.onLine ? 'synced' : 'offline');
    };
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);
  }

  async function loadTheme() {
    const s = await getSettings();
    if (s.darkMode) {
      document.documentElement.classList.add('dark');
    }
  }

  const pages: Record<string, JSX.Element> = {
    dashboard: <Dashboard />,
    pantry: <PantryPage />,
    history: <HistoryPage />,
    settings: <SettingsPage />
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-200">
      {/* Status bar */}
      <div className="sticky top-0 z-30 px-4 py-2.5 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
              <Warehouse size={18} className="text-white" />
            </div>
            <span className="font-bold text-gray-900 dark:text-white text-base">Despensa</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
              syncStatus === 'synced' 
                ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' 
                : syncStatus === 'syncing' 
                ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
            }`}>
              {syncStatus === 'synced' ? (
                <><Cloud size={12} /> Online</>
              ) : syncStatus === 'syncing' ? (
                <><RefreshCw size={12} className="animate-spin" /> Sync...</>
              ) : (
                <><CloudOff size={12} /> Offline</>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Page content */}
      <div className="p-4 max-w-lg mx-auto">
        {pages[currentPage] || <Dashboard />}
      </div>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 inset-x-0 z-30 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 safe-area-pb">
        <div className="flex items-center justify-around max-w-lg mx-auto h-16">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const active = currentPage === item.id;

            if (item.isSpecial) {
              return (
                <button
                  key={item.id}
                  onClick={() => setScannerOpen(true)}
                  className="relative -mt-6 w-14 h-14 bg-emerald-600 text-white rounded-full shadow-lg shadow-emerald-600/30 flex items-center justify-center hover:bg-emerald-700 active:scale-95 transition-all"
                >
                  <Icon size={24} />
                </button>
              );
            }

            return (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 transition-colors ${
                  active ? 'text-emerald-600' : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Scanner overlay */}
      {scannerOpen && <ScannerPage />}
    </div>
  );
}
