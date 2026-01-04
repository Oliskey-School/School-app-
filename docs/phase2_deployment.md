# Phase 2 Database Deployment Guide

## Quick Start - Apply Phase 2 Schema

Since you don't have a `.env` file with service role credentials, you'll need to apply the schema manually through Supabase Dashboard. This is actually the safest and most straightforward method!

### Step 1: Open Supabase SQL Editor

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Click "SQL Editor" in the left sidebar
4. Click "New Query"

### Step 2: Copy and Execute Schema

1. Open the file: `database/phase2_schema.sql` in your project
2. Copy the entire contents
3. Paste into the Supabase SQL Editor
4. Click "Run" (or press Ctrl/Cmd + Enter)

### Step 3: Verify Deployment

Run this command in your terminal:

```bash
node scripts/verify_phase2.js
```

**Expected Output:**
```
🔍 PHASE 2 VERIFICATION SUITE
==================================================

1️⃣  Testing Database Connection...
   ✅ Database connection successful

2️⃣  Testing 'resources' Table...
   ✅ 'resources' table exists and accessible
   📊 Current resources count: 0

3️⃣  Testing 'quizzes' Table...
   ✅ 'quizzes' table exists and accessible
   📊 Current quizzes count: 0

4️⃣  Testing 'questions' Table...
   ✅ 'questions' table exists and accessible

5️⃣  Testing 'quiz_submissions' Table...
   ✅ 'quiz_submissions' table exists and accessible
   📊 Current submissions count: 0

==================================================

🎉 Phase 2 Database is READY!
```

---

## Alternative: Automated Deployment (Optional)

If you have a Supabase Service Role Key, you can use automated deployment:

### Setup .env File

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=your-supabase-url-here
VITE_SUPABASE_ANON_KEY=your-anon-key-here  
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### Run Deployment Script

```bash
node scripts/apply_phase2_schema.js
```

---

## What Gets Created

The Phase 2 schema creates these tables:

### 1. `resources` Table
- Learning resources (PDFs, videos, slides, audio)
- Columns: id, title, description, type, subject, grade, url, thumbnail_url, language, curriculum_tags, teacher_id, created_at, is_public
- RLS policies for public/private access

### 2. `quizzes` Table  
- Quiz metadata
- Columns: id, title, description, subject, grade, teacher_id, duration_minutes, is_published, created_at
- RLS policies for published quizzes

### 3. `questions` Table
- Quiz questions with multiple types
- Columns: id, quiz_id, text, type (MultipleChoice/Theory/TrueFalse), options (JSONB), points, image_url
- Linked to quizzes via quiz_id

### 4. `quiz_submissions` Table
- Student quiz attempts and scores
- Columns: id, quiz_id, student_id, answers (JSONB), score, submitted_at, status
- RLS policies for student/teacher access

---

## After Deployment

Once schema is applied, you can:

1. ✅ Create quizzes via Teacher Dashboard → Quiz Builder
2. ✅ Students can view and take quizzes
3. ✅ Admins can upload learning resources
4. ✅ Parents/students can view resources

### Next Steps

1. Configure Supabase Storage bucket (see storage_setup.md)
2. Test quiz creation flow
3. Test resource upload

---

## Troubleshooting

### If tables already exist
You'll see errors like "relation already exists" - this is fine, it means Phase 2 was already partially deployed.

### If RLS prevents queries
Make sure you're logged in with appropriate role (admin, teacher, student) when testing.

### If scripts don't run
Make sure you have Node.js dependencies installed:
```bash
npm install
```
