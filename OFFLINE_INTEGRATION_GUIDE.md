# Offline-First Integration Guide

This guide shows you how to integrate the offline-first synchronization system into your existing components.

---

## 📋 Table of Contents

1. [Simple Query Replacement](#1-simple-query-replacement)
2. [Create/Update/Delete Operations](#2-createupdatedelete-with-optimistic-updates)
3. [Sync Status Monitoring](#3-sync-status-monitoring)
4. [Protecting Online-Only Features](#4-protecting-online-only-features)
5. [App-Level Integration](#5-app-level-integration)
6. [Multiple Cache Strategies](#6-advanced-multiple-cache-strategies)
7. [Checking Offline Availability](#7-checking-offline-availability)
8. [Direct Data Service Usage](#8-direct-data-service-usage-advanced)
9. [Network Quality Awareness](#9-network-quality-awareness)
10. [Event Listeners](#10-event-listeners-for-advanced-ui)

---

## 1. Simple Query Replacement

### Before (standard React Query)
```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

function StudentsList() {
    const { data, isLoading } = useQuery(['students'], async () => {
        const { data } = await supabase.from('students').select('*');
        return data;
    });

    return <div>{/* ... */}</div>;
}
```

### After (offline-first)
```typescript
import { useOfflineQuery } from './hooks/useOfflineQuery';

function StudentsList() {
    const { data, isLoading } = useOfflineQuery<Student>('students', {
        strategy: 'cache-first', // Works offline!
        where: { class_id: classId },
        orderBy: 'name:asc'
    });

    return <div>{/* data is now cached and available offline */}</div>;
}
```

**Key Changes:**
- ✅ Replace `useQuery` with `useOfflineQuery`
- ✅ Specify table name as first argument
- ✅ Choose caching strategy (`cache-first`, `network-first`, etc.)
- ✅ Works completely offline with local cache

---

## 2. Create/Update/Delete with Optimistic Updates

```typescript
import { 
    useOfflineCreate, 
    useOfflineUpdate, 
    useOfflineDelete 
} from './hooks/useOfflineQuery';
import { toast } from 'react-hot-toast';

function StudentForm() {
    // Create mutation with optimistic update
    const createMutation = useOfflineCreate<Student>('students', {
        optimistic: true, // Default - updates UI immediately
        onSuccess: (data) => {
            toast.success('Student added!');
        }
    });

    // Update mutation
    const updateMutation = useOfflineUpdate<Student>('students', {
        optimistic: true,
        onSuccess: () => {
            toast.success('Student updated!');
        }
    });

    // Delete mutation
    const deleteMutation = useOfflineDelete('students', {
        optimistic: true,
        onSuccess: () => {
            toast.success('Student deleted!');
        }
    });

    const handleCreate = async () => {
        await createMutation.mutateAsync({
            id: crypto.randomUUID(),
            name: 'John Doe',
            class_id: 'class-123',
            email: 'john@example.com'
        });
        // ✅ Works offline! Syncs automatically when online.
    };

    const handleUpdate = async (studentId: string) => {
        await updateMutation.mutateAsync({
            id: studentId,
            updates: { name: 'Jane Doe' }
        });
        // ✅ Works offline! Syncs automatically when online.
    };

    const handleDelete = async (studentId: string) => {
        await deleteMutation.mutateAsync(studentId);
        // ✅ Works offline! Syncs automatically when online.
    };

    return (
        <form>
            {/* Your form fields */}
            <button onClick={handleCreate}>Create Student</button>
        </form>
    );
}
```

**Features:**
- ✅ Instant UI updates (optimistic)
- ✅ Automatic rollback on errors
- ✅ Queued for sync when offline
- ✅ Auto-sync when reconnected

---

## 3. Sync Status Monitoring

### Option 1: Using Hooks
```typescript
import { useSyncStatus } from './hooks/useOfflineQuery';

function Dashboard() {
    const { 
        isSyncing, 
        pendingOperations, 
        lastSync,
        status,
        triggerSync 
    } = useSyncStatus();

    return (
        <div>
            {isSyncing && <div>Syncing...</div>}
            
            {pendingOperations > 0 && (
                <button onClick={triggerSync}>
                    Sync {pendingOperations} Changes
                </button>
            )}
            
            {lastSync > 0 && (
                <div>Last synced: {formatTime(lastSync)}</div>
            )}
        </div>
    );
}
```

### Option 2: Pre-built Components
```typescript
import { 
    SyncStatusBadge, 
    SyncStatusIndicator,
    FloatingSyncButton 
} from './components/shared/SyncStatusIndicator';

function DashboardHeader() {
    return (
        <header>
            <h1>Dashboard</h1>
            
            {/* Compact badge for toolbar */}
            <SyncStatusBadge />
        </header>
    );
}

function DashboardPage() {
    return (
        <div>
            {/* Full status indicator */}
            <SyncStatusIndicator />
            
            {/* Floating action button (shows when pending changes exist) */}
            <FloatingSyncButton />
            
            {/* Your content */}
        </div>
    );
}
```

---

## 4. Protecting Online-Only Features

### Option 1: Guard Component
```typescript
import { OfflineGuard } from './components/shared/OfflineGuard';

function PaymentPage() {
    return (
        <OfflineGuard message="Payment processing requires internet connection">
            <PaymentForm />
        </OfflineGuard>
    );
    // ✅ Shows message when offline, content when online
}
```

### Option 2: Offline-Aware Button
```typescript
import { OfflineAwareButton } from './components/shared/OfflineGuard';

function GradeSubmission() {
    return (
        <div>
            <GradeForm />
            
            <OfflineAwareButton
                requireOnline={true}
                offlineMessage="Cannot submit grade without internet"
                onClick={handleSubmit}
                className="btn btn-primary"
            >
                Submit Grade
            </OfflineAwareButton>
            {/* ✅ Button is automatically disabled when offline */}
        </div>
    );
}
```

### Option 3: Inline Message
```typescript
import { InlineOfflineMessage } from './components/shared/OfflineGuard';
import { useOnlineStatus } from './components/shared/OfflineIndicator';

function LiveChat() {
    const isOnline = useOnlineStatus();

    if (!isOnline) {
        return <InlineOfflineMessage />;
    }

    return <ChatInterface />;
}
```

---

## 5. App-Level Integration

### App.tsx Setup
```typescript
import { QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { queryClient, idbPersister } from './lib/react-query';
import { OfflineIndicator } from './components/shared/OfflineIndicator';
import { SyncStatusIndicator } from './components/shared/SyncStatusIndicator';
import { OfflineGuard } from './components/shared/OfflineGuard';

function App() {
    return (
        <PersistQueryClientProvider
            client={queryClient}
            persistOptions={{ persister: idbPersister }}
        >
            {/* Global offline/online banner */}
            <OfflineIndicator />

            {/* Global sync status */}
            <SyncStatusIndicator />

            <BrowserRouter>
                <Routes>
                    {/* Login page - MUST be online */}
                    <Route 
                        path="/login" 
                        element={
                            <OfflineGuard message="Login requires internet connection">
                                <Login />
                            </OfflineGuard>
                        } 
                    />

                    {/* Other routes work offline */}
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/students" element={<Students />} />
                    <Route path="/teachers" element={<Teachers />} />
                </Routes>
            </BrowserRouter>
        </PersistQueryClientProvider>
    );
}

export default App;
```

**Key Points:**
- ✅ Use `PersistQueryClientProvider` for query cache persistence
- ✅ Add `<OfflineIndicator />` at top level
- ✅ Add `<SyncStatusIndicator />` for sync feedback
- ✅ Wrap login page with `<OfflineGuard>`

---

## 6. Advanced: Multiple Cache Strategies

```typescript
import { useOfflineQuery } from './hooks/useOfflineQuery';

function GradesPage() {
    // NETWORK-FIRST: Real-time data - always fetch fresh when online
    const { data: recentGrades } = useOfflineQuery<Grade>('grades', {
        strategy: 'network-first',
        where: { created_at: { gte: lastWeek } }
    });

    // CACHE-FIRST: Static data - prefer cache for speed
    const { data: students } = useOfflineQuery<Student>('students', {
        strategy: 'cache-first'
    });

    // CACHE-AND-NETWORK: Best of both - show cache immediately, update from network
    const { data: classes } = useOfflineQuery<Class>('classes', {
        strategy: 'cache-and-network'
    });

    // NETWORK-ONLY: Always fresh, fails when offline
    const { data: liveData } = useOfflineQuery<LiveData>('live_data', {
        strategy: 'network-only'
    });

    return <GradesTable grades={recentGrades} students={students} classes={classes} />;
}
```

**Strategy Guide:**
- **`cache-first`**: Static/semi-static data (users, schools, classes)
- **`network-first`**: Real-time data (grades, attendance, messages)
- **`cache-and-network`**: Balance of both (default for most tables)
- **`network-only`**: Always fresh, no offline support

---

## 7. Checking Offline Availability

```typescript
import { 
    useOfflineAvailability, 
    useRecordSyncStatus 
} from './hooks/useOfflineQuery';

function StudentDetail({ studentId }: { studentId: string }) {
    // Check if students table has cached data
    const { isAvailable, isLoading } = useOfflineAvailability('students');

    // Check sync status of specific student
    const syncStatus = useRecordSyncStatus('students', studentId);

    return (
        <div>
            {!isAvailable && (
                <div className="alert alert-warning">
                    Student data not available offline. Connect to internet to view.
                </div>
            )}

            {syncStatus === 'pending' && (
                <span className="badge badge-warning">Pending Sync</span>
            )}

            {syncStatus === 'error' && (
                <span className="badge badge-error">Sync Failed</span>
            )}

            {syncStatus === 'synced' && (
                <span className="badge badge-success">Synced</span>
            )}

            {/* Student details */}
        </div>
    );
}
```

---

## 8. Direct Data Service Usage (Advanced)

For non-React contexts or advanced use cases:

```typescript
import { dataService } from './lib/dataService';
import { syncEngine } from './lib/syncEngine';

// Export data (works offline)
async function exportStudents() {
    const students = await dataService.query<Student>('students', {
        strategy: 'cache-first'
    });

    const csv = convertToCSV(students);
    downloadFile(csv, 'students.csv');
}

// Manual sync trigger
async function syncAllData() {
    await syncEngine.triggerSync();
    console.log('Sync complete!');
}

// Clear all caches
async function clearAllCaches() {
    await dataService.clearAllCaches();
    console.log('Caches cleared!');
}

// Check if specific table is cached
async function isStudentDataCached() {
    const available = await dataService.isAvailableOffline('students');
    return available;
}
```

---

## 9. Network Quality Awareness

```typescript
import { useNetworkStatus } from './lib/networkManager';
import { ConnectionQuality } from './lib/networkManager';

function VideoUpload() {
    const { quality, isOnline, isGoodForSync } = useNetworkStatus();

    // Warn user if connection is poor
    if (quality === ConnectionQuality.POOR || quality === ConnectionQuality.FAIR) {
        return (
            <div className="alert alert-warning">
                <strong>Slow Connection Detected</strong>
                <p>Uploading large files may take a while.</p>
                {isGoodForSync 
                    ? <p>Sync is still operational.</p> 
                    : <p>Sync is paused due to poor connection.</p>
                }
            </div>
        );
    }

    return <UploadForm />;
}

// Connection quality levels:
// - EXCELLENT: < 100ms ping
// - GOOD: 100-300ms ping
// - FAIR: 300-1000ms ping
// - POOR: > 1000ms ping
// - OFFLINE: No connection
```

---

## 10. Event Listeners for Advanced UI

```typescript
import { useEffect } from 'react';
import { syncEngine } from './lib/syncEngine';
import { networkManager } from './lib/networkManager';

function AdvancedSyncMonitor() {
    useEffect(() => {
        // Sync events
        const handleSyncStart = () => {
            console.log('✅ Sync started');
        };

        const handleSyncComplete = ({ synced, failed }: { synced: number; failed: number }) => {
            console.log(`✅ Sync complete: ${synced} synced, ${failed} failed`);
        };

        const handleSyncError = ({ error, operation }: any) => {
            console.error('❌ Sync error:', error);
        };

        const handleConflict = ({ table, localData, serverData }: any) => {
            console.warn('⚠️ Conflict detected in', table);
        };

        // Network events
        const handleOnline = () => {
            console.log('🌐 Back online!');
        };

        const handleOffline = () => {
            console.log('📴 Went offline');
        };

        // Register listeners
        syncEngine.on('sync-start', handleSyncStart);
        syncEngine.on('sync-complete', handleSyncComplete);
        syncEngine.on('sync-error', handleSyncError);
        syncEngine.on('conflict-detected', handleConflict);
        networkManager.on('online', handleOnline);
        networkManager.on('offline', handleOffline);

        // Cleanup
        return () => {
            syncEngine.off('sync-start', handleSyncStart);
            syncEngine.off('sync-complete', handleSyncComplete);
            syncEngine.off('sync-error', handleSyncError);
            syncEngine.off('conflict-detected', handleConflict);
            networkManager.off('online', handleOnline);
            networkManager.off('offline', handleOffline);
        };
    }, []);

    return <div>Monitoring sync events...</div>;
}
```

**Available Events:**

**Sync Engine:**
- `sync-start` - Sync operation started
- `sync-complete` - Sync completed (with stats)
- `sync-error` - Sync error occurred
- `sync-progress` - Progress update during sync
- `state-change` - Sync state changed
- `conflict-detected` - Data conflict detected

**Network Manager:**
- `online` - Connection established
- `offline` - Connection lost
- `state-change` - Network state changed

---

## 🎯 Quick Migration Checklist

### Component Updates
- [ ] Replace `useQuery` with `useOfflineQuery`
- [ ] Replace `useMutation` with `useOfflineCreate/Update/Delete`
- [ ] Add sync status indicators to dashboards
- [ ] Wrap login page with `<OfflineGuard>`

### App Setup
- [ ] Use `PersistQueryClientProvider` in App.tsx
- [ ] Add `<OfflineIndicator />` component
- [ ] Add `<SyncStatusIndicator />` or `<FloatingSyncButton />`
- [ ] Configure cache strategies for tables

### Testing
- [ ] Test offline functionality (disconnect internet)
- [ ] Verify optimistic updates work
- [ ] Check sync on reconnection
- [ ] Test conflict resolution (edit same record on two devices)

---

## 📚 Additional Resources

- **Full Walkthrough**: See [walkthrough.md](file:///C:/Users/USER/.gemini/antigravity/brain/0f86f643-26cb-4bbd-910d-d534f274be0e/walkthrough.md)
- **Implementation Plan**: See [implementation_plan.md](file:///C:/Users/USER/.gemini/antigravity/brain/0f86f643-26cb-4bbd-910d-d534f274be0e/implementation_plan.md)
- **API Reference**: Check individual file JSDoc comments

---

## ❓ Common Questions

**Q: What happens if I edit the same record on two devices while offline?**
A: Last-Write-Wins conflict resolution - the record with the most recent server timestamp wins. Conflicts are logged via events.

**Q: How long can I stay offline?**
A: Indefinitely for data access. Session expires after 24 hours offline (requires re-login).

**Q: What if sync fails?**
A: Automatic retry with exponential backoff (max 3 attempts). Failed operations remain queued.

**Q: Can I sync manually?**
A: Yes! Use `triggerSync()` from `useSyncStatus()` hook or `<FloatingSyncButton />` component.

**Q: How much data is cached?**
A: Depends on user's device. System monitors IndexedDB quota and auto-cleans old data.

---

🎉 **You're all set!** Your app now has robust offline-first capabilities!
