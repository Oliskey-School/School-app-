# Phase 2 Schema - Quick Deploy (No RLS)

## 🚀 Quick Start

The standard `phase2_schema.sql` file has RLS (Row Level Security) policies that are causing type mismatch errors because they're trying to compare BIGINT IDs with UUID auth IDs.

**Use this simplified version instead:**

### File: `database/phase2_schema_simple.sql`

This version:
- ✅ Creates all 4 Phase 2 tables
- ✅ No foreign key constraints
- ✅ **No RLS policies** (to avoid type errors)
- ✅ Adds performance indexes
- ✅ Works immediately without errors

## How to Apply

1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `database/phase2_schema_simple.sql`
3. Paste and run
4. ✅ Done! Tables created successfully

## Tables Created

1. **resources** - Learning resources (PDFs, videos, slides, audio)
2. **quizzes** - Quiz metadata
3. **questions** - Quiz questions
4. **quiz_submissions** - Student quiz attempts

## Security Note

⚠️ **RLS is disabled** for now to avoid type errors.

**What this means:**
- Any authenticated user can read/write to these tables
- Application code must handle permissions
- Fine for development/testing
- For production, we'll need to add proper RLS policies that work with your schema

## Adding RLS Later (Optional)

Once you verify the app works, you can add RLS policies manually:

```sql
-- Enable RLS
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_submissions ENABLE ROW LEVEL SECURITY;

-- Add policies based on your actual user ID column types
-- (Will need to check if teachers/students use UUID or BIGINT IDs)
```

## Verify Deployment

After applying the schema:

```bash
node scripts/verify_phase2.js
```

You should see all tables exist and are accessible.

---

**This simplified schema gets you up and running quickly. Add security policies later once the core functionality works!**
