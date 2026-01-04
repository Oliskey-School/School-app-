# Quick Login Setup Guide

Follow these steps to enable real-time Quick Login authentication:

## Step 1: Create Auth Users in Supabase Dashboard

1. Open https://supabase.com/dashboard/projects
2. Select your "school-app" project
3. Navigate to **Authentication → Users**
4. Click "**Add user**" and create **4 users**:

   | Email | Password | Auto Confirm |
   |-------|----------|--------------|
   | admin@demo.com | Demo123! | ✅ YES |
   | teacher@demo.com | Demo123! | ✅ YES |
   | parent@demo.com | Demo123! | ✅ YES |
   | student@demo.com | Demo123! | ✅ YES |

5. **Important**: After creating each user, note down their **User ID (UUID)**

## Step 2: Update User Metadata (Optional but Recommended)

For each user in the Supabase Dashboard:
1. Click on the user
2. Go to "Raw User Meta Data"
3. Add the following JSON:

```json
{
  "role": "admin",
  "full_name": "Demo Admin"
}
```

Replace `"admin"` with the appropriate role for each user (teacher, parent, student).

## Step 3: Create Database Profiles

After creating Auth users, run this SQL in Supabase SQL Editor:

```sql
-- Insert demo school
INSERT INTO public.schools (id, name, curriculum_type) 
VALUES ('00000000-0000-0000-0000-000000000001', 'Demo School', 'Nigerian')
ON CONFLICT (id) DO NOTHING;

-- Create profiles linked to auth users
-- REPLACE the UUIDs below with actual User IDs from Step 1

INSERT INTO public.profiles (id, email, role, full_name, school_id) 
VALUES 
    ('ADMIN-USER-UUID-HERE', 'admin@demo.com', 'admin', 'Demo Admin', '00000000-0000-0000-0000-000000000001'),
    ('TEACHER-USER-UUID-HERE', 'teacher@demo.com', 'teacher', 'Demo Teacher', '00000000-0000-0000-0000-000000000001'),
    ('PARENT-USER-UUID-HERE', 'parent@demo.com', 'parent', 'Demo Parent', '00000000-0000-0000-0000-000000000001'),
    ('STUDENT-USER-UUID-HERE', 'student@demo.com', 'student', 'Demo Student', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO UPDATE SET 
    email = EXCLUDED.email,
    role = EXCLUDED.role;
```

## Step 4: Test Quick Login

1. Open your app login page
2. Click any Quick Login button (Admin, Teacher, Parent, Student)
3. The app should:
   - Auto-fill the email and password fields
   - Authenticate with Supabase
   - Redirect to the appropriate dashboard

## Verification Checklist

- [ ] All 4 users created in Supabase Auth
- [ ] User metadata set with roles
- [ ] Database profiles created
- [ ] Quick Login buttons work without errors
- [ ] Users redirect to correct dashboards

## Troubleshooting

**Issue**: "Invalid login credentials"
- **Solution**: Verify the password is exactly `Demo123!` with capital D and exclamation mark

**Issue**: "Profile not found"
- **Solution**: Make sure you ran the SQL in Step 3 with the correct UUIDs

**Issue**: Users exist but role is wrong
- **Solution**: Update the user_metadata in Supabase Auth Dashboard
