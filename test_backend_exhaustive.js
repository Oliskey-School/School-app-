
const API_URL = 'http://localhost:5000/api';

async function testBackend() {
    console.log('🚀 Starting Exhaustive Backend Integration Tests...');

    let token = '';
    let schoolId = '';
    let teacherId = '';

    // 1. Health Check
    try {
        const health = await fetch('http://localhost:5000/');
        const data = await health.json();
        console.log('✅ Health Check:', data.status);
    } catch (err) {
        console.error('❌ Health Check Failed:', err.message);
        process.exit(1);
    }

    // 2. Login
    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@demo.com', password: 'password123' })
        });
        const data = await res.json();
        token = data.token;
        schoolId = data.user.school_id;
        console.log('✅ Login Successful. School:', schoolId);
    } catch (err) {
        console.error('❌ Login Error:', err.message);
        process.exit(1);
    }

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    teacherId = 'f65c2228-566f-4559-9182-4dbcd5985b05';

    const endpoints = [
        { name: 'Auth Verify', path: '/auth/verify' },
        { name: 'Dashboard Stats', path: `/dashboard/stats?schoolId=${schoolId}` },
        { name: 'Students', path: `/students?schoolId=${schoolId}` },
        { name: 'Teachers', path: `/teachers?schoolId=${schoolId}` },
        { name: 'Classes', path: `/classes?schoolId=${schoolId}` },
        { name: 'Fees', path: `/fees?schoolId=${schoolId}` },
        { name: 'Notices', path: `/notices?schoolId=${schoolId}` },
        { name: 'Attendance', path: `/attendance?schoolId=${schoolId}&date=${new Date().toISOString().split('T')[0]}` },
        { name: 'Assignments', path: `/assignments?schoolId=${schoolId}` },
        { name: 'Exams', path: `/exams?schoolId=${schoolId}` },
        { name: 'Quizzes', path: `/quizzes?schoolId=${schoolId}` },
        { name: 'Lesson Plans', path: `/lesson-plans?schoolId=${schoolId}` },
        { name: 'Forum Topics', path: `/forum/topics?schoolId=${schoolId}` },
        { name: 'Transactions', path: `/transactions?schoolId=${schoolId}` },
        { name: 'Timetable', path: `/timetable?schoolId=${schoolId}` },
        { name: 'Virtual Classes', path: `/virtual-classes?schoolId=${schoolId}` },
        { name: 'Resources', path: `/resources?schoolId=${schoolId}` },
        { name: 'Student Reports', path: `/student-reports?schoolId=${schoolId}` },
        { name: 'AI Resources', path: `/ai/generated-resources?schoolId=${schoolId}&teacherId=${teacherId}` }
    ];

    for (const endpoint of endpoints) {
        try {
            const res = await fetch(`${API_URL}${endpoint.path}`, { headers });
            const data = await res.json();
            if (res.ok) {
                const count = Array.isArray(data) ? ` (Count: ${data.length})` : '';
                console.log(`✅ ${endpoint.name} fetched successfully${count}.`);
            } else {
                console.warn(`⚠️  ${endpoint.name} failed: ${res.status} - ${data.message || 'Error'}`);
            }
        } catch (err) {
            console.error(`❌ ${endpoint.name} Error:`, err.message);
        }
    }

    console.log('🏁 Exhaustive Backend Integration Tests Completed.');
}

testBackend();
