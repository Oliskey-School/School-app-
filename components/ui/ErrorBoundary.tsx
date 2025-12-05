
import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: undefined
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }
  
  public handleGoBack = () => {
    this.setState({ hasError: false, error: undefined });
    window.history.back();
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 flex flex-col items-center justify-center h-full text-center bg-gray-50">
            <div className="bg-white p-8 rounded-2xl shadow-lg max-w-sm">
                <h1 className="text-2xl font-bold text-red-600">Oops! Something went wrong.</h1>
                <p className="text-gray-600 mt-2">
                    A part of the application encountered an error and could not be displayed.
                </p>
                <p className="text-sm text-gray-500 mt-4">
                    Please try going back and accessing this section again. If the problem persists, please contact support.
                </p>
                <button 
                    onClick={this.handleGoBack}
                    className="mt-6 w-full py-3 px-4 font-semibold text-white bg-orange-500 rounded-lg shadow-md hover:bg-orange-600 transition-colors"
                >
                    Go Back
                </button>
            </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
