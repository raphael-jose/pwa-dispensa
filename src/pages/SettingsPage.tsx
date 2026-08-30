import { useEffect, useState, useRef } from 'react';
import { 
  Moon, Sun, Bell, BellOff, Wifi, WifiOff, Trash2, Info, 
  Upload, Download, CheckCircle, ExternalLink, Search, Check, 
  X as XIcon, Cloud, Key, User, Lock, Database, Zap, Globe,
  Palette, AlertTriangle, HardDrive, ChevronDown, ChevronUp,
  Shield, ScanBarcode, ShoppingCart
} from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { getSettings, updateSettings } from '@/database';
import { parseCSV, importProducts, getCSVTemplate } from '@/utils/csvImport';
import { getCredentials, saveCredentials, lookupByGTIN } from '@/services/osccbr';
import { clearLocalCache } from '@/services/productProvider';
import type { AppSettings, PantryLocation } from '@/types';

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

// Reusable Toggle component
function Toggle({ enabled, onToggle, size = 'md' }: { enabled: boolean; onToggle: () => void; size?: 'sm' | 'md' }) {
  const h = size === 'sm' ? 'h-6 w-11' : 'h-7 w-12';
  const dot = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  const translate = enabled 
    ? (size === 'sm' ? 'translate-x-5.5' : 'translate-x-5.5') 
    : 'translate-x-0.5';
  
  return (
    <button
      onClick={onToggle}
      className={`relative inline-flex items-center ${h} rounded-full transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 ${
        enabled 
          ? 'bg-emerald-500 shadow-inner shadow-emerald-600/20' 
          : 'bg-gray-300 dark:bg-gray-600'
      }`}
    >
      <span
        className={`inline-block ${dot} bg-white rounded-full shadow-lg transform transition-all duration-300 ease-in-out ${
          enabled ? 'translate-x-[22px]' : 'translate-x-[2px]'
        }`}
      />
    </button>
  );
}

// Reusable Section wrapper
function Card({ title, icon: Icon, children, badge }: { title: string; icon: any; children: React.ReactNode; badge?: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/50 overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50 dark:border-gray-700/30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
            <Icon size={16} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <span className="text-sm font-semibold text-gray-900 dark:text-white">{title}</span>
        </div>
        {badge && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-medium">
            {badge}
          </span>
        )}
      </div>
      <div className="divide-y divide-gray-50 dark:divide-gray-700/30">
        {children}
      </div>
    </div>
  );
}

// Reusable Row
function Row({ icon: Icon, label, description, children }: { icon: any; label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 py-4">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Icon size={18} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
          {description && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{description}</p>}
        </div>
      </div>
      <div className="flex-shrink-0 ml-3">
        {children}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { settings, setSettings, isOnline, syncStatus } = useAppStore();
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; skipped: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // OSCBR
  const [osUser, setOsUser] = useState('');
  const [osPass, setOsPass] = useState('');
  const [osConfigured, setOsConfigured] = useState(false);
  const [osTesting, setOsTesting] = useState(false);
  const [osTestResult, setOsTestResult] = useState<'success' | 'error' | null>(null);
  const [osTestMessage, setOsTestMessage] = useState('');
  const [osTestGtin, setOsTestGtin] = useState('');
  const [showOscbr, setShowOscbr] = useState(false);

  // Supabase
  const [sbUrl, setSbUrl] = useState('');
  const [sbKey, setSbKey] = useState('');
  const [sbConfigured, setSbConfigured] = useState(false);
  const [showSupabase, setShowSupabase] = useState(false);

  useEffect(() => {
    getSettings().then(s => {
      setLocalSettings(s);
      setSettings(s);
    });
    const creds = getCredentials();
    if (creds) {
      setOsUser(creds.username);
      setOsPass(creds.password);
      setOsConfigured(true);
    }
    const sb = getSupabaseConfig();
    if (sb.url) {
      setSbUrl(sb.url);
      setSbKey(sb.key);
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
      setImportResult({ success: 0, skipped: 0, errors: [err.message] });
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
    document.documentElement.classList.toggle('dark', newDark);
  };

  return (
    <div className="space-y-5 pb-28">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Configurações</h1>
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
          isOnline 
            ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/30' 
            : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/30'
        }`}>
          {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
          {isOnline ? 'Online' : 'Offline'}
        </div>
      </div>

      {/* Aparência */}
      <Card title="Aparência" icon={Palette}>
        <Row icon={localSettings.darkMode ? Moon : Sun} label="Modo escuro" description={localSettings.darkMode ? 'Tema escuro ativado' : 'Tema claro ativado'}>
          <Toggle enabled={localSettings.darkMode} onToggle={toggleDark} />
        </Row>
      </Card>

      {/* Notificações */}
      <Card title="Notificações" icon={Bell}>
        <Row 
          icon={localSettings.notificationsEnabled ? Bell : BellOff} 
          label="Notificações" 
          description="Alertas de validade"
        >
          <Toggle enabled={localSettings.notificationsEnabled} onToggle={() => handleUpdate({ notificationsEnabled: !localSettings.notificationsEnabled })} />
        </Row>
        <div className="px-5 py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-700 dark:text-gray-300">Alertar vencimento</span>
            <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{localSettings.expiryWarningDays} dias</span>
          </div>
          <input
            type="range"
            min={1}
            max={30}
            value={localSettings.expiryWarningDays}
            onChange={(e) => handleUpdate({ expiryWarningDays: parseInt(e.target.value) })}
            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full appearance-none cursor-pointer accent-emerald-500"
          />
          <div className="flex justify-between text-[10px] text-gray-400 dark:text-gray-500 mt-1">
            <span>1 dia</span>
            <span>30 dias</span>
          </div>
        </div>
        <div className="px-5 py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-700 dark:text-gray-300">Nível crítico</span>
            <span className="text-sm font-semibold text-red-500 dark:text-red-400">Até {localSettings.expiryCriticalDays} dias</span>
          </div>
          <input
            type="range"
            min={1}
            max={7}
            value={localSettings.expiryCriticalDays}
            onChange={(e) => handleUpdate({ expiryCriticalDays: parseInt(e.target.value) })}
            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full appearance-none cursor-pointer accent-red-500"
          />
          <div className="flex justify-between text-[10px] text-gray-400 dark:text-gray-500 mt-1">
            <span>1 dia</span>
            <span>7 dias</span>
          </div>
        </div>
      </Card>

      {/* Padrões */}
      <Card title="Padrões" icon={HardDrive}>
        <Row icon={ShoppingCart} label="Local padrão" description="Onde salvar novos produtos">
          <select
            value={localSettings.defaultLocation}
            onChange={(e) => handleUpdate({ defaultLocation: e.target.value as PantryLocation })}
            className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg border-0 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
          >
            <option value="despensa">Despensa</option>
            <option value="geladeira">Geladeira</option>
            <option value="freezer">Freezer</option>
            <option value="armario">Armário</option>
            <option value="outro">Outro</option>
          </select>
        </Row>
      </Card>

      {/* Supabase */}
      <Card title="Supabase" icon={Cloud} badge={sbConfigured ? 'Ativo' : undefined}>
        <div className="px-5 py-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Sincronize seus dados entre dispositivos.{' '}
            <a href="https://supabase.com" target="_blank" rel="noopener" className="text-emerald-600 dark:text-emerald-400 underline">
              Criar projeto grátis
            </a>
          </p>
          
          <button
            onClick={() => setShowSupabase(!showSupabase)}
            className="w-full flex items-center justify-between py-2.5 px-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200"
          >
            <span className="flex items-center gap-2">
              {sbConfigured ? <Check size={14} className="text-emerald-500" /> : <XIcon size={14} className="text-gray-400" />}
              {sbConfigured ? 'Configurado' : 'Configurar agora'}
            </span>
            {showSupabase ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showSupabase && (
            <div className="mt-3 space-y-3 animate-in slide-in-from-top-1 duration-200">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">URL do projeto</label>
                <input
                  type="url"
                  value={sbUrl}
                  onChange={(e) => setSbUrl(e.target.value)}
                  placeholder="https://xxx.supabase.co"
                  className="w-full px-3 py-2.5 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Anon Key</label>
                <input
                  type="password"
                  value={sbKey}
                  onChange={(e) => setSbKey(e.target.value)}
                  placeholder="eyJhbGciOi..."
                  className="w-full px-3 py-2.5 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (sbUrl && sbKey) {
                      saveSupabaseConfig(sbUrl, sbKey);
                      setSbConfigured(true);
                      setShowSupabase(false);
                    }
                  }}
                  disabled={!sbUrl || !sbKey}
                  className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium disabled:opacity-40 hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Check size={14} /> Salvar
                </button>
                <button
                  onClick={() => { saveSupabaseConfig('', ''); setSbUrl(''); setSbKey(''); setSbConfigured(false); }}
                  className="px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Limpar
                </button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* OSCBR */}
      <Card title="Base de Produtos (OSCBR)" icon={Globe} badge={osConfigured ? 'Ativo' : undefined}>
        <div className="px-5 py-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Identifique produtos brasileiros pelo código de barras.{' '}
            <a href="https://gtin.rscsistemas.com.br/cadastro" target="_blank" rel="noopener" className="text-emerald-600 dark:text-emerald-400 underline inline-flex items-center gap-0.5">
              Cadastro grátis <ExternalLink size={10} />
            </a>
          </p>

          <button
            onClick={() => setShowOscbr(!showOscbr)}
            className="w-full flex items-center justify-between py-2.5 px-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200"
          >
            <span className="flex items-center gap-2">
              {osConfigured ? <Check size={14} className="text-emerald-500" /> : <XIcon size={14} className="text-gray-400" />}
              {osConfigured ? 'Configurado' : 'Configurar agora'}
            </span>
            {showOscbr ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showOscbr && (
            <div className="mt-3 space-y-3 animate-in slide-in-from-top-1 duration-200">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Usuário</label>
                <input
                  type="text"
                  value={osUser}
                  onChange={(e) => setOsUser(e.target.value)}
                  placeholder="Seu usuário"
                  className="w-full px-3 py-2.5 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Senha</label>
                <input
                  type="password"
                  value={osPass}
                  onChange={(e) => setOsPass(e.target.value)}
                  placeholder="Sua senha"
                  className="w-full px-3 py-2.5 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (osUser && osPass) {
                      saveCredentials({ username: osUser, password: osPass });
                      setOsConfigured(true);
                      setShowOscbr(false);
                    }
                  }}
                  disabled={!osUser || !osPass}
                  className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium disabled:opacity-40 hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Check size={14} /> Salvar
                </button>
                <button
                  onClick={() => { saveCredentials({ username: '', password: '' }); setOsUser(''); setOsPass(''); setOsConfigured(false); }}
                  className="px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Limpar
                </button>
              </div>

              {/* Test */}
              <div className="pt-2 border-t border-gray-100 dark:border-gray-700/50">
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Testar consulta</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Código de barras"
                    value={osTestGtin}
                    onChange={(e) => setOsTestGtin(e.target.value.replace(/[^0-9]/g, ''))}
                    className="flex-1 px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                  <button
                    onClick={async () => {
                      if (!osTestGtin || !osConfigured) return;
                      setOsTesting(true);
                      setOsTestResult(null);
                      try {
                        const result = await lookupByGTIN(osTestGtin);
                        setOsTestResult(result.found ? 'success' : 'error');
                        setOsTestMessage(result.found ? `${result.name}` : 'Não encontrado');
                      } catch {
                        setOsTestResult('error');
                        setOsTestMessage('Erro na consulta');
                      } finally {
                        setOsTesting(false);
                      }
                    }}
                    disabled={!osTestGtin || osTesting || !osConfigured}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium disabled:opacity-40 flex items-center gap-1 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    <Search size={14} /> Testar
                  </button>
                </div>
                {osTestResult && (
                  <div className={`mt-2 p-2.5 rounded-lg text-xs font-medium ${
                    osTestResult === 'success' 
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/30' 
                      : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/30'
                  }`}>
                    {osTestResult === 'success' ? '✅' : '❌'} {osTestMessage}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Sincronização */}
      <Card title="Sincronização" icon={Shield}>
        <Row icon={Cloud} label="Auto-sync" description="Sincronizar a cada 30 segundos">
          <Toggle enabled={localSettings.syncEnabled} onToggle={() => handleUpdate({ syncEnabled: !localSettings.syncEnabled })} />
        </Row>
      </Card>

      {/* Importar */}
      <Card title="Importar Produtos" icon={Upload}>
        <div className="px-5 py-4 space-y-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Importe uma planilha CSV com seus produtos.
          </p>
          <div className="flex gap-2">
            <button
              onClick={downloadTemplate}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <Download size={15} /> Modelo
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium disabled:opacity-40 hover:bg-emerald-700 transition-colors"
            >
              {importing ? '⏳ Importando...' : <><Upload size={15} /> Importar</>}
            </button>
          </div>
          <input ref={fileInputRef} type="file" accept=".csv,.txt" onChange={handleFileImport} className="hidden" />
          
          {importResult && (
            <div className={`p-3 rounded-xl text-xs ${
              importResult.errors.length > 0
                ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/30'
                : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/30'
            }`}>
              <div className="flex items-center gap-1.5 font-medium">
                <CheckCircle size={14} />
                {importResult.success} importados, {importResult.skipped} ignorados
              </div>
              {importResult.errors.length > 0 && (
                <ul className="mt-1.5 space-y-0.5 ml-5">
                  {importResult.errors.slice(0, 3).map((err, i) => <li key={i}>• {err}</li>)}
                </ul>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Cache */}
      <Card title="Cache" icon={Database}>
        <div className="px-5 py-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Se produtos aparecem com nomes errados ao escanear, limpe o cache.
          </p>
          <button
            onClick={() => {
              if (confirm('Limpar cache? Produtos salvos não serão apagados.')) {
                clearLocalCache();
                alert('Cache limpo!');
              }
            }}
            className="w-full py-2.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-xl text-sm font-medium border border-amber-200 dark:border-amber-800/30 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors flex items-center justify-center gap-2"
          >
            <Trash2 size={14} /> Limpar cache de produtos
          </button>
        </div>
      </Card>

      {/* Sobre */}
      <Card title="Sobre" icon={Info}>
        <Row icon={Info} label="Versão" description="PWA Despensa">
          <span className="text-sm text-gray-500 dark:text-gray-400 font-mono">1.0.0</span>
        </Row>
        <Row icon={HardDrive} label="Armazenamento" description="Dados locais no navegador">
          <span className="text-xs text-gray-400 dark:text-gray-500">Local</span>
        </Row>
      </Card>

      {/* Zona de perigo */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-red-200 dark:border-red-800/30 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-red-50 dark:border-red-900/20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
              <AlertTriangle size={16} className="text-red-500" />
            </div>
            <span className="text-sm font-semibold text-red-600 dark:text-red-400">Zona de perigo</span>
          </div>
        </div>
        <button
          onClick={() => {
            if (confirm('Tem certeza? Isso apagará TODOS os dados locais permanentemente.')) {
              indexedDB.deleteDatabase('DespensaDB');
              window.location.reload();
            }
          }}
          className="w-full flex items-center gap-3 px-5 py-4 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
        >
          <Trash2 size={18} />
          <span className="text-sm font-medium">Apagar todos os dados</span>
        </button>
      </div>
    </div>
  );
}
