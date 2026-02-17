
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

try { require('dotenv').config(); } catch (e) { }

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function fixDemoParentId() {
    console.log('--- Fixing Demo Parent ID ---');

    const TARGET_UUID = '33333333-3333-3333-3333-333333333333';
    const NEW_ID = 'OLISKEY_MAIN_PAR_0001';

    // 1. Update Database Record
    const { error: dbError } = await supabase
        .from('parents')
        .update({ school_generated_id: NEW_ID })
        .eq('id', TARGET_UUID);

    if (dbError) {
        console.error('Error updating DB:', dbError);
    } else {
        console.log(`✅ Database updated: parents table ID -> ${NEW_ID}`);
    }

    // 2. Update Auth Metadata (so ProfileContext picks it up correctly without fallback logic)
    const { data: user, error: authError } = await supabase.auth.admin.updateUserById(
        TARGET_UUID,
        { user_metadata: { school_generated_id: NEW_ID } }
    );

    if (authError) {
        console.error('Error updating Auth Metadata:', authError);
    } else {
        console.log(`✅ Auth Metadata updated: school_generated_id -> ${NEW_ID}`);
    }
}

fixDemoParentId();
