/**
 * Error logging utility — stores errors in localStorage for debugging.
 * Accessible from Settings → "Ver logs de erro".
 */

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'error' | 'warn' | 'info';
  message: string;
  details?: string;
  source?: string; // e.g. 'scanner', 'database', 'api', 'sync'
}

const LOG_KEY = 'despensa_error_logs';
const MAX_ENTRIES = 200;

function getLogs(): LogEntry[] {
  try {
    const data = localStorage.getItem(LOG_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveLogs(logs: LogEntry[]) {
  try {
    // Keep only the last MAX_ENTRIES
    const trimmed = logs.slice(-MAX_ENTRIES);
    localStorage.setItem(LOG_KEY, JSON.stringify(trimmed));
  } catch {
    // Storage full — clear old logs
    try {
      localStorage.setItem(LOG_KEY, JSON.stringify(logs.slice(-50)));
    } catch {
      // Give up
    }
  }
}

export function logError(message: string, details?: string, source?: string) {
  const entry: LogEntry = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    level: 'error',
    message,
    details,
    source,
  };
  const logs = getLogs();
  logs.push(entry);
  saveLogs(logs);
  console.error(`[${source || 'app'}] ${message}`, details || '');
}

export function logWarn(message: string, details?: string, source?: string) {
  const entry: LogEntry = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    level: 'warn',
    message,
    details,
    source,
  };
  const logs = getLogs();
  logs.push(entry);
  saveLogs(logs);
  console.warn(`[${source || 'app'}] ${message}`, details || '');
}

export function logInfo(message: string, details?: string, source?: string) {
  const entry: LogEntry = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    level: 'info',
    message,
    details,
    source,
  };
  const logs = getLogs();
  logs.push(entry);
  saveLogs(logs);
}

export function getErrorLogs(): LogEntry[] {
  return getLogs().filter(l => l.level === 'error');
}

export function getAllLogs(): LogEntry[] {
  return getLogs();
}

export function clearLogs() {
  localStorage.removeItem(LOG_KEY);
}

export function getLogStats(): { total: number; errors: number; warnings: number } {
  const logs = getLogs();
  return {
    total: logs.length,
    errors: logs.filter(l => l.level === 'error').length,
    warnings: logs.filter(l => l.level === 'warn').length,
  };
}
