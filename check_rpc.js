
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

async function checkRPC() {
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('🧪 Checking RPC: get_dashboard_stats...');
    
    // We can't easily "list" RPCs via standard client, 
    // but we can try to call it with dummy data.
    const { data, error } = await supabase.rpc('get_dashboard_stats', {
        p_school_id: 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1',
        p_branch_id: null
    });

    if (error) {
        if (error.message.includes('does not exist')) {
            console.error('❌ RPC "get_dashboard_stats" does NOT exist in the database.');
        } else {
            console.error('❌ RPC call failed, but it might exist:', error.message);
        }
    } else {
        console.log('✅ RPC "get_dashboard_stats" exists and is working!');
        console.log('📊 Stats:', data);
    }
}

checkRPC();
