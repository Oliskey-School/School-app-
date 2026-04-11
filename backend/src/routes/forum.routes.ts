import { Router } from 'express';
import { getTopics, createTopic, getPosts, createPost } from '../controllers/forum.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/topics', getTopics);
router.post('/topics', createTopic);
router.get('/topics/:id/posts', getPosts);
router.post('/posts', createPost);

// Combined endpoint for TeacherForum component
router.get('/data', async (req: any, res) => {
    try {
        const { default: prisma } = await import('../config/database');
        const categories = await (prisma as any).forum_category.findMany({
            orderBy: { order_index: 'asc' }
        }).catch(() => []);
        const rawThreads = await (prisma as any).forum_thread.findMany({
            orderBy: { created_at: 'desc' },
            take: 20,
            include: {
                teacher: { select: { full_name: true } },
                forum_category: { select: { name: true } }
            }
        }).catch(() => []);
        const threads = rawThreads.map((t: any) => ({
            id: t.id,
            title: t.title,
            content: t.content,
            author_name: t.teacher?.full_name || 'Anonymous',
            created_at: t.created_at,
            reply_count: 0,
            category_name: t.forum_category?.name || 'General'
        }));
        res.json({ categories, threads });
    } catch (e: any) { res.json({ categories: [], threads: [] }); }
});

export default router;
