import { Router } from 'express';
import { getCalendarEvents, createCalendarEvent, rsvpToEvent } from '../controllers/calendar.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', getCalendarEvents);
router.post('/', createCalendarEvent);
router.post('/rsvp', rsvpToEvent);

export default router;
