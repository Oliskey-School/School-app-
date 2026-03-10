import { Router } from 'express';
import { getSubjects } from '../controllers/subject.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticate, getSubjects);

export default router;
