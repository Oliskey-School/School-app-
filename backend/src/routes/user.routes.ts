import { Router } from 'express';
import * as UserController from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant, requireRole } from '../middleware/tenant.middleware';

const router = Router();

// Roles permitted to manage (create/update/delete) other user accounts.
const ADMIN_ROLES = ['admin', 'super_admin', 'proprietor'];

router.use(authenticate);
router.use(requireTenant);

router.get('/', UserController.getUsers);
router.get('/:id', UserController.getUserById);
router.get('/email/:email', UserController.getUserByEmail);
// Mutations are admin-only: prevents privilege escalation / arbitrary account edits
// by low-privilege roles (student/parent/teacher).
router.put('/:id', requireRole(ADMIN_ROLES), UserController.updateUser);
router.delete('/:id', requireRole(ADMIN_ROLES), UserController.deleteUser);
router.post('/', requireRole(ADMIN_ROLES), UserController.createUser);

export default router;
