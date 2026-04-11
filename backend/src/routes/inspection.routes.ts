import { Router } from 'express';
import * as InspectionController from '../controllers/inspection.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Public/Authenticated access to templates
router.get('/templates/:type', authenticate, InspectionController.getTemplateByType);

// Submit full inspection results
router.post('/submit', authenticate, InspectionController.submitInspection);

// Get school inspection history
router.get('/history/:schoolId', authenticate, InspectionController.getSchoolInspectionHistory);

export default router;
