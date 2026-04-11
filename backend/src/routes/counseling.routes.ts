import { Router } from 'express';
import { 
  getAppointments, 
  bookAppointment, 
  updateAppointmentStatus 
} from '../controllers/counseling.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticate, getAppointments);
router.post('/', authenticate, bookAppointment);
router.patch('/:id/status', authenticate, updateAppointmentStatus);

export default router;
