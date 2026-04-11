// DEPRECATED: Realtime updates are now handled by RealtimeService and individual hooks
// like useRealtimeListener or useRealtimeResource which handle the new event system.

export interface RealtimePayload<T = any> {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE';
    new: T;
    old: T;
    errors: any;
}

/**
 * Enhanced realtime subscription hook with offline support (Deprecated)
 */
export const useRealtimeSubscription = (
    _table: string,
    _event: 'INSERT' | 'UPDATE' | 'DELETE' | '*',
    _callback: (payload: RealtimePayload) => void,
    _options: any = {}
) => {
    return {
        isSubscribed: false,
        isOnline: true,
        lastUpdate: Date.now()
    };
};

/**
 * Hook to subscribe to multiple tables at once (Deprecated)
 */
export const useRealtimeSubscriptions = (
    _subscriptions: Array<any>,
    _options?: any
) => {
    return {
        allSubscribed: false,
        anySubscribed: false,
        isOnline: true,
        subscriptions: []
    };
};
