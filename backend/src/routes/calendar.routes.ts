import { Router } from 'express';
import { getCalendarEvents, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent, rsvpToEvent } from '../controllers/calendar.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', getCalendarEvents);
router.post('/', createCalendarEvent);
router.put('/:id', updateCalendarEvent);
router.delete('/:id', deleteCalendarEvent);
router.post('/rsvp', rsvpToEvent);

export default router;
