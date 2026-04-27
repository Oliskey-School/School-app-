import { Router } from 'express';
import { heavyTaskQueue } from '../services/queue.service';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

/**
 * Lead DevSecOps: Offloading Example
 * POST /api/analytics/trigger-audit
 * This endpoint doesn't perform the audit synchronously. It adds a job
 * to the background queue and returns immediately, protecting the API
 * from resource exhaustion.
 */
router.post('/trigger-audit', authenticate, async (req: any, res) => {
    try {
        const { school_id, id: user_id } = req.user;

        // Add to background queue
        const job = await heavyTaskQueue.add('reports:generate-full-audit', {
            school_id,
            user_id,
            requested_at: new Date(),
        });

        res.json({ 
            success: true, 
            message: 'Audit job queued successfully.',
            job_id: job.id 
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
