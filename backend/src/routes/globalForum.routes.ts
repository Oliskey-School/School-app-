import { Router } from 'express';
import {
    getGlobalTopics, createGlobalTopic, getGlobalPosts, createGlobalPost,
    deleteGlobalTopic, deleteGlobalPost,
} from '../controllers/globalForum.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Authenticated, but NOT tenant-scoped — this forum is intentionally cross-school.
router.use(authenticate);

router.get('/topics', getGlobalTopics);
router.post('/topics', createGlobalTopic);
router.get('/topics/:id/posts', getGlobalPosts);
router.post('/posts', createGlobalPost);
router.delete('/topics/:id', deleteGlobalTopic);
router.delete('/posts/:id', deleteGlobalPost);

export default router;
