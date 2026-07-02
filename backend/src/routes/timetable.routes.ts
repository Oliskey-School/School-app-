import { Router } from 'express';
import { getTimetable, createTimetable, updateTimetable, deleteTimetable, deleteTimetableByClass, checkConflict, notifyPublished } from '../controllers/timetable.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', getTimetable);
router.post('/', createTimetable);
router.post('/check-conflict', checkConflict);
router.post('/publish-notify', notifyPublished);
router.put('/:id', updateTimetable);
router.delete('/:id', deleteTimetable);
router.delete('/class/:classId', deleteTimetableByClass);

export default router;
