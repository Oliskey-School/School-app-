import { Router } from 'express';
import { getTimetable } from '../controllers/timetable.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticate, getTimetable);

export default router;
