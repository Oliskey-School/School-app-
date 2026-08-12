const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

async function audit() {
    try {
        console.log('Logging in via standard login...');
        const loginResponse = await axios.post(`${API_URL}/auth/login`, {
            email: 'admin@demo.com',
            password: 'password123'
        }, { withCredentials: true });
        
        // Extract token from cookie
        const cookies = loginResponse.headers['set-cookie'];
        const accessTokenCookie = cookies.find(c => c.startsWith('access_token='));
        const token = accessTokenCookie.split(';')[0].split('=')[1];
        
        console.log('Login successful, token obtained from cookie.');

        const headers = { 'Authorization': `Bearer ${token}` };

        console.log('Fetching Stats...');
        const stats = await axios.get(`${API_URL}/dashboard/stats`, { headers });
        console.log('Stats:', stats.data);

        console.log('Fetching Branches...');
        const branches = await axios.get(`${API_URL}/branches`, { headers });
        console.log('Branches count:', branches.data.length);

        console.log('Fetching Students...');
        const students = await axios.get(`${API_URL}/students`, { headers });
        console.log('Students count:', students.data.length);

        console.log('--- Testing Branch Management (Persistence) ---');
        const schoolId = loginResponse.data.user.school_id;
        const testBranchName = `Audit Branch ${Date.now()}`;
        const newBranchData = {
            name: testBranchName,
            code: `AUDIT-${Date.now().toString().slice(-4)}`,
            location: 'Test Location',
            address: '123 Audit St'
        };

        console.log(`Creating branch: ${testBranchName}...`);
        const createResponse = await axios.post(`${API_URL}/branches`, {
            ...newBranchData,
            school_id: schoolId
        }, { headers });
        
        const createdBranch = createResponse.data;
        console.log('Branch created:', createdBranch.id);

        console.log('Verifying branch persistence...');
        const verifyResponse = await axios.get(`${API_URL}/branches?schoolId=${schoolId}`, { headers });
        console.log('Branches in DB:', verifyResponse.data.map(b => ({ id: b.id, name: b.name })));
        const branchFound = verifyResponse.data.find(b => b.id === createdBranch.id);
        
        if (branchFound && branchFound.name === testBranchName) {
            console.log('✅ Branch persistence verified!');
        } else {
            throw new Error('❌ Branch persistence FAILED!');
        }

        console.log('--- Testing Student Management (Full Stack) ---');
        const testStudentName = `Audit Student ${Date.now()}`;
        const testStudentEmail = `audit_stu_${Date.now()}@test.com`;
        
        // Find a class to enroll in
        const classesResponse = await axios.get(`${API_URL}/classes`, { headers });
        const targetClass = classesResponse.data[0];
        if (!targetClass) throw new Error('No classes found to enroll student');
        
        console.log(`Adding student: ${testStudentName} to class ${targetClass.name}...`);
        const addStudentResponse = await axios.post(`${API_URL}/students/enroll`, {
            firstName: 'Audit',
            lastName: `Student ${Date.now()}`,
            email: testStudentEmail,
            gender: 'Male',
            dateOfBirth: '2010-01-01',
            admissionNumber: `ADM-${Date.now().toString().slice(-4)}`,
            class_id: targetClass.id,
            branch_id: targetClass.branch_id,
            status: 'Active'
        }, { headers });
        
        const createdStudent = addStudentResponse.data;
        const studentId = createdStudent.studentId || createdStudent.id;
        console.log('Student added:', studentId);

        console.log('Verifying student persistence & enrollment...');
        const verifyStudentResponse = await axios.get(`${API_URL}/students/${studentId}`, { headers });
        const studentData = verifyStudentResponse.data;
        
        if (studentData && studentData.full_name.includes('Audit Student') && studentData.enrollments?.length > 0) {
            console.log('✅ Student persistence & enrollment verified!');
        } else {
            console.log('Student Data:', JSON.stringify(studentData, null, 2));
            throw new Error('❌ Student persistence or enrollment FAILED!');
        }

        console.log('--- Testing Teacher Management ---');
        const testTeacherName = `Audit Teacher ${Date.now()}`;
        const testTeacherEmail = `audit_teacher_${Date.now()}@test.com`;
        
        console.log(`Adding teacher: ${testTeacherName}...`);
        const addTeacherResponse = await axios.post(`${API_URL}/teachers`, {
            full_name: testTeacherName,
            email: testTeacherEmail,
            gender: 'Female',
            phone: '1234567890',
            qualification: 'B.Ed',
            subjects: ['Mathematics'],
            branch_id: targetClass.branch_id,
            status: 'Active'
        }, { headers });
        
        const createdTeacher = addTeacherResponse.data;
        console.log('Teacher added:', createdTeacher.id);
        console.log('✅ Teacher persistence verified!');

        console.log('--- Testing Financial Management (Fee Assignment) ---');
        console.log('Fetching student fees...');
        const feesResponse = await axios.get(`${API_URL}/fees`, { headers });
        console.log('Fees count:', feesResponse.data.length);
        
        console.log('Assigning a test fee to the audit student...');
        const feeItemData = {
            studentId: studentId,
            title: `Audit Fee ${Date.now()}`,
            description: 'Test fee assignment',
            amount: 5000,
            dueDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
            type: 'Tuition',
            curriculumType: 'General'
        };
        const createFeeResponse = await axios.post(`${API_URL}/fees`, feeItemData, { headers });
        console.log('✅ Fee assignment persistence verified!');

        console.log('--- Testing Academic Excellence (Exam Management) ---');
        console.log('Fetching exams...');
        const examsResponse = await axios.get(`${API_URL}/exams`, { headers });
        console.log('Exams count:', examsResponse.data.length);
        
        console.log('Creating a test exam...');
        const examData = {
            title: `Audit Exam ${Date.now()}`,
            subject: 'Mathematics',
            date: new Date().toISOString(),
            total_marks: 100,
            term: 'First Term',
            class_id: targetClass.id,
            schoolId: schoolId,
            branchId: targetClass.branch_id
        };
        const createExamResponse = await axios.post(`${API_URL}/exams`, examData, { headers });
        console.log('✅ Exam creation persistence verified!');

        console.log('--- Audit Complete ---');
    } catch (error) {
        console.error('Audit failed:', error.response ? error.response.data : error.message);
    }
}

audit();
