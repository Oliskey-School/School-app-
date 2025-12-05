
import { Router } from 'express';
import { getAllStudents, getStudentById } from '../controllers/student.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// All student routes are protected
router.use(authenticateToken);

router.get('/', getAllStudents);
router.get('/:id', getStudentById);
// router.post('/', createStudent);
// router.put('/:id', updateStudent);
// router.delete('/:id', deleteStudent);

export default router;
