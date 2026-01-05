# Database Migration Index

## How to Run Migrations

Run migrations in order from 0001 to 0019 in your Supabase SQL Editor.

---

## Migration Files (In Order)

### Core System (Migrations 0001-0018)

| # | File | Description | Status |
|---|------|-------------|--------|
| 0001 | `0001_initial_schema.sql` | Core tables (users, students, teachers, parents) | ✅ Should exist |
| 0002 | `0002_initial_data.sql` | Sample data and defaults | ✅ Should exist |
| 0003 | `0003_storage_auth.sql` | Storage buckets and authentication | ✅ Should exist |
| 0004 | `0004_centralized_profiles_rls.sql` | RLS policies for profiles | ✅ Should exist |
| 0005 | `0005_auth_linkage.sql` | Link auth to profiles | ✅ Should exist |
| 0006 | `0006_governance_curriculum_base.sql` | Curriculum and governance | ✅ Should exist |
| 0007 | `0007_enrollment_extensions.sql` | Enrollment system | ✅ Should exist |
| 0008 | `0008_logic_automations.sql` | Triggers and automations | ✅ Should exist |
| 0009 | `0009_infrastructure_log.sql` | Logging infrastructure | ✅ Should exist |
| 0010 | `0010_health_safety_safeguarding.sql` | Health and safety | ✅ Should exist |
| 0011 | `0011_inspector_ministry_module.sql` | Inspector features | ✅ Should exist |
| 0012 | `0012_compliance_dashboard.sql` | Compliance tracking | ✅ Should exist |
| 0013 | `0013_exams_logic_refinement.sql` | Exam system | ✅ Should exist |
| 0014 | `0014_finance_billing_tracks.sql` | Finance and billing | ✅ Should exist |
| 0015 | `0015_immutable_audit_trail.sql` | Audit logging | ✅ Should exist |
| 0016 | `0016_final_backend_hotfix.sql` | Backend fixes | ✅ Should exist |
| 0017 | `0017_final_completion_updates.sql` | Completion updates | ✅ Should exist |
| 0018 | `0018_inspector_portal_FINAL.sql` | Inspector portal (final) | ✅ Should exist |

### New Features (Migration 0019)

| # | File | Description | Status |
|---|------|-------------|--------|
| 0019 | `0019_additional_features.sql` | All 6 new features | ✅ **NEW - RUN THIS** |

---

## Migration 0019 Details

**File**: `migrations/0019_additional_features.sql`

**Features Included**:

1. **Digital ID Cards**
   - `id_cards` table
   - Student/teacher ID card fields
   
2. **Alumni Network & Fundraising**
   - `alumni` table
   - `fundraising_campaigns` table
   - `donations` table
   - `mentorship_requests` table

3. **Enhanced School Shop**
   - `shopping_cart` table
   - `store_orders` table
   - `order_items` table
   - Enhanced `store_products` columns

4. **Reward Points & Badges**
   - `student_points` table
   - `point_transactions` table
   - `badges` table
   - `student_badges` table
   - `badge_criteria` table
   - `rewards_catalog` table
   - `reward_redemptions` table

5. **Video Conferencing**
   - `virtual_classes` table
   - `class_attendance_virtual` table

6. **Custom Learning Paths**
   - `learning_paths` table
   - `learning_path_modules` table
   - `student_learning_paths` table
   - `module_progress` table
   - `adaptive_recommendations` table

**Total New Tables**: 22  
**Sample Data**: 4 badges, 4 rewards

---

## Quick Start

### If You Haven't Run Any Migrations:

```bash
# Run all migrations in order
# In Supabase SQL Editor, run each file from 0001 to 0019
```

### If You Already Have Migrations 0001-0018:

```bash
# Just run the new one:
# migrations/0019_additional_features.sql
```

---

## Verification

After running migration 0019, verify with:

```sql
-- Check new tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'student_points',
  'virtual_classes',
  'learning_paths',
  'alumni',
  'shopping_cart',
  'id_cards'
);
-- Should return 6 rows

-- Check sample data
SELECT COUNT(*) FROM badges; -- Should be >= 4
SELECT COUNT(*) FROM rewards_catalog; -- Should be >= 4
```

---

## Frontend Components Ready

All frontend components are ready and waiting for this migration:

- ✅ IDCardGenerator.tsx
- ✅ RewardsSystem.tsx
- ✅ Leaderboard.tsx
- ✅ AwardPoints.tsx
- ✅ EnhancedShop.tsx
- ✅ AlumniNetwork.tsx
- ✅ VirtualClassroom.tsx
- ✅ LearningPathsDashboard.tsx
- ✅ IDCardManagement.tsx

---

## Next Steps

1. ✅ Run `migrations/0019_additional_features.sql` in Supabase
2. ✅ Verify tables created successfully
3. ✅ Integrate components into dashboards
4. ✅ Test each feature
5. ✅ Deploy!

---

## Rollback (If Needed)

If you need to undo migration 0019:

```sql
-- Drop all new tables (in reverse order due to dependencies)
DROP TABLE IF EXISTS adaptive_recommendations CASCADE;
DROP TABLE IF EXISTS module_progress CASCADE;
DROP TABLE IF NOT EXISTS student_learning_paths CASCADE;
DROP TABLE IF EXISTS learning_path_modules CASCADE;
DROP TABLE IF EXISTS learning_paths CASCADE;
DROP TABLE IF EXISTS class_attendance_virtual CASCADE;
DROP TABLE IF EXISTS virtual_classes CASCADE;
DROP TABLE IF EXISTS reward_redemptions CASCADE;
DROP TABLE IF EXISTS rewards_catalog CASCADE;
DROP TABLE IF EXISTS badge_criteria CASCADE;
DROP TABLE IF EXISTS student_badges CASCADE;
DROP TABLE IF EXISTS badges CASCADE;
DROP TABLE IF EXISTS point_transactions CASCADE;
DROP TABLE IF EXISTS student_points CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS store_orders CASCADE;
DROP TABLE IF EXISTS shopping_cart CASCADE;
DROP TABLE IF EXISTS mentorship_requests CASCADE;
DROP TABLE IF EXISTS donations CASCADE;
DROP TABLE IF EXISTS fundraising_campaigns CASCADE;
DROP TABLE IF EXISTS alumni CASCADE;
DROP TABLE IF EXISTS id_cards CASCADE;

-- Remove added columns
ALTER TABLE students 
DROP COLUMN IF EXISTS id_card_number,
DROP COLUMN IF EXISTS blood_type,
DROP COLUMN IF EXISTS emergency_contact;

ALTER TABLE teachers 
DROP COLUMN IF EXISTS id_card_number,
DROP COLUMN IF EXISTS employee_id;

ALTER TABLE store_products 
DROP COLUMN IF EXISTS images,
DROP COLUMN IF EXISTS sizes,
DROP COLUMN IF EXISTS colors,
DROP COLUMN IF EXISTS discount_percentage,
DROP COLUMN IF EXISTS description,
DROP COLUMN IF EXISTS sku,
DROP COLUMN IF EXISTS is_active;
```

---

**Ready to deploy! 🚀**
