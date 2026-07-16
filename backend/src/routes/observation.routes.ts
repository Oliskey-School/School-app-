import { Router } from 'express';
import { getTemplate, createObservation, getObservationsForTeacherAdmin, getMyObservations } from '../controllers/observation.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/template', getTemplate);
router.post('/', createObservation);
router.get('/mine', getMyObservations);
router.get('/teacher/:teacherId', getObservationsForTeacherAdmin);

export default router;
