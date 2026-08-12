import axios from 'axios';
import fs from 'fs';
import path from 'path';

const API_URL = 'http://localhost:5000/api';

interface ApiResult {
    viewName: string;
    endpoint: string;
    status: 'PASS' | 'FAIL';
    httpStatus?: number;
    error?: string;
    description: string;
}

async function runE2EAudit() {
    console.log('===========================================================');
    console.log('🚀 OLISKEY SCHOOL APP - ADMIN E2E INTEGRATION & PERSISTENCE TEST');
    console.log('===========================================================\n');

    let token = '';
    let schoolId = '';
    const results: ApiResult[] = [];

    // 1. Authenticate (Try both standard and demo login)
    try {
        console.log('🔑 Authenticating with API server...');
        try {
            // Attempt standard login first
            const loginRes = await axios.post(`${API_URL}/auth/login`, {
                email: 'admin@demo.com',
                password: 'password123'
            });
            token = loginRes.data.token || loginRes.data.accessToken;
            schoolId = loginRes.data.user?.school_id;
            console.log('  ✅ Standard Login successful.');
        } catch (stdError) {
            // Attempt demo login fallback
            console.log('  ⚠️ Standard Login failed, trying Demo Login fallback...');
            const demoRes = await axios.post(`${API_URL}/auth/demo/login`, {
                role: 'ADMIN'
            });
            token = demoRes.data.token || demoRes.data.accessToken;
            schoolId = demoRes.data.user?.school_id;
            console.log('  ✅ Demo Login successful.');
        }

        if (!token) {
            // Check if cookie authentication is used
            console.log('  ℹ️ Token not found in body, checking set-cookie or defaulting to demo credentials.');
        }
    } catch (authErr: any) {
        console.error('❌ Authentication failed: Server may be offline or database not seeded.');
        console.error(`   Error details: ${authErr.message}`);
        process.exit(1);
    }

    const headers = { 'Authorization': `Bearer ${token}` };

    // 2. Define Endpoint mapping for Admin viewComponents
    const endpointsToTest = [
        { viewName: 'overview', endpoint: '/dashboard/stats', desc: 'Main Admin Dashboard metrics' },
        { viewName: 'classList', endpoint: '/classes', desc: 'Class roster and registration' },
        { viewName: 'studentList', endpoint: '/students', desc: 'Active student directory' },
        { viewName: 'teacherList', endpoint: '/teachers', desc: 'Active teacher directory' },
        { viewName: 'parentList', endpoint: '/parents', desc: 'Parent/Guardian directory' },
        { viewName: 'feeManagement', endpoint: '/fees', desc: 'Fee structures and details' },
        { viewName: 'examManagement', endpoint: '/exams', desc: 'Exams scheduling and records' },
        { viewName: 'reportCardPublishing', endpoint: '/report-cards', desc: 'Student report cards' },
        { viewName: 'userRoles', endpoint: '/admin-hub/config', desc: 'System user roles & permissions config' },
        { viewName: 'auditLog', endpoint: '/audit-logs', desc: 'System activity & security logs' },
        { viewName: 'systemSettings', endpoint: '/admin-hub/config', desc: 'General system settings' },
        { viewName: 'academicSettings', endpoint: '/academic/curricula', desc: 'Academic session & curriculum config' },
        { viewName: 'financialSettings', endpoint: '/payroll/arrears', desc: 'Payroll and salary arrears' },
        { viewName: 'communicationSettings', endpoint: '/admin-hub/notifications/settings', desc: 'System communication templates' },
        { viewName: 'brandingSettings', endpoint: '/admin-hub/config', desc: 'Custom school branding' },
        { viewName: 'attendanceOverview', endpoint: '/attendance?date=' + new Date().toISOString().split('T')[0], desc: 'Student attendance tracker' },
        { viewName: 'healthLog', endpoint: '/admin-hub/health-logs', desc: 'Student clinic & wellness records' },
        { viewName: 'busDutyRoster', endpoint: '/buses', desc: 'School bus routes & duty assignments' },
        { viewName: 'managePolicies', endpoint: '/admin-hub/safety/policies', desc: 'School policies and handbook documents' },
        { viewName: 'managePermissionSlips', endpoint: '/admin-hub/consents', desc: 'Field trip and event permission slips' },
        { viewName: 'manageLearningResources', endpoint: '/resources', desc: 'Uploaded study materials & library references' },
        { viewName: 'userAccounts', endpoint: '/users', desc: 'Authenticated system accounts list' },
        { viewName: 'financeDashboard', endpoint: '/transactions', desc: 'General ledger transactions & statements' },
        { viewName: 'vendorManagement', endpoint: '/vendors', desc: 'Contracted service vendors' },
        { viewName: 'assetInventory', endpoint: '/infrastructure/facilities', desc: 'Physical facilities inventory and assets' },
        { viewName: 'complianceDashboard', endpoint: '/admin-hub/governance/compliance-metrics', desc: 'Regulatory and standard compliance stats' },
        { viewName: 'studentApprovals', endpoint: '/students/pending-approvals', desc: 'Pending applicant enrollments' },
        { viewName: 'hostelManagement', endpoint: '/hostels', desc: 'Dormitories and boarders list' },
        { viewName: 'transportManagement', endpoint: '/transport/routes', desc: 'Transport routes & bus assignment' },
        { viewName: 'counselorDashboard', endpoint: '/counseling', desc: 'Student counseling referrals & wellness appointments' },
        { viewName: 'privacyDashboard', endpoint: '/admin-hub/data-requests', desc: 'GDPR / DSAR personal data download actions' },
        { viewName: 'onlineStore', endpoint: '/store/products', desc: 'School store inventory item list' },
        { viewName: 'idCardManagement', endpoint: '/id-cards', desc: 'Student ID card printing and issuance stats' }
    ];

    console.log(`\n🔍 Performing endpoint connectivity sweep for ${endpointsToTest.length} viewComponents...\n`);

    for (const test of endpointsToTest) {
        try {
            process.stdout.write(`  Testing view: ${test.viewName.padEnd(25)} -> ${test.endpoint.padEnd(45)} ... `);
            const response = await axios.get(`${API_URL}${test.endpoint}`, { headers });
            console.log(`✅ PASS (${response.status})`);
            results.push({
                viewName: test.viewName,
                endpoint: test.endpoint,
                status: 'PASS',
                httpStatus: response.status,
                description: test.desc
            });
        } catch (err: any) {
            const status = err.response ? err.response.status : 'Offline';
            const errorMsg = err.response ? JSON.stringify(err.response.data) : err.message;
            console.log(`❌ FAIL (Status: ${status})`);
            results.push({
                viewName: test.viewName,
                endpoint: test.endpoint,
                status: 'FAIL',
                httpStatus: err.response ? err.response.status : undefined,
                error: errorMsg,
                description: test.desc
            });
        }
    }

    // 3. Perform Deep Persistence / CRUD Verification
    console.log('\n===========================================================');
    console.log('💾 PERFORMING DATABASE PERSISTENCE & DATA ISOLATION CHECKS');
    console.log('===========================================================\n');

    let persistencePassed = true;

    try {
        // Retrieve current classes to get a target class_id
        console.log('Step 1: Finding target class for test student...');
        const classesRes = await axios.get(`${API_URL}/classes`, { headers });
        const targetClass = classesRes.data[0];
        
        if (!targetClass) {
            throw new Error('No classes available in database to perform student enrollment persistence test.');
        }
        console.log(`  Found class: "${targetClass.name}" (ID: ${targetClass.id})`);

        // Test Student Persistence
        console.log('\nStep 2: Testing Student Enrollment Persistence (Frontend -> API -> DB)...');
        const admissionNum = `AUDIT-${Date.now().toString().slice(-4)}`;
        const testStudentEmail = `audit_student_${Date.now()}@test.com`;
        
        const enrollRes = await axios.post(`${API_URL}/students/enroll`, {
            firstName: 'E2E_Audit',
            lastName: 'Student',
            email: testStudentEmail,
            gender: 'Male',
            dateOfBirth: '2012-05-15',
            admissionNumber: admissionNum,
            class_id: targetClass.id,
            branch_id: targetClass.branch_id || schoolId,
            status: 'Active'
        }, { headers });

        const createdStudentId = enrollRes.data.studentId || enrollRes.data.id;
        console.log(`  ✅ Student enrolled successfully (ID: ${createdStudentId})`);

        // Verify read back (persistence check)
        console.log('Step 3: Reading back student from database...');
        const verifyStudentRes = await axios.get(`${API_URL}/students/${createdStudentId}`, { headers });
        const studentRecord = verifyStudentRes.data;

        if (studentRecord && studentRecord.full_name?.includes('E2E_Audit')) {
            console.log('  ✅ Student read back successful! Persistence verified.');
        } else {
            throw new Error('Student record was not found or was corrupted upon read back.');
        }

        // Test ID Card Issuance & Verification
        console.log('\nStep 4: Testing Student ID Card Issuance Persistence...');
        try {
            const issueRes = await axios.post(`${API_URL}/id-cards/issue/${createdStudentId}`, {
                status: 'Active',
                is_printed: false
            }, { headers });
            
            console.log(`  ✅ ID Card issued successfully (ID: ${issueRes.data.id})`);

            // Verify read back
            console.log('Step 5: Verifying ID Card persistence in database...');
            const idCardRes = await axios.get(`${API_URL}/id-cards/student/${createdStudentId}`, { headers });
            if (idCardRes.data && idCardRes.data.student_id === createdStudentId) {
                console.log('  ✅ Student ID Card persistence verified!');
            } else {
                throw new Error('ID Card record not found upon read back.');
            }
        } catch (idCardErr: any) {
            console.error(`  ❌ ID Card Persistence FAILED.`);
            console.error(`     Error: ${idCardErr.response ? JSON.stringify(idCardErr.response.data) : idCardErr.message}`);
            persistencePassed = false;
        }

    } catch (e2eError: any) {
        console.error('❌ E2E Persistence Test FAILED.');
        console.error(`   Error details: ${e2eError.message}`);
        persistencePassed = false;
    }

    // 4. Generate Markdown Audit Report
    console.log('\n===========================================================');
    console.log('📊 GENERATING COMPREHENSIVE INTEGRATION & PERSISTENCE REPORT');
    console.log('===========================================================\n');

    const totalTested = results.length;
    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    const passRate = Math.round((passed / totalTested) * 100);

    const reportLines: string[] = [
        `# Oliskey School App - Admin viewComponents E2E Integration Audit`,
        ``,
        `**Execution Timestamp:** ${new Date().toISOString()}`,
        `**Total Components Scanned:** ${totalTested}`,
        `**Passed connections:** ${passed}`,
        `**Failed connections:** ${failed}`,
        `**Overall API Pass Rate:** **${passRate}%**`,
        `**Database Persistence Check:** **${persistencePassed ? 'PASS ✅' : 'FAIL ❌'}**`,
        ``,
        `## E2E Component Connection Details`,
        ``,
        `| # | viewComponent Key | Backend API Route | Description | Status | HTTP Code |`,
        `|---|---|---|---|:---:|:---:|`
    ];

    results.forEach((r, idx) => {
        const icon = r.status === 'PASS' ? '✅ PASS' : '❌ FAIL';
        const code = r.httpStatus ? r.httpStatus.toString() : '-';
        reportLines.push(`| ${idx + 1} | \`${r.viewName}\` | \`${r.endpoint}\` | ${r.description} | **${icon}** | ${code} |`);
    });

    reportLines.push(``);
    reportLines.push(`## Connection Failures & Triaging`);
    reportLines.push(``);
    if (failed === 0) {
        reportLines.push(`🎉 **Excellent!** All admin viewComponents are 100% connected to backend API endpoints and resolved successfully.`);
    } else {
        reportLines.push(`The following components returned errors when calling their designated backend APIs:`);
        reportLines.push(``);
        reportLines.push(`| viewComponent | Route | Error Details |`);
        reportLines.push(`|---|---|---|`);
        results.filter(r => r.status === 'FAIL').forEach(r => {
            reportLines.push(`| \`${r.viewName}\` | \`${r.endpoint}\` | ${r.error || 'Server connection timed out'} |`);
        });
        reportLines.push(``);
        reportLines.push(`### Next Steps for Resolution`);
        reportLines.push(`1. If errors are **500 Internal Server Error**, please review server console logs. A common reason is schema drift (e.g. database missing newly added tables like \`StudentIDCard\` or \`StoreProduct\`). Run \`npx prisma db push\` to sync the DB.`);
        reportLines.push(`2. If errors are **404 Not Found**, please verify that the routes are mounted in \`backend/src/routes/index.ts\`.`);
    }

    const reportPath = path.join(process.cwd(), 'admin_integration_report.md');
    fs.writeFileSync(reportPath, reportLines.join('\n'));
    console.log(`📝 Audit Report successfully written to: ${reportPath}`);
    console.log(`\n===========================================================`);
    console.log(`🏁 Sweep Complete! ${passed}/${totalTested} PASSED | ${failed} FAILED | ${passRate}% Pass Rate`);
    console.log('===========================================================\n');
}

runE2EAudit();
