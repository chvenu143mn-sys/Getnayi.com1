import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
          return this.props.fallback;
      }
      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] w-full bg-[#0c0c0e] text-white p-6 rounded-2xl border border-red-500/20">
          <div className="size-14 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
            <AlertTriangle className="size-7 text-red-500" />
          </div>
          <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
          <p className="text-zinc-400 text-sm mb-6 text-center max-w-sm">
            We encountered an unexpected error while loading this component.
          </p>
          <button 
            onClick={() => {
                this.setState({ hasError: false, error: undefined });
                window.location.reload();
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-black font-semibold rounded-full hover:bg-zinc-200 transition-colors"
          >
            <RefreshCcw className="size-4" />
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
