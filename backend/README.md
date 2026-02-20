# School App Backend

This repository contains the backend logic, database migrations, and Supabase configuration for the School App.

## Directory Structure
- `supabase/migrations`: Database schema changes.
- `supabase/functions`: Edge functions.
- `supabase/seed.sql`: Seed data.

## Deployment Instructions

1.  **Environment Setup**:
    -   Copy `.env.local` to `.env`.
    -   Ensure `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are set.

2.  **Database Migration**:
    -   We have consolidated migrations 0050-0066 into `0050_baseline_migration.sql`.
    -   Run `supabase db push` to apply changes.

3.  **Critical Fixes**:
    -   Run `fix_critical_bugs.sql` immediately after deployment to resolve known security and performance issues (554 items) and fix the `users_pkey` sequence error.
    -   Command: `psql -h ... -f fix_critical_bugs.sql`

## Custom ID Management
We use the **Sch_Bra_Rol_Num** format for custom IDs.
-   Sequence management is handled via `generate_school_role_id`.
-   If you encounter "duplicate key" errors, run the sequence sync block in `fix_critical_bugs.sql`.

## Security & Performance
-   RLS is enforced on all tables.
-   Functions are secured with `search_path`.
-   FK indexes are optimized.
