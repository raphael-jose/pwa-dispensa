import { useState, useEffect } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { getAllLogs, clearLogs, getLogStats, type LogEntry } from '@/utils/logger';

// Reusable Card component (duplicated here to avoid circular imports)
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

export default function LogsSection() {
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState({ total: 0, errors: 0, warnings: 0 });

  useEffect(() => {
    setLogs(getAllLogs().reverse());
    setStats(getLogStats());
  }, [showLogs]);

  const levelColors: Record<string, string> = {
    error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/30 text-red-700 dark:text-red-300',
    warn: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/30 text-amber-700 dark:text-amber-300',
    info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/30 text-blue-700 dark:text-blue-300',
  };

  return (
    <Card title="Logs de Erro" icon={AlertTriangle} badge={stats.errors > 0 ? `${stats.errors}` : undefined}>
      <div className="px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {stats.total} registros · {stats.errors} erros · {stats.warnings} avisos
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => { clearLogs(); setLogs([]); setStats({ total: 0, errors: 0, warnings: 0 }); }}
              className="text-xs px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Limpar
            </button>
            <button
              onClick={() => setShowLogs(!showLogs)}
              className="text-xs px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-1"
            >
              {showLogs ? <ChevronUp size={12} /> : <ChevronDown size={12} />} {showLogs ? 'Ocultar' : 'Ver logs'}
            </button>
          </div>
        </div>

        {showLogs && (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">
                Nenhum erro registrado
              </p>
            ) : (
              logs.map((log) => (
                <div key={log.id} className={`p-3 rounded-xl border text-xs ${levelColors[log.level]}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium uppercase text-[10px]">
                      {log.level === 'error' ? '❌ ERRO' : log.level === 'warn' ? '⚠️ AVISO' : 'ℹ️ INFO'}
                      {log.source && <span className="ml-1 opacity-70">· {log.source}</span>}
                    </span>
                    <span className="font-mono opacity-60">
                      {new Date(log.timestamp).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  <p className="font-medium">{log.message}</p>
                  {log.details && (
                    <pre className="mt-1 text-[10px] opacity-70 whitespace-pre-wrap break-all font-mono max-h-20 overflow-y-auto">
                      {log.details}
                    </pre>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
