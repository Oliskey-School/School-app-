# 🔧 Manual SQL Execution Instructions

Since automated execution requires admin privileges that the API key doesn't have, please follow these steps to apply the synchronization fix manually:

## Step 1: Open Supabase Dashboard

1. Go to: **https://nijgkstffuqxqltlmchu.supabase.co**
2. Log in if prompted

## Step 2: Navigate to SQL Editor

1. In the left sidebar, click on **"SQL Editor"**
2. Click **"+ New query"** button

## Step 3: Copy and Paste the SQL Script

1. Open the file: `c:\Users\USER\OneDrive\Desktop\Project\school-app-\sql\SYNC_AUTH_USERS.sql`
2. **Select ALL content** (Ctrl+A)
3. **Copy** it (Ctrl+C)  
4. Go back to Supabase SQL Editor
5. **Paste** into the query editor (Ctrl+V)

## Step 4: Execute the Script

1. Click the green **"Run"** button (or press F5)
2. **Wait** for completion (should take 5-10 seconds)

## Step 5: Verify Success

You should see a success message like:
```
✅ Synchronization Triggers & Repair Complete
```

## Step 6: Check Your Dashboard

1. Go back to your app: `http://localhost:5173`
2. Navigate to **Admin Dashboard**
3. Check the "Total Users" count
4. Click on **"User Accounts"**
5. **Verify**: Both numbers should now match!

---

## What This Script Does

✅ Creates `delete_user_by_email()` function for safe deletion  
✅ Installs triggers to auto-sync new Auth users to public tables  
✅ **Repairs existing data** - finds missing users and restores them  
✅ Keeps deletion in sync between Auth and Database

---

## If You See Errors

If the script shows errors, they're likely permission-related. Try:
1. Make sure you're logged in as the **project owner**
2. Or contact me and I'll help troubleshoot

---

**After completing these steps, your user counts will be synchronized across all 3 locations! 🎉**
