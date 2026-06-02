import { Router } from 'express';
import { getBranches, createBranch, updateBranch, deleteBranch, getAuthorizedBranches, transferUser } from '../controllers/branch.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticate, getBranches);
// Specific routes BEFORE any '/:id' params.
router.get('/authorized', authenticate, getAuthorizedBranches);
router.post('/transfer-user', authenticate, transferUser);
router.post('/', authenticate, createBranch);
router.put('/:id', authenticate, updateBranch);
router.delete('/:id', authenticate, deleteBranch);

export default router;
