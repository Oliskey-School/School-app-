
import { getAIClient, SchemaType } from './lib/ai';

async function verifyFixes() {
    console.log("🔍 Verifying AI Client Fixes...");

    const apiKey = process.env.VITE_GEMINI_API_KEY || "test-key";
    const ai = getAIClient(apiKey);

    // 1. Verify `models` and `live` properties exist
    if (ai.models && typeof ai.models.generateContent === 'function') {
        console.log("✅ ai.models.generateContent exists");
    } else {
        console.error("❌ ai.models.generateContent MISSING");
    }

    if (ai.models && typeof ai.models.generateVideos === 'function') {
        try {
            await ai.models.generateVideos();
        } catch (e: any) {
            if (e.message === "Video generation is currently unavailable.") {
                console.log("✅ ai.models.generateVideos exists and implements stub correctly");
            } else {
                console.error("❌ ai.models.generateVideos unexpected error:", e);
            }
        }
    } else {
        console.error("❌ ai.models.generateVideos MISSING");
    }

    if (ai.live && typeof ai.live.connect === 'function') {
        try {
            await ai.live.connect();
        } catch (e: any) {
            if (e.message === "Live voice features are currently unavailable.") {
                console.log("✅ ai.live.connect exists and implements stub correctly");
            } else {
                console.error("❌ ai.live.connect unexpected error:", e);
            }
        }
    } else {
        console.error("❌ ai.live.connect MISSING");
    }

    // 2. Verify SchemaType export
    if (SchemaType) {
        console.log("✅ SchemaType is exported");
    } else {
        console.error("❌ SchemaType export MISSING");
    }

    console.log("🏁 Verification Complete");
}

verifyFixes();
