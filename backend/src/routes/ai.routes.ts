import { Router } from 'express';
import {
    getGeneratedResources, saveGeneratedResource,
    aiChat, aiEmbeddings, aiGenerateImage, aiTranscribe, aiSpeak, aiStatus,
    listConversations, getConversation, renameConversation, deleteConversation, sendConversationMessage,
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

// AI Assistant chat history — owner-only (the signed-in user), see
// aiConversation.service.ts. Reading/deleting your own history is not a
// billable AI call, so only sending a message passes the plan gate.
router.get('/conversations', listConversations);
router.post('/conversations/send', requireAIAllowed, sendConversationMessage);
router.get('/conversations/:id', getConversation);
router.patch('/conversations/:id', renameConversation);
router.delete('/conversations/:id', deleteConversation);

export default router;
