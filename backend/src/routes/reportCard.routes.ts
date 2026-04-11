import { Router } from 'express';
import { getReportCards, getReportCard, updateStatus } from '../controllers/reportCard.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', getReportCards);
router.get('/:id', getReportCard);
router.put('/:id/status', updateStatus);

export default router;
