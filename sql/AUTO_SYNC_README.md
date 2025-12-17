# Auto-Sync Users to Auth Accounts

## Overview
This SQL script sets up automatic synchronization between the `users` table and the `auth_accounts` table. When a new user is created, an authentication account is automatically generated for them.

## Features
1. **Auto-Create Auth Accounts**: Automatically creates auth_accounts entries when new users are inserted
2. **Backfill Existing Users**: Includes a one-time backfill to create auth accounts for existing users
3. **Password Generation**: Uses the same pattern as the application (surname + "1234")
4. **Secure Hashing**: Passwords are hashed using bcrypt via PostgreSQL's pgcrypto extension

## How to Run

### Option 1: Using Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy the contents of `auto_sync_users_to_auth.sql`
4. Paste into the SQL Editor
5. Click "Run" to execute

### Option 2: Using psql Command Line
```bash
psql -h your-db-host -U your-username -d your-database -f sql/auto_sync_users_to_auth.sql
```

### Option 3: Using Supabase CLI
```bash
supabase db push
```

## What Happens

### 1. Extension Installation
- Enables `pgcrypto` extension for password hashing

### 2. Trigger Function Creation
- Creates `auto_create_auth_account()` function that:
  - Extracts surname from user's name
  - Generates username (first letter of role + name with dots)
  - Generates password (surname + "1234")
  - Hashes the password using bcrypt
  - Inserts into auth_accounts table

### 3. Trigger Setup
- Creates a trigger on the `users` table
- Fires AFTER INSERT for each new user
- Automatically calls the auth account creation function

### 4. Backfill Existing Users
- One-time execution to create auth accounts for existing users
- Only affects users without auth accounts
- Safe to run multiple times (uses ON CONFLICT DO NOTHING)

## Examples

### User Creation Generates Auth Account
```sql
-- When you insert a new user:
INSERT INTO users (email, name, role) 
VALUES ('john.doe@school.com', 'John Doe', 'Teacher');

-- An auth account is automatically created with:
-- username: 'tjohn.doe'
-- password: 'doe1234' (hashed)
-- user_type: 'Teacher'
```

### Username Pattern
- **Student**: `s` + name (e.g., "sadebayo.oluwaseun")
- **Teacher**: `t` + name (e.g., "tjohn.adeoye")
- **Parent**: `p` + name (e.g., "pmary.johnson")
- **Admin**: `a` + name (e.g., "ajames.smith")

### Password Pattern
- Always: `surname + "1234"`
- Example: "Oluwaseun" → "oluwaseun1234"

## Verification

After running the script, verify it worked:

```sql
-- Check if trigger exists
SELECT 
    trigger_name, 
    event_manipulation, 
    event_object_table 
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_auto_create_auth_account';

-- View users and their auth accounts
SELECT 
    u.id,
    u.name,
    u.email,
    u.role,
    aa.username,
    aa.is_active,
    aa.created_at
FROM users u
LEFT JOIN auth_accounts aa ON aa.user_id = u.id;
```

## Maintenance

### Disable Auto-Sync
If you need to temporarily disable auto-sync:
```sql
DROP TRIGGER IF EXISTS trigger_auto_create_auth_account ON users;
```

### Re-enable Auto-Sync
```sql
CREATE TRIGGER trigger_auto_create_auth_account
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_auth_account();
```

## Security Notes
- Passwords are hashed using bcrypt (cost factor 10)
- Original passwords are never stored in plain text
- The password generation pattern is deterministic (based on surname)
- Consider changing the default password pattern for production use

## Troubleshooting

### Error: extension "pgcrypto" does not exist
**Solution**: The script enables it automatically, but if you see this error:
```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

### Error: username already exists
**Solution**: This is expected behavior. The script uses `ON CONFLICT DO NOTHING` to skip duplicates.

### No auth accounts created during backfill
**Solution**: Check if users already have auth accounts:
```sql
SELECT COUNT(*) FROM users u
LEFT JOIN auth_accounts aa ON aa.user_id = u.id
WHERE aa.id IS NULL;
```

## Related Files
- `auth_accounts_schema.sql` - Schema definition for auth_accounts table
- `lib/auth.ts` - Application authentication logic
- `components/admin/UserAccountsScreen.tsx` - UI for managing user accounts
