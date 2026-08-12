const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

async function audit() {
    try {
        console.log('Logging in as Parent...');
        const loginResponse = await axios.post(`${API_URL}/auth/login`, {
            email: 'parent1@demo.com',
            password: 'password123'
        }, { withCredentials: true });
        
        const cookies = loginResponse.headers['set-cookie'];
        const accessTokenCookie = cookies.find(c => c.startsWith('access_token='));
        const token = accessTokenCookie.split(';')[0].split('=')[1];
        
        console.log('Login successful, parent token obtained.');

        const headers = { 'Authorization': `Bearer ${token}` };

        console.log('--- Testing Children Overview ---');
        const childrenResponse = await axios.get(`${API_URL}/parents/me/children`, { headers });
        const children = childrenResponse.data;
        console.log('Children count:', children.length);

        if (children.length > 0) {
            const targetChild = children[0];
            console.log(`Auditing child: ${targetChild.full_name}...`);

            console.log('--- Testing Child Attendance ---');
            const attendanceResponse = await axios.get(`${API_URL}/students/${targetChild.id}/attendance`, { headers });
            console.log('Attendance records count:', attendanceResponse.data.length);

            console.log('--- Testing Child Results ---');
            const resultsResponse = await axios.get(`${API_URL}/students/${targetChild.id}/report-cards`, { headers });
            console.log('Report cards count:', resultsResponse.data.length);

            console.log('--- Testing Fee Payment (Recording) ---');
            const feesResponse = await axios.get(`${API_URL}/students/${targetChild.id}/fees`, { headers });
            const pendingFee = feesResponse.data.find(f => f.status !== 'Paid');
            
            if (pendingFee) {
                console.log(`Recording payment for fee: ${pendingFee.title}...`);
                const paymentData = {
                    feeId: pendingFee.id,
                    studentId: targetChild.id,
                    amount: 1000,
                    reference: `AUDIT-PAY-${Date.now()}`,
                    method: 'Bank Transfer'
                };
                await axios.post(`${API_URL}/fees/record-payment`, paymentData, { headers });
                console.log('✅ Fee payment recording verified!');
            } else {
                console.warn('No pending fees found for child.');
            }
        } else {
            console.warn('No children linked to parent.');
        }

        console.log('--- Audit Complete ---');
    } catch (error) {
        console.error('Audit failed:', error.response ? error.response.data : error.message);
    }
}

audit();
