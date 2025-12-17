import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshIcon, ExclamationCircleIcon } from '../../constants';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
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

    public static getDerivedStateFromError(_: Error): State {
        return { hasError: true, error: _ };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public handleRetry = () => {
        this.setState({ hasError: false, error: null });
        window.location.reload();
    };

    public render() {
        if (this.state.hasError) {
            return this.props.fallback || (
                <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center bg-white rounded-2xl shadow-sm border border-red-100 m-4">
                    <div className="p-4 bg-red-50 rounded-full mb-4">
                        <ExclamationCircleIcon className="w-8 h-8 text-red-500" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Something went wrong</h2>
                    <p className="text-gray-500 mb-6 max-w-md">
                        We encountered an unexpected error while loading this section.
                        <br />
                        <span className="text-xs font-mono bg-gray-100 p-1 rounded mt-2 inline-block">
                            {this.state.error?.message}
                        </span>
                    </p>
                    <button
                        onClick={this.handleRetry}
                        className="flex items-center space-x-2 px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                        <RefreshIcon className="w-4 h-4" />
                        <span>Reload Application</span>
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
