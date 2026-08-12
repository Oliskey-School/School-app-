const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

async function testNotificationSettings() {
    console.log('🚀 Starting Notification API Diagnostic...');
    
    try {
        // 1. Check Health
        console.log('🏥 Checking Backend Health...');
        const health = await axios.get(`${API_BASE}/health`);
        console.log('✅ Health:', health.data);

        // 2. Try to hit the settings endpoint (will likely fail auth, but should be 401, not 404)
        console.log('🛰️ Testing /notifications/settings endpoint (Expected: 401 or 200)...');
        try {
            const response = await axios.get(`${API_BASE}/notifications/settings`);
            console.log('✅ Success:', response.data);
        } catch (err) {
            if (err.response) {
                console.log(`❌ HTTP Error ${err.response.status}:`, err.response.data);
                if (err.response.status === 404) {
                    console.log('🚨 SEVERE: Endpoint is definitely 404 on the backend.');
                }
            } else {
                console.log('❌ Request failed:', err.message);
            }
        }

        // 3. Try hitting the base notifications endpoint
        console.log('🛰️ Testing base /notifications endpoint...');
        try {
            const response = await axios.get(`${API_BASE}/notifications`);
            console.log('✅ Success:', response.data);
        } catch (err) {
             if (err.response) {
                console.log(`❌ HTTP Error ${err.response.status}:`, err.response.data);
            } else {
                console.log('❌ Request failed:', err.message);
            }
        }

    } catch (err) {
        console.error('💥 Critical Error in Diagnostic:', err.message);
    }
}

testNotificationSettings();
