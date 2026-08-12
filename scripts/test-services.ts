import { ClassService } from '../backend/src/services/class.service';
import { NoticeService } from '../backend/src/services/notice.service';
import { FeeService } from '../backend/src/services/fee.service';
import { AuditService } from '../backend/src/services/audit.service';
import { SchoolService } from '../backend/src/services/school.service';
import { DEMO_SCHOOL_ID } from '../lib/mockAuth';

async function runAuditTests() {
    console.log('🚀 [Audit-Test] Starting Service Logic Verification...');
    const results: any[] = [];

    const schoolId = DEMO_SCHOOL_ID;
    const branchId = 'all';

    // 1. Test Class Service
    try {
        console.log('--- Testing Class Service ---');
        const classes = await ClassService.getClasses(schoolId, branchId);
        console.log(`✅ Classes fetched: ${classes.length}`);
        results.push({ module: 'Academic (Classes)', status: 'PASS', detail: `${classes.length} classes found` });
    } catch (err: any) {
        console.error('❌ Class Service failed:', err.message);
        results.push({ module: 'Academic (Classes)', status: 'FAIL', detail: err.message });
    }

    // 2. Test Notice Service (Communication)
    try {
        console.log('\n--- Testing Notice Service ---');
        const testNotice = { title: 'Code Test Notice', content: 'Testing via script', audience: ['all'] };
        const notice = await NoticeService.createNotice(schoolId, branchId, testNotice);
        console.log(`✅ Notice created: ${notice.id}`);
        results.push({ module: 'Communication', status: 'PASS', detail: 'Notice created successfully' });
    } catch (err: any) {
        console.error('❌ Notice Service failed:', err.message);
        results.push({ module: 'Communication', status: 'FAIL', detail: err.message });
    }

    // 3. Test Fee Service (Financial)
    try {
        console.log('\n--- Testing Fee Service ---');
        const fees = await FeeService.getAllFees(schoolId, branchId);
        console.log(`✅ Fees fetched: ${fees.length}`);
        results.push({ module: 'Financial (Fees)', status: 'PASS', detail: `${fees.length} fees found` });
    } catch (err: any) {
        console.error('❌ Fee Service failed:', err.message);
        results.push({ module: 'Financial (Fees)', status: 'FAIL', detail: err.message });
    }

    // 4. Test Audit Service (System)
    try {
        console.log('\n--- Testing Audit Service ---');
        const log = await AuditService.createLog(schoolId, branchId, { action: 'SYSTEM_TEST', action_description: 'Running service-level audit test' });
        console.log(`✅ Audit log created: ${log.id}`);
        results.push({ module: 'System (Audit)', status: 'PASS', detail: 'Audit log created successfully' });
    } catch (err: any) {
        console.error('❌ Audit Service failed:', err.message);
        results.push({ module: 'System (Audit)', status: 'FAIL', detail: err.message });
    }
    
    // 5. Test School Service (Management)
    try {
        console.log('\n--- Testing School Service ---');
        const updateData = { curriculum_type: 'National' };
        const result = await SchoolService.updateSchool(schoolId, schoolId, updateData);
        console.log(`✅ School updated: ${result.name}`);
        results.push({ module: 'Management (School)', status: 'PASS', detail: 'School updated successfully' });
    } catch (err: any) {
        console.error('❌ School Service failed:', err.message);
        results.push({ module: 'Management (School)', status: 'FAIL', detail: err.message });
    }

    console.log('\n====================================');
    console.log('📊 FINAL TEST RESULTS');
    console.table(results);
    console.log('====================================');
}

runAuditTests()
    .catch(err => {
        console.error('💥 Fatal Test Runner Error:', err);
        process.exit(1);
    });
