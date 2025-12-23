# 📁 SQL Scripts Directory

This directory contains all SQL scripts for the School Management System. Scripts are organized by category for easy navigation.

---

## 🚀 **ESSENTIAL SCRIPTS (Start Here)**

### **1. Initial Database Setup**
- **`MAGIC_FIX_ALL.sql`** - Complete database schema with all tables, sample data, and initial setup
- **`complete_supabase_schema.sql`** - Alternative complete schema setup

### **2. User Synchronization (IMPORTANT!)**
- **`AUTO_SYNC_COMPLETE.sql`** ⭐ **RUN THIS** - Automatic user sync between Supabase Auth and public tables
  - Creates triggers for automatic user creation/deletion
  - Ensures auth_accounts, users table, and Supabase Auth stay in sync
  - See `AUTO_SYNC_README.md` for detailed documentation

### **3. Student Grade Assignment Fix**
- **`COMPLETE_GRADE_FIX.sql`** ⭐ **RUN THIS IF STUDENTS DON'T APPEAR IN REPORTS** - Fixes missing grade/section assignments
  - Diagnoses current state
  - Assigns proper grades and sections
  - Verifies the fix
  - See `GRADE_ISSUE_EXPLAINED.md` for details

### **4. Create Missing Profiles**
- **`CREATE_MISSING_PROFILES.sql`** - Creates student/teacher/parent profiles for users who are missing them
  - Backfills missing entries in students, teachers, parents tables
  - Uses default values (grade 10, section A for students)

---

## 🔍 **DIAGNOSTIC SCRIPTS**

Use these to check system state and troubleshoot issues:

- **`SIMPLE_DIAGNOSTIC.sql`** - Quick check of student data and grade/section assignments
- **`CHECK_STUDENT_GRADES.sql`** - Detailed student grade/section analysis
- **`CHECK_ACTUAL_STATE.sql`** - Check user counts across all tables
- **`CHECK_NEW_USER.sql`** - Verify if newly created user exists
- **`VERIFY_TRIGGERS.sql`** - Check if auto-sync triggers are installed
- **`verify_counts.sql`** - Verify user counts across tables
- **`DIAGNOSE_USER_COUNTS.sql`** - Detailed user count diagnostics

---

## 🔧 **MAINTENANCE & FIXES**

### User Account Fixes
- **`FIX_AUTH_ACCOUNTS.sql`** - Clean up orphaned auth_accounts records
- **`DELETE_5_NEWEST.sql`** - Remove 5 newest users (use with caution!)
- **`CLEANUP_EXTRA_USERS.sql`** - Remove orphaned users without auth accounts
- **`SIMPLE_CLEANUP.sql`** - Simple cleanup of unverified users

### Authentication & Security
- **`auth_accounts_schema.sql`** - Auth accounts table schema
- **`delete_auth_user_func.sql`** - Function to delete auth users
- **`ensure_auth_account_func.sql`** - Ensure auth account exists for user
- **`fix_auth_accounts_permissions.sql`** - Fix auth_accounts table permissions
- **`fix_auth_accounts_view.sql`** - Fix auth_accounts view
- **`fix_auth_trigger_password_error.sql`** - Fix password trigger errors

### Access Control & Permissions
- **`disable_users_rls.sql`** - Disable RLS on users table
- **`enable_rls_public_tables.sql`** - Enable RLS on all public tables
- **`quick_fix_permissions.sql`** - Quick permissions fix
- **`fix_classes_access.sql`** - Fix classes table access
- **`fix_auth_accounts_permissions.sql`** - Fix auth accounts permissions

### User Features
- **`add_2fa_to_users.sql`** - Add 2FA support to users
- **`add_phone_to_users.sql`** - Add phone column to users
- **`add_notification_preferences.sql`** - Add notification preferences

---

## 📚 **FEATURE-SPECIFIC SCRIPTS**

### Classes & Academic
- **`fix_classes_table.sql`** - Fix classes table structure
- **`insert_classes_only.sql`** - Insert class data only
- **`insert_sample_classes.sql`** - Insert sample classes
- **`populate_classes.sql`** - Populate classes with data
- **`assign_classes_to_teacher.sql`** - Assign classes to teachers
- **`fix_assignments_schema.sql`** - Fix assignments table schema
- **`fix_assignment_rls.sql`** - Fix assignment RLS policies

### CBT (Computer-Based Testing)
- **`cbt_schema.sql`** - CBT system schema
- **`fix_cbt_schema.sql`** - Fix CBT schema issues
- **`final_cbt_fix.sql`** - Final CBT system fix

### Communication
- **`chat_schema.sql`** - Chat/messaging system schema
- **`email_logs_schema.sql`** - Email logging system

### Academic Performance
- **`report_cards_schema.sql`** - Report cards schema
- **`add_total_mark.sql`** - Add total mark column

### Timetable
- **`fix_timetable_schema.sql`** - Fix timetable table structure
- **`add_timetable_status.sql`** - Add status column to timetable

### Notifications
- **`fix_notifications_schema.sql`** - Fix notifications table

### Teacher Settings
- **`update_teacher_settings_schema.sql`** - Update teacher settings schema

---

## 🗂️ **REFERENCE & BACKFILL SCRIPTS**

- **`backfill_profiles.sql`** - Backfill missing profile data
- **`backfill_role_tables.sql`** - Backfill role-specific tables
- **`ensure_reference_tables.sql`** - Ensure reference tables exist
- **`create_missing_static_tables.sql`** - Create missing static tables
- **`create_system_settings.sql`** - Create system settings table

---

## 🔄 **LEGACY/DEPRECATED SCRIPTS**

These scripts were used during initial development or have been superseded:

- `SYNC_AUTH_USERS.sql` - Superseded by `AUTO_SYNC_COMPLETE.sql`
- `IMPROVED_SYNC.sql` - Superseded by `AUTO_SYNC_COMPLETE.sql`
- `auto_sync_users_to_auth.sql` - Superseded by `AUTO_SYNC_COMPLETE.sql`
- `FIX_STUDENT_GRADES.sql` - Superseded by `COMPLETE_GRADE_FIX.sql`
- `fix_schema_and_data.sql` - Old schema fix
- `setup_supabase_schema.sql` - Old setup script

---

## 📖 **DOCUMENTATION FILES**

- **`AUTO_SYNC_README.md`** - Complete guide to the auto-sync system
- **`GRADE_ISSUE_EXPLAINED.md`** - Explanation of student grade assignment issues
- **`MANUAL_INSTRUCTIONS.md`** - Manual execution instructions for SQL scripts
- **`FIX_DASHBOARD_GUIDE.md`** - Dashboard fix guide

---

## 🎯 **RECOMMENDED WORKFLOW**

### For New Database Setup:
1. Run `MAGIC_FIX_ALL.sql` - Sets up complete database schema
2. Run `AUTO_SYNC_COMPLETE.sql` - Enables automatic user synchronization
3. Run `CREATE_MISSING_PROFILES.sql` - Creates missing user profiles
4. Run `COMPLETE_GRADE_FIX.sql` - Fixes student grade assignments

### For Existing Database Maintenance:
1. Run `SIMPLE_DIAGNOSTIC.sql` - Check current state
2. Run specific fix scripts as needed
3. Run `VERIFY_TRIGGERS.sql` - Ensure triggers are working

### For User Synchronization Issues:
1. Run `CHECK_ACTUAL_STATE.sql` - Check user counts
2. Run `AUTO_SYNC_COMPLETE.sql` - Reinstall sync triggers
3. Run `FIX_AUTH_ACCOUNTS.sql` - Clean up orphaned records

### For Student Display Issues:
1. Run `SIMPLE_DIAGNOSTIC.sql` - Check student data
2. Run `COMPLETE_GRADE_FIX.sql` - Fix grade assignments
3. Verify in app that students appear in reports

---

## ⚠️ **SAFETY NOTES**

- **Always backup your database** before running destructive scripts
- **Test in development** before running in production
- Scripts marked with ⭐ are safe to run multiple times (idempotent)
- Scripts with "DELETE" or "CLEANUP" in the name should be used with caution
- Review the script contents before executing, especially for production

---

## 🆘 **TROUBLESHOOTING**

**Problem: Students don't appear in Student Reports**
→ Run `COMPLETE_GRADE_FIX.sql`

**Problem: User counts don't match across Dashboard/Auth**
→ Run `AUTO_SYNC_COMPLETE.sql`

**Problem: Missing student/teacher/parent profiles**
→ Run `CREATE_MISSING_PROFILES.sql`

**Problem: Orphaned auth_accounts records**
→ Run `FIX_AUTH_ACCOUNTS.sql`

**Problem: Need to check system state**
→ Run `SIMPLE_DIAGNOSTIC.sql`

---

## 📝 **MAINTAINING THIS DIRECTORY**

To keep this directory clean:
1. Archive old/deprecated scripts to an `archive/` subdirectory
2. Use clear naming conventions: `ACTION_TARGET_DESCRIPTION.sql`
3. Document all new scripts in this README
4. Include comments at the top of each script explaining its purpose
5. Mark safe-to-rerun scripts with comments

---

**Last Updated**: December 23, 2024  
**Total Scripts**: 68  
**Repository**: https://github.com/Oliskey/School-app-
