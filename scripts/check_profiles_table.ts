
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
    console.log("Checking Profiles Table...");

    // 1. Get all profiles
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*');

    if (error) {
        console.error("Error fetching profiles:", error);
        return;
    }

    console.log(`Found ${profiles.length} profiles.`);
    console.table(profiles);

    // 2. Check specific roles distribution
    const roles = profiles.reduce((acc, p) => {
        const r = p.role || 'NULL';
        acc[r] = (acc[r] || 0) + 1;
        return acc;
    }, {});
    console.log("Role Distribution:", roles);

    // 3. Test the helper function (if possible via rpc, created in previous step)
    // We'll try to call it with a known ID if any exist
    if (profiles.length > 0) {
        const testId = profiles[0].id;
        console.log(`Testing get_user_role for ID: ${testId}`);
        const { data: roleCheck, error: rpcError } = await supabase.rpc('get_user_role', { user_id: testId });

        if (rpcError) {
            console.log("RPC Check Failed (Might not be exposed or permission issue?):", rpcError.message);
        } else {
            console.log(`RPC Result: ${roleCheck}`);
            if (roleCheck !== profiles[0].role) {
                console.error("MISMATCH! RPC returned different role than table!");
            } else {
                console.log("RPC matches table data ✅");
            }
        }
    }
}

run();
