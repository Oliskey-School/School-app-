/**
 * Graceful Fallback UI Component
 * 
 * Provides user-friendly fallback interfaces when offline features are unavailable.
 */

import React from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

interface FallbackUIProps {
    feature: string;
    children: React.ReactNode;
    fallback?: React.ReactNode;
    requiresOnline?: boolean;
}

/**
 * Graceful fallback wrapper for features
 */
export const GracefulFallback: React.FC<FallbackUIProps> = ({
    feature,
    children,
    fallback,
    requiresOnline = false
}) => {
    const isOnline = useOnlineStatus();

    if (requiresOnline && !isOnline) {
        return (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                        <svg className="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <div className="flex-1">
                        <h3 className="text-sm font-semibold text-yellow-800 mb-1">
                            {feature} Unavailable Offline
                        </h3>
                        <p className="text-sm text-yellow-700">
                            This feature requires an internet connection. Please reconnect to continue.
                        </p>
                        {fallback && (
                            <div className="mt-3">
                                {fallback}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return <>{children}</>;
};

/**
 * Read-only fallback for form fields
 */
export const ReadOnlyFallback: React.FC<{
    value: string;
    label: string;
    helpText?: string;
}> = ({ value, label, helpText }) => {
    return (
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-1">
                {label}
            </label>
            <div className="text-gray-900 font-medium">
                {value || '—'}
            </div>
            {helpText && (
                <p className="mt-1 text-xs text-gray-500">{helpText}</p>
            )}
        </div>
    );
};

/**
 * Degraded functionality notice
 */
export const DegradedNotice: React.FC<{
    message: string;
    severity?: 'info' | 'warning' | 'error';
}> = ({ message, severity = 'info' }) => {
    const colors = {
        info: {
            bg: 'bg-blue-50',
            border: 'border-blue-200',
            icon: 'text-blue-600',
            text: 'text-blue-800'
        },
        warning: {
            bg: 'bg-yellow-50',
            border: 'border-yellow-200',
            icon: 'text-yellow-600',
            text: 'text-yellow-800'
        },
        error: {
            bg: 'bg-red-50',
            border: 'border-red-200',
            icon: 'text-red-600',
            text: 'text-red-800'
        }
    };

    const theme = colors[severity];

    return (
        <div className={`p-3 ${theme.bg} border ${theme.border} rounded-lg mb-4`}>
            <div className="flex items-start gap-2">
                <svg className={`w-5 h-5 ${theme.icon} flex-shrink-0 mt-0.5`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className={`text-sm ${theme.text}`}>
                    {message}
                </p>
            </div>
        </div>
    );
};

/**
 * Cached data indicator
 */
export const CachedDataBadge: React.FC<{
    lastSynced?: number;
    className?: string;
}> = ({ lastSynced, className = '' }) => {
    if (!lastSynced) return null;

    const timeSince = Date.now() - lastSynced;
    const hours = Math.floor(timeSince / (1000 * 60 * 60));
    const minutes = Math.floor((timeSince % (1000 * 60 * 60)) / (1000 * 60));

    let displayTime = '';
    if (hours > 0) {
        displayTime = `${hours}h ago`;
    } else if (minutes > 0) {
        displayTime = `${minutes}m ago`;
    } else {
        displayTime = 'Just now';
    }

    return (
        <div className={`inline-flex items-center gap-1.5 px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs text-gray-600 ${className}`}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span>Cached • {displayTime}</span>
        </div>
    );
};

/**
 * Offline form wrapper with auto-save
 */
export const OfflineFormWrapper: React.FC<{
    children: React.ReactNode;
    onSave?: () => void;
    isDirty?: boolean;
}> = ({ children, onSave, isDirty }) => {
    const isOnline = useOnlineStatus();

    return (
        <div className="relative">
            {!isOnline && (
                <DegradedNotice
                    severity="warning"
                    message="You're offline. Changes will be saved locally and synced when you reconnect."
                />
            )}

            {children}

            {!isOnline && isDirty && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-blue-800">
                        <div className="animate-pulse">
                            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        </div>
                        <span>Unsaved changes will sync automatically when online</span>
                    </div>
                </div>
            )}
        </div>
    );
};

/**
 * Limited functionality wrapper
 */
export const LimitedFunctionality: React.FC<{
    children: React.ReactNode;
    limitations: string[];
}> = ({ children, limitations }) => {
    const isOnline = useOnlineStatus();

    if (isOnline) {
        return <>{children}</>;
    }

    return (
        <div>
            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <h4 className="text-sm font-semibold text-amber-900 mb-2">
                    ⚠️ Limited Functionality (Offline Mode)
                </h4>
                <ul className="text-sm text-amber-800 space-y-1">
                    {limitations.map((limitation, index) => (
                        <li key={index} className="flex items-start gap-2">
                            <span className="text-amber-600 mt-0.5">•</span>
                            <span>{limitation}</span>
                        </li>
                    ))}
                </ul>
            </div>

            {children}
        </div>
    );
};
