import { supabase } from '../config/supabase';

export class ParentService {
    static async getParents(schoolId: string, branchId?: string) {
        let query = supabase
            .from('parents')
            .select(`
                *,
                parent_children (
                    student_id,
                    students (id, name, grade, section)
                )
            `)
            .eq('school_id', schoolId);

        if (branchId && branchId !== 'all') {
            query = query.or(`branch_id.eq.${branchId},branch_id.is.null`);
        }

        const { data, error } = await query.order('name');

        if (error) throw new Error(error.message);
        return (data || []).map((p: any) => ({
            ...p,
            childIds: p.parent_children?.map((pc: any) => pc.student_id) || []
        }));
    }

    static async createParent(schoolId: string, branchId: string | undefined, parentData: any) {
        const insertData = { ...parentData, school_id: schoolId };

        if (branchId && branchId !== 'all') {
            insertData.branch_id = branchId;
        }

        const { data, error } = await supabase
            .from('parents')
            .insert([insertData])
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    static async getParentById(schoolId: string, branchId: string | undefined, id: string) {
        let query = supabase
            .from('parents')
            .select(`
                *,
                parent_children (
                    student_id,
                    students (id, name, grade, section)
                )
            `)
            .eq('school_id', schoolId)
            .eq('id', id);

        if (branchId && branchId !== 'all') {
            query = query.eq('branch_id', branchId);
        }

        const { data, error } = await query.single();

        if (error) throw new Error(error.message);
        return {
            ...data,
            childIds: data.parent_children?.map((pc: any) => pc.student_id) || []
        };
    }

    static async updateParent(schoolId: string, branchId: string | undefined, id: string, updates: any) {
        let query = supabase
            .from('parents')
            .update(updates)
            .eq('id', id)
            .eq('school_id', schoolId);

        if (branchId && branchId !== 'all') {
            query = query.eq('branch_id', branchId);
        }

        const { data, error } = await query
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    static async deleteParent(schoolId: string, branchId: string | undefined, id: string) {
        let query = supabase
            .from('parents')
            .delete()
            .eq('id', id)
            .eq('school_id', schoolId);

        if (branchId && branchId !== 'all') {
            query = query.eq('branch_id', branchId);
        }

        const { error } = await query;

        if (error) throw new Error(error.message);
        return true;
    }

    static async getChildren(schoolId: string, branchId: string | undefined, parentUserId: string) {
        // 1. Resolve parent_id from user_id
        const { data: parent } = await supabase
            .from('parents')
            .select('id')
            .eq('user_id', parentUserId)
            .eq('school_id', schoolId)
            .single();

        if (!parent) return [];

        // 2. Get student IDs from parent_children bridge table
        let query = supabase
            .from('parent_children')
            .select('student_id')
            .eq('parent_id', parent.id)
            .eq('school_id', schoolId);

        if (branchId && branchId !== 'all') {
            query = query.eq('branch_id', branchId);
        }

        const { data: relations, error: relError } = await query;
        if (relError || !relations || relations.length === 0) return [];

        const studentIds = relations.map(r => r.student_id);

        // 3. Fetch the specific students
        let studentQuery = supabase
            .from('students')
            .select(`
                *,
                academic_performance (*),
                behavior_records (*),
                report_cards (*)
            `)
            .in('id', studentIds)
            .eq('school_id', schoolId);

        if (branchId && branchId !== 'all') {
            studentQuery = studentQuery.or(`branch_id.eq.${branchId},branch_id.is.null`);
        }

        const { data: students, error } = await studentQuery.order('name');

        if (error) throw new Error(error.message);
        return students || [];
    }

    static async createAppointment(schoolId: string, branchId: string | undefined, appointmentData: any) {
        const insertData = {
            ...appointmentData,
            school_id: schoolId
        };

        if (branchId && branchId !== 'all') {
            insertData.branch_id = branchId;
        }

        const { data, error } = await supabase
            .from('appointments')
            .insert([insertData])
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    static async volunteerSignup(schoolId: string, branchId: string | undefined, signupData: any) {
        // 1. Insert signup
        const insertData = {
            ...signupData,
            school_id: schoolId
        };

        if (branchId && branchId !== 'all') {
            insertData.branch_id = branchId;
        }

        const { data, error } = await supabase
            .from('volunteer_signups')
            .insert([insertData])
            .select()
            .single();

        if (error) throw new Error(error.message);

        // 2. Increment slots_filled
        if (signupData.opportunity_id) {
            const { data: opp } = await supabase
                .from('volunteering_opportunities')
                .select('slots_filled')
                .eq('id', signupData.opportunity_id)
                .single();

            if (opp) {
                await supabase
                    .from('volunteering_opportunities')
                    .update({ slots_filled: ((opp as any).slots_filled || 0) + 1 })
                    .eq('id', signupData.opportunity_id);
            }
        }

        return data;
    }

    static async markNotificationRead(schoolId: string, branchId: string | undefined, notificationId: string | number) {
        let query = supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notificationId)
            .eq('school_id', schoolId);

        if (branchId && branchId !== 'all') {
            query = query.eq('branch_id', branchId);
        }

        const { data, error } = await query
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }
}
