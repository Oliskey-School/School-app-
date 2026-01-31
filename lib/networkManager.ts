/**
 * Network Manager - Global Network State Management
 * 
 * Monitors network connectivity, connection quality, and provides
 * real-time network status updates to the application.
 */

import { EventEmitter } from './EventEmitter';

// ============================================================================
// Types & Interfaces
// ============================================================================

export enum NetworkStatus {
    ONLINE = 'online',
    OFFLINE = 'offline',
    UNKNOWN = 'unknown'
}

export enum ConnectionQuality {
    EXCELLENT = 'excellent',  // < 100ms ping, fast connection
    GOOD = 'good',            // 100-300ms ping
    FAIR = 'fair',            // 300-1000ms ping
    POOR = 'poor',            // > 1000ms ping or slow connection
    OFFLINE = 'offline',      // No connection
    UNKNOWN = 'unknown'       // Not yet determined
}

export interface NetworkState {
    status: NetworkStatus;
    quality: ConnectionQuality;
    effectiveType?: string; // From Network Information API
    downlink?: number;      // Mbps
    rtt?: number;           // Round-trip time in ms
    saveData?: boolean;     // User's data saver preference
    lastChecked: number;
    isVerified: boolean;    // True if ping verification passed
}

export interface NetworkEventMap {
    'online': NetworkState;
    'offline': NetworkState;
    'quality-change': NetworkState;
    'state-change': NetworkState;
}

// ============================================================================
// Network Manager Class
// ============================================================================

class NetworkManager extends EventEmitter {
    private state: NetworkState;
    private pingUrl: string = '/favicon.ico'; // Small file to ping
    private pingInterval: number = 30000; // 30 seconds
    private pingIntervalId: NodeJS.Timeout | null = null;
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 5;

    constructor() {
        super();

        // Initialize state
        this.state = {
            status: this.getInitialStatus(),
            quality: ConnectionQuality.UNKNOWN,
            lastChecked: Date.now(),
            isVerified: false
        };

        // Setup listeners
        this.setupEventListeners();

        // Initial verification
        this.verifyConnection();
    }

    // ========================================================================
    // Initialization
    // ========================================================================

    private getInitialStatus(): NetworkStatus {
        if (typeof navigator === 'undefined') {
            return NetworkStatus.UNKNOWN;
        }
        return navigator.onLine ? NetworkStatus.ONLINE : NetworkStatus.OFFLINE;
    }

    private setupEventListeners(): void {
        if (typeof window === 'undefined') return;

        // Browser online/offline events
        window.addEventListener('online', () => this.handleOnlineEvent());
        window.addEventListener('offline', () => this.handleOfflineEvent());

        // Visibility change (tab focus)
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.verifyConnection();
            }
        });

        // Network Information API (experimental)
        if ('connection' in navigator) {
            const connection = (navigator as any).connection;
            connection.addEventListener('change', () => this.updateConnectionInfo());
        }

        // Start periodic ping
        this.startPeriodicPing();
    }

    // ========================================================================
    // Event Handlers
    // ========================================================================

    private handleOnlineEvent(): void {
        console.log('🌐 Browser reports: Online');
        this.reconnectAttempts = 0;
        this.verifyConnection();
    }

    private handleOfflineEvent(): void {
        console.log('🔌 Browser reports: Offline');
        this.updateState({
            status: NetworkStatus.OFFLINE,
            quality: ConnectionQuality.OFFLINE,
            isVerified: true,
            lastChecked: Date.now()
        });
    }

    // ========================================================================
    // Connection Verification
    // ========================================================================

    /**
     * Verify actual internet connectivity with a ping test
     */
    async verifyConnection(): Promise<boolean> {
        if (!navigator.onLine) {
            this.updateState({
                status: NetworkStatus.OFFLINE,
                quality: ConnectionQuality.OFFLINE,
                isVerified: true,
                lastChecked: Date.now()
            });
            return false;
        }

        try {
            const startTime = performance.now();

            // Fetch a small resource with cache-busting
            const response = await fetch(this.pingUrl + '?t=' + Date.now(), {
                method: 'HEAD',
                cache: 'no-cache',
                signal: AbortSignal.timeout(5000) // 5 second timeout
            });

            const endTime = performance.now();
            const rtt = endTime - startTime;

            if (response.ok || response.status === 304) {
                const quality = this.calculateQuality(rtt);

                this.updateState({
                    status: NetworkStatus.ONLINE,
                    quality,
                    rtt,
                    isVerified: true,
                    lastChecked: Date.now()
                });

                this.updateConnectionInfo(); // Get additional network info
                return true;
            } else {
                throw new Error('Ping failed: ' + response.status);
            }
        } catch (error) {
            console.warn('Connection verification failed:', error);

            // If we can't verify but browser says online, mark as unknown
            this.updateState({
                status: navigator.onLine ? NetworkStatus.UNKNOWN : NetworkStatus.OFFLINE,
                quality: ConnectionQuality.OFFLINE,
                isVerified: false,
                lastChecked: Date.now()
            });

            // Attempt reconnection with exponential backoff
            this.scheduleReconnect();
            return false;
        }
    }

    /**
     * Calculate connection quality based on RTT
     */
    private calculateQuality(rtt: number): ConnectionQuality {
        if (rtt < 100) return ConnectionQuality.EXCELLENT;
        if (rtt < 300) return ConnectionQuality.GOOD;
        if (rtt < 1000) return ConnectionQuality.FAIR;
        return ConnectionQuality.POOR;
    }

    /**
     * Get additional connection info from Network Information API
     */
    private updateConnectionInfo(): void {
        if ('connection' in navigator) {
            const connection = (navigator as any).connection;

            this.state.effectiveType = connection.effectiveType || undefined;
            this.state.downlink = connection.downlink || undefined;
            this.state.rtt = connection.rtt || this.state.rtt;
            this.state.saveData = connection.saveData || false;

            // Recalculate quality based on network info
            if (connection.rtt && this.state.status === NetworkStatus.ONLINE) {
                const quality = this.calculateQuality(connection.rtt);
                if (quality !== this.state.quality) {
                    this.state.quality = quality;
                    this.emit('quality-change', this.state);
                }
            }
        }
    }

    /**
     * Schedule reconnection attempt with exponential backoff
     */
    private scheduleReconnect(): void {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.warn('Max reconnect attempts reached');
            return;
        }

        this.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // Max 30 seconds

        console.log(`🔄 Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);

        setTimeout(() => {
            this.verifyConnection();
        }, delay);
    }

    // ========================================================================
    // Periodic Ping
    // ========================================================================

    private startPeriodicPing(): void {
        this.pingIntervalId = setInterval(() => {
            if (this.state.status === NetworkStatus.ONLINE) {
                this.verifyConnection();
            }
        }, this.pingInterval);
    }

    private stopPeriodicPing(): void {
        if (this.pingIntervalId) {
            clearInterval(this.pingIntervalId);
            this.pingIntervalId = null;
        }
    }

    // ========================================================================
    // State Management
    // ========================================================================

    private updateState(newState: Partial<NetworkState>): void {
        const previousStatus = this.state.status;
        const previousQuality = this.state.quality;

        this.state = {
            ...this.state,
            ...newState
        };

        // Emit state change event
        this.emit('state-change', this.state);

        // Emit specific events
        if (previousStatus !== this.state.status) {
            if (this.state.status === NetworkStatus.ONLINE) {
                console.log('✅ Network: ONLINE');
                this.emit('online', this.state);
            } else if (this.state.status === NetworkStatus.OFFLINE) {
                console.log('❌ Network: OFFLINE');
                this.emit('offline', this.state);
            }
        }

        if (previousQuality !== this.state.quality && this.state.status === NetworkStatus.ONLINE) {
            console.log(`📶 Connection quality: ${this.state.quality}`);
            this.emit('quality-change', this.state);
        }
    }

    // ========================================================================
    // Public API
    // ========================================================================

    /**
     * Get current network state
     */
    getState(): NetworkState {
        return { ...this.state };
    }

    /**
     * Check if currently online
     */
    isOnline(): boolean {
        return this.state.status === NetworkStatus.ONLINE && this.state.isVerified;
    }

    /**
     * Check if currently offline
     */
    isOffline(): boolean {
        return this.state.status === NetworkStatus.OFFLINE;
    }

    /**
     * Get connection quality
     */
    getQuality(): ConnectionQuality {
        return this.state.quality;
    }

    /**
     * Check if connection is good enough for sync
     */
    isGoodForSync(): boolean {
        return this.isOnline() && (
            this.state.quality === ConnectionQuality.EXCELLENT ||
            this.state.quality === ConnectionQuality.GOOD
        );
    }

    /**
     * Check if connection is slow (use reduced sync)
     */
    isSlowConnection(): boolean {
        return this.isOnline() && (
            this.state.quality === ConnectionQuality.FAIR ||
            this.state.quality === ConnectionQuality.POOR
        );
    }

    /**
     * Check if user has data saver enabled
     */
    hasDataSaver(): boolean {
        return this.state.saveData || false;
    }

    /**
     * Force connection check
     */
    async checkConnection(): Promise<boolean> {
        return this.verifyConnection();
    }

    /**
     * Wait for online status
     */
    waitForOnline(timeout: number = 30000): Promise<NetworkState> {
        return new Promise((resolve, reject) => {
            if (this.isOnline()) {
                resolve(this.state);
                return;
            }

            const timeoutId = setTimeout(() => {
                this.off('online', onlineHandler);
                reject(new Error('Timeout waiting for online status'));
            }, timeout);

            const onlineHandler = (state: NetworkState) => {
                clearTimeout(timeoutId);
                resolve(state);
            };

            this.once('online', onlineHandler);
        });
    }

    /**
     * Register listener for network events
     */
    on<K extends keyof NetworkEventMap>(
        event: K,
        listener: (state: NetworkEventMap[K]) => void
    ): this {
        return super.on(event, listener);
    }

    /**
     * Register one-time listener
     */
    once<K extends keyof NetworkEventMap>(
        event: K,
        listener: (state: NetworkEventMap[K]) => void
    ): this {
        return super.once(event, listener);
    }

    /**
     * Remove listener
     */
    off<K extends keyof NetworkEventMap>(
        event: K,
        listener: (state: NetworkEventMap[K]) => void
    ): this {
        return super.off(event, listener);
    }

    /**
     * Cleanup and stop monitoring
     */
    destroy(): void {
        this.stopPeriodicPing();
        this.removeAllListeners();

        if (typeof window !== 'undefined') {
            window.removeEventListener('online', () => this.handleOnlineEvent());
            window.removeEventListener('offline', () => this.handleOfflineEvent());
        }
    }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const networkManager = new NetworkManager();

// React Hook for network status
import { useState, useEffect } from 'react';

export function useNetworkStatus() {
    if (typeof window === 'undefined') {
        return {
            status: NetworkStatus.UNKNOWN,
            quality: ConnectionQuality.UNKNOWN,
            isOnline: false,
            isOffline: true,
            isGoodForSync: false
        };
    }

    const [state, setState] = useState<NetworkState>(networkManager.getState());

    useEffect(() => {
        const handleStateChange = (newState: NetworkState) => {
            setState(newState);
        };

        networkManager.on('state-change', handleStateChange);

        return () => {
            networkManager.off('state-change', handleStateChange);
        };
    }, []);

    return {
        ...state,
        isOnline: networkManager.isOnline(),
        isOffline: networkManager.isOffline(),
        isGoodForSync: networkManager.isGoodForSync()
    };
}

