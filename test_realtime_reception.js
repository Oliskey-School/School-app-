
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

async function testRealtime() {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const schoolId = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1'; // Demo School

    console.log('📡 Subscribing to notifications...');

    const channel = supabase.channel('test-notifications')
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `school_id=eq.${schoolId}`
        }, (payload) => {
            console.log('✅ Real-time Notification Received:', payload.new.title);
            process.exit(0);
        })
        .subscribe((status) => {
            console.log('Channel Status:', status);
            if (status === 'SUBSCRIBED') {
                console.log('🚀 Triggering test notification...');
                triggerNotification();
            }
        });

    async function triggerNotification() {
        const { error } = await supabase.from('notifications').insert({
            school_id: schoolId,
            title: 'Test Real-time ' + Date.now(),
            message: 'Testing reception in CLI',
            audience: ['all'],
            category: 'System',
            is_read: false
        });

        if (error) {
            console.error('❌ Insert Error:', error.message);
            process.exit(1);
        } else {
            console.log('📝 Test notification inserted.');
        }
    }

    // Timeout after 10 seconds
    setTimeout(() => {
        console.error('❌ Timeout: Real-time notification not received.');
        process.exit(1);
    }, 10000);
}

testRealtime();
