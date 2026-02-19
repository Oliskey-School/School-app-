import React from 'react';

interface CenteredLoaderProps {
    className?: string; // Additional classes for the container
    size?: 'sm' | 'md' | 'lg'; // Size of the spinner
    fullScreen?: boolean; // If true, covers the entire screen
    message?: string; // Optional text to display below spinner
}

const CenteredLoader: React.FC<CenteredLoaderProps> = ({
    className = '',
    size = 'md',
    fullScreen = false,
    message
}) => {
    const sizeClasses = {
        sm: 'h-6 w-6 border-2',
        md: 'h-10 w-10 border-4',
        lg: 'h-16 w-16 border-4'
    };

    const containerClasses = fullScreen
        ? 'fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm'
        : `flex flex-col items-center justify-center w-full h-full min-h-[200px] ${className}`;

    return (
        <div className={containerClasses}>
            <div className={`animate-spin rounded-full border-gray-200 border-t-indigo-600 ${sizeClasses[size]}`}></div>
            {message && (
                <p className="mt-4 text-gray-500 font-medium text-sm animate-pulse">{message}</p>
            )}
        </div>
    );
};

export default CenteredLoader;
