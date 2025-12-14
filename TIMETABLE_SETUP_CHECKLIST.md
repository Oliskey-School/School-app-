# Timetable Publishing - Quick Start Checklist

## 🚀 Setup Checklist

### Database Setup
- [ ] Open Supabase SQL Editor
- [ ] Run the migration file: `sql/add_timetable_status.sql`
- [ ] Verify new columns exist in `timetable` table:
  - [ ] `status` column (VARCHAR)
  - [ ] `created_at` column (TIMESTAMP)
  - [ ] `updated_at` column (TIMESTAMP)
- [ ] Check indexes are created:
  - [ ] `idx_timetable_status`
  - [ ] `idx_timetable_class`
  - [ ] `idx_timetable_teacher`

### Code Verification
- [ ] `components/admin/TimetableEditor.tsx` - Updated with Supabase integration
- [ ] `components/admin/TimetableScreen.tsx` - New overview screen created
- [ ] `components/shared/TimetableScreen.tsx` - Updated with published filter
- [ ] All files compile without errors

## 🧪 Testing Checklist

### Admin Testing
- [ ] Login as admin
- [ ] Navigate to Timetable Management
- [ ] Create a new timetable
- [ ] Click "Save Changes"
  - [ ] Success message appears
  - [ ] Timetable appears in "Drafts" filter
  - [ ] Check Supabase: status = 'Draft'
- [ ] Click "Publish"
  - [ ] Success message: "Timetable published! Now visible to teachers and students."
  - [ ] Status badge changes to "Published"
  - [ ] Timetable appears in "Published" filter
  - [ ] Check Supabase: status = 'Published'
- [ ] Edit published timetable
  - [ ] Changes save correctly
  - [ ] Status remains "Published"

### Teacher Testing
- [ ] Login as teacher
- [ ] Navigate to Timetable view
- [ ] Verify:
  - [ ] Only published timetables are visible
  - [ ] Only assigned periods are shown
  - [ ] Class names are displayed for each period
  - [ ] Week view works correctly
  - [ ] Day view works correctly
- [ ] Create a draft timetable (as admin)
- [ ] Verify teacher CANNOT see the draft

### Student Testing
- [ ] Login as student
- [ ] Navigate to Timetable view
- [ ] Verify:
  - [ ] Only published timetables are visible
  - [ ] Complete class schedule is shown
  - [ ] All subjects and times are correct
  - [ ] Week view works correctly
  - [ ] Day view works correctly
- [ ] Create a draft timetable (as admin)
- [ ] Verify student CANNOT see the draft

## 🔍 Database Verification

### Check Data in Supabase
- [ ] Open Supabase Table Editor
- [ ] Select `timetable` table
- [ ] Verify columns exist: `status`, `created_at`, `updated_at`
- [ ] Check sample entries:
  - [ ] `status` is either 'Draft' or 'Published'
  - [ ] `teacher_id` is correctly assigned
  - [ ] `class_name` matches expected format
  - [ ] Timestamps are populated

### Test Queries
Run these queries in Supabase SQL Editor:

```sql
-- Check all published timetables
SELECT * FROM timetable WHERE status = 'Published';

-- Check draft timetables
SELECT * FROM timetable WHERE status = 'Draft';

-- Check timetables for a specific teacher (replace 1 with actual teacher_id)
SELECT * FROM timetable WHERE teacher_id = 1 AND status = 'Published';

-- Check timetables for a specific class
SELECT * FROM timetable WHERE class_name LIKE '%10A%' AND status = 'Published';

-- Count entries by status
SELECT status, COUNT(*) as count FROM timetable GROUP BY status;
```

## ✅ Feature Validation

### Core Functionality
- [ ] Admins can create timetables
- [ ] Admins can save as draft
- [ ] Admins can publish timetables
- [ ] Admins can edit published timetables
- [ ] Teachers see only published timetables
- [ ] Teachers see only their assigned periods
- [ ] Students see only published timetables
- [ ] Students see their complete class schedule

### UI/UX
- [ ] Overview screen shows all timetables
- [ ] Filter tabs work (All, Published, Draft)
- [ ] Status badges display correctly
- [ ] Success/error messages appear
- [ ] Loading states work
- [ ] Mobile responsive design works

### Data Integrity
- [ ] No duplicate entries after save
- [ ] Teacher IDs are correctly assigned
- [ ] Old entries are deleted before new save
- [ ] Timestamps are updated correctly

## 🐛 Common Issues & Solutions

### Issue: Migration fails
**Solution**: 
- Check if columns already exist
- Use `IF NOT EXISTS` in ALTER statements
- Verify Supabase connection

### Issue: Teacher can't see timetable
**Solution**:
- Verify teacher_id in database matches logged-in user
- Check timetable status is 'Published'
- Verify teacher is assigned to at least one period

### Issue: Student can't see timetable
**Solution**:
- Check class_name format in database
- Verify student's grade and section are correct
- Ensure timetable status is 'Published'

### Issue: Publish button doesn't work
**Solution**:
- Check browser console for errors
- Verify Supabase connection
- Check teachers table has matching names
- Verify status column exists

## 📊 Success Criteria

All items below should be ✅:

- [ ] Database migration completed successfully
- [ ] Admin can create and publish timetables
- [ ] Teachers see only their published periods
- [ ] Students see only their published class schedule
- [ ] Draft timetables are not visible to teachers/students
- [ ] No console errors during save/publish
- [ ] Data persists correctly in Supabase
- [ ] All user roles work as expected

## 📝 Notes

**Important Points**:
1. Always run database migration first
2. Test with different user roles
3. Verify data in Supabase after each operation
4. Check browser console for errors
5. Ensure teacher names in timetable match teachers table

**Performance Tips**:
- Indexes are created for better query performance
- Use filters to limit data fetched
- Cache timetable data where appropriate

## 🎉 Completion

When all checkboxes are ✅, the feature is ready for production!

**Date Completed**: _______________
**Tested By**: _______________
**Approved By**: _______________

---

**For detailed documentation, see:**
- `TIMETABLE_IMPLEMENTATION_SUMMARY.md` - Quick overview
- `TIMETABLE_PUBLISHING_GUIDE.md` - Complete technical guide
