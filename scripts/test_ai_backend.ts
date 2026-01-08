
import fetch from 'node-fetch';

const ENDPOINT = 'http://localhost:5000/api/ai/assistant';

async function testAI() {
    console.log("🚀 Testing AI Assistant Backend...");

    const payload = {
        question: "What is the grading system?",
        options: {
            image_needed: false
        }
    };

    console.log("Request Payload:", JSON.stringify(payload, null, 2));

    try {
        const start = Date.now();
        const response = await fetch(ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const duration = Date.now() - start;
        console.log(`⏱️ Response Time: ${duration}ms`);

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`API Error ${response.status}: ${text}`);
        }

        const data = await response.json();
        console.log("✅ API Response:", JSON.stringify(data, null, 2));

        if (data.answer && data.tokens_estimate !== undefined) {
            console.log("✨ Structure Validation Passed");
        } else {
            console.warn("⚠️ JSON structure might be invalid");
        }

    } catch (error: any) {
        console.error("❌ Test Failed:", error.message);
        if (error.code === 'ECONNREFUSED') {
            console.error("💡 Is the backend server running on port 5000?");
        }
    }
}

testAI();
