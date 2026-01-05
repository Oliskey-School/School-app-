
const apiKey = "AIzaSyD_Y7qn1syofkL-NJ45Z7MqFQuSdc6gn-0";
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

console.log(`Querying ${url}...`);

fetch(url)
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            console.error("Error:", data.error);
        } else {
            console.log("Available Models:");
            if (data.models) {
                data.models.forEach(m => {
                    if (m.supportedGenerationMethods.includes("generateContent")) {
                        console.log(`- ${m.name}`);
                    }
                });
            } else {
                console.log("No models found or different response format:", data);
            }
        }
    })
    .catch(err => console.error("Fetch error:", err));
