
async function testCreateUser() {
    const API_URL = 'http://localhost:5000/api/auth/create-user';
    const email = 'duplicate.test.v2@school.com';
    const body = {
        email: email,
        password: 'password123',
        username: 'duplicate.test.v2',
        full_name: 'Duplicate Test V2',
        role: 'Student',
        school_id: 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1'
    };

    console.log('1. Creating first user...');
    try {
        const res1 = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data1 = await res1.json();
        console.log('Status:', res1.status);
        console.log('Response:', data1);
    } catch (e) {
        console.log('Error 1:', e.message);
    }

    console.log('\n2. Creating duplicate user...');
    try {
        const res2 = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data2 = await res2.json();
        console.log('Status:', res2.status);
        console.log('Response:', data2);
    } catch (e) {
        console.log('Error 2:', e.message);
    }
}

testCreateUser();
