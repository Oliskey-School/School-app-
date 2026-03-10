import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ExclamationCircleIcon, RotateCcwIcon } from '../../constants';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  title?: string;
  message?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🔥 [ErrorBoundary] Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center p-8 bg-white rounded-2xl shadow-sm border border-red-100 text-center m-4 animate-in fade-in zoom-in duration-300">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
            <ExclamationCircleIcon className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {this.props.title || "Something went wrong"}
          </h2>
          <p className="text-gray-500 mb-6 max-w-xs mx-auto">
            {this.props.message || "We encountered an error while loading this component. Please try again."}
          </p>
          <button
            onClick={this.handleReset}
            className="flex items-center space-x-2 px-6 py-2.5 bg-sky-500 text-white font-semibold rounded-xl hover:bg-sky-600 transition-all shadow-md active:scale-95"
          >
            <RotateCcwIcon className="w-4 h-4" />
            <span>Try Again</span>
          </button>

          {process.env.NODE_ENV === 'development' && (
            <div className="mt-8 p-4 bg-gray-50 rounded-lg text-left overflow-auto max-w-full">
              <p className="text-xs font-mono text-red-600 truncate">
                {this.state.error?.message}
              </p>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
