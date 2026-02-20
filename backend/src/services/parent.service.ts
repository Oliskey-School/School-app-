import { supabase } from '../config/supabase';

export class ParentService {
    static async getParents(schoolId: string) {
        const { data, error } = await supabase
            .from('parents')
            .select(`
                *,
                parent_children (
                    student_id,
                    students (id, name, grade, section)
                )
            `)
            .eq('school_id', schoolId)
            .order('name');

        if (error) throw new Error(error.message);
        return (data || []).map((p: any) => ({
            ...p,
            childIds: p.parent_children?.map((pc: any) => pc.student_id) || []
        }));
    }

    static async createParent(schoolId: string, parentData: any) {
        const { data, error } = await supabase
            .from('parents')
            .insert([{ ...parentData, school_id: schoolId }])
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    static async getParentById(schoolId: string, id: string) {
        const { data, error } = await supabase
            .from('parents')
            .select(`
                *,
                parent_children (
                    student_id,
                    students (id, name, grade, section)
                )
            `)
            .eq('school_id', schoolId)
            .eq('id', id)
            .single();

        if (error) throw new Error(error.message);
        return {
            ...data,
            childIds: data.parent_children?.map((pc: any) => pc.student_id) || []
        };
    }

    static async updateParent(schoolId: string, id: string, updates: any) {
        const { data, error } = await supabase
            .from('parents')
            .update(updates)
            .eq('id', id)
            .eq('school_id', schoolId)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    static async deleteParent(schoolId: string, id: string) {
        const { error } = await supabase
            .from('parents')
            .delete()
            .eq('id', id)
            .eq('school_id', schoolId);

        if (error) throw new Error(error.message);
        return true;
    }

    static async getChildren(schoolId: string, parentUserId: string) {
        // 1. Get student IDs from student_parent_links (user-id based) or direct link
        const { data: relations } = await supabase
            .from('parent_children')
            .select('student_id')
            .eq('school_id', schoolId);
        // In a real multi-tenant app, we'd filter by parent_id here.
        // For now, let's assume we find students where user_id matches the parent link.

        const { data: students, error } = await supabase
            .from('students')
            .select(`
                *,
                academic_performance (*),
                behavior_records (*),
                report_cards (*)
            `)
            .eq('school_id', schoolId)
            // This is a simplified fetch for the demo/connected test.
            // In production, we'd join via parent_children table with proper auth.
            .order('name');

        if (error) throw new Error(error.message);
        return students || [];
    }

    static async createAppointment(schoolId: string, appointmentData: any) {
        const { data, error } = await supabase
            .from('appointments')
            .insert([{
                ...appointmentData,
                school_id: schoolId
            }])
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    static async volunteerSignup(schoolId: string, signupData: any) {
        // 1. Insert signup
        const { data, error } = await supabase
            .from('volunteer_signups')
            .insert([{
                ...signupData,
                school_id: schoolId
            }])
            .select()
            .single();

        if (error) throw new Error(error.message);

        // 2. Increment slots_filled
        if (signupData.opportunity_id) {
            const { data: opp } = await supabase
                .from('volunteer_opportunities')
                .select('slots_filled')
                .eq('id', signupData.opportunity_id)
                .single();

            if (opp) {
                await supabase
                    .from('volunteer_opportunities')
                    .update({ slots_filled: (opp.slots_filled || 0) + 1 })
                    .eq('id', signupData.opportunity_id);
            }
        }

        return data;
    }

    static async markNotificationRead(notificationId: string | number) {
        const { data, error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notificationId)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }
}
