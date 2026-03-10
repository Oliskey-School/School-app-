import { supabase } from '../config/supabase';

export class GalleryService {
    static async getPhotos(schoolId: string) {
        const { data, error } = await supabase
            .from('school_gallery')
            .select('*')
            .eq('school_id', schoolId)
            .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);
        return data || [];
    }
}
