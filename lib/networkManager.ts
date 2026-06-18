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
    }

    // ========================================================================
    // Event Handlers
    // ========================================================================

    private handleOnlineEvent(): void {
        console.log('🌐 Browser reports: Online');
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
     * Determine connectivity WITHOUT pinging any server.
     *
     * We deliberately no longer issue an HTTP "are we online?" probe (it used to
     * hit the backend /health endpoint every 30s, which spammed access logs and
     * tripped the WAF). Instead we trust the browser's own `navigator.onLine`
     * signal and enrich quality from the Network Information API when available.
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

        // Browser reports online — assume reachable. Quality comes from the
        // Network Information API (effectiveType / rtt) where supported.
        this.updateState({
            status: NetworkStatus.ONLINE,
            quality: ConnectionQuality.GOOD,
            isVerified: true,
            lastChecked: Date.now()
        });
        this.updateConnectionInfo();
        return true;
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

