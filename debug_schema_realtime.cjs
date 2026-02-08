
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

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
        // Code 42703 (undefined_column) or PGRST301
        if (error.message.includes("does not exist") || error.code === 'PGRST301') {
            console.log("   -> The column 'class_name' likely DOES NOT exist.");
        }
    } else {
        console.log("✅ Column 'class_name' exists and is accessible.");
    }

    console.log("\nChecking 'teachers' table schema...");
    const { data: teachers, error: tErr } = await supabase
        .from('teachers')
        .select('*')
        .limit(1);

    if (tErr) console.error("Error fetching teachers:", tErr);
    else if (teachers && teachers.length > 0) {
        console.log("Teacher Columns:", Object.keys(teachers[0]));
    } else {
        console.log("Teachers table accessible but empty.");
    }

    // Check if 'assignments' is in realtime
    console.log("\nChecking Realtime configuration...");

    return new Promise((resolve) => {
        const channel = supabase.channel('test_realtime_assignments_' + Date.now())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'assignments' }, (payload) => {
                console.log("   -> Realtime event received!", payload.eventType);
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log("✅ Subscribed to 'assignments' table successfully.");

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
