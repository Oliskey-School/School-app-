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
        console.log(`🔍 [TeacherService] getAllTeachers - schoolId: ${schoolId}, branchId: ${branchId}`);
        let query = supabase
            .from('teachers')
            .select('*')
            .eq('school_id', schoolId);

        if (branchId && branchId !== 'all') {
            query = query.or(`branch_id.eq.${branchId},branch_id.is.null`);
        }

        const { data, error } = await query.order('name');
        console.log(`🔍 [TeacherService] Database returned ${data?.length || 0} teachers. Error:`, error);

        if (error) throw new Error(error.message);

        return data || [];
    }

    static async getTeacherById(schoolId: string, branchId: string | undefined, id: string) {
        let query = supabase
            .from('teachers')
            .select(`
    *,
    class_teachers(
        class_id,
        subject_id,
        is_class_teacher,
        classes(id, name, grade, section, school_id, branch_id),
        subjects(id, name, school_id)
    )
        `)
            .eq('school_id', schoolId)
            .eq('id', id);

        if (branchId && branchId !== 'all') {
            // Be more permissive for demo data: match branch or match null
            query = query.or(`branch_id.eq.${branchId}, branch_id.is.null`);
        }

        const { data, error } = await query.maybeSingle();

        if (error) throw new Error(error.message);

        // DEMO MODE MOCK DATA INJECTION
        if (!data && id.toString().startsWith('t')) {
            console.log(`🛡️[TeacherService] Injecting Mock Data for teacher ID: ${id} `);
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
            .select('id, branch_id, name')
            .eq('user_id', userId)
            .eq('school_id', schoolId);

        if (branchId && branchId !== 'all') {
            tQuery = tQuery.eq('branch_id', branchId);
        }

        let { data: teacher, error: tErr } = await tQuery.maybeSingle();

        const isDemo = (schoolId === 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1' || userId === '014811ea-281f-484e-b039-e37beb8d92b2' || !schoolId);

        // [ENHANCED PERSISTENCE] If teacher not found in demo mode, try to link or create one
        if (!teacher && isDemo && userId) {
            console.log('🛡️ [TeacherService] Demo Mode: Attempting to resolve or create teacher for user:', userId);
            
            // Try to find ANY teacher record for this user (ignore school/branch filter for a moment)
            const { data: anyTeacher } = await supabase
                .from('teachers')
                .select('id, branch_id, name, school_id')
                .eq('user_id', userId)
                .maybeSingle();
            
            if (anyTeacher) {
                teacher = anyTeacher;
                console.log('🛡️ [TeacherService] Resolved existing teacher record for demo user');
            } else {
                // Fetch profile to get a name for the new teacher record
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('full_name, email')
                    .eq('id', userId)
                    .maybeSingle();
                
                if (profile) {
                    console.log('🛡️ [TeacherService] Creating new teacher record for demo user:', profile.full_name);
                    const { data: newTeacher, error: createErr } = await supabase
                        .from('teachers')
                        .insert({
                            user_id: userId,
                            name: profile.full_name || 'Demo Teacher',
                            email: profile.email,
                            school_id: schoolId || 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1',
                            branch_id: branchId && branchId !== 'all' ? branchId : '7601cbea-e1ba-49d6-b59b-412a584cb94f',
                            status: 'Active'
                        })
                        .select()
                        .maybeSingle();
                    
                    if (newTeacher) {
                        teacher = newTeacher;
                    } else if (createErr) {
                        console.error('❌ [TeacherService] Failed to create demo teacher:', createErr.message);
                    }
                }
            }
        }

        // Final fallback to Sarah Jones ONLY if we still haven't found a teacher and it's demo
        let teacherId = teacher?.id;
        if (!teacherId && isDemo) {
            console.log('🛡️ [TeacherService] Using Sarah Jones as final demo fallback');
            teacherId = '2e8f37b9-bae9-461a-b31e-9a757a261ce0';
        }

        if (!teacherId) {
            throw new Error('Teacher record not found');
        }

        const date = new Date().toISOString().split('T')[0];
        const checkIn = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

        // Use UPSERT to allow re-marking (updating check-in) and avoid unique constraint errors
        const { data, error } = await supabase
            .from('teacher_attendance')
            .upsert({
                teacher_id: teacherId,
                school_id: schoolId || (teacher as any)?.school_id || 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1',
                branch_id: (branchId && branchId !== 'all') ? branchId : (teacher?.branch_id || '7601cbea-e1ba-49d6-b59b-412a584cb94f'),
                date,
                status: 'present',
                approval_status: 'pending',
                check_in: checkIn
            }, { onConflict: 'teacher_id,date' })
            .select()
            .single();

        if (error) {
            console.error('❌ [TeacherService] Attendance persistence failed:', error.message);
            throw new Error(error.message);
        }
        
        return data;
    }

    static async getMyAttendanceHistory(schoolId: string, branchId: string | undefined, userId: string, limit: number = 30) {
        let tQuery = supabase
            .from('teachers')
            .select('id')
            .eq('user_id', userId);

        // Only filter by school/branch if provided, to be more robust in demo/sync scenarios
        if (schoolId) {
            tQuery = tQuery.eq('school_id', schoolId);
        }

        if (branchId && branchId !== 'all') {
            tQuery = tQuery.eq('branch_id', branchId);
        }

        let { data: teacher, error: tErr } = await tQuery.maybeSingle();

        const isDemo = schoolId === 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1' || userId === '014811ea-281f-484e-b039-e37beb8d92b2' || !schoolId;

        // If not found by strict criteria, try broad lookup for demo users
        if (!teacher && isDemo && userId) {
            const { data: anyTeacher } = await supabase
                .from('teachers')
                .select('id')
                .eq('user_id', userId)
                .maybeSingle();
            
            if (anyTeacher) teacher = anyTeacher;
        }

        if (!teacher) {
            if (isDemo) {
                console.log('🛡️ [TeacherService] Demo History Fallback for user_id:', userId);
                // Return empty but don't throw, allowing UI to show "No records yet"
                return [];
            }
            throw new Error('Teacher record not found');
        }

        const { data, error } = await supabase
            .from('teacher_attendance')
            .select('*')
            .eq('teacher_id', teacher.id)
            .order('date', { ascending: false })
            .limit(limit);

        if (error) throw new Error(error.message);
        return data;
    }

    static async getTeacherAttendance(schoolId: string, branchId: string | undefined, filters: { date?: string; status?: string; teacher_id?: string }) {
        let query = supabase
            .from('teacher_attendance')
            .select(`
                *,
                teachers (
                    id,
                    name,
                    avatar_url,
                    email
                )
            `)
            .eq('school_id', schoolId);

        if (branchId && branchId !== 'all') {
            query = query.eq('branch_id', branchId);
        }

        if (filters.date) {
            query = query.eq('date', filters.date);
        }

        if (filters.status) {
            query = query.eq('approval_status', filters.status);
        }

        if (filters.teacher_id) {
            query = query.eq('teacher_id', filters.teacher_id);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw new Error(error.message);
        return data;
    }
}
