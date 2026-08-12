const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

async function audit() {
    try {
        console.log('Logging in as Student...');
        const loginResponse = await axios.post(`${API_URL}/auth/login`, {
            email: 'student1@demo.com',
            password: 'password123'
        }, { withCredentials: true });
        
        const cookies = loginResponse.headers['set-cookie'];
        const accessTokenCookie = cookies.find(c => c.startsWith('access_token='));
        const token = accessTokenCookie.split(';')[0].split('=')[1];
        
        console.log('Login successful, student token obtained.');

        const headers = { 'Authorization': `Bearer ${token}` };
        const student = loginResponse.data.user;

        console.log('--- Testing Dashboard Overview ---');
        const overviewResponse = await axios.get(`${API_URL}/students/me/dashboard`, { headers });
        console.log('Dashboard primary class:', overviewResponse.data.primaryClass ? 'Found' : 'Missing');
        console.log('Assignments count:', overviewResponse.data.assignments?.length || 0);

        console.log('--- Testing Subject List ---');
        const subjectsResponse = await axios.get(`${API_URL}/students/me/subjects`, { headers });
        console.log('Subjects count:', subjectsResponse.data.length);

        console.log('--- Testing Assignment Submission ---');
        const assignments = overviewResponse.data.assignments || [];
        if (assignments.length > 0) {
            const targetAssignment = assignments[0];
            console.log(`Submitting assignment: ${targetAssignment.title}...`);
            const submissionData = {
                assignment_id: targetAssignment.id,
                content: 'This is my audit submission.',
                submission_date: new Date().toISOString()
            };
            // Route from index.ts: router.use('/assignments', assignmentRoutes);
            // From assignment.routes.ts: router.post('/:id/submit', authenticate, submitAssignment);
            const submitResponse = await axios.post(`${API_URL}/assignments/${targetAssignment.id}/submit`, submissionData, { headers });
            console.log('✅ Assignment submission verified!');
        } else {
            console.warn('No pending assignments found for student.');
        }

        console.log('--- Testing Results View ---');
        const resultsResponse = await axios.get(`${API_URL}/students/me/report-cards`, { headers });
        console.log('Published report cards:', resultsResponse.data.length);
        console.log('✅ Results view verified!');

        console.log('--- Audit Complete ---');
    } catch (error) {
        console.error('Audit failed:', error.response ? error.response.data : error.message);
    }
}

audit();
