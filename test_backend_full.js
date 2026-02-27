
const API_URL = 'http://localhost:5000/api';

async function testBackend() {
    console.log('🚀 Starting Backend Integration Tests...');

    let token = '';
    let schoolId = '';

    // 1. Test Health Check
    try {
        const health = await fetch('http://localhost:5000/');
        const healthData = await health.json();
        console.log('✅ Health Check:', healthData);
    } catch (err) {
        console.error('❌ Health Check Failed:', err.message);
        process.exit(1);
    }

    // 2. Test Login (Demo Account)
    try {
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@demo.com', password: 'password123' })
        });
        const loginData = await loginRes.json();
        if (loginRes.ok) {
            token = loginData.token;
            schoolId = loginData.user.school_id;
            console.log('✅ Login successful. Role:', loginData.user.role);
        } else {
            console.error('❌ Login failed:', loginData.message);
            process.exit(1);
        }
    } catch (err) {
        console.error('❌ Login Error:', err.message);
        process.exit(1);
    }

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    // 3. Test School Info
    try {
        const res = await fetch(`${API_URL}/schools/${schoolId}`, { headers });
        const data = await res.json();
        if (res.ok) {
            console.log('✅ School Info fetched successfully.');
        } else {
            console.warn('⚠️  School Info failed (maybe 404 if not found):', data.message);
        }
    } catch (err) {
        console.error('❌ School Info Error:', err.message);
    }

    // 4. Test Student List
    try {
        const res = await fetch(`${API_URL}/students`, { headers });
        const data = await res.json();
        if (res.ok) {
            console.log('✅ Student List fetched successfully. Count:', Array.isArray(data) ? data.length : 'unknown');
        } else {
            console.error('❌ Student List failed:', data.message);
        }
    } catch (err) {
        console.error('❌ Student List Error:', err.message);
    }

    // 5. Test Teacher List
    try {
        const res = await fetch(`${API_URL}/teachers`, { headers });
        const data = await res.json();
        if (res.ok) {
            console.log('✅ Teacher List fetched successfully. Count:', Array.isArray(data) ? data.length : 'unknown');
        } else {
            console.error('❌ Teacher List failed:', data.message);
        }
    } catch (err) {
        console.error('❌ Teacher List Error:', err.message);
    }

    // 6. Test Class List
    try {
        const res = await fetch(`${API_URL}/classes`, { headers });
        const data = await res.json();
        if (res.ok) {
            console.log('✅ Class List fetched successfully. Count:', Array.isArray(data) ? data.length : 'unknown');
        } else {
            console.error('❌ Class List failed:', data.message);
        }
    } catch (err) {
        console.error('❌ Class List Error:', err.message);
    }

    // 7. Test Dashboard Stats
    try {
        const res = await fetch(`${API_URL}/dashboard/stats`, { headers });
        const data = await res.json();
        if (res.ok) {
            console.log('✅ Dashboard Stats fetched successfully.');
        } else {
            console.error('❌ Dashboard Stats failed:', data.message);
        }
    } catch (err) {
        console.error('❌ Dashboard Stats Error:', err.message);
    }

    console.log('🏁 Backend Integration Tests Completed.');
}

testBackend();
