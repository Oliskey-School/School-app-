import { supabase } from '../config/supabase';

export class ForumService {
    static async getTopics(schoolId: string) {
        const { data, error } = await supabase
            .from('forum_topics')
            .select('*')
            .eq('school_id', schoolId)
            .order('last_activity', { ascending: false });
        if (error) throw new Error(error.message);
        return data || [];
    }

    static async createTopic(schoolId: string, topicData: any) {
        const { data, error } = await supabase
            .from('forum_topics')
            .insert([{ ...topicData, school_id: schoolId, last_activity: new Date().toISOString(), post_count: 0 }])
            .select()
            .single();
        if (error) throw new Error(error.message);
        return data;
    }

    static async getPosts(topicId: string) {
        const { data, error } = await supabase
            .from('forum_posts')
            .select('*')
            .eq('topic_id', topicId)
            .order('created_at', { ascending: true });
        if (error) throw new Error(error.message);
        return data || [];
    }

    static async createPost(schoolId: string, postData: any) {
        const { data, error } = await supabase
            .from('forum_posts')
            .insert([{ ...postData, school_id: schoolId }])
            .select()
            .single();
        
        if (error) throw new Error(error.message);

        // Update topic last activity and post count
        await supabase.rpc('increment_forum_post_count', { p_topic_id: postData.topic_id });

        return data;
    }
}
