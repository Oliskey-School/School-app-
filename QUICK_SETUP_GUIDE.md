# 🚀 Quick Setup Guide - Get Classes and Subjects Working

## Problem
Your app shows "No classes found" because the database is empty.

## Solution
Run ONE SQL script to populate everything!

---

## ⚡ QUICK STEPS (5 Minutes)

### Step 1: Open Supabase Dashboard
1. Go to: https://supabase.com/dashboard
2. Click on your project: **nijgkstffuqxqltlmchu**
3. Click on **SQL Editor** (left sidebar)

### Step 2: Run the Setup Script
1. Click **"+ New Query"**
2. Copy the ENTIRE contents of this file:
   ```
   sql/setup_complete_system.sql
   ```
3. Paste into the SQL Editor
4. Click **"Run"** button (or press Ctrl+Enter)

### Step 3: Verify Success
You should see a success message showing:
```
status: "Setup Complete!"
total_classes: 81
total_subjects: 70+
```

### Step 4: Refresh Your App
1. Go back to your app
2. Refresh the page (F5)
3. Navigate to AI Timetable
4. Classes should now appear in the dropdown! ✅

---

## 📊 What Gets Created

### Classes Table (81 classes):
- ✅ 6 Early Years classes (Pre-Nursery, Nursery 1-2)
- ✅ 18 Primary classes (Basic 1-6)
- ✅ 9 JSS classes (JSS 1-3)
- ✅ 27 SSS Science classes
- ✅ 27 SSS Arts classes  
- ✅ 27 SSS Commercial classes

**Total: 81 classes**

### Subjects Table (70+ subjects):
- ✅ 9 Early Years activity areas
- ✅ 14 Primary subjects
- ✅ 16 JSS subjects
- ✅ 5 SSS Core subjects (all tracks)
- ✅ 6 SSS Science electives
- ✅ 8 SSS Arts electives
- ✅ 7 SSS Commercial electives

**Total: 70+ subjects**

---

## 🔍 Troubleshooting

### If you see an error about "table already exists":
The subjects table might already exist. Run this first:
```sql
DROP TABLE IF EXISTS subjects CASCADE;
```
Then run the full script again.

### If classes still don't show:
1. Check if Supabase URL and keys are correct in `.env` file
2. Make sure you're connected to the internet
3. Try clearing browser cache and refreshing

### To verify data was created:
Run these queries in SQL Editor:
```sql
-- Check classes
SELECT COUNT(*) FROM classes;

-- Check subjects  
SELECT COUNT(*) FROM subjects;

-- View sample classes
SELECT * FROM classes LIMIT 10;

-- View sample subjects
SELECT * FROM subjects LIMIT 10;
```

---

## ✅ After Setup

Once the script runs successfully:

1. **Classes will appear** in all dropdowns
2. **Subjects will be available** for each class
3. **AI Timetable** will work
4. **Real-time updates** will sync automatically

---

## 📝 Files Reference

- **Setup Script**: `sql/setup_complete_system.sql`
- **Classes Hook**: `lib/hooks/useClasses.ts`
- **Subjects Helper**: `lib/schoolSystem.ts`

---

## 🎯 Expected Result

After running the script, your AI Timetable screen should show:

**Target Class dropdown** will display:
- Pre-Nursery A, Pre-Nursery B
- Nursery1 A, Nursery1 B
- Nursery2 A, Nursery2 B
- Basic1 A, Basic1 B, Basic1 C
- Basic2 A, Basic2 B, Basic2 C
- ... (and so on for all 81 classes)

---

## 💡 Need Help?

If you encounter any issues:
1. Check the Supabase logs in the dashboard
2. Verify your `.env` file has correct credentials
3. Make sure you're using the correct Supabase project

---

**That's it!** Your database will be fully populated and ready to use! 🎉
