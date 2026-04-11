import { Router } from 'express';
import { getBehaviorNotes, createBehaviorNote, deleteBehaviorNote } from '../controllers/behavior.controller';
import { authenticate } from '../middleware/auth.middleware';
import { enforceTenant } from '../middleware/tenant.middleware';

const router = Router();

router.get('/notes', authenticate, getBehaviorNotes);
router.post('/notes', authenticate, createBehaviorNote);
router.delete('/notes/:id', authenticate, deleteBehaviorNote);

export default router;
