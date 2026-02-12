const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const backendUrl = 'http://localhost:5000';

async function testConnections() {
    console.log('🔍 Starting System Connectivity Test...');

    // 1. Test Supabase
    console.log('\n--- 1. Supabase Connection ---');
    if (!supabaseUrl || !supabaseKey) {
        console.error('❌ Supabase credentials missing in .env');
    } else {
        const supabase = createClient(supabaseUrl, supabaseKey);
        try {
            const { data, error } = await supabase.from('schools').select('*', { count: 'exact', head: true });
            if (error) throw error;
            console.log('✅ Supabase Connection: SUCCESS');
            console.log(`📊 Schools found in DB: ${data || 0}`);
        } catch (err) {
            console.error('❌ Supabase Connection: FAILED', err.message);
        }
    }

    // 2. Test Backend
    console.log('\n--- 2. Express Backend Connection ---');
    try {
        const response = await fetch(`${backendUrl}/`);
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Backend Connection: SUCCESS');
            console.log('🤖 Backend Status:', JSON.stringify(data));
        } else {
            console.error('❌ Backend Connection: FAILED', response.statusText);
        }
    } catch (err) {
        console.error('❌ Backend Connection: FAILED (Is the server running?)', err.message);
    }

    // 3. Test API Health Endpoint
    console.log('\n--- 3. API Health Check ---');
    try {
        const response = await fetch(`${backendUrl}/api/dashboard/stats`);
        console.log(`📡 API /api/dashboard/stats returned status: ${response.status} (${response.statusText})`);
        if (response.status === 401) {
            console.log('✅ API is reachable and enforcing authentication.');
        } else if (response.ok) {
            console.log('✅ API is reachable and responding.');
        }
    } catch (err) {
        console.error('❌ API Health Check: FAILED', err.message);
    }

    console.log('\n--- Connectivity Test Complete ---');
}

testConnections();
