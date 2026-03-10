import { supabase } from '../config/supabase';
import { IdGeneratorService } from './idGenerator.service';

export class TeacherService {
    static async createTeacher(schoolId: string, branchId: string | undefined, data: any) {
        const { name, email, phone, subjects, classes, avatar_url, branch_id } = data;
        const effectiveBranchId = branchId || branch_id;

        // 1. Generate standard school ID
        let schoolGeneratedId: string | undefined;
        if (effectiveBranchId) {
            try {
                schoolGeneratedId = await IdGeneratorService.generateSchoolId(schoolId, effectiveBranchId, 'teacher');
            } catch (idErr: any) {
                console.warn('[TeacherService] Could not generate school ID:', idErr.message);
            }
        }

        // 2. Create Teacher Record
        const { data: teacher, error } = await supabase
            .from('teachers')
            .insert([{
                name,
                email,
                phone,
                avatar_url,
                school_id: schoolId,
                branch_id: effectiveBranchId,
                school_generated_id: schoolGeneratedId || null,
                status: 'Active'
            }])
            .select()
            .single();

        if (error) throw new Error(error.message);

        // 3. Link Subjects if provided
        if (subjects && Array.isArray(subjects)) {
            const subjectInserts = subjects.map(s => ({ teacher_id: teacher.id, subject: s }));
            await supabase.from('teacher_subjects').insert(subjectInserts);
        }

        // 4. Link Classes if provided
        if (classes && Array.isArray(classes)) {
            const classInserts = classes.map(c => ({ teacher_id: teacher.id, class_name: c }));
            await supabase.from('teacher_classes').insert(classInserts);
        }

        // Sync school_generated_id to users table if this teacher has a linked user
        if (teacher.user_id && schoolGeneratedId) {
            await IdGeneratorService.syncToUsersTable(teacher.user_id, schoolGeneratedId);
        }

        return teacher;
    }

    static async getAllTeachers(schoolId: string, branchId?: string) {
        let query = supabase
            .from('teachers')
            .select('*')
            .eq('school_id', schoolId);

        if (branchId && branchId !== 'all') {
            query = query.or(`branch_id.eq.${branchId},branch_id.is.null`);
        }

        const { data, error } = await query.order('name');

        if (error) throw new Error(error.message);

        // DEMO MODE MOCK DATA INJECTION
        const isDemoSchool = schoolId === 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';
        if (isDemoSchool && (!data || data.length === 0)) {
            console.log('🛡️ [TeacherService] Injecting Demo Mock Teachers');
            return [
                { id: 't1', name: 'Robert Smith', email: 'robert@school.com', phone: '1234567890', status: 'Active', school_id: schoolId, branch_id: branchId || '7601cbea-e1ba-49d6-b59b-412a584cb94f' },
                { id: 't2', name: 'Sarah Wilson', email: 'sarah@school.com', phone: '0987654321', status: 'Active', school_id: schoolId, branch_id: branchId || '7601cbea-e1ba-49d6-b59b-412a584cb94f' },
                { id: 't3', name: 'Michael Chen', email: 'michael@school.com', phone: '5556667777', status: 'Active', school_id: schoolId, branch_id: branchId || '7601cbea-e1ba-49d6-b59b-412a584cb94f' }
            ];
        }

        return data;
    }

    static async getTeacherById(schoolId: string, branchId: string | undefined, id: string) {
        let query = supabase
            .from('teachers')
            .select(`
                *,
                class_teachers (
                    class_id,
                    subject_id,
                    is_class_teacher,
                    classes (id, name, grade, section, school_id, branch_id),
                    subjects (id, name, school_id)
                )
            `)
            .eq('school_id', schoolId)
            .eq('id', id);

        if (branchId && branchId !== 'all') {
            // Be more permissive for demo data: match branch or match null
            query = query.or(`branch_id.eq.${branchId},branch_id.is.null`);
        }

        const { data, error } = await query.maybeSingle();

        if (error) throw new Error(error.message);

        // DEMO MODE MOCK DATA INJECTION
        if (!data && id.toString().startsWith('t')) {
            console.log(`🛡️ [TeacherService] Injecting Mock Data for teacher ID: ${id}`);
            const mockTeachers: any = {
                't1': { id: 't1', name: 'Robert Smith', email: 'robert@school.com', phone: '1234567890', status: 'Active', school_id: schoolId, branch_id: branchId || '7601cbea-e1ba-49d6-b59b-412a584cb94f', class_teachers: [] },
                't2': { id: 't2', name: 'Sarah Wilson', email: 'sarah@school.com', phone: '0987654321', status: 'Active', school_id: schoolId, branch_id: branchId || '7601cbea-e1ba-49d6-b59b-412a584cb94f', class_teachers: [] },
                't3': { id: 't3', name: 'Michael Chen', email: 'michael@school.com', phone: '5556667777', status: 'Active', school_id: schoolId, branch_id: branchId || '7601cbea-e1ba-49d6-b59b-412a584cb94f', class_teachers: [] }
            };
            return mockTeachers[id.toString()] || null;
        }

        return data;
    }

    static async updateTeacher(schoolId: string, branchId: string | undefined, id: string, updates: any) {
        let query = supabase
            .from('teachers')
            .update(updates)
            .eq('school_id', schoolId)
            .eq('id', id);

        if (branchId && branchId !== 'all') {
            query = query.eq('branch_id', branchId);
        }

        const { data, error } = await query
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    static async deleteTeacher(schoolId: string, branchId: string | undefined, id: string) {
        let query = supabase
            .from('teachers')
            .delete()
            .eq('school_id', schoolId)
            .eq('id', id);

        if (branchId && branchId !== 'all') {
            query = query.eq('branch_id', branchId);
        }

        const { error } = await query;

        if (error) throw new Error(error.message);
        return true;
    }

    static async submitMyAttendance(schoolId: string, branchId: string | undefined, userId: string) {
        // 1. Resolve teacher ID from user ID
        let tQuery = supabase
            .from('teachers')
            .select('id, branch_id')
            .eq('user_id', userId)
            .eq('school_id', schoolId);

        if (branchId && branchId !== 'all') {
            tQuery = tQuery.eq('branch_id', branchId);
        }

        const { data: teacher, error: tErr } = await tQuery.single();

        if (tErr || !teacher) throw new Error('Teacher record not found');

        const date = new Date().toISOString().split('T')[0];
        const checkIn = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

        const { data, error } = await supabase
            .from('teacher_attendance')
            .insert({
                teacher_id: teacher.id,
                school_id: schoolId,
                branch_id: branchId || (teacher as any).branch_id,
                date,
                status: 'present',
                approval_status: 'pending',
                check_in: checkIn
            })
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    static async getMyAttendanceHistory(schoolId: string, branchId: string | undefined, userId: string, limit: number = 30) {
        let tQuery = supabase
            .from('teachers')
            .select('id')
            .eq('user_id', userId)
            .eq('school_id', schoolId);

        if (branchId && branchId !== 'all') {
            tQuery = tQuery.eq('branch_id', branchId);
        }

        const { data: teacher, error: tErr } = await tQuery.single();

        if (tErr || !teacher) throw new Error('Teacher record not found');

        const { data, error } = await supabase
            .from('teacher_attendance')
            .select('*')
            .eq('teacher_id', teacher.id)
            .eq('school_id', schoolId)
            .order('date', { ascending: false })
            .limit(limit);

        if (error) throw new Error(error.message);
        return data;
    }
}
