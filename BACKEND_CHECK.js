
const http = require('http');

const loginData = JSON.stringify({
    email: 'demo_admin@demo.com',
    password: 'password123'
});

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': loginData.length
    }
};

const req = http.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
        console.log('Login Response Status:', res.statusCode);
        try {
            const data = JSON.parse(body);
            if (data.token) {
                console.log('✅ Token obtained successfully.');
                testEndpoints(data.token);
            } else {
                console.error('❌ Failed to get token:', data.message);
            }
        } catch (e) {
            console.error('❌ Error parsing response:', e.message);
            console.log('Raw body:', body);
        }
    });
});

req.on('error', (e) => {
    console.error('❌ Connection error:', e.message);
});

req.write(loginData);
req.end();

function testEndpoints(token) {
    const endpoints = [
        { name: 'Dashboard Stats', path: '/api/dashboard/stats' },
        { name: 'Students Me', path: '/api/students/me' },
        { name: 'Teachers List', path: '/api/teachers' },
        { name: 'Assignments List', path: '/api/assignments' },
        { name: 'Exams List', path: '/api/exams' },
        { name: 'Forum Topics', path: '/api/forum/topics' },
        { name: 'Lesson Plans', path: '/api/lesson-plans' },
        { name: 'Notices', path: '/api/notices' },
        { name: 'Attendance', path: '/api/attendance?date=2026-02-19&classId=any' },
        { name: 'Report Cards', path: '/api/report-cards' }
    ];

    endpoints.forEach(ep => {
        const opt = {
            hostname: 'localhost',
            port: 5000,
            path: ep.path,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        };

        const r = http.request(opt, (res) => {
            let b = '';
            res.on('data', (c) => b += c);
            res.on('end', () => {
                const statusIcon = res.statusCode === 200 || res.statusCode === 201 ? '✅' : '❌';
                console.log(`${statusIcon} ${ep.name} (${ep.path}): ${res.statusCode}`);
                if (res.statusCode !== 200 && res.statusCode !== 201) {
                    console.log('   Error:', b.substring(0, 100));
                }
            });
        });
        r.end();
    });
}
