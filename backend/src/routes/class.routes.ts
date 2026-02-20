import { Router } from 'express';
import { getClasses, createClass, updateClass, deleteClass } from '../controllers/class.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticate, getClasses);
router.post('/', authenticate, createClass);
router.put('/:id', authenticate, updateClass);
router.delete('/:id', authenticate, deleteClass);

export default router;
