
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

async function checkRPC() {
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('🧪 Checking RPC: get_teacher_analytics...');
    
    // Test with a sample teacher ID if possible, or just check existence
    const { data, error } = await supabase.rpc('get_teacher_analytics', {
        p_teacher_id: '43fed44d-94d7-49b4-b5f7-ab7aad3e3704', // Sample from previous check
        p_school_id: 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1'
    });

    if (error) {
        if (error.message.includes('does not exist')) {
            console.error('❌ RPC "get_teacher_analytics" does NOT exist in the database.');
        } else {
            console.error('❌ RPC call failed, but it might exist:', error.message);
        }
    } else {
        console.log('✅ RPC "get_teacher_analytics" exists and is working!');
        console.log('📊 Stats:', data);
    }
}

checkRPC();
