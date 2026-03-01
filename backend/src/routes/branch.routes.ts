import { Router } from 'express';
import { getBranches } from '../controllers/branch.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticate, getBranches);

export default router;
