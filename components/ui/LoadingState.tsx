import React from 'react';

interface LoadingStateProps {
    type?: 'list' | 'card' | 'table';
    rows?: number;
    className?: string;
}

const LoadingState: React.FC<LoadingStateProps> = ({ type = 'list', rows = 5, className = '' }) => {
    const skeletonRows = Array.from({ length: rows });

    if (type === 'list') {
        return (
            <div className={`space-y-4 w-full animate-pulse ${className}`}>
                {skeletonRows.map((_, i) => (
                    <div key={i} className="flex items-center space-x-4 p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                        <div className="rounded-full bg-gray-200 h-12 w-12"></div>
                        <div className="flex-1 space-y-2 py-1">
                            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                            <div className="h-2 bg-gray-200 rounded w-1/2"></div>
                        </div>
                        <div className="h-4 w-4 bg-gray-200 rounded-full"></div>
                    </div>
                ))}
            </div>
        );
    }

    if (type === 'card') {
        return (
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full animate-pulse ${className}`}>
                {skeletonRows.map((_, i) => (
                    <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                        <div className="h-32 bg-gray-100 rounded-xl"></div>
                        <div className="space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                            <div className="h-3 bg-gray-200 rounded w-full"></div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className={`w-full space-y-3 animate-pulse ${className}`}>
            <div className="h-10 bg-gray-200 rounded-lg w-full mb-6"></div>
            {skeletonRows.map((_, i) => (
                <div key={i} className="h-8 bg-gray-100 rounded w-full"></div>
            ))}
        </div>
    );
};

export default LoadingState;
