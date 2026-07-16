import { Router } from 'express';
import {
    getDepartments, createDepartment, updateDepartment, assignTeacher, removeTeacher,
    addBudget, createMeeting, updateMeetingMinutes, getReport,
} from '../controllers/department.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', getDepartments);
router.post('/', createDepartment);
router.put('/:id', updateDepartment);
router.get('/:id/report', getReport);
router.post('/:id/teachers', assignTeacher);
router.delete('/teachers/:teacherId', removeTeacher);
router.post('/:id/budget', addBudget);
router.post('/:id/meetings', createMeeting);
router.put('/meetings/:meetingId', updateMeetingMinutes);

export default router;
