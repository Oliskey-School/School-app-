/**
 * Migration Manager
 * 
 * Handles schema versioning, data migrations, and rollback support for the offline database.
 */

import { offlineDB, TableName } from './offlineDatabase';
import { syncEngine } from './syncEngine';

// ============================================================================
// Schema Version Management
// ============================================================================

const CURRENT_SCHEMA_VERSION = 1;
const SCHEMA_VERSION_KEY = 'schema_version';

interface Migration {
    version: number;
    name: string;
    up: () => Promise<void>;
    down: () => Promise<void>;
}

/**
 * Get current schema version from localStorage
 */
export function getCurrentSchemaVersion(): number {
    const stored = localStorage.getItem(SCHEMA_VERSION_KEY);
    return stored ? parseInt(stored, 10) : 0;
}

/**
 * Set schema version in localStorage
 */
export function setSchemaVersion(version: number): void {
    localStorage.setItem(SCHEMA_VERSION_KEY, version.toString());
}

// ============================================================================
// Migration Definitions
// ============================================================================

const migrations: Migration[] = [
    {
        version: 1,
        name: 'Initial schema',
        up: async () => {
            console.log('âœ… Schema v1: Initial setup complete');
        },
        down: async () => {
            await offlineDB.clearAll();
            console.log('âœ… Schema v1: Rollback complete');
        }
    },
    // Add future migrations here
    // {
    //     version: 2,
    //     name: 'Add new table xyz',
    //     up: async () => {
    //         // Migration logic
    //     },
    //     down: async () => {
    //         // Rollback logic
    //     }
    // }
];

/**
 * Run pending migrations
 */
export async function runMigrations(): Promise<void> {
    const currentVersion = getCurrentSchemaVersion();

    console.log(`ðŸ“¦ Current schema version: ${currentVersion}`);
    console.log(`ðŸ“¦ Target schema version: ${CURRENT_SCHEMA_VERSION}`);

    if (currentVersion === CURRENT_SCHEMA_VERSION) {
        console.log('âœ… Schema is up to date');
        return;
    }

    if (currentVersion > CURRENT_SCHEMA_VERSION) {
        console.warn('âš ï¸ Schema version is newer than expected! Consider rolling back.');
        return;
    }

    // Run pending migrations
    const pendingMigrations = migrations.filter((m) => m.version > currentVersion);

    for (const migration of pendingMigrations) {
        console.log(`ðŸ”„ Running migration ${migration.version}: ${migration.name}`);

        try {
            await migration.up();
            setSchemaVersion(migration.version);
            console.log(`âœ… Migration ${migration.version} complete`);
        } catch (error) {
            console.error(`âŒ Migration ${migration.version} failed:`, error);
            throw new Error(`Migration ${migration.version} failed: ${error}`);
        }
    }

    console.log('âœ… All migrations complete');
}

/**
 * Rollback to a specific version
 */
export async function rollbackToVersion(targetVersion: number): Promise<void> {
    const currentVersion = getCurrentSchemaVersion();

    if (targetVersion >= currentVersion) {
        console.warn('âš ï¸ Target version is same or newer');
        return;
    }

    // Run rollbacks in reverse order
    const migrationsToRollback = migrations
        .filter((m) => m.version > targetVersion && m.version <= currentVersion)
        .reverse();

    for (const migration of migrationsToRollback) {
        console.log(`ðŸ”„ Rolling back migration ${migration.version}: ${migration.name}`);

        try {
            await migration.down();
            setSchemaVersion(migration.version - 1);
            console.log(`âœ… Rollback ${migration.version} complete`);
        } catch (error) {
            console.error(`âŒ Rollback ${migration.version} failed:`, error);
            throw new Error(`Rollback ${migration.version} failed: ${error}`);
        }
    }

    console.log(`âœ… Rolled back to version ${targetVersion}`);
}

// ============================================================================
// Initial Data Hydration
// ============================================================================

/**
 * Perform full sync on first app load
 */
export async function initialDataHydration(
    onProgress?: (progress: number, message: string) => void
): Promise<void> {
    const isFirstLoad = getCurrentSchemaVersion() === 0;

    if (!isFirstLoad) {
        console.log('â„¹ï¸ Not first load, skipping initial hydration');
        return;
    }

    console.log('ðŸŒŠ Starting initial data hydration...');

    try {
        onProgress?.(10, 'Initializing database...');

        // Run migrations first
        await runMigrations();

        onProgress?.(30, 'Fetching user data...');

        // Trigger full sync
        await syncEngine.triggerSync();

        onProgress?.(90, 'Finalizing...');

        // Mark as complete
        localStorage.setItem('initial_hydration_complete', 'true');

        onProgress?.(100, 'Complete!');

        console.log('âœ… Initial hydration complete');
    } catch (error) {
        console.error('âŒ Initial hydration failed:', error);
        throw error;
    }
}

/**
 * Check if initial hydration is complete
 */
export function isInitialHydrationComplete(): boolean {
    return localStorage.getItem('initial_hydration_complete') === 'true';
}

/**
 * Reset hydration status (for testing)
 */
export function resetHydrationStatus(): void {
    localStorage.removeItem('initial_hydration_complete');
    setSchemaVersion(0);
}

// ============================================================================
// Cache Optimization for Large Schools
// ============================================================================

/**
 * Optimize initial sync for large schools by caching only recent data
 */
export async function optimizedHydrationForLargeSchool(
    schoolId: string,
    daysToCache: number = 30
): Promise<void> {
    console.log(`ðŸ« Optimized hydration for large school: ${schoolId} (last ${daysToCache} days)`);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToCache);

    // This would be implemented with specific backend queries
    // For now, just trigger normal sync
    await syncEngine.triggerSync();

    console.log('âœ… Optimized hydration complete');
}

// ============================================================================
// Feature Flags
// ============================================================================

interface FeatureFlags {
    offlineMode: boolean;
    backgroundSync: boolean;
    realtimeUpdates: boolean;
}

const DEFAULT_FLAGS: FeatureFlags = {
    offlineMode: true,
    backgroundSync: true,
    realtimeUpdates: true
};

/**
 * Get feature flags
 */
export function getFeatureFlags(): FeatureFlags {
    const stored = localStorage.getItem('feature_flags');
    return stored ? JSON.parse(stored) : DEFAULT_FLAGS;
}

/**
 * Set feature flags
 */
export function setFeatureFlags(flags: Partial<FeatureFlags>): void {
    const current = getFeatureFlags();
    const updated = { ...current, ...flags };
    localStorage.setItem('feature_flags', JSON.stringify(updated));
    console.log('ðŸš© Feature flags updated:', updated);
}

/**
 * Disable offline mode (emergency killswitch)
 */
export function disableOfflineMode(): void {
    setFeatureFlags({ offlineMode: false });
    console.warn('âš ï¸ Offline mode DISABLED');
}

/**
 * Enable offline mode
 */
export function enableOfflineMode(): void {
    setFeatureFlags({ offlineMode: true });
    console.log('âœ… Offline mode ENABLED');
}

/**
 * Check if offline mode is enabled
 */
export function isOfflineModeEnabled(): boolean {
    return getFeatureFlags().offlineMode;
}

// ============================================================================
// Rollback & Recovery
// ============================================================================

/**
 * Complete rollback - clear all offline data and force re-hydration
 */
export async function completeRollback(): Promise<void> {
    console.warn('âš ï¸ Performing complete rollback...');

    try {
        // Clear all offline data
        await offlineDB.clearAll();

        // Reset schema version
        setSchemaVersion(0);

        // Reset hydration status
        resetHydrationStatus();

        // Reset feature flags
        setFeatureFlags(DEFAULT_FLAGS);

        console.log('âœ… Complete rollback successful. Please refresh the app.');
    } catch (error) {
        console.error('âŒ Rollback failed:', error);
        throw error;
    }
}

/**
 * Force re-hydration
 */
export async function forceRehydration(
    onProgress?: (progress: number, message: string) => void
): Promise<void> {
    console.log('ðŸ”„ Forcing re-hydration...');

    try {
        // Clear existing data
        await offlineDB.clearAll();

        // Reset hydration status
        resetHydrationStatus();

        // Perform initial hydration
        await initialDataHydration(onProgress);

        console.log('âœ… Re-hydration complete');
    } catch (error) {
        console.error('âŒ Re-hydration failed:', error);
        throw error;
    }
}

// ============================================================================
// Monitoring & Alerting
// ============================================================================

interface MigrationEvent {
    type: 'success' | 'error' | 'warning';
    message: string;
    timestamp: number;
    metadata?: any;
}

const migrationEvents: MigrationEvent[] = [];

/**
 * Log migration event
 */
export function logMigrationEvent(
    type: MigrationEvent['type'],
    message: string,
    metadata?: any
): void {
    const event: MigrationEvent = {
        type,
        message,
        timestamp: Date.now(),
        metadata
    };

    migrationEvents.push(event);

    // Keep only last 100 events
    if (migrationEvents.length > 100) {
        migrationEvents.shift();
    }

    console.log(`[Migration ${type.toUpperCase()}]`, message, metadata);
}

/**
 * Get migration logs
 */
export function getMigrationLogs(): MigrationEvent[] {
    return [...migrationEvents];
}

/**
 * Clear migration logs
 */
export function clearMigrationLogs(): void {
    migrationEvents.length = 0;
}
