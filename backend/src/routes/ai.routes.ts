import { Router } from 'express';
import {
    getGeneratedResources, saveGeneratedResource,
    aiChat, aiEmbeddings, aiGenerateImage, aiTranscribe, aiSpeak, aiStatus,
} from '../controllers/ai.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate);
router.use(requireTenant);

router.get('/generated-resources', getGeneratedResources);
router.post('/generated-resources', saveGeneratedResource);

// NVIDIA-powered AI proxy — key stays server-side. All authenticated + tenant-scoped.
router.get('/status', aiStatus);
router.post('/chat', aiChat);            // chat + vision (multimodal messages)
router.post('/embeddings', aiEmbeddings);
router.post('/image', aiGenerateImage);  // FLUX / SDXL
router.post('/stt', aiTranscribe);       // Whisper speech-to-text
router.post('/tts', aiSpeak);            // text-to-speech

export default router;
