
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const API_URL = process.env.VITE_API_URL || 'http://localhost:3000/api';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testFeeStatusUpdate() {
    console.log('🚀 Starting Fee Status Verification...');

    try {
        // 1. Get a Demo Student
        const { data: student } = await supabase
            .from('students')
            .select('id, school_id')
            .limit(1)
            .single();

        if (!student) {
            console.error('❌ No students found to test with.');
            return;
        }

        console.log(`👤 Using Student ID: ${student.id}`);

        // 2. Create a Dummy Fee
        const { data: fee, error: createError } = await supabase
            .from('student_fees')
            .insert({
                student_id: student.id,
                school_id: student.school_id,
                title: 'Test Fee Status',
                amount: 5000,
                due_date: new Date().toISOString(),
                status: 'Pending'
            })
            .select()
            .single();

        if (createError) throw createError;
        console.log(`📝 Created Test Fee: ${fee.id} (Status: ${fee.status})`);

        // 3. Call API to Update Status (Simulating Backend Call)
        // We'll use fetch directly to test the Endpoint
        // We need a valid token. For this test, we'll sign in as admin.
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: 'admin@demo.com',
            password: 'password123'
        });

        if (authError || !authData.session) {
            throw new Error('Failed to login as admin for API test');
        }

        const token = authData.session.access_token;
        console.log('🔑 Obtained Auth Token');

        // 4. Update Status to 'Paid' via API
        const response = await fetch(`${API_URL}/fees/${fee.id}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status: 'Paid' })
        });

        if (!response.ok) {
            const txt = await response.text();
            throw new Error(`API Request Failed: ${response.status} ${txt}`);
        }

        const updatedFeeApi = await response.json();
        console.log(`✅ API Response: Status is now '${updatedFeeApi.status}'`);

        // 5. Verify in DB
        const { data: verifiedFee } = await supabase
            .from('student_fees')
            .select('status')
            .eq('id', fee.id)
            .single();

        if (verifiedFee?.status === 'Paid') {
            console.log('🎉 DB Verification Passed: Fee is marked as Paid.');
        } else {
            console.error('❌ DB Verification Failed:', verifiedFee);
        }

        // 6. Cleanup
        await supabase.from('student_fees').delete().eq('id', fee.id);
        console.log('🧹 Cleanup done.');

    } catch (err) {
        console.error('❌ Test Failed:', err);
    }
}

testFeeStatusUpdate();
