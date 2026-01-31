/**
 * Enhanced Offline Storage Utility
 * Implements a robust caching layer with encryption and quota management.
 */

import { get, set, del } from 'idb-keyval';

const STORAGE_PREFIX = 'school_app_cache_';
const CACHE_EXPIRY = 1000 * 60 * 60 * 24; // 24 hours
const QUOTA_WARNING_THRESHOLD = 0.8; // 80%

export interface CacheEntry<T> {
    data: T;
    timestamp: number;
    version: string;
    encrypted?: boolean;
    ttl?: number; // Time-to-live in milliseconds
}

// ============================================================================
// Encryption Utilities
// ============================================================================

class EncryptionHelper {
    private static async getKey(): Promise<CryptoKey> {
        // In production, derive this from user session or device fingerprint
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode('school-app-encryption-key-v1'),
            'PBKDF2',
            false,
            ['deriveBits', 'deriveKey']
        );

        return crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: new TextEncoder().encode('school-app-salt'),
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    }

    static async encrypt(data: string): Promise<string> {
        try {
            const key = await this.getKey();
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const encoded = new TextEncoder().encode(data);

            const encrypted = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv },
                key,
                encoded
            );

            // Combine IV and encrypted data
            const combined = new Uint8Array(iv.length + encrypted.byteLength);
            combined.set(iv);
            combined.set(new Uint8Array(encrypted), iv.length);

            // Convert to base64
            return btoa(String.fromCharCode(...combined));
        } catch (error) {
            console.error('Encryption failed:', error);
            throw error;
        }
    }

    static async decrypt(encryptedData: string): Promise<string> {
        try {
            const key = await this.getKey();

            // Decode from base64
            const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));

            // Extract IV and encrypted data
            const iv = combined.slice(0, 12);
            const encrypted = combined.slice(12);

            const decrypted = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv },
                key,
                encrypted
            );

            return new TextDecoder().decode(decrypted);
        } catch (error) {
            console.error('Decryption failed:', error);
            throw error;
        }
    }
}

// ============================================================================
// Storage Manager
// ============================================================================

export const offlineStorage = {
    /**
     * Save data to local persistence with optional encryption
     */
    save: async <T>(key: string, data: T, options: { encrypt?: boolean; ttl?: number } = {}) => {
        try {
            const entry: CacheEntry<T> = {
                data,
                timestamp: Date.now(),
                version: '1.0',
                encrypted: options.encrypt,
                ttl: options.ttl
            };

            let serialized = JSON.stringify(entry);

            // Encrypt if requested
            if (options.encrypt) {
                serialized = await EncryptionHelper.encrypt(serialized);
            }

            // Try IndexedDB first for large data
            const sizeInBytes = new Blob([serialized]).size;

            if (sizeInBytes > 5 * 1024) { // > 5KB, use IndexedDB
                await set(STORAGE_PREFIX + key, serialized);
            } else {
                // Use localStorage for small data
                localStorage.setItem(STORAGE_PREFIX + key, serialized);
            }

            // Check quota
            await offlineStorage.checkQuota();
        } catch (e) {
            console.error('Failed to save to offline storage:', e);
            throw e;
        }
    },

    /**
     * Load data from local persistence with decryption support
     */
    load: async <T>(key: string): Promise<T | null> => {
        try {
            // Try localStorage first
            let item = localStorage.getItem(STORAGE_PREFIX + key);

            // Fallback to IndexedDB
            if (!item) {
                item = await get(STORAGE_PREFIX + key);
            }

            if (!item) return null;

            // Check if encrypted
            let serialized = item;

            try {
                // Try to parse as JSON first
                const parsed = JSON.parse(item);
                if (parsed.encrypted) {
                    // Decrypt if needed
                    serialized = await EncryptionHelper.decrypt(item);
                }
            } catch {
                // If JSON parse fails, assume it's encrypted
                serialized = await EncryptionHelper.decrypt(item);
            }

            const entry: CacheEntry<T> = JSON.parse(serialized);

            // Check TTL if set
            if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
                await offlineStorage.remove(key);
                return null;
            }

            // Optional: check default expiry
            // if (Date.now() - entry.timestamp > CACHE_EXPIRY) return null;

            return entry.data;
        } catch (e) {
            console.error('Failed to load from offline storage:', e);
            return null;
        }
    },

    /**
     * Check if a key exists
     */
    has: async (key: string): Promise<boolean> => {
        const data = await offlineStorage.load(key);
        return data !== null;
    },

    /**
     * Get cache metadata without loading data
     */
    getMetadata: async (key: string): Promise<Pick<CacheEntry<any>, 'timestamp' | 'version' | 'encrypted'> | null> => {
        try {
            let item = localStorage.getItem(STORAGE_PREFIX + key);
            if (!item) {
                item = await get(STORAGE_PREFIX + key);
            }
            if (!item) return null;

            const entry: CacheEntry<any> = JSON.parse(item);
            return {
                timestamp: entry.timestamp,
                version: entry.version,
                encrypted: entry.encrypted
            };
        } catch {
            return null;
        }
    },

    /**
     * Clear specific cache entry
     */
    remove: async (key: string) => {
        localStorage.removeItem(STORAGE_PREFIX + key);
        await del(STORAGE_PREFIX + key);
    },

    /**
     * Clear all application cache
     */
    clearAll: async () => {
        // Clear localStorage
        Object.keys(localStorage)
            .filter(key => key.startsWith(STORAGE_PREFIX))
            .forEach(key => localStorage.removeItem(key));

        // Note: idb-keyval doesn't have a clear-by-prefix method
        // In production, you'd use a custom store or Dexie.js
        console.log('✅ Offline storage cleared');
    },

    /**
     * Get storage usage statistics
     */
    getUsageStats: async (): Promise<{ usage: number; quota: number; percentage: number }> => {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            const estimate = await navigator.storage.estimate();
            const usage = estimate.usage || 0;
            const quota = estimate.quota || 0;
            const percentage = quota > 0 ? (usage / quota) * 100 : 0;

            return { usage, quota, percentage };
        }

        return { usage: 0, quota: 0, percentage: 0 };
    },

    /**
     * Check quota and warn if approaching limit
     */
    checkQuota: async () => {
        const stats = await offlineStorage.getUsageStats();

        if (stats.percentage > QUOTA_WARNING_THRESHOLD * 100) {
            console.warn(`⚠️ Storage quota at ${stats.percentage.toFixed(1)}% - Consider clearing old data`);

            // Emit warning event
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('storage-quota-warning', {
                    detail: stats
                }));
            }
        }

        return stats;
    },

    /**
     * Purge expired entries
     */
    purgeExpired: async () => {
        const now = Date.now();
        let purgedCount = 0;

        // Purge from localStorage
        const keys = Object.keys(localStorage).filter(key => key.startsWith(STORAGE_PREFIX));

        for (const key of keys) {
            try {
                const item = localStorage.getItem(key);
                if (!item) continue;

                const entry: CacheEntry<any> = JSON.parse(item);

                // Check if expired
                if (entry.ttl && now - entry.timestamp > entry.ttl) {
                    localStorage.removeItem(key);
                    purgedCount++;
                }
            } catch {
                // Invalid entry, remove it
                localStorage.removeItem(key);
                purgedCount++;
            }
        }

        console.log(`✅ Purged ${purgedCount} expired cache entries`);
        return purgedCount;
    }
};

