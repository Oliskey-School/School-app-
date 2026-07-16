import { Router } from 'express';
import {
    getCoTeacherSetting, setCoTeacherSetting,
    assignClassTeacher, assignSubjectTeacher,
    removeAssignment, transferClassTeacher,
    listAssignments, getWorkload, getTeachingHistory, getMyRoles, getMyClassHub, addDuty, removeDuty,
} from '../controllers/teacherAssignment.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/settings/co-class-teachers', getCoTeacherSetting);
router.put('/settings/co-class-teachers', setCoTeacherSetting);

router.get('/', listAssignments);
router.post('/class-teacher', assignClassTeacher);
router.post('/subject-teacher', assignSubjectTeacher);
router.post('/:id/transfer', transferClassTeacher);
router.delete('/:id', removeAssignment);

router.get('/workload', getWorkload);
router.post('/duties', addDuty);
router.delete('/duties/:id', removeDuty);
router.get('/teacher/:teacherId/history', getTeachingHistory);
router.get('/mine/roles', getMyRoles);
router.get('/mine/class/:classId', getMyClassHub);

export default router;
