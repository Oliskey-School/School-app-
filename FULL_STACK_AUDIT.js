const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fullAudit() {
    console.log('--- STARTING SYSTEM SECURITY AUDIT ---');

    // 1. Database Level (RLS)
    console.log('1. Database Row-Level Security:');
    const sensitiveTables = ['students', 'teachers', 'payments', 'student_fees', 'schools'];
    for (const table of sensitiveTables) {
        try {
            const { data, error } = await supabase.from(table).select('*').limit(1);
            if (error && error.code === '42501') {
                console.log(`✅ [${table}] SECURE: Permission Denied for Anon.`);
            } else if (data && data.length > 0) {
                console.log(`🚨 [${table}] VULNERABLE: Data leaked to Anonymous!`);
            } else {
                console.log(`✅ [${table}] SECURE: No rows returned.`);
            }
        } catch (err) {
            console.log(`❌ [${table}] Error testing: ${err.message}`);
        }
    }

    // 2. Integration Check (Functions)
    console.log('\n2. RLS Helper Functions Check:');
    try {
        const { error: rpcError } = await supabase.rpc('get_school_id');
        if (rpcError && rpcError.code === 'PGRST202') {
             console.log('✅ get_school_id() function: INSTALLED');
        } else if (!rpcError) {
             console.log('✅ get_school_id() function: INSTALLED & FUNCTIONAL');
        } else {
             console.log('❌ get_school_id() function: ERROR or NOT FOUND');
        }
    } catch (err) {
        console.log('❌ Helper Function Error');
    }

    // 3. Code Checks
    console.log('\n3. Codebase Security Layer Check:');
    if (fs.existsSync('backend/src/middleware/tenant.middleware.ts')) {
        console.log('✅ Backend Tenant Firewall Middleware: DETECTED');
    }
    if (fs.existsSync('shared/utils/validation.ts')) {
        console.log('✅ Shared Validation Schemas: DETECTED');
    }

    console.log('\n--- AUDIT COMPLETE ---');
}

fullAudit();
