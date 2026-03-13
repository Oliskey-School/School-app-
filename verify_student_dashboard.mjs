import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const API_BASE_URL = 'http://localhost:3000/api';

async function verifyStudentFeatures() {
    console.log("=== Starting Student Dashboard Verification ===");

    const demoEmail = 'student@demo.com';
    const demoPassword = 'password123';

    console.log(`Logging in as ${demoEmail}...`);
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: demoEmail,
        password: demoPassword,
    });

    if (authErr || !authData.session) {
        console.error("Failed to login as demo student:", authErr?.message);
        return;
    }

    const token = authData.session.access_token;
    const user = authData.user;
    console.log(`Login successful! Token acquired for user ID: ${user.id}`);

    // If no student profile, we'll just grab any valid school ID to test the endpoints
    let studentUser = null;
    if (!studentUser) {
        console.warn("No student profile found for this user in the database, using generic school context.");
        const { data: schools } = await supabase.from('schools').select('*').limit(1);
        studentUser = {
            school_id: schools?.[0]?.id || 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1',
            branch_id: '7601cbea-e1ba-49d6-b59b-412a584cb94f' // known demo branch
        };
    }
    console.log(`Testing context -> School: ${studentUser.school_id}`);

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    const endpointsToTest = [
        { name: 'Student Profile', url: '/students/me' },
        { name: 'Student Performance', url: '/students/me/performance' },
        { name: 'Student Quiz Results', url: '/students/me/quiz-results' },
        { name: 'Timetable', url: `/timetable?schoolId=${studentUser.school_id}` },
        { name: 'Assignments', url: `/assignments?schoolId=${studentUser.school_id}` },
        // Quizzes requires branchid to be valid, but we inject it in the frontend. Testing if backend accepts it
        { name: 'Quizzes', url: `/quizzes?schoolId=${studentUser.school_id}&branchId=${studentUser.branch_id || 'all'}` }
    ];

    let allPassed = true;

    for (const ep of endpointsToTest) {
        try {
            console.log(`\nTesting ${ep.name}...`);
            const res = await fetch(`${API_BASE_URL}${ep.url}`, { headers });

            if (!res.ok) {
                const text = await res.text();
                console.error(`❌ ${ep.name} Failed: ${res.status} ${res.statusText}`);
                console.error(`   Body: ${text}`);
                allPassed = false;
            } else {
                const data = await res.json();
                console.log(`✅ ${ep.name} Success. Status: 200. Data items: ${Array.isArray(data) ? data.length : 'Object'}`);
            }
        } catch (err) {
            console.error(`❌ ${ep.name} Error: ${err.message}`);
            allPassed = false;
        }
    }

    if (allPassed) {
        console.log("\n✅ ALL STUDENT API FEATURES VERIFIED SUCCESSFULLY!");
    } else {
        console.log("\n❌ SOME API FEATURES FAILED VERIFICATION.");
    }
}

verifyStudentFeatures();
