import { Router } from 'express';
import { getBranches, createBranch, updateBranch, deleteBranch } from '../controllers/branch.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticate, getBranches);
router.post('/', authenticate, createBranch);
router.put('/:id', authenticate, updateBranch);
router.delete('/:id', authenticate, deleteBranch);

export default router;
