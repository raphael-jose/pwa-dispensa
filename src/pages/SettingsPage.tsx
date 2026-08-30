import { useEffect, useState, useRef } from 'react';
import { 
  Moon, Sun, Bell, BellOff, Wifi, WifiOff, Trash2, Info, ChevronRight, 
  Upload, Download, FileText, CheckCircle, ExternalLink, Search, Check, 
  X as XIcon, Cloud, Key, User, Lock, Database, Zap, Globe,
  Palette, Shield, AlertTriangle, HardDrive, Paintbrush
} from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { getSettings, updateSettings } from '@/database';
import { parseCSV, importProducts, getCSVTemplate } from '@/utils/csvImport';
import { getCredentials, saveCredentials, hasCredentials, lookupByGTIN } from '@/services/osccbr';
import { clearLocalCache } from '@/services/productProvider';
import type { AppSettings, PantryLocation } from '@/types';

// Supabase config helpers
const SUPABASE_STORAGE_KEY = 'despensa_supabase_config';

function getSupabaseConfig(): { url: string; key: string } {
  try {
    const data = localStorage.getItem(SUPABASE_STORAGE_KEY);
    return data ? JSON.parse(data) : { url: '', key: '' };
  } catch {
    return { url: '', key: '' };
  }
}

function saveSupabaseConfig(url: string, key: string) {
  localStorage.setItem(SUPABASE_STORAGE_KEY, JSON.stringify({ url, key }));
}

export default function SettingsPage() {
  const { settings, setSettings, isOnline, syncStatus } = useAppStore();
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; skipped: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // OSCBR API state
  const [osUser, setOsUser] = useState('');
  const [osPass, setOsPass] = useState('');
  const [osConfigured, setOsConfigured] = useState(false);
  const [osTesting, setOsTesting] = useState(false);
  const [osTestResult, setOsTestResult] = useState<'success' | 'error' | null>(null);
  const [osTestMessage, setOsTestMessage] = useState('');
  const [osTestGtin, setOsTestGtin] = useState('');

  // Supabase config state
  const [sbUrl, setSbUrl] = useState('');
  const [sbKey, setSbKey] = useState('');
  const [sbConfigured, setSbConfigured] = useState(false);

  useEffect(() => {
    getSettings().then(s => {
      setLocalSettings(s);
      setSettings(s);
    });
    // Load OSCBR credentials
    const creds = getCredentials();
    if (creds) {
      setOsUser(creds.username);
      setOsPass(creds.password);
      setOsConfigured(true);
    }
    // Load Supabase config
    const sbConfig = getSupabaseConfig();
    if (sbConfig.url) {
      setSbUrl(sbConfig.url);
      setSbKey(sbConfig.key);
      setSbConfigured(true);
    }
  }, []);

  async function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);

    try {
      const text = await file.text();
      const rows = parseCSV(text);
      const result = await importProducts(rows);
      setImportResult(result);
    } catch (err: any) {
      setImportResult({ success: 0, skipped: 0, errors: ['Erro ao ler arquivo: ' + err.message] });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function downloadTemplate() {
    const csv = getCSVTemplate();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modelo_produtos.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

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
      <div className={`flex items-center gap-3 p-4 rounded-xl border ${
        isOnline 
          ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/30' 
          : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/30'
      }`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          isOnline ? 'bg-emerald-100 dark:bg-emerald-800/30' : 'bg-red-100 dark:bg-red-800/30'
        }`}>
          {isOnline ? <Wifi size={20} className="text-emerald-600 dark:text-emerald-400" /> : <WifiOff size={20} className="text-red-600 dark:text-red-400" />}
        </div>
        <div>
          <p className={`font-medium ${isOnline ? 'text-emerald-800 dark:text-emerald-200' : 'text-red-800 dark:text-red-200'}`}>
            {isOnline ? 'Online' : 'Offline'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {syncStatus === 'synced' ? 'Sincronizado' : syncStatus === 'syncing' ? 'Sincronizando...' : 'Dados locais apenas'}
          </p>
        </div>
      </div>

      {/* Appearance - Dark Mode */}
      <Section title="Aparência" icon={Palette}>
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                localSettings.darkMode 
                  ? 'bg-indigo-100 dark:bg-indigo-800/30' 
                  : 'bg-amber-100 dark:bg-amber-800/30'
              }`}>
                {localSettings.darkMode ? (
                  <Moon size={20} className="text-indigo-600 dark:text-indigo-400" />
                ) : (
                  <Sun size={20} className="text-amber-600 dark:text-amber-400" />
                )}
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Modo escuro</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {localSettings.darkMode ? 'Escuro ativado' : 'Claro ativado'}
                </p>
              </div>
            </div>
            <button 
              onClick={toggleDark} 
              className={`relative w-14 h-8 rounded-full transition-all duration-300 ${
                localSettings.darkMode 
                  ? 'bg-indigo-600 shadow-lg shadow-indigo-600/30' 
                  : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 flex items-center justify-center ${
                localSettings.darkMode ? 'translate-x-7' : 'translate-x-1'
              }`}>
                {localSettings.darkMode ? <Moon size={12} className="text-indigo-600" /> : <Sun size={12} className="text-amber-500" />}
              </span>
            </button>
          </div>
        </div>
      </Section>

      {/* Notifications */}
      <Section title="Notificações" icon={Bell}>
        <SettingRow
          icon={localSettings.notificationsEnabled ? Bell : BellOff}
          label="Notificações"
          action={
            <button
              onClick={() => handleUpdate({ notificationsEnabled: !localSettings.notificationsEnabled })}
              className={`relative w-12 h-7 rounded-full transition-colors ${localSettings.notificationsEnabled ? 'bg-emerald-600' : 'bg-gray-300 dark:bg-gray-600'}`}
            >
              <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${localSettings.notificationsEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          }
        />
        <SettingRow
          icon={AlertTriangle}
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
            className="w-full accent-emerald-600"
          />
        </div>
        <SettingRow
          icon={Zap}
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
            className="w-full accent-emerald-600"
          />
        </div>
      </Section>

      {/* Defaults */}
      <Section title="Padrões" icon={HardDrive}>
        <SettingRow
          icon={Database}
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

      {/* Supabase Configuration */}
      <Section title="Supabase (Sincronização)" icon={Cloud}>
        <div className="p-4 space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Configure o Supabase para sincronizar seus dados entre dispositivos. Crie um projeto gratuito em{' '}
            <a href="https://supabase.com" target="_blank" rel="noopener" className="text-emerald-600 dark:text-emerald-400 underline inline-flex items-center gap-1">
              supabase.com <ExternalLink size={12} />
            </a>
          </p>

          <div className="flex items-center gap-2">
            {sbConfigured ? <Check size={16} className="text-emerald-600" /> : <XIcon size={16} className="text-gray-400" />}
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {sbConfigured ? 'Configurado' : 'Não configurado'}
            </span>
          </div>

          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
              <Globe size={12} /> URL do projeto
            </label>
            <input
              type="url"
              value={sbUrl}
              onChange={(e) => setSbUrl(e.target.value)}
              placeholder="https://seu-projeto.supabase.co"
              className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
              <Key size={12} /> Anon Key
            </label>
            <input
              type="password"
              value={sbKey}
              onChange={(e) => setSbKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIs..."
              className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-sm font-mono"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                if (sbUrl && sbKey) {
                  saveSupabaseConfig(sbUrl, sbKey);
                  setSbConfigured(true);
                  alert('Configuração salva! Reinicie o app para aplicar.');
                }
              }}
              disabled={!sbUrl || !sbKey}
              className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Check size={14} /> Salvar
            </button>
            <button
              onClick={() => {
                saveSupabaseConfig('', '');
                setSbUrl('');
                setSbKey('');
                setSbConfigured(false);
              }}
              className="py-2.5 px-4 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium"
            >
              Limpar
            </button>
          </div>
        </div>
      </Section>

      {/* OSCBR API - Brazilian Product Database */}
      <Section title="Base de Produtos Brasileiros (OSCBR)" icon={Globe}>
        <div className="p-4 space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Cadastre-se gratuitamente em{' '}
            <a href="https://gtin.rscsistemas.com.br/cadastro" target="_blank" rel="noopener" className="text-emerald-600 dark:text-emerald-400 underline inline-flex items-center gap-1">
              gtin.rscsistemas.com.br <ExternalLink size={12} />
            </a>{' '}
            para identificar produtos brasileiros automaticamente (20 consultas/minuto).
          </p>

          <div className="flex items-center gap-2">
            {osConfigured ? <Check size={16} className="text-emerald-600" /> : <XIcon size={16} className="text-gray-400" />}
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {osConfigured ? 'Configurada' : 'Não configurada'}
            </span>
          </div>

          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
              <User size={12} /> Usuário
            </label>
            <input
              type="text"
              value={osUser}
              onChange={(e) => setOsUser(e.target.value)}
              placeholder="Seu usuário OSCBR"
              className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
              <Lock size={12} /> Senha
            </label>
            <input
              type="password"
              value={osPass}
              onChange={(e) => setOsPass(e.target.value)}
              placeholder="Sua senha OSCBR"
              className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                if (osUser && osPass) {
                  saveCredentials({ username: osUser, password: osPass });
                  setOsConfigured(true);
                  alert('Credenciais salvas!');
                }
              }}
              disabled={!osUser || !osPass}
              className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Check size={14} /> Salvar
            </button>
            <button
              onClick={() => {
                saveCredentials({ username: '', password: '' });
                setOsUser('');
                setOsPass('');
                setOsConfigured(false);
                setOsTestResult(null);
              }}
              className="py-2.5 px-4 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium"
            >
              Limpar
            </button>
          </div>

          {/* Test lookup */}
          <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Testar com código de barras:</p>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                placeholder="Ex: 7891234567890"
                value={osTestGtin}
                onChange={(e) => setOsTestGtin(e.target.value.replace(/[^0-9]/g, ''))}
                className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-sm font-mono"
              />
              <button
                onClick={async () => {
                  if (!osTestGtin || !osConfigured) return;
                  setOsTesting(true);
                  setOsTestResult(null);
                  try {
                    const result = await lookupByGTIN(osTestGtin);
                    if (result.found) {
                      setOsTestResult('success');
                      setOsTestMessage(`${result.name} (${result.brand})`);
                    } else {
                      setOsTestResult('error');
                      setOsTestMessage('Produto não encontrado');
                    }
                  } catch {
                    setOsTestResult('error');
                    setOsTestMessage('Erro na consulta');
                  } finally {
                    setOsTesting(false);
                  }
                }}
                disabled={!osTestGtin || osTesting || !osConfigured}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium disabled:opacity-50 flex items-center gap-1"
              >
                <Search size={14} /> Testar
              </button>
            </div>
            {osTestResult && (
              <p className={`text-xs mt-2 ${osTestResult === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                {osTestResult === 'success' ? '✅' : '❌'} {osTestMessage}
              </p>
            )}
          </div>
        </div>
      </Section>

      {/* Sync */}
      <Section title="Sincronização" icon={Shield}>
        <SettingRow
          icon={Cloud}
          label="Sincronizar com Supabase"
          action={
            <button
              onClick={() => handleUpdate({ syncEnabled: !localSettings.syncEnabled })}
              className={`relative w-12 h-7 rounded-full transition-colors ${localSettings.syncEnabled ? 'bg-emerald-600' : 'bg-gray-300 dark:bg-gray-600'}`}
            >
              <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${localSettings.syncEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          }
        />
      </Section>

      {/* Import */}
      <Section title="Importar Produtos" icon={Upload}>
        <div className="p-4 space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Importe uma planilha CSV com seus produtos para preencher a despensa automaticamente.
          </p>
          
          <div className="flex gap-2">
            <button
              onClick={downloadTemplate}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <Download size={16} /> Modelo CSV
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium disabled:opacity-50 hover:bg-emerald-700 transition-colors"
            >
              {importing ? (
                <><span className="animate-spin">⏳</span> Importando...</>
              ) : (
                <><Upload size={16} /> Importar CSV</>
              )}
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            onChange={handleFileImport}
            className="hidden"
          />

          {importResult && (
            <div className={`p-3 rounded-xl ${
              importResult.errors.length > 0
                ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30'
                : 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/30'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle size={16} className={importResult.errors.length > 0 ? 'text-amber-600' : 'text-emerald-600'} />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {importResult.success} importados, {importResult.skipped} ignorados
                </span>
              </div>
              {importResult.errors.length > 0 && (
                <ul className="text-xs text-amber-700 dark:text-amber-300 mt-1 space-y-0.5">
                  {importResult.errors.slice(0, 5).map((err, i) => (
                    <li key={i}>• {err}</li>
                  ))}
                  {importResult.errors.length > 5 && (
                    <li>... e mais {importResult.errors.length - 5} erros</li>
                  )}
                </ul>
              )}
            </div>
          )}

          <p className="text-xs text-gray-400 dark:text-gray-500">
            Colunas: barcode, nome, marca, categoria, validade, quantidade, local, observacoes
          </p>
        </div>
      </Section>

      {/* Cache */}
      <Section title="Cache de Produtos" icon={Database}>
        <div className="p-4 space-y-2">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Se produtos estão sendo identificados com nomes errados ao escanear, limpe o cache.
          </p>
          <button
            onClick={() => {
              if (confirm('Limpar cache de produtos? Produtos salvos NÃO serão apagados.')) {
                clearLocalCache();
                alert('Cache limpo! Da próxima vez que escanear, o app vai consultar a API novamente.');
              }
            }}
            className="w-full py-2.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-xl font-medium text-sm border border-amber-200 dark:border-amber-800/30 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors flex items-center justify-center gap-2"
          >
            <Trash2 size={14} /> Limpar cache de produtos
          </button>
        </div>
      </Section>

      {/* About */}
      <Section title="Sobre" icon={Info}>
        <SettingRow icon={Info} label="Versão" value="1.0.0" />
        <SettingRow icon={HardDrive} label="Dados" value="Armazenados localmente" />
      </Section>

      {/* Danger zone */}
      <Section title="Zona de perigo" icon={AlertTriangle}>
        <button
          onClick={() => {
            if (confirm('Tem certeza? Isso apagará todos os dados locais.')) {
              indexedDB.deleteDatabase('DespensaDB');
              window.location.reload();
            }
          }}
          className="w-full flex items-center gap-3 p-4 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-colors"
        >
          <Trash2 size={20} />
          <span className="font-medium">Apagar todos os dados</span>
        </button>
      </Section>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon?: typeof Info; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2 px-1">
        {Icon && <Icon size={14} className="text-gray-400 dark:text-gray-500" />}
        <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{title}</h2>
      </div>
      <div className="bg-white dark:bg-gray-800/80 rounded-xl border border-gray-100 dark:border-gray-700/50 divide-y divide-gray-100 dark:divide-gray-700/50">
        {children}
      </div>
    </div>
  );
}

function SettingRow({ icon: Icon, label, value, action }: { icon: any; label: string; value?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between p-4">
      <div className="flex items-center gap-3">
        <Icon size={18} className="text-gray-400 dark:text-gray-500" />
        <span className="text-gray-900 dark:text-white">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {value && <span className="text-sm text-gray-500 dark:text-gray-400 capitalize">{value}</span>}
        {action}
      </div>
    </div>
  );
}
