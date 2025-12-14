# Profile Supabase Integration Guide

## Overview
The profile system has been updated to use **Supabase as the primary data source** with localStorage as a cache layer. This ensures profile changes (especially avatar updates) persist globally across all dashboard components.

## Architecture

### Data Flow
```
App Mount
  ↓
ProfileProvider initializes
  ↓
useEffect: Get logged-in user from Supabase Auth
  ↓
Query `users` table by email address
  ↓
Load profile data (id, name, email, avatar_url)
  ↓
Set to ProfileContext state + cache to localStorage
  ↓
All dashboards read avatar from context
  ↓
When user edits profile and clicks Save
  ↓
updateProfile() saves to Supabase `users` table (by id or email)
  ↓
Updates local state + localStorage cache
  ↓
Header re-renders with new avatar across all dashboards
```

## File Changes

### 1. **context/ProfileContext.tsx** (Enhanced)
**Key Features:**
- On app mount: Calls `supabase.auth.getUser()` to get logged-in user email
- Fetches profile from `users` table by email using `.single()` query
- If DB unavailable, falls back to localStorage
- `updateProfile()` method now saves to Supabase FIRST, then caches locally
- `refreshProfile()` fetches latest from DB and syncs to localStorage
- `loadProfileFromDatabase()` method allows manual profile load by userId or email
- `isLoading` state indicates async operations

**Interface:**
```typescript
interface UserProfile {
  id?: number | string;
  name: string;
  email: string;
  phone: string;
  avatarUrl: string;
  role?: 'Student' | 'Teacher' | 'Parent' | 'Admin';
  supabaseId?: string;
}
```

### 2. **components/admin/EditProfileScreen.tsx**
**Changes:**
- Imports `useProfile()` hook
- On component mount: loads initial profile from context via `useEffect`
- Form fields tied to local state (name, email, phone, avatar)
- On save: calls `updateProfile()` with all changes
- Shows success/error messages with auto-dismiss (3 seconds)
- Save button disabled during async save

### 3. **components/dashboards/AdminDashboard.tsx**
**Changes:**
- Imports `useProfile()` hook at line 8
- Destructures `const { profile } = useProfile()` at line 90
- Passes `profile.avatarUrl` to Header component (line 213)
- Avatar in header now updates globally when profile changes

### 4. **components/dashboards/TeacherDashboard.tsx**
**Changes:**
- Added `import { useProfile } from '../../context/ProfileContext'`
- Destructures profile hook in component
- Passes `profile.avatarUrl` to Header

### 5. **components/dashboards/StudentDashboard.tsx**
**Changes:**
- Added `import { useProfile } from '../../context/ProfileContext'`
- Destructures profile hook in component
- Changed Header avatarUrl from `student.avatarUrl` to `profile.avatarUrl`
- Student state still used for other data (grades, assignments, etc.)

### 6. **components/dashboards/ParentDashboard.tsx**
**Changes:**
- Added `import { useProfile } from '../../context/ProfileContext'`
- Destructures profile hook in component
- Changed Header avatarUrl from hardcoded string to `profile.avatarUrl`

### 7. **App.tsx**
**Current State:**
- Already wraps entire app with `<ProfileProvider>`
- ProfileProvider initialization happens on first app mount

## Database Schema

The `users` table (from `complete_supabase_schema.sql`):
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  avatar_url TEXT,                    -- Profile picture URL
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## How It Works Step-by-Step

### 1. **App Initialization**
```
User opens app
  ↓
ProfileProvider's useEffect runs
  ↓
Gets logged-in user: supabase.auth.getUser()
  ↓
Finds user in `users` table by email
  ↓
Sets profile state: {id, name, email, avatarUrl, ...}
  ↓
Saves to localStorage for offline access
```

### 2. **Profile Update (Edit Profile Screen)**
```
User uploads new avatar
  ↓
Form state updates with new image (base64 or URL)
  ↓
User clicks "Save"
  ↓
updateProfile() is called with {avatarUrl: newURL, ...}
  ↓
Method attempts Supabase update:
  - If user has ID: UPDATE users SET avatar_url = ? WHERE id = ?
  - Else if has email: UPDATE users SET avatar_url = ? WHERE email = ?
  ↓
On success:
  - Update local state
  - Cache to localStorage
  - Show "Profile saved successfully!" message
  ↓
Header re-renders automatically
  ↓
All dashboards see new avatar
```

### 3. **Profile Refresh (Manual)**
```
Call: refreshProfile()
  ↓
Fetches latest from `users` table
  ↓
Updates state
  ↓
Syncs to localStorage
```

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Supabase unavailable on app load | Falls back to localStorage cached profile |
| Update fails due to network | Error logged to console, message shown to user, still tries to save locally |
| User not in `users` table | Falls back to localStorage or uses default profile |
| Invalid profile data | Gracefully parses available fields, uses defaults for missing ones |

## Testing Checklist

- [ ] Edit profile → change avatar → save
  - Check: Supabase `users` table has new avatar_url
  - Check: Header avatar updates immediately
  - Check: Navigate to different screens → avatar persists
  - Check: Refresh page → avatar still shows (from DB)

- [ ] Logout and login again
  - Check: ProfileContext initializes avatar from Supabase
  - Check: No hardcoded avatar shown

- [ ] Offline scenario
  - Check: Edit profile → network disconnect → save
  - Check: localStorage is updated (even if DB fails)
  - Check: Message shows "Profile saved" (optimistic)

- [ ] Multi-user scenario
  - Check: Student saves avatar
  - Check: Parent logs in → sees their own avatar (not student's)
  - Check: Admin logs in → sees their own avatar

## Console Logging

ProfileContext logs to browser console for debugging:

```javascript
console.log('Profile saved to Supabase successfully');
console.warn('Could not load profile from database: ...');
console.error('Error updating profile: ...');
console.warn('Error initializing profile from Supabase: ...');
```

## Migration from Old System

If you had localStorage-only profile before:
1. Old profile data remains in localStorage
2. On next app load, ProfileContext checks Supabase first
3. If user found in DB, DB data takes priority
4. Old localStorage data is overwritten with DB values
5. If not found in DB, falls back to old localStorage

## Future Enhancements

- [ ] Real-time profile sync via Supabase Realtime subscriptions
- [ ] Multi-device profile sync (detect changes on another device)
- [ ] Profile validation before saving
- [ ] Image optimization/compression on upload
- [ ] Profile history/audit trail
- [ ] Batch updates for multiple profile fields

## Troubleshooting

**Avatar not updating after save:**
1. Check browser console for errors
2. Verify `users` table has the row (check by email)
3. Check `avatar_url` column has the new value
4. Check RLS policies allow the update (should be disabled for dev)
5. Manually call `refreshProfile()` to sync from DB

**Profile not loading on app start:**
1. Check if user is authenticated (`supabase.auth.getUser()`)
2. Verify user email exists in `users` table
3. Check localStorage fallback profile (browser DevTools → Application → LocalStorage → userProfile)

**Profile Context not available:**
1. Ensure component is wrapped by `<ProfileProvider>` (should be in App.tsx)
2. Use `useProfile()` hook only inside ProfileProvider
3. Check for typos in hook name

