# Fix Dashboard Counts - Quick Guide

## 🎯 Problem
You have 7 users in the database, but the dashboard shows only 1 student, 1 teacher, and 1 parent.

## ✅ Solution
The 7 users exist in the `users` table, but they need to be added to their specific role tables (`students`, `teachers`, `parents`).

## 📋 Steps to Fix

### Step 1: Run the Backfill Script

1. **Open Supabase Dashboard** → **SQL Editor**
2. **Copy** the contents of `sql/backfill_role_tables.sql`
3. **Paste** into SQL Editor
4. **Click "Run"**

### Step 2: What Happens

The script will:
- ✅ Add all Student users to the `students` table
- ✅ Add all Teacher users to the `teachers` table
- ✅ Add all Parent users to the `parents` table
- ✅ Show you the new counts
- ✅ Show you which users were added

### Step 3: Refresh Your App

1. **Go to** http://localhost:3000
2. **Press F5** to refresh
3. **Dashboard counts should now be correct!** 🎉

## 📊 Expected Results

After running the script, you should see:
- ✅ Correct student count (based on users with role='Student')
- ✅ Correct teacher count (based on users with role='Teacher')
- ✅ Correct parent count (based on users with role='Parent')

## 🔍 Verify It Worked

Run this query to see all users and their status:

```sql
SELECT 
    u.name,
    u.role,
    CASE 
        WHEN s.id IS NOT NULL THEN '✅ Has student record'
        WHEN t.id IS NOT NULL THEN '✅ Has teacher record'
        WHEN p.id IS NOT NULL THEN '✅ Has parent record'
        ELSE '❌ Missing'
    END as status
FROM users u
LEFT JOIN students s ON s.user_id = u.id
LEFT JOIN teachers t ON t.user_id = u.id
LEFT JOIN parents p ON p.user_id = u.id;
```

## 💡 Going Forward

**When adding new users:**

### ✅ RECOMMENDED: Use the App
- Go to Admin Dashboard → Add User
- All tables are updated automatically

### ⚠️ If Adding via SQL:
1. Add to `users` table
2. Add to role table (`students`/`teachers`/`parents`)
3. Add to `auth_accounts` (or run sync script)
4. Create Supabase Auth user (or run sync script)

**OR just run this backfill script again!**

## 🚀 That's It!

Your dashboard will now show the correct counts for all users in your database!
