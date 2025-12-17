# Quick Start Guide - User Account Management

## 🚀 Getting Started in 3 Steps

### Step 1: Run the Auto-Sync Script
```bash
# Open Supabase SQL Editor and run:
# File: sql/auto_sync_users_to_auth.sql
```

This will:
- ✅ Create the auto-sync trigger
- ✅ Backfill auth accounts for existing users
- ✅ Enable automatic auth account creation

### Step 2: Test the Feature
Your app is already running! Just navigate to:
```
Admin Dashboard → User Accounts
```

### Step 3: Try It Out
1. **Click the eye icon** 👁️ next to any password to view/hide it
2. **Click "Activate" or "Deactivate"** button to toggle user status
3. **Create a new user** and watch the auth account auto-create

---

## 📋 Quick Reference

### Password Pattern
```
Password = [surname] + "1234"
Example: "John Doe" → "doe1234"
```

### Username Pattern
```
Username = [role letter] + [full.name]
Examples:
- "John Doe" (Student) → "sjohn.doe"
- "Mary Smith" (Teacher) → "tmary.smith"
- "Bob Johnson" (Parent) → "pbob.johnson"
```

### User Status
- 🟢 **Active**: User can log in
- 🔴 **Inactive**: User cannot log in

---

## 🎯 Common Tasks

### View a User's Password
1. Go to User Accounts page
2. Find the user
3. Click the 👁️ eye icon next to their password
4. Password appears (e.g., "oluwaseun1234")

### Deactivate a User
1. Go to User Accounts page
2. Find the user
3. Click the red **"Deactivate"** button
4. User is immediately locked out

### Reactivate a User
1. Go to User Accounts page
2. Find the inactive user
3. Click the green **"Activate"** button
4. User can log in again

### Add a New User (Auto-Creates Auth Account)
```sql
-- Just insert into users table:
INSERT INTO users (email, name, role) 
VALUES ('jane@school.com', 'Jane Williams', 'Student');

-- Auth account is created automatically! ✨
-- Username: sjane.williams
-- Password: williams1234 (hashed)
```

---

## ✅ Verification Checklist

After running the auto-sync script, verify:

- [ ] Trigger exists in database
- [ ] Existing users have auth accounts
- [ ] New users automatically get auth accounts
- [ ] Passwords are hashed (not plain text)
- [ ] Activate/Deactivate buttons work
- [ ] Eye icon shows/hides passwords
- [ ] Status badges update correctly

---

## 🔧 Files to Know

| File | Purpose |
|------|---------|
| `sql/auto_sync_users_to_auth.sql` | Database trigger setup |
| `sql/AUTO_SYNC_README.md` | Detailed documentation |
| `components/admin/UserAccountsScreen.tsx` | UI component |
| `IMPLEMENTATION_SUMMARY.md` | Full feature list |

---

## 💡 Tips

1. **For Security**: Change the password pattern before production
2. **For Testing**: Create test users to verify auto-sync works
3. **For Backups**: Keep a copy of `auto_sync_users_to_auth.sql`
4. **For Debugging**: Check browser console and Supabase logs

---

## 🆘 Troubleshooting

### Activate/Deactivate button doesn't work
- Check browser console for errors
- Verify Supabase connection
- Ensure you're logged in as admin

### Passwords don't show when clicking eye icon
- Verify user has a name with at least one space
- Check that the name field is populated

### New users don't get auth accounts
- Verify the trigger is installed: Run verification query from AUTO_SYNC_README.md
- Check Supabase logs for errors
- Ensure pgcrypto extension is enabled

---

## 📖 Need More Help?

See detailed documentation:
- `sql/AUTO_SYNC_README.md` - Database setup guide
- `IMPLEMENTATION_SUMMARY.md` - Complete feature documentation

---

**That's it! You're ready to manage user accounts efficiently! 🎉**
