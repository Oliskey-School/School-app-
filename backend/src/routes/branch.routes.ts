import { Router } from 'express';
import { getBranches, createBranch, updateBranch, deleteBranch, getAuthorizedBranches, transferUser, getBranchOptions } from '../controllers/branch.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/tenant.middleware';

// Managing branches (create/update/delete) is an admin-only action.
const ADMIN_ROLES = ['admin', 'super_admin', 'superadmin', 'proprietor'];

const router = Router();

// Reads: any authenticated member (results are scoped to their school/branch).
router.get('/', authenticate, getBranches);
// Specific routes BEFORE any '/:id' params.
router.get('/authorized', authenticate, getAuthorizedBranches);
router.get('/options', authenticate, getBranchOptions);
router.post('/transfer-user', authenticate, transferUser);
// Writes: admins only (the controller/service additionally scope by school_id).
router.post('/', authenticate, requireRole(ADMIN_ROLES), createBranch);
router.put('/:id', authenticate, requireRole(ADMIN_ROLES), updateBranch);
router.delete('/:id', authenticate, requireRole(ADMIN_ROLES), deleteBranch);

export default router;
