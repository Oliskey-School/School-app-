# Phase 2 Deployment & Testing - Step by Step

## 🚀 STEP 1: Deploy Database Schema

You currently have `phase2_minimal.sql` open. Let's deploy it:

### Instructions:

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor**
   - Click "SQL Editor" in left sidebar
   - Click "New Query"

3. **Copy and Paste**
   - Select ALL content from `database/phase2_minimal.sql`
   - Copy it (Ctrl+A, Ctrl+C)
   - Paste into Supabase SQL Editor

4. **Run the SQL**
   - Click "Run" button (or Ctrl/Cmd + Enter)
   - Wait for completion

5. **Verify Success**
   - You should see: "Success. No rows returned"
   - This means all 4 tables were created!

**Tables Created:**
- ✅ resources
- ✅ quizzes
- ✅ questions  
- ✅ quiz_submissions

---

## 🗄️ STEP 2: Create Storage Bucket

1. **Go to Storage**
   - In Supabase Dashboard → Click "Storage"

2. **Create New Bucket**
   - Click "Create a new bucket"
   
3. **Configure Bucket**
   - Name: `resources` (exactly this!)
   - Public bucket: ✅ **CHECK THIS BOX**
   - Click "Create bucket"

4. **Verify**
   - You should see "resources" in your buckets list

---

## ✅ STEP 3: Verify Deployment

Open your terminal and run:

```bash
node scripts/verify_phase2.js
```

**Expected Output:**
```
🔍 PHASE 2 VERIFICATION SUITE
==================================================

1️⃣  Database Connection: ✅ Successful
2️⃣  'resources' Table: ✅ Exists and accessible
3️⃣  'quizzes' Table: ✅ Exists and accessible
4️⃣  'questions' Table: ✅ Exists and accessible
5️⃣  'quiz_submissions' Table: ✅ Exists and accessible

🎉 Phase 2 Database is READY!
```

If you see this, proceed to testing!

---

## 🧪 STEP 4: Test Quiz Features

### Test 4A: Teacher Creates Quiz

1. **Login as Teacher**
   - Use Quick Login → Teacher
   - Or login with teacher credentials

2. **Navigate to Quiz Builder**
   - Look for "Quiz Builder" button in teacher dashboard
   - Click it

3. **Create a Quiz**
   - **Title:** "Phase 2 Test Quiz"
   - **Subject:** "Mathematics"
   - **Grade:** 10
   - **Duration:** 30 minutes
   - **Description:** "Testing Phase 2 quiz system"

4. **Add Questions**
   
   **Question 1:** (Multiple Choice)
   - Text: "What is 5 + 3?"
   - Options:
     - A) 6
     - B) 7
     - C) 8 ✓ (mark as correct)
     - D) 9

   **Question 2:** (Multiple Choice)
   - Text: "What is 10 × 2?"
   - Options:
     - A) 12
     - B) 15
     - C) 20 ✓ (mark as correct)
     - D) 25

   **Question 3:** (Multiple Choice)
   - Text: "What is 15 - 7?"
   - Options:
     - A) 6
     - B) 7
     - C) 8 ✓ (mark as correct)
     - D) 9

5. **Publish Quiz**
   - Click "Publish Quiz" or "Save"
   - Look for success message

**✅ CHECK:** Did you see a success toast notification?

### Test 4B: Verify Quiz in Database

1. **Open Supabase Dashboard**
2. **Go to Table Editor**
3. **Select `quizzes` table**
4. **Look for your quiz**
   - Should see "Phase 2 Test Quiz"
   - Check `is_published = true`

**✅ CHECK:** Can you see the quiz in the database?

---

## 👨‍🎓 STEP 5: Test Student Quiz Flow

### Test 5A: Student Views Quiz

1. **Logout (if logged in as teacher)**
2. **Login as Student**
   - Use Quick Login → Student
   
3. **Navigate to Quizzes**
   - Look for "Assessments & Quizzes" or "Quizzes" menu
   - Click it

4. **Find Your Quiz**
   - Should see "Phase 2 Test Quiz" in the list
   - Check that it shows:
     - Subject: Mathematics
     - Duration: 30 minutes
     - Questions: 3

**✅ CHECK:** Can you see the quiz in the student view?

### Test 5B: Student Takes Quiz

1. **Click on the Quiz**
   - Click "Phase 2 Test Quiz"

2. **Answer Questions**
   - Answer all 3 questions (try to get them right!)
   - Question 1: Select C (8)
   - Question 2: Select C (20)
   - Question 3: Select C (8)

3. **Submit Quiz**
   - Click "Submit Quiz" or "Submit"
   - Confirm submission

**✅ CHECK:** Did submission succeed? Any success message?

### Test 5C: Verify Submission in Database

1. **Open Supabase Dashboard**
2. **Go to `quiz_submissions` table**
3. **Look for submission**
   - Should see a new row
   - Check `student_id`, `quiz_id`
   - Check `answers` (JSONB with your answers)
   - Check `score` (should be calculated)

**✅ CHECK:** Can you see the submission with correct data?

---

## 📚 STEP 6: Test Resource Upload

### Test 6A: Admin Uploads Resource

1. **Login as Admin**
   - Use Quick Login → Admin

2. **Navigate to Resources**
   - Look for "Manage Learning Resources" or similar
   - Click it

3. **Upload a Resource**
   - Click "Upload Resource" or "+Add"
   
4. **Select File**
   - Choose a small PDF file (< 5MB)
   - If you don't have one, create a simple text file and save as PDF
   
5. **Fill Metadata**
   - **Title:** "Phase 2 Test Resource"
   - **Description:** "Testing resource upload"
   - **Type:** PDF
   - **Subject:** Mathematics
   - **Grade:** 10
   - Click "Upload" or "Save"

**✅ CHECK:** Did upload succeed? File uploaded to storage?

### Test 6B: Verify Resource in Storage

1. **Open Supabase Dashboard**
2. **Go to Storage → resources bucket**
3. **Look for uploaded file**
   - Should see your PDF file
   - File should have a timestamp in the name

**✅ CHECK:** Can you see the file in Supabase Storage?

### Test 6C: Verify Resource Metadata

1. **Open Table Editor**
2. **Select `resources` table**
3. **Look for your resource**
   - Title: "Phase 2 Test Resource"
   - Type: PDF
   - URL should point to Supabase Storage

**✅ CHECK:** Can you see resource metadata in database?

---

## 👨‍👩‍👧 STEP 7: Test Student/Parent Resource View

### Test 7A: Student Views Resources

1. **Login as Student**
2. **Navigate to Learning Resources**
3. **Find Your Resource**
   - Should see "Phase 2 Test Resource"
   - Shows subject, type (PDF icon)

**✅ CHECK:** Can student see the resource?

### Test 7B: Download Resource

1. **Click on the Resource**
   - Click download or view button

2. **Verify Download**
   - File should download or open in new tab
   - PDF should display correctly

**✅ CHECK:** Can you download/view the PDF?

---

## 📊 FINAL CHECKLIST

Mark each as complete:

- [ ] ✅ Database schema deployed (Step 1)
- [ ] ✅ Storage bucket created (Step 2)
- [ ] ✅ Verification script passed (Step 3)
- [ ] ✅ Teacher created quiz (Step 4A)
- [ ] ✅ Quiz appears in database (Step 4B)
- [ ] ✅ Student sees quiz (Step 5A)
- [ ] ✅ Student submitted quiz (Step 5B)
- [ ] ✅ Submission in database (Step 5C)
- [ ] ✅ Admin uploaded resource (Step 6A)
- [ ] ✅ File in storage (Step 6B)
- [ ] ✅ Resource metadata saved (Step 6C)
- [ ] ✅ Student can view resource (Step 7A)
- [ ] ✅ Student can download resource (Step 7B)

---

## 🎉 SUCCESS!

If all items are checked, **Phase 2 is COMPLETE and WORKING!**

### What You've Accomplished:

✅ Full quiz creation and management system  
✅ Student quiz-taking functionality  
✅ Quiz submission and scoring  
✅ Resource upload and storage  
✅ Resource viewing and downloading  
✅ Complete Teaching & Learning Layer

---

## 🐛 Troubleshooting

**Quiz not appearing for students?**
- Check `is_published = true` in quizzes table
- Check grade matches student's grade

**Upload fails?**
- Verify bucket is named exactly "resources"
- Check bucket is marked as **Public**
- Try smaller file (< 5MB first)

**Can't see resource?**
- Check `is_public = true` in resources table
- Verify URL in resources table is valid

**Verification script fails?**
- Run `npm install` to ensure dependencies
- Check `.env` has Supabase credentials
- Make sure you're in project root directory

---

**Start with Step 1 and work through each step in order. Let me know when you complete each step or if you hit any issues!**
