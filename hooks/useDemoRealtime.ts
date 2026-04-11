/**
 * Hook for demo mode realtime subscriptions
 * 
 * In demo mode, this hook listens to BroadcastChannel/localStorage events
 * instead of Supabase realtime. It triggers re-fetches when data changes.
 */

import { useEffect, useRef, useCallback } from 'react';
import { api } from '../lib/api';

interface UseDemoRealtimeOptions {
  enabled?: boolean;
  tables?: string[];
  onEvent?: (event: any) => void;
}

export function useDemoRealtime(options: UseDemoRealtimeOptions = {}) {
  const { enabled = true, tables, onEvent } = options;
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const handleDemoEvent = useCallback((event: Event) => {
    const customEvent = event as CustomEvent;
    const detail = customEvent.detail;
    
    if (!detail) return;
    
    // Filter by tables if specified
    if (tables && tables.length > 0 && detail.table && !tables.includes(detail.table) && detail.table !== '*') {
      return;
    }
    
    // Invalidate cache for fresh data on next read
    api.invalidateCache();
    
    // Call user callback
    if (onEventRef.current) {
      onEventRef.current(detail);
    }
    
    console.log(`📡 [useDemoRealtime] Event received: ${detail.type} on ${detail.table}`);
  }, [tables]);

  useEffect(() => {
    if (!enabled) return;
    
    // Initialize demo realtime system
    import('../lib/demoRealtime').then(({ demoRealtime }) => {
      demoRealtime.initialize();
    }).catch(() => {
      // Module not available, will fall back to window events
    });
    
    // Listen for demo realtime events
    window.addEventListener('demo-realtime-update', handleDemoEvent);
    window.addEventListener('realtime-update', handleDemoEvent);
    
    return () => {
      window.removeEventListener('demo-realtime-update', handleDemoEvent);
      window.removeEventListener('realtime-update', handleDemoEvent);
    };
  }, [enabled, handleDemoEvent]);
}
