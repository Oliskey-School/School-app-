# 🚀 Quick Setup: Sync Users to Supabase Auth

## Step 1: Get Your Supabase Credentials

### 1.1 Open Supabase Dashboard
Go to: https://supabase.com/dashboard

### 1.2 Find Your API Credentials
1. Click on your project
2. Click ⚙️ **Settings** (bottom left)
3. Click **API** in the sidebar
4. You'll see:
   - **Project URL**: `https://xxxxxx.supabase.co`
   - **API Keys**:
     - `anon` `public` - DON'T use this
     - **`service_role` `secret`** - ✅ USE THIS ONE!

### 1.3 Copy These Values
- Click the copy icon next to the **service_role** key
- Save it somewhere temporarily

---

## Step 2: Configure the Sync Script

### Option A: Edit the Script File (Easiest)

1. Open: `scripts/sync_users_to_auth.js`

2. Find these lines (around line 12-13):
```javascript
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY';
```

3. Replace with your actual values:
```javascript
const SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';  // Your service_role key
```

4. Save the file

### Option B: Use Environment Variables

**Windows (PowerShell)**:
```powershell
$env:EXPO_PUBLIC_SUPABASE_URL="https://YOUR-PROJECT.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"
node scripts/sync_users_to_auth.js
```

**Mac/Linux (Terminal)**:
```bash
export EXPO_PUBLIC_SUPABASE_URL="https://YOUR-PROJECT.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"
node scripts/sync_users_to_auth.js
```

---

## Step 3: Run the Sync

Open your terminal in the project directory and run:

```bash
node scripts/sync_users_to_auth.js
```

You should see output like:
```
🚀 Syncing Users to Supabase Authentication
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Found 5 user(s) to sync

📝 Processing: Adebayo Oluwaseun (adebayo@student.school.com)
   🔐 Creating Supabase Auth user...
   ✅ Created successfully!
   ...
```

---

## Step 4: Verify Success

### Check Supabase Dashboard
1. Go to **Supabase Dashboard**
2. Click **Authentication** (sidebar)
3. Click **Users** tab
4. You should see all your users! 🎉

### Check Login Works
1. Try logging in with one of the synced users:
   - Email: (from your users table)
   - Password: `[surname]1234`
   - Example: For "John Doe", password is `doe1234`

---

## ⚠️ Important Security Notes

1. **Never commit the service_role key to Git!**
   - Add it to `.gitignore`
   - Use environment variables in production

2. **After testing, you can remove the key from the script**
   - Or keep it as an environment variable only

3. **The service_role key has full admin access**
   - Only use it in secure server-side scripts
   - Never expose it in client-side code

---

## 📋 Checklist

- [ ] Got Supabase URL from dashboard
- [ ] Got service_role key from dashboard  
- [ ] Updated sync_users_to_auth.js with credentials
- [ ] Ran `node scripts/sync_users_to_auth.js`
- [ ] Saw success messages in terminal
- [ ] Checked Supabase Authentication → Users
- [ ] Tested login with a synced user
- [ ] Removed service_role key from script file (or kept it secure)

---

## 🎯 What Happens Next?

After this one-time sync:

✅ All existing users can log in with Supabase Auth
✅ Future users created through your app will auto-sync
✅ You can manage users in Supabase Authentication dashboard
✅ Your activate/deactivate buttons will work perfectly

---

## 💡 Example Credentials After Sync

Your users will have these login credentials:

| User | Email | Password |
|------|-------|----------|
| Adebayo Oluwaseun | adebayo@student.school.com | oluwaseun1234 |
| Chidinma Okafor | chidinma@student.school.com | okafor1234 |
| Mr. John Adeoye | j.adeoye@school.com | adeoye1234 |

Pattern: **surname + "1234"**

---

**You're ready to go! Start the sync now! 🚀**
