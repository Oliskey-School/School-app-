import { Router } from 'express';
import { 
  getConferences, 
  scheduleConference, 
  updateConferenceStatus, 
  getTeacherAvailability, 
  setTeacherAvailability 
} from '../controllers/conference.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/tenant.middleware';

const router = Router();

router.get('/', authenticate, getConferences);
router.post('/', authenticate, scheduleConference);
router.patch('/:id/status', authenticate, updateConferenceStatus);
router.get('/teachers/:teacher_id/availability', authenticate, getTeacherAvailability);
// Setting availability is staff-only (route gate) + self-only for teachers
// (ownership check inside the controller). Previously any authenticated
// user could hit this for any teacher_id — verified live via demo student
// token.
router.post(
  '/teachers/:teacher_id/availability',
  authenticate,
  requireRole(['admin', 'proprietor', 'superadmin', 'super_admin', 'teacher']),
  setTeacherAvailability
);

export default router;
