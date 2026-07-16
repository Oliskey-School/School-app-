import { Router } from 'express';
import {
    getIncidentTypes, createIncidentType, updateIncidentType, deactivateIncidentType,
    reportCase, getCases, getCaseDetail, advanceStage,
    addEvidence, recordDecision,
    generateLetter, updateLetter, sendLetter,
} from '../controllers/sop.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// Incident types / workflow builder
router.get('/incident-types', getIncidentTypes);
router.post('/incident-types', createIncidentType);
router.put('/incident-types/:id', updateIncidentType);
router.delete('/incident-types/:id', deactivateIncidentType);

// Cases
router.get('/cases', getCases);
router.post('/cases', reportCase);
router.get('/cases/:id', getCaseDetail);
router.post('/cases/:id/advance', advanceStage);
router.post('/cases/:id/evidence', addEvidence);
router.post('/cases/:id/decision', recordDecision);
router.post('/cases/:id/letters', generateLetter);
router.put('/letters/:letterId', updateLetter);
router.post('/letters/:letterId/send', sendLetter);

export default router;
