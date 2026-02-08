
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load env
const envPath = path.resolve(__dirname, '.env');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log("Checking 'assignments' table schema...");

    // Try to select 'class_name' from assignments
    // We limit to 1 to confirm existence.
    const { data, error } = await supabase
        .from('assignments')
        .select('class_name')
        .limit(1);

    if (error) {
        console.error("❌ Error selecting 'class_name':", error.message);
        if (error.message.includes("does not exist") || error.code === 'PGRST301') { // Column not found code often
            console.log("   -> The column 'class_name' likely DOES NOT exist.");
        }
    } else {
        console.log("✅ Column 'class_name' exists and is accessible.");
    }

    // Check if 'assignments' is in realtime
    console.log("\nChecking Realtime configuration...");
    // We can't query pg tables directly from client usually without RPC.
    // But we can test a subscription.

    return new Promise((resolve) => {
        const channel = supabase.channel('test_realtime_assignments')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'assignments' }, (payload) => {
                console.log("   -> Realtime event received!", payload.eventType);
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log("✅ Subscribed to 'assignments' table successfully.");
                    console.log("   (Note: This confirms subscription is possible, but not necessarily that REPLICA IDENTITY is set correctly for all events, but usually sufficient).");

                    // Clean up
                    supabase.removeChannel(channel);
                    resolve(true);
                } else {
                    console.log("❌ Failed to subscribe:", status);
                    resolve(false);
                }
            });

        // Timeout
        setTimeout(() => {
            // console.log("   (Timeout waiting for subscription confirmation)");
            // resolve(false);
        }, 5000);
    });
}

checkSchema();
