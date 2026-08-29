import { useEffect } from 'react';
import { Home, Package, Camera, Clock, Settings } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { getAllProducts, getAllPantryItems, getSettings, db } from '@/database';
import Dashboard from '@/pages/Dashboard';
import PantryPage from '@/pages/PantryPage';
import ScannerPage from '@/pages/ScannerPage';
import HistoryPage from '@/pages/HistoryPage';
import SettingsPage from '@/pages/SettingsPage';

const NAV_ITEMS = [
  { id: 'dashboard', icon: Home, label: 'Início' },
  { id: 'pantry', icon: Package, label: 'Despensa' },
  { id: 'scanner', icon: Camera, label: 'Escanear', isSpecial: true },
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Status bar */}
      <div className="sticky top-0 z-30 px-4 py-2 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🏠</span>
            <span className="font-bold text-gray-900 dark:text-white">Despensa</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              syncStatus === 'synced' ? 'bg-green-100 text-green-700' :
              syncStatus === 'syncing' ? 'bg-yellow-100 text-yellow-700' :
              'bg-red-100 text-red-700'
            }`}>
              {syncStatus === 'synced' ? '🟢' : syncStatus === 'syncing' ? '🟡' : '🔴'}
            </span>
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
                  className="relative -mt-6 w-14 h-14 bg-brand-600 text-white rounded-full shadow-lg shadow-brand-600/30 flex items-center justify-center hover:bg-brand-700 active:scale-95 transition-all"
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
                  active ? 'text-brand-600' : 'text-gray-400'
                }`}
              >
                <Icon size={20} />
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
