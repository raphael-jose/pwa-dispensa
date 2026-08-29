import { useEffect, useState } from 'react';
import { Moon, Sun, Bell, BellOff, Wifi, WifiOff, Trash2, Info, ChevronRight } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { getSettings, updateSettings } from '@/database';
import type { AppSettings, PantryLocation } from '@/types';

export default function SettingsPage() {
  const { settings, setSettings, isOnline, syncStatus } = useAppStore();
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);

  useEffect(() => {
    getSettings().then(s => {
      setLocalSettings(s);
      setSettings(s);
    });
  }, []);

  async function handleUpdate(updates: Partial<AppSettings>) {
    const merged = { ...localSettings, ...updates };
    setLocalSettings(merged);
    setSettings(merged);
    await updateSettings(updates);
  }

  const toggleDark = () => {
    const newDark = !localSettings.darkMode;
    handleUpdate({ darkMode: newDark });
    if (newDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Configurações</h1>

      {/* Sync status */}
      <div className={`flex items-center gap-3 p-4 rounded-xl ${
        isOnline ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' :
        'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
      }`}>
        {isOnline ? <Wifi size={20} className="text-green-600" /> : <WifiOff size={20} className="text-red-600" />}
        <div>
          <p className={`font-medium ${isOnline ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
            {isOnline ? '🟢 Online' : '🔴 Offline'}
          </p>
          <p className="text-xs text-gray-500">
            {syncStatus === 'synced' ? 'Sincronizado' : syncStatus === 'syncing' ? 'Sincronizando...' : 'Dados locais apenas'}
          </p>
        </div>
      </div>

      {/* Appearance */}
      <Section title="Aparência">
        <SettingRow
          icon={localSettings.darkMode ? Moon : Sun}
          label="Modo escuro"
          action={
            <button onClick={toggleDark} className={`relative w-12 h-7 rounded-full transition-colors ${localSettings.darkMode ? 'bg-brand-600' : 'bg-gray-300'}`}>
              <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${localSettings.darkMode ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          }
        />
      </Section>

      {/* Notifications */}
      <Section title="Notificações">
        <SettingRow
          icon={localSettings.notificationsEnabled ? Bell : BellOff}
          label="Notificações"
          action={
            <button
              onClick={() => handleUpdate({ notificationsEnabled: !localSettings.notificationsEnabled })}
              className={`relative w-12 h-7 rounded-full transition-colors ${localSettings.notificationsEnabled ? 'bg-brand-600' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${localSettings.notificationsEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          }
        />
        <SettingRow
          icon={Info}
          label="Alertar vencimento"
          value={`${localSettings.expiryWarningDays} dias antes`}
          action={<ChevronRight size={16} className="text-gray-400" />}
        />
        <div className="px-4 pb-3">
          <input
            type="range"
            min={1}
            max={30}
            value={localSettings.expiryWarningDays}
            onChange={(e) => handleUpdate({ expiryWarningDays: parseInt(e.target.value) })}
            className="w-full accent-brand-600"
          />
        </div>
        <SettingRow
          icon={Info}
          label="Crítico"
          value={`Até ${localSettings.expiryCriticalDays} dias`}
          action={<ChevronRight size={16} className="text-gray-400" />}
        />
        <div className="px-4 pb-3">
          <input
            type="range"
            min={1}
            max={7}
            value={localSettings.expiryCriticalDays}
            onChange={(e) => handleUpdate({ expiryCriticalDays: parseInt(e.target.value) })}
            className="w-full accent-brand-600"
          />
        </div>
      </Section>

      {/* Defaults */}
      <Section title="Padrões">
        <SettingRow
          icon={Info}
          label="Local padrão"
          value={localSettings.defaultLocation}
          action={
            <select
              value={localSettings.defaultLocation}
              onChange={(e) => handleUpdate({ defaultLocation: e.target.value as PantryLocation })}
              className="bg-transparent text-right text-sm text-gray-600 dark:text-gray-300 focus:outline-none"
            >
              <option value="despensa">Despensa</option>
              <option value="geladeira">Geladeira</option>
              <option value="freezer">Freezer</option>
              <option value="armario">Armário</option>
              <option value="outro">Outro</option>
            </select>
          }
        />
      </Section>

      {/* Sync */}
      <Section title="Sincronização">
        <SettingRow
          icon={Wifi}
          label="Sincronizar com Supabase"
          action={
            <button
              onClick={() => handleUpdate({ syncEnabled: !localSettings.syncEnabled })}
              className={`relative w-12 h-7 rounded-full transition-colors ${localSettings.syncEnabled ? 'bg-brand-600' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${localSettings.syncEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          }
        />
      </Section>

      {/* About */}
      <Section title="Sobre">
        <SettingRow icon={Info} label="Versão" value="1.0.0" />
        <SettingRow icon={Info} label="Dados" value="Armazenados localmente" />
      </Section>

      {/* Danger zone */}
      <Section title="Zona de perigo">
        <button
          onClick={() => {
            if (confirm('Tem certeza? Isso apagará todos os dados locais.')) {
              indexedDB.deleteDatabase('DespensaDB');
              window.location.reload();
            }
          }}
          className="w-full flex items-center gap-3 p-4 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl"
        >
          <Trash2 size={20} />
          <span className="font-medium">Apagar todos os dados</span>
        </button>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 px-1">{title}</h2>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
        {children}
      </div>
    </div>
  );
}

function SettingRow({ icon: Icon, label, value, action }: { icon: any; label: string; value?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between p-4">
      <div className="flex items-center gap-3">
        <Icon size={18} className="text-gray-400" />
        <span className="text-gray-900 dark:text-white">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {value && <span className="text-sm text-gray-500">{value}</span>}
        {action}
      </div>
    </div>
  );
}
