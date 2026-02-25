const { GoogleGenerativeAI } = require("@google/generative-ai");

// Get your key from https://aistudio.google.com/
const genAI = new GoogleGenerativeAI("YOUR_API_KEY_HERE");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

async function chat() {
    const result = await model.generateContent("Hello Gemini, are you working in my school-app?");
    console.log(result.response.text());
}

chat();