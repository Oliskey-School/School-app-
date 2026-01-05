
const apiKey = "AIzaSyD_Y7qn1syofkL-NJ45Z7MqFQuSdc6gn-0";
const model = "gemini-2.0-flash-lite";
const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

console.log(`Testing generation with ${model}...`);

const body = {
    contents: [{
        parts: [{ text: "Hello, what is 2+2?" }]
    }]
};

fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
})
    .then(async res => {
        if (!res.ok) {
            const text = await res.text();
            console.error(`Error ${res.status}:`, text);
        } else {
            const data = await res.json();
            console.log("Success!");
            console.log("Response:", data?.candidates?.[0]?.content?.parts?.[0]?.text);
        }
    })
    .catch(err => console.error("Fetch error:", err));
