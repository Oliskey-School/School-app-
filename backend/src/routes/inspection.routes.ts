import { Router } from 'express';
import * as InspectionController from '../controllers/inspection.controller';
import { authenticate } from '../middleware/auth.middleware';
import prisma from '../config/database';

const router = Router();

// List inspections for the caller's school (tenant-scoped).
router.get('/', authenticate, async (req: any, res) => {
    try {
        const school_id = req.user?.school_id;
        if (!school_id) return res.status(401).json({ message: 'Tenant context missing' });
        const list = await prisma.inspection.findMany({
            where: { school_id },
            include: { template: true, escalations: true },
            orderBy: { created_at: 'desc' }
        });
        res.json(list);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// Public/Authenticated access to templates
router.get('/templates/:type', authenticate, InspectionController.getTemplateByType);

// Submit full inspection results
router.post('/submit', authenticate, InspectionController.submitInspection);

// Get school inspection history
router.get('/history/:schoolId', authenticate, InspectionController.getSchoolInspectionHistory);

export default router;
