import prisma from '../config/database';
import { SocketService } from './socket.service';

export class ForumService {
    static async getTopics(schoolId: string, branchId: string | undefined) {
        const where: any = { school_id: schoolId };

        if (branchId && branchId !== 'all') {
            where.OR = [
                { branch_id: branchId },
                { branch_id: null }
            ];
        }

        return prisma.forumTopic.findMany({
            where,
            orderBy: { last_activity: 'desc' }
        });
    }

    static async createTopic(schoolId: string, branchId: string | undefined, topicData: any) {
        const data: any = {
            ...topicData,
            school_id: schoolId,
            last_activity: new Date(),
            post_count: 0
        };

        if (branchId && branchId !== 'all') {
            data.branch_id = branchId;
        }

        const topic = await prisma.forumTopic.create({ data });
        SocketService.emitToSchool(schoolId, 'forum:updated', { action: 'create_topic', topicId: topic.id });
        return topic;
    }

    static async getPosts(schoolId: string, branchId: string | undefined, topicId: string) {
        const where: any = {
            topic_id: topicId,
            school_id: schoolId
        };

        if (branchId && branchId !== 'all') {
            where.branch_id = branchId;
        }

        return prisma.forumPost.findMany({
            where,
            orderBy: { created_at: 'asc' }
        });
    }

    static async createPost(schoolId: string, branchId: string | undefined, postData: any) {
        const data: any = { ...postData, school_id: schoolId };

        if (branchId && branchId !== 'all') {
            data.branch_id = branchId;
        }

        const post = await prisma.forumPost.create({ data });

        await prisma.forumTopic.update({
            where: { id: postData.topic_id },
            data: {
                last_activity: new Date(),
                post_count: { increment: 1 }
            }
        });

        SocketService.emitToSchool(schoolId, 'forum:updated', { action: 'create_post', topicId: postData.topic_id, postId: post.id });
        return post;
    }
}
