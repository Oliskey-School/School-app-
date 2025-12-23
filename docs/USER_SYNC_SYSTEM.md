# 📘 User Synchronization System - Documentation

## Overview

This document explains the complete user synchronization system implemented for the School Management System. The system ensures that user accounts remain perfectly synchronized across three key areas:

1. **Supabase Authentication** (`auth.users`)
2. **Public Users Table** (`public.users`)
3. **Admin Dashboard** (displays from `public.users` and `auth_accounts`)

---

## 🎯 Problem Statement

### Initial Issues
- **Supabase Auth had ~20 users**
- **`public.users` table had ~7 users**
- **`auth_accounts` table had ~6 users**
- **Dashboard showed inconsistent counts**

### Root Causes
1. No automatic synchronization between Supabase Auth and public tables
2. Manual user creation in different tables at different times
3. Deletions not cascading properly
4. Missing triggers to maintain consistency

---

## ✅ Solution Architecture

### Core Components

#### 1. **Database Triggers** (`AUTO_SYNC_COMPLETE.sql`)

**Trigger 1: `on_auth_user_created`**
- **Fires**: When a user is created in `auth.users` (via app or Supabase Console)
- **Action**: Automatically creates/updates records in:
  - `public.users` - Basic profile information
  - `public.auth_accounts` - Authentication details
- **Conflict Handling**: Uses `ON CONFLICT (email) DO UPDATE` to prevent duplicates

**Trigger 2: `on_auth_user_deleted`**
- **Fires**: When a user is deleted from `auth.users`
- **Action**: Automatically deletes from:
  - `public.users` - Cascades to role tables (students/teachers/parents)
  - `public.auth_accounts` - Removes auth record

#### 2. **RPC Function** (`delete_user_by_email`)

- **Purpose**: Allows frontend to delete users by email
- **Scope**: Deletes from all three locations:
  1. `public.users` (cascades to role tables)
  2. `public.auth_accounts`
  3. `auth.users` (triggers the delete cascade)
- **Usage**: Called from `UserAccountsScreen.tsx`

#### 3. **Profile Creation** (`CREATE_MISSING_PROFILES.sql`)

- **Purpose**: Backfills missing student/teacher/parent profiles
- **Scope**: Creates records in:
  - `public.students` - For users with role='Student'
  - `public.teachers` - For users with role='Teacher' or 'Admin'
  - `public.parents` - For users with role='Parent'
- **Default Values**:
  - Students: grade=10, section='A'
  - All: status='Active', default avatars

---

## 🔄 How It Works

### User Creation Flow

```
USER CREATES ACCOUNT VIA APP
          ↓
AddStudentScreen.tsx / AddTeacherScreen.tsx / AddParentScreen.tsx
          ↓
1. Insert into public.users ✅
          ↓
2. Insert into role table (students/teachers/parents) ✅
          ↓
3. lib/auth.ts → createUserAccount()
          ↓
4. supabase.auth.signUp() → Creates auth.users entry ✅
          ↓
5. TRIGGER: on_auth_user_created fires
          ↓
6. Auto-updates public.users and public.auth_accounts ✅
          ↓
RESULT: All 3 locations synchronized! ✅
```

### User Deletion Flow

```
USER CLICKS DELETE IN DASHBOARD
          ↓
UserAccountsScreen.tsx → handleDeleteUser()
          ↓
supabase.rpc('delete_user_by_email', { target_email })
          ↓
RPC FUNCTION EXECUTES:
    1. DELETE FROM public.users (cascades to role tables) ✅
    2. DELETE FROM public.auth_accounts ✅
    3. DELETE FROM auth.users ✅
          ↓
TRIGGER: on_auth_user_deleted fires (cleanup safety net)
          ↓
RESULT: User completely removed from system ✅
```

---

## 🛠️ Implementation Steps

### 1. Initial Setup (One-Time)

**Run in Supabase SQL Editor:**

```sql
-- Step 1: Install auto-sync triggers
\i sql/AUTO_SYNC_COMPLETE.sql

-- Step 2: Create missing profiles for existing users
\i sql/CREATE_MISSING_PROFILES.sql

-- Step 3: Fix student grade assignments
\i sql/COMPLETE_GRADE_FIX.sql
```

### 2. Verification

**Check that triggers are installed:**
```sql
\i sql/VERIFY_TRIGGERS.sql
```

**Check user counts:**
```sql
\i sql/SIMPLE_DIAGNOSTIC.sql
```

### 3. Monitoring

**Dashboard Locations:**
- **Total Users**: `DashboardOverview.tsx` → Queries `public.users`
- **User Accounts Screen**: `UserAccountsScreen.tsx` → Queries `auth_accounts`
- **Manage Students**: `StudentListScreen.tsx` → Queries `students` table
- **Student Reports**: `TeacherReportsScreen.tsx` → Queries `students` filtered by grade/section

---

## 📊 Database Schema

### Key Tables

**`auth.users`** (Supabase Auth - System Table)
- Managed by Supabase
- Contains authentication credentials
- Our triggers watch this table

**`public.users`** (Application Profile Table)
```sql
id SERIAL PRIMARY KEY
email VARCHAR(255) UNIQUE NOT NULL
name VARCHAR(255) NOT NULL
role VARCHAR(50) NOT NULL  -- 'Student', 'Teacher', 'Parent', 'Admin'
avatar_url TEXT
created_at TIMESTAMP
```

**`public.auth_accounts`** (Internal Auth Mapping)
```sql
id SERIAL PRIMARY KEY
username VARCHAR(100) UNIQUE NOT NULL
email VARCHAR(255) UNIQUE NOT NULL
user_type VARCHAR(50) NOT NULL
user_id INTEGER REFERENCES users(id)
is_verified BOOLEAN DEFAULT FALSE
created_at TIMESTAMP
```

**`public.students`** (Student Profiles)
```sql
id SERIAL PRIMARY KEY
user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
name VARCHAR(255) NOT NULL
grade INTEGER NOT NULL
section VARCHAR(10) NOT NULL
attendance_status VARCHAR(20)
created_at TIMESTAMP
```

*(Similar structure for `teachers` and `parents` tables)*

---

## 🐛 Common Issues & Fixes

### Issue 1: Students Don't Appear in Reports

**Symptom**: Students show in "Manage Students" but not in "Student Reports"

**Cause**: Students have invalid or missing `grade`/`section` values

**Fix**:
```sql
\i sql/COMPLETE_GRADE_FIX.sql
```

**Explanation**: The `TeacherReportsScreen` filters students by `grade` and `section`. If these are NULL, 0, or empty, students won't match the query.

---

### Issue 2: User Counts Don't Match

**Symptom**: Dashboard shows different counts than User Accounts screen

**Diagnosis**:
```sql
\i sql/CHECK_ACTUAL_STATE.sql
```

**Fix**:
```sql
-- Re-install sync triggers
\i sql/AUTO_SYNC_COMPLETE.sql

-- Clean up orphaned records
\i sql/FIX_AUTH_ACCOUNTS.sql
```

---

### Issue 3: Missing Student/Teacher/Parent Profiles

**Symptom**: User exists in `public.users` but not in role-specific table

**Fix**:
```sql
\i sql/CREATE_MISSING_PROFILES.sql
```

---

## 🔐 Security Considerations

### Trigger Security

- **`SECURITY DEFINER`**: Triggers run with elevated privileges to access `auth.users`
- **`search_path = public`**: Prevents schema injection attacks
- **Email validation**: Triggers verify email format and uniqueness

### RPC Function Security

- **Row-level security**: RPC respects RLS policies
- **Admin-only access**: Only authenticated admins can delete users
- **Cascading deletes**: Ensures complete removal without orphaned records

---

## 📈 Performance Considerations

### Trigger Optimization

- **Minimal operations**: Triggers only perform necessary INSERT/UPDATE/DELETE
- **Conflict handling**: `ON CONFLICT` prevents duplicate key errors
- **Cascade deletes**: Database handles cascading automatically (fast)

### Query Optimization

- **Indexed columns**: `email`, `user_id`, `grade`, `section` are indexed
- **Selective queries**: Frontend queries only necessary columns
- **Real-time subscriptions**: Use Supabase Realtime for live updates

---

## 🎓 Best Practices

### When Adding Users via App
1. ✅ **Always use the app's Add Student/Teacher/Parent screens**
2. ✅ **Triggers will handle synchronization automatically**
3. ❌ **Don't manually insert into `auth.users` or `public.users` separately**

### When Deleting Users
1. ✅ **Use the "Delete" button in User Accounts screen**
2. ✅ **RPC function handles complete removal**
3. ❌ **Don't manually delete from individual tables**

### When Checking System Health
1. ✅ **Run diagnostic scripts regularly**
2. ✅ **Monitor user counts across all screens**
3. ✅ **Verify triggers are installed after schema changes**

---

## 📝 Maintenance Scripts

### Regular Maintenance
- **Weekly**: Run `SIMPLE_DIAGNOSTIC.sql` to check system health
- **After schema changes**: Re-run `AUTO_SYNC_COMPLETE.sql`
- **After bulk imports**: Run `CREATE_MISSING_PROFILES.sql`

### Emergency Fixes
- **User sync issues**: `AUTO_SYNC_COMPLETE.sql`
- **Grade assignment issues**: `COMPLETE_GRADE_FIX.sql`
- **Orphaned records**: `FIX_AUTH_ACCOUNTS.sql`

---

## 🔗 Related Files

### SQL Scripts
- `sql/AUTO_SYNC_COMPLETE.sql` - Main synchronization system
- `sql/CREATE_MISSING_PROFILES.sql` - Profile backfill
- `sql/COMPLETE_GRADE_FIX.sql` - Grade assignment fix
- `sql/SIMPLE_DIAGNOSTIC.sql` - Quick health check

### Documentation
- `sql/AUTO_SYNC_README.md` - Detailed auto-sync documentation
- `sql/GRADE_ISSUE_EXPLAINED.md` - Grade assignment issue explained
- `sql/README.md` - Complete SQL scripts index

### Frontend Components
- `components/admin/UserAccountsScreen.tsx` - User management UI
- `components/admin/DashboardOverview.tsx` - Dashboard stats
- `components/admin/AddStudentScreen.tsx` - Student creation
- `components/admin/AddTeacherScreen.tsx` - Teacher creation
- `components/admin/AddParentScreen.tsx` - Parent creation
- `lib/auth.ts` - Authentication utilities

---

## 🎯 Success Metrics

After implementing this system:
- ✅ **100% synchronization** across all three user stores
- ✅ **Automatic user creation** with no manual intervention
- ✅ **Complete user deletion** with no orphaned records
- ✅ **Consistent counts** across all dashboard screens
- ✅ **Real-time updates** via Supabase Realtime subscriptions

---

## 🆘 Getting Help

If you encounter issues:

1. **Check this documentation first**
2. **Run diagnostic scripts** to identify the problem
3. **Review error messages** in Supabase logs
4. **Check trigger installation** with `VERIFY_TRIGGERS.sql`
5. **Consult the troubleshooting section above**

---

**Last Updated**: December 23, 2024  
**System Version**: 2.0  
**Status**: ✅ Fully Operational
