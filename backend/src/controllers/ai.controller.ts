import { Response } from 'express';
import { withOliskeyKnowledge } from '../services/aiKnowledge.service';
import { AuthRequest } from '../middleware/auth.middleware';
import { AiService } from '../services/ai.service';
import { NvidiaAIService, NVIDIA_MODELS } from '../services/nvidiaAI.service';
import { AIGateway } from '../services/aiGateway.service';
import { GeminiAIService, GEMINI_FALLBACK_MODEL } from '../services/geminiAI.service';
import prisma from '../config/database';
import { getEffectiveBranchId } from '../utils/branchScope';
import { sendError } from '../utils/httpError';

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
        // Central gateway: NVIDIA first, Gemini on a transient failure. The
        // user id scopes in-flight de-duplication so two users with the same
        // prompt never share a response.
        // Oliskey product knowledge, the security rules and the user's context
        // are attached HERE, before the gateway picks a provider — so NVIDIA and
        // the Gemini fallback receive exactly the same system messages. Role,
        // school and branch come from the verified session; the client may only
        // supply presentational hints (which page/module it is showing).
        const body = withOliskeyKnowledge(req.body || {}, {
            role: req.user?.role,
            userId: req.user?.id,
            schoolId: req.user?.school_id,
            branchId: (req.user as any)?.active_branch_id || req.user?.branch_id,
            page: typeof req.body?.context?.page === 'string' ? req.body.context.page.slice(0, 120) : null,
            module: typeof req.body?.context?.module === 'string' ? req.body.context.module.slice(0, 120) : null,
            session: typeof req.body?.context?.session === 'string' ? req.body.context.session.slice(0, 40) : null,
            term: typeof req.body?.context?.term === 'string' ? req.body.context.term.slice(0, 40) : null,
        });
        delete (body as any).context;   // a UI hint, not part of the provider payload

        const result = await AIGateway.chat(body, String(req.user?.id || ''));
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
    res.json({
        configured: NvidiaAIService.isConfigured() || GeminiAIService.isConfigured(),
        provider: 'nvidia',
        fallback: GeminiAIService.isConfigured() ? GEMINI_FALLBACK_MODEL : null,
        models: NVIDIA_MODELS,
    });
};

export const getGeneratedResources = async (req: AuthRequest, res: Response) => {
    try {
        let teacherId = (req.query.teacherId || req.query.teacher_id) as string;

        // req.user.role comes straight from the JWT/Prisma Role enum, which is
        // uppercase ("TEACHER") — comparing against lowercase never matched, so
        // a teacher's own history request always fell through to the 400 below.
        if ((req.user.role || '').toLowerCase() === 'teacher' && !teacherId) {
            const teacher = await prisma.teacher.findUnique({
                where: { user_id: req.user.id },
                select: { id: true }
            });
            if (teacher) teacherId = teacher.id;
            else return res.json([]);
        }

        // No teacher in scope. Admins browse the whole school's library.
        // Students and parents get none: these rows can hold generated quizzes
        // with their answers. An empty list, not a 400, so the shared Library
        // and Curriculum screens show their empty state instead of failing.
        let allTeachers = false;
        if (!teacherId) {
            const role = (req.user.role || '').toLowerCase();
            if (!['admin', 'superadmin', 'proprietor', 'principal'].includes(role)) return res.json([]);
            allTeachers = true;
        }

        const requestedBranch = (req.query.branch_id as string) || (req.query.branchId as string) || (req.body?.branch_id as string);
        const branchId = getEffectiveBranchId(req.user, requestedBranch);
        const result = await AiService.getGeneratedResources(req.user.school_id, branchId, allTeachers ? undefined : teacherId);
        res.json(result);
    } catch (error: any) {
        sendError(res, error, 'ai.controller.ts');
    }
};

export const saveGeneratedResource = async (req: AuthRequest, res: Response) => {
    try {
        const branchId = getEffectiveBranchId(req.user, req.body?.branch_id);
        const result = await AiService.saveGeneratedResource(req.user.school_id, branchId, req.body);
        res.status(201).json(result);
    } catch (error: any) {
        sendError(res, error, 'ai.controller.ts');
    }
};
