
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_KEY are required in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runSimulation() {
    console.log('🚀 Starting Phase 4: Authentic Live Simulation Test...');

    const timestamp = Date.now();
    const testEmail = `sim_admin_${timestamp}@simulate.com`;
    const testSchoolName = `Simulation Academy ${timestamp}`;

    try {
        // 1. Create Auth User with School Metadata (Triggers handle_new_school_signup)
        console.log(`[1/4] Registering User in Auth: ${testEmail}...`);
        const startTime = Date.now();

        const { data: { user }, error: authError } = await supabase.auth.admin.createUser({
            email: testEmail,
            password: 'Password123!',
            user_metadata: {
                full_name: 'Simulation Admin',
                school_name: testSchoolName,
                motto: 'Simulating Excellence',
                address: '123 Simulator Drive'
            },
            email_confirm: true
        });

        if (authError) throw authError;
        console.log(`✅ Auth User Created (ID: ${user.id})`);

        // 2. Wait for Trigger and Verify School Creation
        console.log('[2/4] Waiting for Backend Triggers (School Creation & Linkage)...');
        let school = null;
        let publicUser = null;

        // Poll for up to 5 seconds
        for (let i = 0; i < 5; i++) {
            await new Promise(r => setTimeout(r, 1000));

            const { data: u } = await supabase
                .from('users')
                .select('*, schools(*)')
                .eq('id', user.id)
                .single();

            if (u && u.school_id) {
                publicUser = u;
                school = u.schools;
                break;
            }
        }

        if (!school) throw new Error('Timeout: School creation/linkage trigger failed to fire.');

        const latency = Date.now() - startTime;
        console.log(`✅ School "${school.name}" automatically created and linked to User.`);
        console.log(`✅ System Latency: ${latency}ms`);

        // 3. Verification
        console.log('[3/4] Running Linkage Integrity Check...');
        if (publicUser.school_id === school.id && publicUser.role === 'admin') {
            console.log('🎉 VERIFICATION SUCCESS: End-to-End Registration Flow Validated.');
            console.log(`   Admin: ${publicUser.email}`);
            console.log(`   School ID: ${school.id}`);
            console.log(`   Branding: ${school.primary_color || 'Default'}`);
        } else {
            throw new Error('Linkage or Role mismatch in public.users!');
        }

        // 4. Trigger Live Handshake (Notification)
        console.log('[4/4] Triggering Live Handshake (Notification)...');
        const { error: notifyError } = await supabase
            .from('notifications')
            .insert({
                school_id: school.id,
                user_id: user.id,
                title: 'Simulation Successful!',
                message: 'Your school is now live and linked via real-time triggers.',
                is_read: false
            });

        if (notifyError) throw notifyError;
        console.log('✅ Real-time Notification Dispatched to School Channel.');

        console.log('\n--- DATA INTEGRITY SUMMARY ---');
        console.log(`Status: Pass`);
        console.log(`Total Time: ${latency}ms`);
        console.log(`Linkage: ${user.id} -> ${school.id}`);

    } catch (err) {
        console.error('❌ Simulation Failed:', err.message);
        process.exit(1);
    }
}

runSimulation();
