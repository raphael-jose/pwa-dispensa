import React from 'react';
import { logError } from '@/utils/logger';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logError(
      error.message,
      `Stack: ${error.stack}\nComponent: ${errorInfo.componentStack}`,
      'error_boundary'
    );
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-8 max-w-sm w-full text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} className="text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Algo deu errado
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Oapp encontrou um erro inesperado. O erro foi salvo nos logs.
            </p>
            {this.state.error && (
              <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3 mb-6 text-left">
                <p className="text-xs font-mono text-red-600 dark:text-red-400 break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium text-sm flex items-center justify-center gap-2"
              >
                <RefreshCw size={16} /> Tentar novamente
              </button>
              <button
                onClick={this.handleReload}
                className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-medium text-sm"
              >
                Recarregar app
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
