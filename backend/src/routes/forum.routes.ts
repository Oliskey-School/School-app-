import { Router } from 'express';
import { getTopics, createTopic, getPosts, createPost } from '../controllers/forum.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/topics', getTopics);
router.post('/topics', createTopic);
router.get('/topics/:id/posts', getPosts);
router.post('/posts', createPost);

// Combined endpoint for TeacherForum component. This previously queried
// prisma.forum_category / prisma.forum_thread, which have never existed —
// the real models are ForumTopic (with a plain `category` string field, no
// separate category table) and ForumPost. That TypeError was silently
// caught into `{ categories: [], threads: [] }` on every single request, so
// this endpoint has never actually returned real forum data.
router.get('/data', async (req: any, res) => {
    try {
        const { default: prisma } = await import('../config/database');
        const schoolId = req.user.school_id;
        const rawTopics = await prisma.forumTopic.findMany({
            where: { school_id: schoolId, deleted_at: null },
            orderBy: { last_activity: 'desc' },
            take: 20,
        });
        const categoryNames = Array.from(new Set(rawTopics.map((t) => t.category).filter(Boolean))) as string[];
        const categories = categoryNames.map((name) => ({ id: name, name }));
        const threads = rawTopics.map((t) => ({
            id: t.id,
            title: t.title,
            content: t.content,
            author_name: t.author_name || 'Anonymous',
            created_at: t.created_at,
            reply_count: t.post_count,
            category_name: t.category || 'General',
        }));
        res.json({ categories, threads });
    } catch (e: any) {
        console.error('[GET /forum/data]', e);
        res.status(500).json({ message: 'Failed to load forum data' });
    }
});

export default router;
