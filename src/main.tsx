import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { logError } from './utils/logger';
import './index.css';

// Global error handlers — capture unhandled errors and log them
window.addEventListener('error', (event) => {
  logError(
    event.message || 'Erro não capturado',
    `File: ${event.filename}:${event.lineno}:${event.colno}\nStack: ${event.error?.stack || ''}`,
    'global'
  );
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  logError(
    'Promise rejeitada sem tratamento',
    typeof reason === 'string' ? reason : reason?.message || JSON.stringify(reason),
    'global'
  );
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
