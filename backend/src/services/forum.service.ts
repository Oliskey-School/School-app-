import { supabase } from '../config/supabase';

export class ForumService {
    static async getTopics(schoolId: string, branchId: string | undefined) {
        let query = supabase
            .from('forum_topics')
            .select('*')
            .eq('school_id', schoolId);

        if (branchId && branchId !== 'all') {
            query = query.or(`branch_id.eq.${branchId},branch_id.is.null`);
        }

        const { data, error } = await query.order('last_activity', { ascending: false });
        if (error) throw new Error(error.message);
        return data || [];
    }

    static async createTopic(schoolId: string, branchId: string | undefined, topicData: any) {
        const insertData = {
            ...topicData,
            school_id: schoolId,
            last_activity: new Date().toISOString(),
            post_count: 0
        };

        if (branchId && branchId !== 'all') {
            insertData.branch_id = branchId;
        }

        const { data, error } = await supabase
            .from('forum_topics')
            .insert([insertData])
            .select()
            .single();
        if (error) throw new Error(error.message);
        return data;
    }

    static async getPosts(schoolId: string, branchId: string | undefined, topicId: string) {
        let query = supabase
            .from('forum_posts')
            .select('*')
            .eq('topic_id', topicId)
            .eq('school_id', schoolId);

        if (branchId && branchId !== 'all') {
            query = query.eq('branch_id', branchId);
        }

        const { data, error } = await query.order('created_at', { ascending: true });
        if (error) throw new Error(error.message);
        return data || [];
    }

    static async createPost(schoolId: string, branchId: string | undefined, postData: any) {
        const insertData = { ...postData, school_id: schoolId };

        if (branchId && branchId !== 'all') {
            insertData.branch_id = branchId;
        }

        const { data, error } = await supabase
            .from('forum_posts')
            .insert([insertData])
            .select()
            .single();

        if (error) throw new Error(error.message);

        // Update topic last activity and post count
        await supabase.rpc('increment_forum_post_count', { p_topic_id: postData.topic_id });

        return data;
    }
}
