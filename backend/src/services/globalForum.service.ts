import prisma from '../config/database';
import { SocketService } from './socket.service';

/**
 * Global Teacher Community — a cross-school forum.
 *
 * This is the ONLY feature that intentionally crosses the tenant boundary, and
 * it does so on owner instruction. To protect privacy we store and return ONLY:
 *   - the message text
 *   - a non-identifying author label: first name + role
 * We never store or expose school_id, branch_id, email, last name, IDs, etc.
 *
 * Uses raw SQL so it runs without regenerating the Prisma client.
 */
export class GlobalForumService {
    // Reduce a full name to just the first name; never leak the surname.
    private static firstNameOnly(fullName?: string | null): string {
        const first = (fullName || '').trim().split(/\s+/)[0];
        return first || 'Teacher';
    }

    static async getTopics() {
        return prisma.$queryRawUnsafe<any[]>(
            `SELECT id, title, content, author_name, author_role, post_count, is_locked, last_activity, created_at
             FROM "GlobalForumTopic"
             ORDER BY last_activity DESC
             LIMIT 100`
        );
    }

    static async createTopic(user: any, body: { title?: string; content?: string }) {
        const title = (body.title || '').trim();
        if (!title) throw new Error('Title is required');
        const content = (body.content || '').trim() || null;
        const authorName = this.firstNameOnly(user?.full_name);

        const rows = await prisma.$queryRawUnsafe<any[]>(
            `INSERT INTO "GlobalForumTopic" (id, title, content, author_id, author_name, author_role, post_count, is_locked, last_activity, created_at, updated_at)
             VALUES (gen_random_uuid(), $1, $2, $3, $4, 'teacher', 0, false, now(), now(), now())
             RETURNING id, title, content, author_name, author_role, post_count, is_locked, last_activity, created_at`,
            title, content, user?.id ?? null, authorName
        );
        const topic = rows[0];
        SocketService.emit('global-forum:updated', { action: 'create_topic', topicId: topic.id });
        return topic;
    }

    static async getPosts(topicId: string) {
        return prisma.$queryRawUnsafe<any[]>(
            `SELECT id, topic_id, author_name, author_role, content, created_at
             FROM "GlobalForumPost"
             WHERE topic_id = $1
             ORDER BY created_at ASC`,
            topicId
        );
    }

    static async createPost(user: any, body: { topic_id?: string; content?: string }) {
        const topicId = body.topic_id;
        const content = (body.content || '').trim();
        if (!topicId) throw new Error('topic_id is required');
        if (!content) throw new Error('Message is required');
        const authorName = this.firstNameOnly(user?.full_name);

        const rows = await prisma.$queryRawUnsafe<any[]>(
            `INSERT INTO "GlobalForumPost" (id, topic_id, author_id, author_name, author_role, content, created_at, updated_at)
             VALUES (gen_random_uuid(), $1, $2, $3, 'teacher', $4, now(), now())
             RETURNING id, topic_id, author_name, author_role, content, created_at`,
            topicId, user?.id ?? null, authorName, content
        );
        await prisma.$executeRawUnsafe(
            `UPDATE "GlobalForumTopic" SET post_count = post_count + 1, last_activity = now() WHERE id = $1`,
            topicId
        );
        const post = rows[0];
        SocketService.emit('global-forum:updated', { action: 'create_post', topicId, postId: post.id });
        return post;
    }

    // Moderation — super admin only (enforced in the controller).
    static async deleteTopic(id: string) {
        await prisma.$executeRawUnsafe(`DELETE FROM "GlobalForumPost" WHERE topic_id = $1`, id);
        await prisma.$executeRawUnsafe(`DELETE FROM "GlobalForumTopic" WHERE id = $1`, id);
        SocketService.emit('global-forum:updated', { action: 'delete_topic', topicId: id });
        return { success: true };
    }

    static async deletePost(id: string) {
        const rows = await prisma.$queryRawUnsafe<any[]>(
            `DELETE FROM "GlobalForumPost" WHERE id = $1 RETURNING topic_id`, id
        );
        const topicId = rows[0]?.topic_id;
        if (topicId) {
            await prisma.$executeRawUnsafe(
                `UPDATE "GlobalForumTopic" SET post_count = GREATEST(post_count - 1, 0) WHERE id = $1`,
                topicId
            );
        }
        SocketService.emit('global-forum:updated', { action: 'delete_post', postId: id });
        return { success: true };
    }
}
