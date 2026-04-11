import { Router } from 'express';
import { 
  getConferences, 
  scheduleConference, 
  updateConferenceStatus, 
  getTeacherAvailability, 
  setTeacherAvailability 
} from '../controllers/conference.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticate, getConferences);
router.post('/', authenticate, scheduleConference);
router.patch('/:id/status', authenticate, updateConferenceStatus);
router.get('/teachers/:teacher_id/availability', authenticate, getTeacherAvailability);
router.post('/teachers/:teacher_id/availability', authenticate, setTeacherAvailability);

export default router;
