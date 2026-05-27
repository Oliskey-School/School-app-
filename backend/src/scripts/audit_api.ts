
import axios from 'axios';
import { PrismaClient } from '../../generated/prisma-client';

const prisma = new PrismaClient();
const API_URL = 'http://localhost:5000/api';
const SCHOOL_ID = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';

async function testFeature(name: string, testFn: () => Promise<void>) {
    console.log(`\n🔍 Testing Feature: ${name}`);
    try {
        await testFn();
        console.log(`✅ ${name}: Operational`);
        return true;
    } catch (err: any) {
        const errorMsg = err.response?.data?.message || err.response?.data?.error || err.message;
        const details = err.response?.data?.details ? JSON.stringify(err.response.data.details) : '';
        console.error(`❌ ${name}: Failing - ${errorMsg} ${details}`);
        return false;
    }
}

async function run() {
    let passing = 0;
    let total = 0;

    // Login to get token
    console.log('🔑 Logging in as Admin...');
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
        email: 'admin-eff8e7ca@demo.com',
        password: 'password123'
    });
    
    const setCookie = loginRes.headers['set-cookie'];
    if (!setCookie) throw new Error('No cookies received');
    
    let cookies = setCookie.map(c => c.split(';')[0]).join('; ');
    
    // Fetch CSRF Token
    const csrfRes = await axios.get(`${API_URL}/auth/csrf-token`, {
        headers: { Cookie: cookies }
    });
    const csrfToken = csrfRes.data.csrfToken;
    
    // Add CSRF cookie to our cookie string if it was sent
    const csrfCookie = csrfRes.headers['set-cookie'];
    if (csrfCookie) {
        cookies += '; ' + csrfCookie.map(c => c.split(';')[0]).join('; ');
    }
    
    const headers = { 
        Cookie: cookies,
        'X-CSRF-Token': csrfToken
    };
    
    console.log('Logged in successfully. CSRF Token obtained.');

    // 1. Overview
    total++;
    if (await testFeature('Overview API', async () => {
        const res = await axios.get(`${API_URL}/dashboard/stats?schoolId=${SCHOOL_ID}`, { headers });
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
        if (!res.data.totalStudents) throw new Error('Missing student count');
    })) passing++;

    // 2. Analytics
    total++;
    if (await testFeature('Analytics API', async () => {
        const res = await axios.get(`${API_URL}/academic/analytics?schoolId=${SCHOOL_ID}&term=current`, { headers });
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
    })) passing++;

    // 3. Reports
    total++;
    if (await testFeature('Reports API', async () => {
        const res = await axios.get(`${API_URL}/admin-hub/reports/saved`, { headers });
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
    })) passing++;

    // 4. Classes
    total++;
    if (await testFeature('Class List API', async () => {
        const res = await axios.get(`${API_URL}/classes?schoolId=${SCHOOL_ID}`, { headers });
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
        if (!Array.isArray(res.data)) throw new Error('Not an array');
    })) passing++;

    // 5. Students
    total++;
    if (await testFeature('Student List API', async () => {
        const res = await axios.get(`${API_URL}/students?schoolId=${SCHOOL_ID}`, { headers });
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
    })) passing++;

    // 6. Persistence Check: Add Student
    total++;
    if (await testFeature('Add Student & DB Persistence', async () => {
        const testName = `AuditTest${Date.now()}`;
        const addRes = await axios.post(`${API_URL}/students/enroll`, {
            school_id: SCHOOL_ID,
            branch_id: 'demo-v-eff8e7ca',
            firstName: 'Audit',
            lastName: `Student${Date.now()}`,
            email: `audit_${Date.now()}@test.com`,
            grade: 1,
            section: 'A'
        }, { headers });
        
        if (addRes.status !== 201) throw new Error(`Add failed: ${addRes.status}`);
        const studentId = addRes.data.studentId;

        // Verify in DB
        const dbStudent = await prisma.student.findUnique({ where: { id: studentId } });
        if (!dbStudent) throw new Error('Student not found in database after creation');
        
        console.log(`   Verification: Student ${studentId} persisted in DB.`);
    })) passing++;

    // 7. Teachers
    total++;
    if (await testFeature('Teacher List API', async () => {
        const res = await axios.get(`${API_URL}/teachers?schoolId=${SCHOOL_ID}`, { headers });
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
    })) passing++;

    // 8. Teacher Performance
    total++;
    if (await testFeature('Teacher Performance API', async () => {
        const res = await axios.get(`${API_URL}/teachers/performance?schoolId=${SCHOOL_ID}`, { headers });
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
    })) passing++;

    // 9. Timetable
    total++;
    if (await testFeature('Timetable API', async () => {
        const res = await axios.get(`${API_URL}/timetables?schoolId=${SCHOOL_ID}`, { headers });
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
    })) passing++;

    // 10. Fees
    total++;
    if (await testFeature('Fee Management API', async () => {
        const res = await axios.get(`${API_URL}/fees?schoolId=${SCHOOL_ID}`, { headers });
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
    })) passing++;

    // 11. Exams
    total++;
    if (await testFeature('Exam Management API', async () => {
        const res = await axios.get(`${API_URL}/exams?schoolId=${SCHOOL_ID}`, { headers });
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
    })) passing++;

    // 12. Profile Settings
    total++;
    if (await testFeature('Profile Settings API', async () => {
        const res = await axios.get(`${API_URL}/auth/me`, { headers });
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
    })) passing++;

    // 13. System Settings
    total++;
    if (await testFeature('System Settings API', async () => {
        const res = await axios.get(`${API_URL}/schools/${SCHOOL_ID}`, { headers });
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
    })) passing++;

    // 14. Academic Settings
    total++;
    if (await testFeature('Academic Settings API', async () => {
        const res = await axios.get(`${API_URL}/academic/curricula?schoolId=${SCHOOL_ID}`, { headers });
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
    })) passing++;

    // 15. Financial Settings
    total++;
    if (await testFeature('Financial Settings API', async () => {
        const res = await axios.get(`${API_URL}/fees/config?schoolId=${SCHOOL_ID}`, { headers });
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
    })) passing++;

    // 16. Communication Hub
    total++;
    if (await testFeature('Communication Hub API', async () => {
        const res = await axios.get(`${API_URL}/notices?schoolId=${SCHOOL_ID}`, { headers });
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
    })) passing++;

    // --- BATCH 2 ---

    // 17. Teacher Attendance
    total++;
    if (await testFeature('Teacher Attendance API', async () => {
        const res = await axios.get(`${API_URL}/teachers/attendance?schoolId=${SCHOOL_ID}`, { headers });
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
    })) passing++;

    // 18. Fee Details & Payment Persistence
    total++;
    if (await testFeature('Fee Details & Payment Persistence', async () => {
        // 1. Get a fee
        const feesRes = await axios.get(`${API_URL}/fees?schoolId=${SCHOOL_ID}`, { headers });
        const fees = feesRes.data;
        if (!fees || fees.length === 0) throw new Error('No fees found to test');
        
        console.log('DEBUG: Found Fee:', JSON.stringify(fees[0], null, 2));
        const feeId = fees[0].id;
        console.log('DEBUG: Extracted Fee ID:', feeId);

        // 2. Get details
        const detailRes = await axios.get(`${API_URL}/fees/${feeId}`, { headers });
        if (detailRes.status !== 200) throw new Error(`Detail status ${detailRes.status}`);

        // 3. Record a payment
        const paymentRes = await axios.post(`${API_URL}/fees/record-payment`, {
            school_id: SCHOOL_ID,
            student_id: fees[0].studentId,
            fee_id: feeId,
            amount: 10,
            method: 'Cash',
            reference: `AUDIT-PAY-${Date.now()}`
        }, { headers });
        
        if (paymentRes.status !== 201 && paymentRes.status !== 200) throw new Error(`Payment failed: ${paymentRes.status}`);
        
        console.log(`   Verification: Payment recorded for fee ${feeId}.`);
    })) passing++;

    // 19. Add Exam Persistence
    total++;
    if (await testFeature('Add Exam & DB Persistence', async () => {
        const examName = `Audit Exam ${Date.now()}`;
        const addRes = await axios.post(`${API_URL}/exams`, {
            schoolId: SCHOOL_ID,
            title: examName,
            subject: 'Mathematics',
            date: new Date().toISOString(),
            total_marks: 100,
            term: 'First Term'
        }, { headers });

        if (addRes.status !== 201) throw new Error(`Add failed: ${addRes.status}`);
        const examId = addRes.data.id;

        // Verify in DB
        const dbExam = await prisma.exam.findUnique({ where: { id: examId } });
        if (!dbExam) throw new Error('Exam not found in database after creation');
        
        console.log(`   Verification: Exam ${examId} persisted in DB.`);
    })) passing++;

    // 20. Report Card Publishing
    total++;
    if (await testFeature('Report Card Publishing API', async () => {
        const res = await axios.post(`${API_URL}/report-cards/publish`, {
            schoolId: SCHOOL_ID,
            term: 'First Term',
            session: '2024/2025'
        }, { headers });
        // publishing might return 200 or 201
        if (res.status !== 200 && res.status !== 201) throw new Error(`Status ${res.status}`);
    })) passing++;

    // 21. User Roles
    total++;
    if (await testFeature('User Roles API', async () => {
        const res = await axios.get(`${API_URL}/users?school_id=${SCHOOL_ID}`, { headers });
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
    })) passing++;

    // 22. Audit Logs
    total++;
    if (await testFeature('Audit Logs API', async () => {
        const res = await axios.get(`${API_URL}/audit-logs?schoolId=${SCHOOL_ID}`, { headers });
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
    })) passing++;

    // --- BATCH 4 ---

    // 23. Attendance
    total++;
    if (await testFeature('Attendance API', async () => {
        const res = await axios.get(`${API_URL}/attendance?schoolId=${SCHOOL_ID}&date=${new Date().toISOString()}`, { headers });
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
    })) passing++;

    // 24. Transport Routes
    total++;
    if (await testFeature('Transport Routes API', async () => {
        const res = await axios.get(`${API_URL}/transport/routes?schoolId=${SCHOOL_ID}`, { headers });
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
    })) passing++;

    // 25. Hostel
    total++;
    if (await testFeature('Hostel API', async () => {
        const res = await axios.get(`${API_URL}/hostels?schoolId=${SCHOOL_ID}`, { headers });
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
    })) passing++;

    // --- BATCH 5 ---

    // 26. Behavior Notes
    total++;
    if (await testFeature('Behavior Notes API', async () => {
        const res = await axios.get(`${API_URL}/behavior/notes?schoolId=${SCHOOL_ID}`, { headers });
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
    })) passing++;

    // 27. Parental Consents
    total++;
    if (await testFeature('Parental Consents API', async () => {
        const res = await axios.get(`${API_URL}/admin-hub/consents?schoolId=${SCHOOL_ID}`, { headers });
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
    })) passing++;

    // 28. Enrollment Stats
    total++;
    if (await testFeature('Enrollment Stats API', async () => {
        // Checking via Student List or dashboard stats since no direct "enrollment" route was found
        const res = await axios.get(`${API_URL}/students?schoolId=${SCHOOL_ID}&status=enrolled`, { headers });
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
    })) passing++;

    // --- BATCH 6 ---

    // 29. Payroll Dashboard
    total++;
    if (await testFeature('Payroll API', async () => {
        // Need a valid teacherId for /payroll/salary/:teacherId
        const teachersRes = await axios.get(`${API_URL}/teachers?schoolId=${SCHOOL_ID}`, { headers });
        const teachers = teachersRes.data;
        if (!teachers || teachers.length === 0) throw new Error('No teachers to test payroll');
        
        const teacherId = teachers[0].id;
        const res = await axios.get(`${API_URL}/payroll/salary/${teacherId}?schoolId=${SCHOOL_ID}`, { headers });
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
    })) passing++;

    // 30. Conference Scheduling
    total++;
    if (await testFeature('Conference Scheduling API', async () => {
        // Since router is mounted at /api/conferences in index.ts, the full path is /api/conferences
        const res = await axios.get(`${API_URL}/conferences?schoolId=${SCHOOL_ID}`, { headers });
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
    })) passing++;

    // --- BATCH 7 ---

    // 31. Academic Tracks
    total++;
    if (await testFeature('Academic Tracks API', async () => {
        const res = await axios.get(`${API_URL}/academic/tracks?schoolId=${SCHOOL_ID}`, { headers });
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
    })) passing++;

    // 32. Academic Terms
    total++;
    if (await testFeature('Academic Terms API', async () => {
        const res = await axios.get(`${API_URL}/academic/terms?schoolId=${SCHOOL_ID}`, { headers });
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
    })) passing++;

    // 33. Extracurricular Activities
    total++;
    if (await testFeature('Extracurricular API', async () => {
        const res = await axios.get(`${API_URL}/extracurriculars?schoolId=${SCHOOL_ID}`, { headers });
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
    })) passing++;

    console.log(`\n📊 Final Result: ${passing}/${total} features operational (${((passing/total)*100).toFixed(2)}%)`);
    await prisma.$disconnect();
}

run().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
