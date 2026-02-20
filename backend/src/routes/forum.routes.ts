import { Router } from 'express';
import { getTopics, createTopic, getPosts, createPost } from '../controllers/forum.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/topics', getTopics);
router.post('/topics', createTopic);
router.get('/topics/:id/posts', getPosts);
router.post('/posts', createPost);

export default router;
