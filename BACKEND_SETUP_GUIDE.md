# Backend Security Setup Guide

## 🚀 Quick Start

Follow these steps to enable backend security with profiles, RLS, and secure AI calls.

---

## Step 1: Run Database Migrations

### Option A: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Run migrations in order:

**Migration 1: Create Profiles Table**
- Open [`sql/001_create_profiles.sql`](file:///c:/Users/USER/OneDrive/Desktop/Project/school-app-/sql/001_create_profiles.sql)
- Copy all content
- Paste into SQL Editor
- Click **Run**

**Migration 2: Enable RLS Policies**
- Open [`sql/002_enable_rls_policies.sql`](file:///c:/Users/USER/OneDrive/Desktop/Project/school-app-/sql/002_enable_rls_policies.sql)
- Copy all content
- Paste into SQL Editor  
- Click **Run**

### Option B: Using Supabase CLI

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Run migrations
supabase db push
```

---

## Step 2: Deploy Edge Function

### Deploy AI Assistant Function

```bash
# Navigate to project directory
cd c:\Users\USER\OneDrive\Desktop\Project\school-app-

# Deploy the Edge Function
supabase functions deploy ai-assistant

# Set AI API keys as secrets (choose one or both)
supabase secrets set OPENAI_API_KEY=your_openai_key_here
# OR
supabase secrets set GEMINI_API_KEY=your_gemini_key_here
```

---

## Step 3: Update Frontend Code

### Replace AI Calls

Update any file using `lib/ai.ts` to use the new secure version:

```typescript
// OLD (insecure - exposes API keys)
import { generateAIResponse } from '../lib/ai';

// NEW (secure - uses Edge Function)
import { callAI, getStudyHelp, generateQuizQuestions } from '../lib/ai-secure';
```

### Example Updates Needed

1. **Study Buddy Component** - Replace AI calls
2. **AI Parenting Tips** - Use `generateParentingTips()`
3. **Quiz Generator** - Use `generateQuizQuestions()`

---

## Step 4: Create Test Users

### Using Supabase Dashboard

1. Go to **Authentication** > **Users**
2. Click **Add user**
3. Fill in:
   - Email: `student1@test.com`
   - Password: `Test123!`
   - User Metadata (JSON):
     ```json
     {
       "full_name": "Test Student",
       "role": "student"
     }
     ```
4. Click **Create user**
5. The trigger will auto-create profile in `profiles` table

### Repeat for Other Roles

- Teacher: `teacher1@test.com` with `role: "teacher"`
- Parent: `parent1@test.com` with `role: "parent"`
- Admin: `admin1@test.com` with `role: "admin"`

---

## Step 5: Link Profiles to Existing Data

### For Existing Students/Teachers/Parents

Run this SQL to link a profile to existing data:

```sql
-- Example: Link student profile to existing student record
UPDATE profiles
SET student_id = (SELECT id FROM students WHERE email = 'student1@test.com')  
WHERE email = 'student1@test.com';

-- Example: Link teacher profile  
UPDATE profiles
SET teacher_id = (SELECT id FROM teachers WHERE email = 'teacher1@test.com')
WHERE email = 'teacher1@test.com';

-- Example: Link parent profile with children
UPDATE profiles
SET parent_id = (SELECT id FROM parents WHERE email = 'parent1@test.com')
WHERE email = 'parent1@test.com';
```

---

## Step 6: Test Each Role

### Student Test Checklist

- [ ] Sign in as student
- [ ] View own dashboard
- [ ] See own grades and attendance
- [ ] Cannot see other students' data (test in browser console)
- [ ] Can submit assignments
- [ ] AI Study Buddy works

### Teacher Test Checklist

- [ ] Sign in as teacher
- [ ] View assigned classes
- [ ] See only students in assigned classes
- [ ] Can create/grade assignments
- [ ] Cannot see unrelated students

### Parent Test Checklist

- [ ] Sign in as parent
- [ ] View linked children only
- [ ] See children's grades/attendance
- [ ] Cannot see unrelated students
- [ ] AI Parenting Tips works

### Admin Test Checklist

- [ ] Sign in as admin
- [ ] View all students/teachers/parents
- [ ] Can create/modify all records
- [ ] Full system access

---

## Step 7: Verify Security

### RLS Verification

Test in browser console:

```javascript
// Try to fetch all students (should only return allowed records)
const { data } = await supabase.from('students').select('*')
console.log(data) // Should be filtered by RLS

// Try to update another user's profile (should fail)
const { error } = await supabase
  .from('profiles')
  .update({ full_name: 'Hacked' })
  .eq('id', 'some-other-user-uuid')
console.log(error) // Should show permission denied
```

### AI Security Verification

1. Open Network tab in browser dev tools
2. Trigger an AI feature (Study Buddy, etc.)
3. Check request:
   - ✅ Should go to `/functions/v1/ai-assistant`
   - ✅ Should NOT contain API keys in request/response
   - ❌ Should NOT go directly to `api.openai.com` or Google APIs

---

## Troubleshooting

### "Permission denied" errors
- Verify RLS policies are correct
- Check user's role in `profiles` table
- Ensure profile is linked to student/teacher/parent record

### Edge Function not working
- Check function is deployed: `supabase functions list`
- Verify secrets are set: `supabase secrets list`
- Check function logs: `supabase functions logs ai-assistant`

### Users not auto-creating profiles
- Check trigger exists: Look for `on_auth_user_created` in Supabase Dashboard > Database > Triggers
- Verify function `handle_new_user()` exists
- Check user metadata includes `role` field during signup

---

## Next Steps

- [ ] Remove old `lib/ai.ts` file after migrating all calls
- [ ] Add more RLS policies for remaining tables
- [ ] Set up monitoring for Edge Function usage
- [ ] Document role assignment process for new users
