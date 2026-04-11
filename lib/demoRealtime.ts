/**
 * Demo Realtime Broadcast System
 * 
 * Provides realtime-like functionality in demo mode without requiring
 * Supabase authenticated connections. Uses BroadcastChannel API for
 * same-browser communication and localStorage events as fallback.
 * 
 * When a demo user makes a change (create, update, delete), this system:
 * 1. Broadcasts the change to all other tabs/windows
 * 2. Invalidates the API client cache
 * 3. Dispatches window events for dashboard listeners
 */

import { api } from './api';

const DEMO_CHANNEL_NAME = 'oliskey-demo-realtime';
const DEMO_STORAGE_KEY = 'oliskey-demo-broadcast';

interface DemoBroadcastMessage {
  type: 'INSERT' | 'UPDATE' | 'DELETE' | 'CACHE_INVALIDATE';
  table?: string;
  id?: string | number;
  data?: any;
  timestamp: number;
  sourceRole?: string;
  schoolId?: string;
}

class DemoRealtimeService {
  private channel: BroadcastChannel | null = null;
  private listeners: Map<string, Set<(message: DemoBroadcastMessage) => void>> = new Map();
  private isInitialized = false;
  private storageListener: ((e: StorageEvent) => void) | null = null;

  /**
   * Initialize the demo realtime broadcast system
   */
  initialize() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Try BroadcastChannel first (modern browsers, same origin)
    try {
      this.channel = new BroadcastChannel(DEMO_CHANNEL_NAME);
      this.channel.onmessage = (event: MessageEvent<DemoBroadcastMessage>) => {
        this.handleMessage(event.data);
      };
      console.log('📡 [DemoRealtime] BroadcastChannel initialized');
    } catch (e) {
      console.warn('📡 [DemoRealtime] BroadcastChannel not supported, falling back to localStorage events');
    }

    // Fallback: localStorage events for cross-tab communication
    this.storageListener = (e: StorageEvent) => {
      if (e.key === DEMO_STORAGE_KEY && e.newValue) {
        try {
          const message = JSON.parse(e.newValue) as DemoBroadcastMessage;
          // Ignore our own messages (already handled via direct broadcast)
          if (message.timestamp > Date.now() - 5000) {
            this.handleMessage(message);
          }
        } catch {
          // Ignore parse errors
        }
      }
    };
    window.addEventListener('storage', this.storageListener);

    console.log('📡 [DemoRealtime] Demo realtime system initialized');
  }

  /**
   * Broadcast a change to all listeners and other tabs
   */
  broadcast(message: Omit<DemoBroadcastMessage, 'timestamp'>) {
    const fullMessage: DemoBroadcastMessage = {
      ...message,
      timestamp: Date.now(),
    };

    // Broadcast via BroadcastChannel
    if (this.channel) {
      try {
        this.channel.postMessage(fullMessage);
      } catch (e) {
        console.warn('📡 [DemoRealtime] BroadcastChannel postMessage failed:', e);
      }
    }

    // Fallback: localStorage event for cross-tab
    try {
      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(fullMessage));
      // Remove immediately to allow same value to trigger again
      setTimeout(() => localStorage.removeItem(DEMO_STORAGE_KEY), 100);
    } catch (e) {
      console.warn('📡 [DemoRealtime] localStorage broadcast failed:', e);
    }

    // Handle locally
    this.handleMessage(fullMessage);

    console.log(`📡 [DemoRealtime] Broadcast: ${message.type} on ${message.table || 'unknown'}`);
  }

  /**
   * Handle incoming broadcast message
   */
  private handleMessage(message: DemoBroadcastMessage) {
    // Invalidate API cache on any write operation
    if (message.type !== 'CACHE_INVALIDATE') {
      api.invalidateCache();
    }

    // Dispatch window event for dashboard listeners
    window.dispatchEvent(new CustomEvent('demo-realtime-update', {
      detail: message
    }));

    // Also dispatch the legacy event name for backward compatibility
    window.dispatchEvent(new CustomEvent('realtime-update', {
      detail: message
    }));

    // Call registered table-specific listeners
    if (message.table) {
      const tableListeners = this.listeners.get(message.table);
      if (tableListeners) {
        tableListeners.forEach(listener => {
          try {
            listener(message);
          } catch (e) {
            console.error('📡 [DemoRealtime] Listener error:', e);
          }
        });
      }
    }

    // Call wildcard listeners
    const wildcardListeners = this.listeners.get('*');
    if (wildcardListeners) {
      wildcardListeners.forEach(listener => {
        try {
          listener(message);
        } catch (e) {
          console.error('📡 [DemoRealtime] Wildcard listener error:', e);
        }
      });
    }
  }

  /**
   * Subscribe to changes on a specific table
   */
  subscribe(table: string, callback: (message: DemoBroadcastMessage) => void): () => void {
    if (!this.listeners.has(table)) {
      this.listeners.set(table, new Set());
    }
    this.listeners.get(table)!.add(callback);

    // Return unsubscribe function
    return () => {
      const tableListeners = this.listeners.get(table);
      if (tableListeners) {
        tableListeners.delete(callback);
      }
    };
  }

  /**
   * Broadcast a cache invalidation request
   */
  invalidateCache() {
    this.broadcast({
      type: 'CACHE_INVALIDATE',
      timestamp: Date.now(),
    });
  }

  /**
   * Destroy the realtime system
   */
  destroy() {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    if (this.storageListener) {
      window.removeEventListener('storage', this.storageListener);
      this.storageListener = null;
    }
    this.listeners.clear();
    this.isInitialized = false;
    console.log('📡 [DemoRealtime] Demo realtime system destroyed');
  }
}

export const demoRealtime = new DemoRealtimeService();
export default demoRealtime;
export type { DemoBroadcastMessage };
