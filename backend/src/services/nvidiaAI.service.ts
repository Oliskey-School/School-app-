import { config } from '../config/env';

/**
 * NVIDIA NIM AI service — the single server-side gateway for every AI capability
 * in the app. The API key lives only here (never in the browser bundle). All
 * front-end AI calls go through the /api/ai/* proxy, which calls this service.
 *
 * NVIDIA exposes two bases:
 *  - integrate.api.nvidia.com/v1 → OpenAI-compatible chat, vision, embeddings
 *  - ai.api.nvidia.com/v1/genai   → image generation, audio (STT/TTS)
 */

// Sensible defaults per capability — callers may override with `model`.
export const NVIDIA_MODELS = {
    // Verified invokable on this key (integrate.api.nvidia.com):
    chat: 'meta/llama-3.3-70b-instruct',        // strong general chat ✓
    fastChat: 'meta/llama-3.1-8b-instruct',     // low-latency chat ✓
    reasoning: 'deepseek-ai/deepseek-v4-flash', // DeepSeek reasoning ✓
    qwen: 'qwen/qwen3-next-80b-a3b-instruct',   // Qwen ✓
    nemotron: 'nvidia/llama-3.3-nemotron-super-49b-v1', // Nemotron ✓
    vision: 'meta/llama-3.2-11b-vision-instruct', // vision/multimodal ✓
    embed: 'nvidia/nv-embedqa-e5-v5',           // embeddings ✓
    // Media models live on the genai host (ai.api.nvidia.com), which some
    // networks can't reach — these degrade to a clear error when unreachable.
    image: 'black-forest-labs/flux.1-schnell',  // fast text-to-image
    imageSdxl: 'stabilityai/stable-diffusion-xl',
    stt: 'openai/whisper-large-v3',
    tts: 'nvidia/magpie-tts-multilingual',
} as const;

const requireKey = (): string => {
    const key = config.nvidiaApiKey;
    if (!key) {
        // 503 (not 500) so it's unmistakably a configuration/restart issue — the
        // most common cause is the server not being restarted after the key was
        // added to backend/.env (env vars only load at process start).
        throw Object.assign(
            new Error('AI is not configured on the server. Add NVIDIA_API_KEY to backend/.env and restart the server.'),
            { status: 503 }
        );
    }
    return key;
};

const authHeaders = (extra: Record<string, string> = {}) => ({
    Authorization: `Bearer ${requireKey()}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...extra,
});

// Media models (image / audio) live on the genai host. Some server networks
// can't reach it, and raw fetch throws an opaque "fetch failed". Wrap those
// calls so the app shows a clear, actionable message instead.
const genaiFetch = async (url: string, init: RequestInit): Promise<Response> => {
    try {
        return await fetch(url, init);
    } catch (e: any) {
        throw Object.assign(
            new Error("This AI media service (image/voice) can't be reached from the server's network. Text chat, vision and embeddings work; image and voice need access to ai.api.nvidia.com."),
            { status: 502, detail: e?.message }
        );
    }
};

// ── Chat + Vision (OpenAI-compatible) ────────────────────────────────────────
// `messages` may include multimodal content (text + image_url) for vision.
export interface ChatBody {
    model?: string;
    messages: Array<{ role: string; content: any }>;
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    response_format?: any;
    stream?: false;
}

// NVIDIA models are always "publisher/name" (e.g. meta/llama-3.3-70b-instruct).
// Callers migrating from Gemini pass names like "gemini-2.0-flash" with no
// slash, which NVIDIA rejects with a 404. Map any non-NVIDIA model to a sensible
// NVIDIA default — vision-capable when the request carries an image.
const hasImage = (messages: any[]) => messages.some(m =>
    Array.isArray(m?.content) && m.content.some((c: any) => c?.type === 'image_url' || c?.image_url)
);
const resolveChatModel = (model: string | undefined, messages: any[]): string => {
    if (model && model.includes('/')) return model;      // real NVIDIA model id
    return hasImage(messages) ? NVIDIA_MODELS.vision : NVIDIA_MODELS.chat;
};

export class NvidiaAIService {
    static async chat(body: ChatBody) {
        if (!Array.isArray(body?.messages) || body.messages.length === 0) {
            throw new Error('messages[] is required for chat.');
        }
        const payload = {
            model: resolveChatModel(body.model, body.messages),
            messages: body.messages,
            temperature: body.temperature ?? 0.7,
            max_tokens: body.max_tokens ?? 1024,
            top_p: body.top_p ?? 1,
            stream: false,
            ...(body.response_format ? { response_format: body.response_format } : {}),
        };
        const res = await fetch(`${config.nvidiaBaseUrl}/chat/completions`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify(payload),
        });
        if (!res.ok) {
            const detail = await res.text().catch(() => '');
            throw Object.assign(new Error(`NVIDIA chat error ${res.status}`), { status: res.status, detail });
        }
        const data: any = await res.json();
        return {
            text: data?.choices?.[0]?.message?.content ?? '',
            model: data?.model,
            usage: data?.usage,
            raw: data,
        };
    }

    // ── Embeddings ───────────────────────────────────────────────────────────
    static async embeddings(input: string | string[], model?: string, inputType: 'query' | 'passage' = 'passage') {
        const inputs = Array.isArray(input) ? input : [input];
        if (inputs.length === 0 || inputs.some(i => typeof i !== 'string')) {
            throw new Error('input (string or string[]) is required for embeddings.');
        }
        const res = await fetch(`${config.nvidiaBaseUrl}/embeddings`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({
                // Same guard as chat: a non-NVIDIA model id (no "/") → default.
                model: (model && model.includes('/')) ? model : NVIDIA_MODELS.embed,
                input: inputs,
                input_type: inputType,
                encoding_format: 'float',
                truncate: 'END',
            }),
        });
        if (!res.ok) {
            const detail = await res.text().catch(() => '');
            throw Object.assign(new Error(`NVIDIA embeddings error ${res.status}`), { status: res.status, detail });
        }
        const data: any = await res.json();
        return {
            model: data?.model || model || NVIDIA_MODELS.embed,
            embeddings: (data?.data || []).map((d: any) => d.embedding),
            usage: data?.usage,
        };
    }

    // ── Image generation (FLUX / SDXL, genai base) ───────────────────────────
    static async generateImage(prompt: string, model?: string, opts: { width?: number; height?: number; steps?: number; seed?: number; negative_prompt?: string } = {}) {
        if (!prompt || typeof prompt !== 'string') throw new Error('prompt is required for image generation.');
        const chosen = model || NVIDIA_MODELS.image;
        const isSdxl = chosen.includes('stable-diffusion') || chosen.includes('sdxl');
        // FLUX and SDXL take slightly different bodies; cover both.
        const body: any = isSdxl
            ? {
                text_prompts: [{ text: prompt, weight: 1 }, ...(opts.negative_prompt ? [{ text: opts.negative_prompt, weight: -1 }] : [])],
                cfg_scale: 5, sampler: 'K_DPM_2_ANCESTRAL', seed: opts.seed ?? 0, steps: opts.steps ?? 25,
                width: opts.width ?? 1024, height: opts.height ?? 1024,
            }
            : {
                prompt,
                ...(opts.negative_prompt ? { negative_prompt: opts.negative_prompt } : {}),
                width: opts.width ?? 1024, height: opts.height ?? 1024,
                steps: opts.steps ?? 4, seed: opts.seed ?? 0,
            };
        const res = await genaiFetch(`${config.nvidiaGenaiBaseUrl}/genai/${chosen}`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify(body),
        });
        if (!res.ok) {
            const detail = await res.text().catch(() => '');
            throw Object.assign(new Error(`NVIDIA image error ${res.status}`), { status: res.status, detail });
        }
        const data: any = await res.json();
        // Normalise the several shapes NVIDIA image models return into data URIs.
        const b64 = data?.artifacts?.[0]?.base64
            || data?.image
            || data?.images?.[0]
            || data?.data?.[0]?.b64_json;
        return {
            model: chosen,
            image: b64 ? (String(b64).startsWith('data:') ? b64 : `data:image/png;base64,${b64}`) : null,
            raw: data,
        };
    }

    // ── Speech-to-Text (Whisper) ─────────────────────────────────────────────
    // audioBase64: raw base64 (no data: prefix). Tries the OpenAI-compatible
    // transcription route first (available on newer NVIDIA deployments).
    static async transcribe(audioBase64: string, model?: string, language?: string) {
        if (!audioBase64) throw new Error('audio (base64) is required for transcription.');
        const res = await genaiFetch(`${config.nvidiaBaseUrl}/audio/transcriptions`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({
                model: model || NVIDIA_MODELS.stt,
                input_audio: audioBase64,
                ...(language ? { language } : {}),
                response_format: 'json',
            }),
        });
        if (!res.ok) {
            const detail = await res.text().catch(() => '');
            throw Object.assign(new Error(`NVIDIA transcription error ${res.status}`), { status: res.status, detail });
        }
        const data: any = await res.json();
        return { text: data?.text ?? '', model: model || NVIDIA_MODELS.stt, raw: data };
    }

    // ── Text-to-Speech ───────────────────────────────────────────────────────
    static async synthesizeSpeech(text: string, opts: { model?: string; voice?: string; format?: string } = {}) {
        if (!text || typeof text !== 'string') throw new Error('text is required for speech synthesis.');
        const res = await genaiFetch(`${config.nvidiaBaseUrl}/audio/speech`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({
                model: opts.model || NVIDIA_MODELS.tts,
                input: text,
                voice: opts.voice || 'Magpie-Multilingual.EN-US.Sofia',
                response_format: opts.format || 'mp3',
            }),
        });
        if (!res.ok) {
            const detail = await res.text().catch(() => '');
            throw Object.assign(new Error(`NVIDIA TTS error ${res.status}`), { status: res.status, detail });
        }
        // Audio comes back either as binary or base64 JSON depending on model.
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
            const data: any = await res.json();
            const b64 = data?.audio || data?.data?.[0]?.b64_json || '';
            return { audio: b64 ? `data:audio/mp3;base64,${b64}` : null, raw: data };
        }
        const buf = Buffer.from(await res.arrayBuffer());
        return { audio: `data:audio/mp3;base64,${buf.toString('base64')}`, raw: null };
    }

    static isConfigured() {
        return !!config.nvidiaApiKey;
    }
}
