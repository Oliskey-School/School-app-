# Multi-Tenant School Onboarding - Quick Start Guide

This guide will help you apply the migration and test the new school onboarding system.

---

## Step 1: Apply Database Migration

### Option A: Using Supabase CLI (Recommended)

```bash
cd c:\Users\USER\OneDrive\Desktop\Project\school-app-

# Make sure you're connected to your Supabase project
npx supabase link --project-ref your-project-ref

# Apply the migration
npx supabase db push
```

### Option B: Manual Application via Supabase Dashboard

1. Go to https://app.supabase.com
2. Select your project
3. Navigate to **SQL Editor**
4. Click **New Query**
5. Copy contents of `supabase/migrations/20260128_multi_tenant_onboarding.sql`
6. Paste and click **Run**

---

## Step 2: Verify Migration

### Run Verification Script

In Supabase SQL Editor:

```bash
# Copy and run the verification script
file: c:\Users\USER\OneDrive\Desktop\Project\school-app-\supabase\migrations\20260128_verify_migration.sql
```

**Expected Output**:
```
MIGRATION VERIFICATION SUMMARY
Functions created: 5 / 5
Triggers created: 2 / 2
RLS Policies: [number]
STATUS: ✓ MIGRATION SUCCESSFUL
```

---

## Step 3: Configure Backend Environment

Add service role key to your backend `.env`:

```bash
# Open backend/.env (or create if not exists)
# Add this line:
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**Where to find your service role key:**
1. Supabase Dashboard → Settings → API
2. Copy the `service_role` secret key

---

## Step 4: Start Backend Server

```bash
# Terminal 1 - Backend API
cd c:\Users\USER\OneDrive\Desktop\Project\school-app-
npm run server
```

**Expected Output:**
```
🚀 Server running on port 3001 in development mode
```

---

## Step 5: Start Frontend

```bash
# Terminal 2 - Frontend App
cd c:\Users\USER\OneDrive\Desktop\Project\school-app-
npm run dev
```

**Expected Output:**
```
VITE v6.2.0  ready in XXX ms

➜  Local:   http://localhost:5173/
```

---

## Step 6: Test School Creation

### A. Navigate to Signup

Open browser: http://localhost:5173

Click **"Create School"** or navigate directly to signup.

### B. Fill Registration Form

**School Details:**
- School Name: `Test Academy`
- Motto: `Excellence in Education`
- Address: `123 Test Street, Test City`
- Logo: (optional)

**Admin Details:**
- Full Name: `John Administrator`
- Email: `admin@testacademy.com`
- Password: `SecurePass123!`

Click **"Get Started & Create Portal"**

### C. Expected Result

✅ Success toast: "Welcome! Your portal is ready. 🎉"
✅ Email sent to admin@testacademy.com
✅ Redirected or prompted to verify email

---

## Step 7: Verify Email & Login

### Check Email
1. Check `admin@testacademy.com` inbox
2. Click **"Confirm your email"** link

### Expected Result
✅ Redirects to `/#/auth/callback`
✅ Shows "Email Verified! 🎉"
✅ Auto-redirects to Admin Dashboard
✅ Welcome toast appears

---

## Step 8: Test Staff Invitation

### Navigate to Staff Management
In Admin Dashboard:
1. Look at sidebar → **"Staff Management"**
2. Click to open

### Send Test Invitation

**Form:**
- Email: `teacher@testacademy.com`
- Full Name: `Sarah Teacher`
- Role: Select **"Teacher"**

Click **"Send Invitation"**

### Expected Result
✅ Success toast
✅ Teacher appears in staff list with "pending" status
✅ Email sent to teacher@testacademy.com

---

## Step 9: Test Invited User Acceptance

### As Teacher (New Browser/Incognito)

1. Check `teacher@testacademy.com` email
2. Click invitation link
3. Set password: `TeacherPass123!`
4. Click **"Accept Invitation"**

### Expected Result
✅ Redirects to Teacher Dashboard (not admin)
✅ Navigation shows teacher-specific links:
   - My Classes
   - Attendance
   - Assignments
   - Gradebook

---

## Step 10: Verify Database

### Check Created Records

Run in Supabase SQL Editor:

```sql
-- 1. Verify school was created
SELECT id, name, motto, address, subscription_status
FROM schools
WHERE name = 'Test Academy';

-- 2. Check admin user metadata
SELECT 
    email,
    raw_app_meta_data->'role' as role,
    raw_app_meta_data->'school_id' as school_id
FROM auth.users
WHERE email = 'admin@testacademy.com';

-- 3. Verify teacher was invited
SELECT email, role, school_id, full_name
FROM users
WHERE email = 'teacher@testacademy.com';
```

---

## Troubleshooting

### Issue: "Missing Supabase credentials"
**Fix:** Check `SUPABASE_SERVICE_ROLE_KEY` in backend/.env

### Issue: Backend API not responding
**Fix:** 
```bash
# Check backend is running on port 3001
curl http://localhost:3001/api/
# Should return: {"status":"ok","service":"School SaaS Backend"}
```

### Issue: Invitation email not received
**Fix:**
1. Check Supabase email settings (Dashboard → Authentication → Email)
2. Verify SMTP is configured
3. Check spam folder

### Issue: Role not set correctly
**Fix:** Run this to manually update:
```sql
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'::jsonb
WHERE email = 'admin@testacademy.com';
```

---

## Next Steps

After successful testing:

1. **Deploy Backend**
   - Deploy to your hosting service
   - Set `SUPABASE_SERVICE_ROLE_KEY` in production
   - Update `VITE_APP_URL` to production URL

2. **Configure Production Redirect URLs**
   - Supabase Dashboard → Authentication → URL Configuration
   - Add: `https://yourdomain.com/#/auth/callback`

3. **Customize Email Templates**
   - Supabase Dashboard → Authentication → Email Templates
   - Customize invitation and verification emails

4. **Test All 8 Roles**
   - Invite and test: Proprietor, Inspector, Exam Officer, Compliance Officer, Parent, Student

---

## Success Criteria

✅ School signup works end-to-end
✅ Email verification redirects to admin dashboard
✅ Admin can see "Staff Management" in sidebar
✅ Admin can invite staff with different roles
✅ Invited users receive emails with correct metadata
✅ Invited users auto-assigned correct role and school
✅ RLS prevents cross-school data access
✅ Navigation is role-specific

---

## Quick Reference

**Frontend:** http://localhost:5173
**Backend API:** http://localhost:3001/api
**Supabase Dashboard:** https://app.supabase.com

**Test Accounts:**
- Admin: admin@testacademy.com / SecurePass123!
- Teacher: teacher@testacademy.com / TeacherPass123!

**Key Files:**
- Migration: `supabase/migrations/20260128_multi_tenant_onboarding.sql`
- Staff Management: `components/admin/StaffManagement.tsx`
- Invite API: `backend/src/routes/invite.routes.ts`

**Database Functions:**
- `create_school_and_admin()` - Creates new school
- `invite_staff_member()` - Validates invitations
- `handle_invited_user()` - Processes accepted invitations
