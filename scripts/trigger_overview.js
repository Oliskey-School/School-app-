const fetch = (await import('node-fetch')).default;

const API_BASE = 'http://localhost:5000/api';
// Using student ID from logs
const STUDENT_ID = 'da936dc2-2d8e-4f09-bc7d-70d917aef100';

async function triggerOverview() {
    console.log(`🚀 Triggering getChildOverview for student ${STUDENT_ID}...`);
    try {
        // We'll just call it. Even if 401, it should hit the controller/service if auth passes or if we bypass it.
        // Actually, without a token it will 401 in middleware.
        // But I can check if the server logs show anything.
        const res = await fetch(`${API_BASE}/parents/me/children/${STUDENT_ID}/overview`);
        console.log(`Status: ${res.status} ${res.statusText}`);
    } catch (err) {
        console.error('❌ Fetch failed:', err.message);
    }
}

triggerOverview();
