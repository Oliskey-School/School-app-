
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
// Use service key to perform schema changes
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Service Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixRLS() {
    console.log('\n--- Applying Notification Policy Fix ---');
    const sql = `
    DO $$
    BEGIN
        -- Safety: Drop existing conflicting policy if any
        DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
        DROP POLICY IF EXISTS "View own notifications (User)" ON public.notifications;
    END
    $$;

    -- Create/Replace the SELECT policy for authenticated users
    CREATE POLICY "Users can view own and broadcast notifications"
    ON public.notifications
    FOR SELECT
    TO authenticated
    USING (
         -- User sees their own specific notification
         auth.uid() = user_id
         -- OR user sees broadcast notification (user_id IS NULL)
         OR (user_id IS NULL)
    );
    
    -- Ensure service role bypasses RLS (already implicit, but good to clarify intent)
    ALTER TABLE public.notifications FORCE ROW LEVEL SECURITY;
    `;

    const { error } = await supabase.from('notifications').select('*').limit(1); // just a test query

    // Actually execute raw SQL if possible via an RPC or direct connection
    // Supabase-js doesn't support raw SQL unless via RPC.
    // I will try to use the 'pg' library or assume the user has psql if I can't.
    // Wait, let's use the provided `execute_sql` tool or similar if available? No, I don't have that.

    console.log('Since I cannot run raw DDL via supabase-js standard client, I will use a special RPC function if it exists.');

    // Check for exec_sql function
    const { error: rpcError } = await supabase.rpc('exec_sql', { query: sql });

    if (rpcError) {
        console.error('RPC exec_sql failed (it might not exist):', rpcError.message);
        console.log('Attempting alternative: direct node pg connection if possible? No.');
        console.log('Please run the migration manually using SQL Editor in Supabase Dashboard.');
        console.log('SQL to run:\n', sql);
    } else {
        console.log('✅ Policy applied successfully via exec_sql!');
    }
}
// Actually, let's check if we can just rely on the user running it or find another way?
// The previous step `npx supabase db execute` likely failed because local supabase CLI is not linked/setup?
// Actually I can try to use the `supabase-js` to call a generic 'exec' function if one was set up in previous migrations?
// Checking migrations for `exec`...
fixRLS();
