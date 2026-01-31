/**
 * Offline Guard Component
 * 
 * Wrapper component to protect online-only features.
 * Shows appropriate messaging when offline and prevents access.
 */

import React, { ReactNode } from 'react';
import { useOnlineStatus } from './OfflineIndicator';

interface OfflineGuardProps {
    children: ReactNode;
    fallback?: ReactNode;
    requireOnline?: boolean;
    message?: string;
}

export function OfflineGuard({
    children,
    fallback,
    requireOnline = true,
    message = 'This feature requires an internet connection'
}: OfflineGuardProps) {
    const isOnline = useOnlineStatus();

    if (!requireOnline || isOnline) {
        return <>{children}</>;
    }

    if (fallback) {
        return <>{fallback}</>;
    }

    return (
        <div className="flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <svg
                className="w-16 h-16 text-gray-400 dark:text-gray-600 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
                />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Internet Required
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center max-w-md mb-4">
                {message}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 text-center">
                Please check your connection and try again
            </p>
        </div>
    );
}

/**
 * Inline offline message for smaller spaces
 */
export function InlineOfflineMessage({ className = '' }: { className?: string }) {
    return (
        <div className={`flex items-center gap-2 px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded text-sm ${className}`}>
            <svg className="w-4 h-4 text-yellow-600 dark:text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-yellow-800 dark:text-yellow-200 font-medium">
                Offline - Feature unavailable
            </span>
        </div>
    );
}

/**
 * Button with offline state
 */
interface OfflineAwareButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    requireOnline?: boolean;
    offlineMessage?: string;
}

export function OfflineAwareButton({
    children,
    requireOnline = true,
    offlineMessage = 'This action requires internet',
    disabled,
    ...props
}: OfflineAwareButtonProps) {
    const isOnline = useOnlineStatus();
    const isDisabled = disabled || (requireOnline && !isOnline);

    return (
        <button
            {...props}
            disabled={isDisabled}
            className={`${props.className} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={requireOnline && !isOnline ? offlineMessage : props.title}
        >
            {children}
            {requireOnline && !isOnline && (
                <svg className="w-4 h-4 ml-2 inline" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                </svg>
            )}
        </button>
    );
}
