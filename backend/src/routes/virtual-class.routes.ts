import { Router } from 'express';
import { createVirtualClassSession, getVirtualClassSessions, getActiveVirtualClasses, endVirtualClassSession, recordVirtualAttendance, deleteVirtualClassSession } from '../controllers/virtual-class.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant, requireRole } from '../middleware/tenant.middleware';

const router = Router();

// Apply auth to all routes
router.use(authenticate);
router.use(requireTenant);

// Creating/ending/deleting a class session is a teacher/admin action
// (only components/teacher/VirtualClassScreen.tsx calls create) — previously
// any authenticated user, including a student, could do this. Verified live
// via demo student token (blocked only by a missing Prisma field, not auth).
// recordVirtualAttendance stays open — students legitimately self-mark
// attendance when joining (components/video/VirtualClassroom.tsx); ownership
// of the studentId is enforced in the controller instead.
const CLASS_STAFF = requireRole(['admin', 'proprietor', 'superadmin', 'super_admin', 'teacher']);

router.get('/', getVirtualClassSessions);
router.get('/active', getActiveVirtualClasses);
router.post('/', CLASS_STAFF, createVirtualClassSession);
router.post('/:id/end', CLASS_STAFF, endVirtualClassSession);
router.post('/attendance', recordVirtualAttendance);
router.delete('/:id', CLASS_STAFF, deleteVirtualClassSession);

export default router;
