import { supabase } from '../config/supabase';

export class ClassService {
    static async getClasses(schoolId: string, branchId: string | undefined, teacherId?: string) {
        if (teacherId) {
            // Join with class_teachers to get classes AND subjects assigned to this teacher
            let query = supabase
                .from('class_teachers')
                .select(`
                    class_id,
                    subject_id,
                    classes!inner(id, name, grade, section, school_id, branch_id),
                    subjects!inner(id, name, school_id)
                `)
                .eq('teacher_id', teacherId)
                .eq('school_id', schoolId);

            if (branchId && branchId !== 'all') {
                query = query.or(`branch_id.eq.${branchId},branch_id.is.null`, { foreignTable: 'classes' });
            }

            const { data, error } = await query;
            if (error) throw new Error(error.message);

            // Flatten structure for easier consumption
            return data.map((item: any) => ({
                id: item.classes.id,
                name: item.classes.name,
                grade: item.classes.grade,
                section: item.classes.section,
                subject: item.subjects.name,
                subject_id: item.subjects.id,
                school_id: item.classes.school_id,
                branch_id: item.classes.branch_id
            }));
        } else {
            let query = supabase
                .from('classes')
                .select(`
                    *,
                    students!students_class_id_fkey (id)
                `)
                .eq('school_id', schoolId);

            if (branchId && branchId !== 'all') {
                // Classes filter
                query = query.or(`branch_id.eq.${branchId},branch_id.is.null`);
                // Note: supabase-js nested filtering for counts is complex, 
                // we will handle the count in the map below.
            }

            const { data, error } = await query
                .order('grade', { ascending: true })
                .order('section', { ascending: true });

            if (error) throw new Error(error.message);

            // Map to include student count and clean up students array
            return (data || []).map((cls: any) => {
                const { students, ...classInfo } = cls;
                return {
                    ...classInfo,
                    student_count: students?.length || 0,
                    studentCount: students?.length || 0
                };
            });
        }
    }

    static async createClass(schoolId: string, branchId: string | undefined, classData: any) {
        const insertData: any = { ...classData, school_id: schoolId };
        if (branchId && branchId !== 'all') {
            insertData.branch_id = branchId;
        }

        const { data, error } = await supabase
            .from('classes')
            .insert([insertData])
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    static async updateClass(schoolId: string, branchId: string | undefined, id: string, updates: any) {
        let query = supabase
            .from('classes')
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

    static async deleteClass(schoolId: string, branchId: string | undefined, id: string) {
        let query = supabase
            .from('classes')
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
}
