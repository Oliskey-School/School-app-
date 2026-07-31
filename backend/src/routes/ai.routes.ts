import { Router } from 'express';
import {
    getGeneratedResources, saveGeneratedResource,
    aiChat, aiEmbeddings, aiGenerateImage, aiTranscribe, aiSpeak, aiStatus,
} from '../controllers/ai.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';
import { requireAIAllowed } from '../middleware/aiGate.middleware';

const router = Router();

router.use(authenticate);
router.use(requireTenant);

router.get('/generated-resources', getGeneratedResources);
router.post('/generated-resources', saveGeneratedResource);

// NVIDIA-powered AI proxy — key stays server-side. All authenticated + tenant-scoped.
router.get('/status', aiStatus);
// requireAIAllowed only on routes that actually spend real (billable) NVIDIA
// calls — the plan gate is a business rule, not a generic auth check.
router.post('/chat', requireAIAllowed, aiChat);            // chat + vision (multimodal messages)
router.post('/embeddings', requireAIAllowed, aiEmbeddings);
router.post('/image', requireAIAllowed, aiGenerateImage);  // FLUX / SDXL
router.post('/stt', requireAIAllowed, aiTranscribe);       // Whisper speech-to-text
router.post('/tts', requireAIAllowed, aiSpeak);            // text-to-speech

export default router;
