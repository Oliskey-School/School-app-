import { App } from '@capacitor/app';
import { Network } from '@capacitor/network';
import { syncEngine } from '../syncEngine';
import { Capacitor } from '@capacitor/core';

/**
 * Mobile Sync Manager
 * 
 * Orchestrates synchronization specifically for mobile lifecycle events.
 * Uses Capacitor plugins to detect App State (Background/Foreground) and Network status.
 */

export class MobileSyncManager {
    private static instance: MobileSyncManager;
    private isInitialized = false;
    private backgroundSyncTaskId: string | null = null;

    private constructor() { }

    static getInstance(): MobileSyncManager {
        if (!MobileSyncManager.instance) {
            MobileSyncManager.instance = new MobileSyncManager();
        }
        return MobileSyncManager.instance;
    }

    /**
     * Initialize mobile-specific listeners
     */
    async initialize() {
        if (this.isInitialized || !Capacitor.isNativePlatform()) return;

        console.log('📱 Initializing Mobile Sync Manager');

        // 1. Listen for App State Changes (Foreground/Background)
        // More reliable than visibilitychange on iOS/Android
        try {
            await App.addListener('appStateChange', async ({ isActive }) => {
                if (isActive) {
                    console.log('📱 App returned to foreground - triggering data refresh');

                    // Check network before syncing
                    const status = await Network.getStatus();
                    if (status.connected) {
                        await syncEngine.triggerSync();
                    }
                } else {
                    console.log('📱 App went to background - scheduling background sync');
                    // In a real implementation with BackgroundFetch plugin:
                    // this.scheduleBackgroundFetch();
                }
            });
        } catch (e) {
            console.warn('Failed to add appStateChange listener', e);
        }

        // 2. Listen for Native Network Changes
        // Capacitor Network plugin is more accurate for native connection types (WiFi vs Cellular)
        try {
            await Network.addListener('networkStatusChange', async (status) => {
                console.log('📱 Native Network Status Change:', status);

                if (status.connected) {
                    // Optimized: Only sync heavy data if on WiFi
                    // If on cellular, maybe only sync critical tables?
                    // For now, we just trigger standard sync but we could pass flags

                    if (status.connectionType === 'wifi') {
                        console.log('📱 WiFi detected - Performing Full Sync');
                        await syncEngine.triggerSync();
                    } else {
                        console.log('📱 Cellular detected - Performing Smart Sync (could be throttled)');
                        await syncEngine.triggerSync();
                    }
                } else {
                    syncEngine.pause();
                }
            });
        } catch (e) {
            console.warn('Failed to add networkStatusChange listener', e);
        }

        this.isInitialized = true;
    }

    /**
     * Mock implementation of Background Fetch Registration
     * (Requires @transistorsoft/capacitor-background-fetch or similar)
     */
    async registerBackgroundFetch() {
        if (!Capacitor.isNativePlatform()) return;

        console.log('📱 Registering Background Fetch (Mock)');
        // Real implementation would look like:
        // BackgroundFetch.configure({
        //   minimumFetchInterval: 15, // minutes
        // }, async (taskId) => {
        //   console.log("[BackgroundFetch] Event received");
        //   await syncEngine.sync();
        //   BackgroundFetch.finish(taskId);
        // });
    }
}

export const mobileSyncManager = MobileSyncManager.getInstance();
