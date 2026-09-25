import { Router } from 'express';
import * as UserController from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant, requireRole } from '../middleware/tenant.middleware';

const router = Router();

// Roles permitted to manage (create/update/delete) other user accounts.
const ADMIN_ROLES = ['admin', 'super_admin', 'proprietor'];

router.use(authenticate);
router.use(requireTenant);

// The full user directory exposes every account in the school. A TEACHER token
// was returning 200 here (234 KB, including admins), which combined with the
// credential leak below meant a teacher could harvest admin passwords.
router.get('/', requireRole(['ADMIN', 'PROPRIETOR', 'SUPER_ADMIN']), UserController.getUsers);
// Self-service: any authenticated user may edit THEIR OWN profile (name/phone/avatar).
// Self-scoped to req.user.id — no id in the path, so no IDOR.
router.put('/me/profile', UserController.updateMyProfile);
// Looking up ANOTHER account (email, phone, role) is an admin capability; a
// student/parent/teacher token could otherwise enumerate the whole school.
// Self-lookup by id stays open. No screen calls either route for non-admins.
router.get('/:id', (req: any, res, next) =>
    req.params.id === req.user?.id ? next() : requireRole(ADMIN_ROLES)(req, res, next),
    UserController.getUserById);
router.get('/email/:email', requireRole(ADMIN_ROLES), UserController.getUserByEmail);
// Mutations are admin-only: prevents privilege escalation / arbitrary account edits
// by low-privilege roles (student/parent/teacher).
router.put('/:id', requireRole(ADMIN_ROLES), UserController.updateUser);
router.delete('/:id', requireRole(ADMIN_ROLES), UserController.deleteUser);
router.post('/', requireRole(ADMIN_ROLES), UserController.createUser);

export default router;
