import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { AiService } from '../services/ai.service';
import { NvidiaAIService, NVIDIA_MODELS } from '../services/nvidiaAI.service';
import prisma from '../config/database';
import { getEffectiveBranchId } from '../utils/branchScope';

// Shared error shaping for the NVIDIA proxy — surfaces the upstream status and a
// short reason without leaking the API key or full internals.
const sendAiError = (res: Response, error: any) => {
    const status = error?.status && error.status >= 400 && error.status < 600 ? error.status : 500;
    const message = error?.message || 'AI request failed';
    if (process.env.NODE_ENV !== 'production' && error?.detail) {
        console.error('[NVIDIA AI]', message, String(error.detail).slice(0, 500));
    }
    res.status(status).json({ message });
};

// ── NVIDIA AI proxy handlers ─────────────────────────────────────────────────
// The browser never holds the key; it calls these authenticated endpoints and
// the server calls NVIDIA. Every capability the app needs is exposed here.

export const aiChat = async (req: AuthRequest, res: Response) => {
    try {
        const result = await NvidiaAIService.chat(req.body);
        res.json(result);
    } catch (error: any) { sendAiError(res, error); }
};

export const aiEmbeddings = async (req: AuthRequest, res: Response) => {
    try {
        const { input, model, input_type } = req.body || {};
        const result = await NvidiaAIService.embeddings(input, model, input_type);
        res.json(result);
    } catch (error: any) { sendAiError(res, error); }
};

export const aiGenerateImage = async (req: AuthRequest, res: Response) => {
    try {
        const { prompt, model, ...opts } = req.body || {};
        const result = await NvidiaAIService.generateImage(prompt, model, opts);
        res.json(result);
    } catch (error: any) { sendAiError(res, error); }
};

export const aiTranscribe = async (req: AuthRequest, res: Response) => {
    try {
        const { audio, model, language } = req.body || {};
        const result = await NvidiaAIService.transcribe(audio, model, language);
        res.json(result);
    } catch (error: any) { sendAiError(res, error); }
};

export const aiSpeak = async (req: AuthRequest, res: Response) => {
    try {
        const { text, model, voice, format } = req.body || {};
        const result = await NvidiaAIService.synthesizeSpeech(text, { model, voice, format });
        res.json(result);
    } catch (error: any) { sendAiError(res, error); }
};

// Lets the frontend discover whether AI is configured + the default model map.
export const aiStatus = async (_req: AuthRequest, res: Response) => {
    res.json({ configured: NvidiaAIService.isConfigured(), provider: 'nvidia', models: NVIDIA_MODELS });
};

export const getGeneratedResources = async (req: AuthRequest, res: Response) => {
    try {
        let teacherId = (req.query.teacherId || req.query.teacher_id) as string;

        if (req.user.role === 'teacher' && !teacherId) {
            const teacher = await prisma.teacher.findUnique({
                where: { user_id: req.user.id },
                select: { id: true }
            });
            if (teacher) teacherId = teacher.id;
            else return res.json([]);
        }

        if (!teacherId) {
            return res.status(400).json({ message: "Teacher ID is required" });
        }

        const requestedBranch = (req.query.branch_id as string) || (req.query.branchId as string) || (req.body?.branch_id as string);
        const branchId = getEffectiveBranchId(req.user, requestedBranch);
        const result = await AiService.getGeneratedResources(req.user.school_id, branchId, teacherId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const saveGeneratedResource = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, req.body?.branch_id);
        const result = await AiService.saveGeneratedResource(req.user.school_id, branchId, req.body);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
