# Sync Users to Supabase Authentication

## 🎯 What This Does

This script syncs all users from your **`users` table** to **Supabase Authentication**, so they appear in the Authentication dashboard and can log in using Supabase Auth.

## 📋 Prerequisites

Before running the script, you need:

1. ✅ **Supabase Project URL**
2. ✅ **Supabase Service Role Key** (not the anon key!)

### Where to Find These:

1. Go to your **Supabase Dashboard**
2. Click **Settings** (gear icon) → **API**
3. Copy:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **service_role** key (under "Project API keys")

⚠️ **Important**: Use the **service_role** key, NOT the **anon** key!

---

## 🚀 How to Run

### Step 1: Configure the Script

Open `scripts/sync_users_to_auth.js` and update these lines:

```javascript
const SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co';
const SUPABASE_SERVICE_KEY = 'your-service-role-key-here';
```

**OR** set environment variables:

```bash
# Windows (PowerShell)
$env:EXPO_PUBLIC_SUPABASE_URL="https://YOUR-PROJECT.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Mac/Linux (Terminal)
export EXPO_PUBLIC_SUPABASE_URL="https://YOUR-PROJECT.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

### Step 2: Run the Script

```bash
node scripts/sync_users_to_auth.js
```

### Step 3: Check the Results

Go to **Supabase Dashboard → Authentication → Users**

You should now see all your users! 🎉

---

## 📊 What the Script Does

For each user in your `users` table, it:

1. ✅ Generates a **username**: `[role letter] + [full.name]`
   - Example: "John Doe" (Student) → `sjohn.doe`

2. ✅ Generates a **password**: `[surname] + "1234"`
   - Example: "John Doe" → `doe1234`

3. ✅ Creates a **Supabase Auth user** with:
   - Email address
   - Generated password
   - Auto-confirmed email
   - User metadata (name, role, username)

4. ✅ Creates an **auth_accounts** entry with:
   - Hashed password
   - Username
   - User type/role
   - Active status

---

## 📝 Example Output

```
🚀 Syncing Users to Supabase Authentication

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Found 5 user(s) to sync

📝 Processing: Adebayo Oluwaseun (adebayo@student.school.com)
   🔐 Creating Supabase Auth user...
   ✅ Created successfully!
   📧 Email: adebayo@student.school.com
   🔑 Username: sadebayo.oluwaseun
   🔒 Password: oluwaseun1234
   ✅ Created auth_accounts entry

📝 Processing: Mr. John Adeoye (j.adeoye@school.com)
   🔐 Creating Supabase Auth user...
   ✅ Created successfully!
   📧 Email: j.adeoye@school.com
   🔑 Username: tmr..john.adeoye
   🔒 Password: adeoye1234
   ✅ Created auth_accounts entry

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✨ Sync Complete!

📊 Summary:
   ✅ Successful: 5
   ❌ Errors: 0
   📝 Total: 5

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Check: Supabase Dashboard → Authentication → Users
   You should now see all your users!

🎉 Done!
```

---

## 🔍 Verification

### Check Supabase Dashboard

1. Go to **Supabase Dashboard**
2. Click **Authentication** → **Users**
3. You should see all your users listed!

### Check Database

Run this query in Supabase SQL Editor:

```sql
SELECT 
    u.id,
    u.name,
    u.email,
    u.role,
    aa.username,
    aa.is_active
FROM users u
LEFT JOIN auth_accounts aa ON aa.user_id = u.id
ORDER BY u.id;
```

All users should have matching auth_accounts entries.

---

## 🔄 Keeping Users in Sync (Future Users)

### For New Users Created in Your App

The existing `createUserAccount()` function in `lib/auth.ts` already handles this! When you create a user through your app (e.g., Add Student, Add Teacher), it automatically:

1. Creates a Supabase Auth user
2. Creates an auth_accounts entry
3. Sends verification email

**No changes needed** - it's already working! ✅

### For Users Added Directly to Database

If you add users directly via SQL, you have two options:

#### Option 1: Run the Sync Script Again
```bash
node scripts/sync_users_to_auth.js
```
- Safe to run multiple times
- Skips existing users
- Only creates auth for new users

#### Option 2: Use the SQL Trigger (Limited)

The SQL trigger we created (`auto_sync_users_to_auth.sql`) will create **auth_accounts** entries automatically, but it **cannot** create Supabase Auth users (SQL can't call the Auth API).

**Solution**: Run the sync script periodically, or always create users through the app UI.

---

## ❓ Troubleshooting

### Error: "Invalid API key"
- ✅ Check you're using the **service_role** key, not the anon key
- ✅ Verify the key is correct (no extra spaces)

### Error: "User already exists"
- ✅ This is normal - the script skips existing users
- ✅ Check the Supabase Authentication dashboard to confirm

### Error: "Network error" or "Connection refused"
- ✅ Check your internet connection
- ✅ Verify the Supabase URL is correct
- ✅ Check if Supabase is experiencing issues

### No users created
- ✅ Verify you have users in the `users` table
- ✅ Check the console output for error messages
- ✅ Ensure your service role key has admin permissions

### Script runs but no users appear in dashboard
- ✅ Refresh the Supabase Authentication page
- ✅ Check if email filtering is applied in the dashboard
- ✅ Verify users were created using the SQL query above

---

## 🔐 Security Notes

### Service Role Key
- ⚠️ **Never commit** the service role key to Git
- ⚠️ **Never expose** it in client-side code
- ✅ Only use it in server-side scripts
- ✅ Store it in environment variables

### Passwords
- ✅ Passwords are hashed before storage
- ✅ Users can change their password after first login
- ✅ Consider requiring password change on first login for production

---

## 📋 Quick Command Reference

```bash
# Run the sync script
node scripts/sync_users_to_auth.js

# Check if users table has data
# (Run in Supabase SQL Editor)
SELECT COUNT(*) FROM users;

# View users and their auth accounts
SELECT 
    u.name, 
    u.email, 
    aa.username, 
    aa.is_active 
FROM users u 
LEFT JOIN auth_accounts aa ON aa.user_id = u.id;
```

---

## 🎯 What's Next?

After running this script:

1. ✅ All existing users can now log in via Supabase Auth
2. ✅ New users created through the app will auto-sync
3. ✅ You can manage users in the Supabase Authentication dashboard
4. ✅ Users appear in both:
   - Supabase Authentication (for login)
   - Your auth_accounts table (for app logic)

---

## 📞 Need Help?

If you encounter issues:

1. Check the troubleshooting section above
2. Review the console output for specific error messages
3. Verify your Supabase credentials
4. Check the Supabase documentation: https://supabase.com/docs/guides/auth

---

**You're all set! Your users are now synced with Supabase Authentication! 🎉**
