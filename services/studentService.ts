import { supabase } from '../lib/supabase';
import { api } from '../lib/api';
import { toast } from 'react-hot-toast';
import { Database } from '../types/supabase';
import {
    Student,
    Teacher,
    Parent,
    Notice,
    ClassInfo,
    Assignment,
    Exam,
    Conversation,
    Message,
    ReportCard,
    Bus
} from '../types';

import {
    isDemoMode,
    backendFetch,
    getFormattedClassName,
    getGrade
} from '../lib/apiHelpers';


/**
 * Complete Database Service for School Management System
 * All data fetching happens here - NO mock data!
 */


// ============================================
// STUDENTS
// ============================================

export async function fetchStudents(schoolId?: string, branchId?: string): Promise<Student[]> {
    try {
        let query = supabase
            .from('students')
            .select('id, school_generated_id, name, email, avatar_url, grade, section, class_id, department, attendance_status, birthday, school_id, branch_id')
            .order('grade', { ascending: false });

        if (schoolId) {
            query = query.eq('school_id', schoolId);
        }

        if (branchId && branchId !== 'all') {
            query = query.or(`branch_id.eq.${branchId},branch_id.is.null`);
        }

        const { data, error } = await query;

        // Fallback to backend API if direct query returns nothing and we're in demo mode
        if ((!data || data.length === 0) && (isDemoMode() || !error)) {
            try {
                const backendData = await backendFetch<any[]>(`/students?school_id=${schoolId || ''}${branchId && branchId !== 'all' ? `&branchId=${branchId}` : ''}`);
                if (backendData && backendData.length > 0) {
                    return backendData.map((s: any) => ({
                        id: s.id,
                        schoolId: s.school_id,
                        schoolGeneratedId: s.school_generated_id,
                        name: s.name,
                        email: s.email || '',
                        avatarUrl: s.avatar_url || 'https://i.pravatar.cc/150',
                        grade: s.grade,
                        section: s.section,
                        department: s.department,
                        attendanceStatus: s.attendance_status || 'Absent',
                        birthday: s.birthday,
                        classId: s.class_id
                    }));
                }
            } catch (backendErr) {
                console.error('Backend fallback failed for students:', backendErr);
            }
        }

        if (error) throw error;

        return (data || []).map((s: any) => ({
            id: s.id,
            schoolId: s.school_id,
            schoolGeneratedId: s.school_generated_id,
            name: s.name,
            email: s.email || '',
            avatarUrl: s.avatar_url || 'https://i.pravatar.cc/150',
            grade: s.grade,
            section: s.section,
            department: s.department,
            attendanceStatus: s.attendance_status || 'Absent',
            birthday: s.birthday,
            classId: s.class_id
        }));
    } catch (err) {
        console.error('Error fetching students:', err);
        return [];
    }
}

export async function fetchStudentById(id: string | number): Promise<Student | null> {
    try {
        const { data, error } = await supabase
            .from('students')
            .select('id, school_id, school_generated_id, name, avatar_url, grade, section, department, attendance_status, birthday, email')
            .eq('id', id)
            .maybeSingle();

        if (error) throw error;
        if (!data) return null;

        return {
            id: data.id,
            schoolId: data.school_id,
            schoolGeneratedId: data.school_generated_id,
            name: data.name,
            avatarUrl: data.avatar_url || 'https://i.pravatar.cc/150',
            grade: data.grade,
            section: data.section,
            department: data.department,
            attendanceStatus: data.attendance_status || 'Absent',
            birthday: data.birthday,
            email: data.email || ''
        };
    } catch (err) {
        console.error('Error fetching student:', err);
        return null;
    }
}

export async function fetchStudentByEmail(email: string): Promise<Student | null> {
    try {
        const { data, error } = await supabase
            .from('students')
            .select('id, school_id, school_generated_id, name, avatar_url, grade, section, department, attendance_status, birthday, email')
            .eq('email', email)
            .maybeSingle();

        if (error) throw error;
        if (!data) return null;

        return {
            id: data.id,
            schoolId: data.school_id,
            schoolGeneratedId: data.school_generated_id,
            name: data.name,
            avatarUrl: data.avatar_url || 'https://i.pravatar.cc/150',
            grade: data.grade,
            section: data.section,
            department: data.department,
            attendanceStatus: data.attendance_status || 'Absent',
            birthday: data.birthday,
            email: data.email || ''
        };
    } catch (err) {
        console.error('Error fetching student by email:', err);
        return null;
    }
}

export async function fetchStudentsByClass(grade: number | string, section: string, schoolId?: string, branchId?: string): Promise<Student[]> {
    try {
        let query = supabase
            .from('students')
            .select('id, school_id, school_generated_id, name, email, avatar_url, grade, section, department, attendance_status, birthday')
            .eq('grade', grade);

        if (section && section !== 'null' && section !== '') {
            query = query.eq('section', section);
        } else {
            query = query.is('section', null);
        }

        if (schoolId) {
            query = query.eq('school_id', schoolId);
        }

        if (branchId && branchId !== 'all') {
            query = query.or(`branch_id.eq.${branchId},branch_id.is.null`);
        }

        const { data, error } = await query.order('name', { ascending: true });

        if (error) throw error;

        return (data || []).map((s: any) => ({
            id: s.id,
            schoolId: s.school_id,
            schoolGeneratedId: s.school_generated_id,
            name: s.name,
            email: s.email || '',
            avatarUrl: s.avatar_url || 'https://i.pravatar.cc/150',
            grade: s.grade,
            section: s.section,
            department: s.department,
            attendanceStatus: s.attendance_status || 'Absent',
            birthday: s.birthday
        }));
    } catch (err) {
        console.error(`Error fetching students for Grade ${grade} - ${section}:`, err);
        return [];
    }
}

export async function fetchStudentsByClassId(classId: string): Promise<Student[]> {
    try {
        const { data, error } = await supabase
            .from('students')
            .select(`
                id, school_id, school_generated_id, name, email, avatar_url, grade, section, department, attendance_status, birthday, class_id
            `)
            .or(`class_id.eq.${classId},current_class_id.eq.${classId}`);

        if (error) throw error;

        return (data || []).map((s: any) => {
            return {
                id: s.id,
                schoolId: s.school_id,
                schoolGeneratedId: s.school_generated_id,
                name: s.name,
                email: s.email || '',
                avatarUrl: s.avatar_url || 'https://i.pravatar.cc/150',
                grade: s.grade,
                section: s.section,
                department: s.department,
                attendanceStatus: s.attendance_status || 'Absent',
                birthday: s.birthday,
                classId: s.class_id
            };
        });
    } catch (err) {
        console.error(`Error fetching students for Class ID ${classId}:`, err);
        return [];
    }
}

export async function fetchClassSubjects(grade: number, section: string): Promise<string[]> {
    try {
        const { data, error } = await supabase
            .from('classes')
            .select('subject')
            .eq('grade', grade)
            .eq('section', section);

        if (error) throw error;

        // Return unique subjects
        return Array.from(new Set((data || []).map((c: any) => c.subject)));
    } catch (err) {
        console.error('Error fetching student subjects:', err);
        return [];
    }
}

export async function createStudent(studentData: {
    name: string;
    email?: string;
    grade: number;
    section: string;
    department?: string;
    birthday?: string;
    avatarUrl?: string;
    userId?: string;
}): Promise<Student | null> {
    try {
        const { data, error } = await supabase
            .from('students')
            .insert({
                user_id: studentData.userId,
                name: studentData.name,
                email: studentData.email,
                grade: studentData.grade,
                section: studentData.section,
                department: studentData.department,
                birthday: studentData.birthday,
                avatar_url: studentData.avatarUrl,
                attendance_status: 'Absent',
                created_at: new Date().toISOString()
            })
            .select()
            .maybeSingle();

        if (error) throw error;

        return {
            id: data.id,
            schoolId: data.school_id,
            schoolGeneratedId: data.school_generated_id,
            name: data.name,
            avatarUrl: data.avatar_url || 'https://i.pravatar.cc/150',
            grade: data.grade,
            section: data.section,
            department: data.department,
            attendanceStatus: data.attendance_status || 'Absent',
            birthday: data.birthday,
            email: data.email || ''
        };
    } catch (err) {
        console.error('Error creating student:', err);
        return null;
    }
}

export async function updateStudent(id: string | number, updates: Partial<{
    name: string;
    email: string;
    grade: number;
    section: string;
    department: string;
    birthday: string;
    avatarUrl: string;
    attendanceStatus: string;
}>): Promise<boolean> {
    try {
        const dbUpdates: any = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.email !== undefined) dbUpdates.email = updates.email;
        if (updates.grade !== undefined) dbUpdates.grade = updates.grade;
        if (updates.section !== undefined) dbUpdates.section = updates.section;
        if (updates.department !== undefined) dbUpdates.department = updates.department;
        if (updates.birthday !== undefined) dbUpdates.birthday = updates.birthday;
        if (updates.avatarUrl !== undefined) dbUpdates.avatar_url = updates.avatarUrl;
        if (updates.attendanceStatus !== undefined) dbUpdates.attendance_status = updates.attendanceStatus;

        const { error } = await supabase
            .from('students')
            .update(dbUpdates)
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (err) {
        console.error('Error updating student:', err);
        return false;
    }
}

export async function deleteStudent(id: string | number): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('students')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (err) {
        console.error('Error deleting student:', err);
        return false;
    }
}


// ============================================
// TEACHERS
// ============================================

export async function fetchTeachers(schoolId?: string, branchId?: string): Promise<Teacher[]> {
    try {
        let query = supabase
            .from('teachers')
            .select(`
                id, user_id, school_id, school_generated_id, name, avatar_url, email, phone, status,
                teacher_subjects(subject),
                teacher_classes(class_name)
            `);

        if (schoolId) {
            query = query.eq('school_id', schoolId);
        }

        if (branchId && branchId !== 'all') {
            query = query.or(`branch_id.eq.${branchId},branch_id.is.null`);
        }

        const { data, error } = await query;

        // Fallback to backend API if direct query returns nothing and we're in demo mode
        if ((!data || data.length === 0) && (isDemoMode() || !error)) {
            try {
                const backendData = await backendFetch<any[]>(`/teachers?school_id=${schoolId || ''}${branchId && branchId !== 'all' ? `&branchId=${branchId}` : ''}`);
                if (backendData && backendData.length > 0) {
                    return backendData.map((t: any) => ({
                        id: t.id,
                        schoolId: t.school_id,
                        schoolGeneratedId: t.school_generated_id,
                        name: t.name,
                        avatarUrl: t.avatar_url || 'https://i.pravatar.cc/150?u=teacher',
                        email: t.email,
                        phone: t.phone || '',
                        status: t.status || 'Active',
                        subjects: (t.teacher_subjects || []).map((s: any) => s.subject),
                        classes: (t.teacher_classes || []).map((c: any) => c.class_name)
                    }));
                }
            } catch (backendErr) {
                console.error('Backend fallback failed for teachers:', backendErr);
            }
        }

        return (data || []).map((t: any) => ({
            id: t.id,
            schoolId: t.school_id,
            schoolGeneratedId: t.school_generated_id,
            name: t.name,
            avatarUrl: t.avatar_url || 'https://i.pravatar.cc/150?u=teacher',
            email: t.email,
            phone: t.phone || '',
            status: t.status || 'Active',
            subjects: (t.teacher_subjects || []).map((s: any) => s.subject),
            classes: (t.teacher_classes || []).map((c: any) => c.class_name)
        }));
    } catch (err) {
        console.error('Error fetching teachers:', err);
        return [];
    }
}

export async function fetchTeacherById(id: string | number): Promise<Teacher | null> {
    try {
        const { data, error } = await supabase
            .from('teachers')
            .select(`
        id, user_id, school_id, school_generated_id, name, avatar_url, email, phone, status,
        teacher_subjects(subject),
        teacher_classes(class_name),
        class_teachers (
          class_id,
          subject_id,
          classes ( id, name, grade, section ),
          subjects ( id, name )
        )
      `)
            .eq('id', id)
            .maybeSingle();

        if (error) throw error;
        if (!data) return null;

        // Resolve subjects from both legacy and modern tables
        const subjectsSet = new Set<string>((data.teacher_subjects || []).map((s: any) => s.subject));
        (data.class_teachers || []).forEach((ct: any) => {
            if (ct.subjects?.name) subjectsSet.add(ct.subjects.name);
        });

        // Resolve classes from both legacy and modern tables
        const classesSet = new Set<string>((data.teacher_classes || []).map((c: any) => c.class_name));
        (data.class_teachers || []).forEach((ct: any) => {
            if (ct.classes?.name) classesSet.add(ct.classes.name);
        });

        return {
            id: data.id,
            user_id: data.user_id,
            schoolId: data.school_id,
            schoolGeneratedId: data.school_generated_id,
            name: data.name,
            avatarUrl: data.avatar_url || 'https://i.pravatar.cc/150?u=teacher',
            email: data.email,
            phone: data.phone || '',
            status: data.status || 'Active',
            subjects: Array.from(subjectsSet),
            classes: Array.from(classesSet)
        };
    } catch (err) {
        console.error('Error fetching teacher:', err);
        return null;
    }
}

export async function createTeacher(teacherData: {
    name: string;
    email: string;
    phone?: string;
    subjects?: string[];
    classes?: string[];
    avatarUrl?: string;
}): Promise<Teacher | null> {
    try {
        // Insert teacher first
        const { data: teacher, error: teacherError } = await supabase
            .from('teachers')
            .insert({
                name: teacherData.name,
                email: teacherData.email,
                phone: teacherData.phone,
                avatar_url: teacherData.avatarUrl,
                status: 'Active',
                created_at: new Date().toISOString()
            })
            .select()
            .maybeSingle();

        if (teacherError) throw teacherError;

        // Insert subjects if provided
        if (teacherData.subjects && teacherData.subjects.length > 0) {
            const subjectInserts = teacherData.subjects.map(subject => ({
                teacher_id: teacher.id,
                subject
            }));
            await supabase.from('teacher_subjects').insert(subjectInserts);
        }

        // Insert classes if provided
        if (teacherData.classes && teacherData.classes.length > 0) {
            const classInserts = teacherData.classes.map(className => ({
                teacher_id: teacher.id,
                class_name: className
            }));
            await supabase.from('teacher_classes').insert(classInserts);
        }

        return {
            id: teacher.id,
            schoolId: teacher.school_generated_id,
            name: teacher.name,
            avatarUrl: teacher.avatar_url || 'https://i.pravatar.cc/150?u=teacher',
            email: teacher.email,
            phone: teacher.phone || '',
            status: teacher.status || 'Active',
            subjects: teacherData.subjects || [],
            classes: teacherData.classes || []
        };
    } catch (err) {
        console.error('Error creating teacher:', err);
        return null;
    }
}

export async function updateTeacher(id: string | number, updates: Partial<{
    name: string;
    email: string;
    phone: string;
    avatarUrl: string;
    status: string;
    subjects: string[];
    classes: string[];
}>): Promise<boolean> {
    try {
        // Update teacher basic info
        const dbUpdates: any = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.email !== undefined) dbUpdates.email = updates.email;
        if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
        if (updates.avatarUrl !== undefined) dbUpdates.avatar_url = updates.avatarUrl;
        if (updates.status !== undefined) dbUpdates.status = updates.status;

        if (Object.keys(dbUpdates).length > 0) {
            const { error } = await supabase
                .from('teachers')
                .update(dbUpdates)
                .eq('id', id);
            if (error) throw error;
        }

        // Update subjects if provided
        if (updates.subjects !== undefined) {
            // Delete existing
            await supabase.from('teacher_subjects').delete().eq('teacher_id', id);
            // Insert new
            if (updates.subjects.length > 0) {
                const subjectInserts = updates.subjects.map(subject => ({
                    teacher_id: id,
                    subject
                }));
                await supabase.from('teacher_subjects').insert(subjectInserts);
            }
        }

        // Update classes if provided
        if (updates.classes !== undefined) {
            // Delete existing
            await supabase.from('teacher_classes').delete().eq('teacher_id', id);
            // Insert new
            if (updates.classes.length > 0) {
                const classInserts = updates.classes.map(className => ({
                    teacher_id: id,
                    class_name: className
                }));
                await supabase.from('teacher_classes').insert(classInserts);
            }
        }

        return true;
    } catch (err) {
        console.error('Error updating teacher:', err);
        return false;
    }
}

export async function deleteTeacher(id: string | number): Promise<boolean> {
    try {
        // Delete related records first (cascade should handle this, but being explicit)
        await supabase.from('teacher_subjects').delete().eq('teacher_id', id);
        await supabase.from('teacher_classes').delete().eq('teacher_id', id);

        // Delete teacher
        const { error } = await supabase
            .from('teachers')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (err) {
        console.error('Error deleting teacher:', err);
        return false;
    }
}


// ============================================
// PARENTS
// ============================================

export async function fetchParents(schoolId?: string, branchId?: string): Promise<Parent[]> {
    try {
        let query = supabase
            .from('parents')
            .select(`
                id, school_generated_id, name, email, phone, avatar_url, school_id, user_id, branch_id,
                parent_children(student_id)
            `);

        if (schoolId) {
            query = query.eq('school_id', schoolId);
        }

        if (branchId && branchId !== 'all') {
            query = query.or(`branch_id.eq.${branchId},branch_id.is.null`);
        }

        let { data, error } = await query;

        // Fallback to backend API if direct query returns nothing and we're in demo mode
        if ((!data || data.length === 0) && (isDemoMode() || !error)) {
            try {
                const backendData = await backendFetch<any[]>(`/parents?school_id=${schoolId || ''}${branchId && branchId !== 'all' ? `&branchId=${branchId}` : ''}`);
                if (backendData && backendData.length > 0) {
                    data = backendData;
                }
            } catch (backendErr) {
                console.error('Backend fallback failed for parents:', backendErr);
            }
        }

        if (error && !data) throw error;

        const parents = data || [];

        // Extract all involved student IDs
        const allStudentIds = new Set<string>();
        parents.forEach((p: any) => {
            if (p.parent_children) {
                p.parent_children.forEach((c: any) => allStudentIds.add(c.student_id));
            }
        });

        // Fetch readable IDs for these students
        let studentMap: Record<string, string> = {};
        if (allStudentIds.size > 0) {
            const arrIds = Array.from(allStudentIds);
            const { data: students, error: stuError } = await supabase
                .from('students')
                .select('id, school_generated_id, admission_number')
                .in('id', arrIds);

            if (!stuError && students) {
                students.forEach((s: any) => {
                    studentMap[s.id] = s.school_generated_id || s.admission_number || 'Unknown';
                });
            }
        }

        return parents.map((p: any) => ({
            id: p.id,
            schoolId: p.school_id,
            schoolGeneratedId: p.school_generated_id,
            name: p.name,
            email: p.email,
            phone: p.phone || '',
            avatarUrl: p.avatar_url || 'https://i.pravatar.cc/150?u=parent',
            childIds: (p.parent_children || []).map((c: any) => studentMap[c.student_id] || 'OLISKEY_MAIN_STU_0001')
        }));
    } catch (err) {
        console.error('Error fetching parents:', err);
        return [];
    }
}

export async function fetchParentByEmail(email: string): Promise<Parent | null> {
    try {
        const { data, error } = await supabase
            .from('parents')
            .select(`
        *,
        parent_children(student_id)
      `)
            .eq('email', email)
            .maybeSingle();

        if (error) throw error;
        if (!data) return null;

        // Fetch readable IDs for children
        let childIds: string[] = [];
        if (data.parent_children && data.parent_children.length > 0) {
            const studentIds = data.parent_children.map((c: any) => c.student_id);
            const { data: students, error: stuError } = await supabase
                .from('students')
                .select('school_generated_id, admission_number')
                .in('id', studentIds);

            if (!stuError && students) {
                childIds = students.map((s: any) => s.school_generated_id || s.admission_number || 'Unknown');
            } else {
                childIds = studentIds; // Fallback
            }
        }

        return {
            id: data.id,
            schoolId: data.school_id,
            schoolGeneratedId: data.school_generated_id,
            name: data.name,
            email: data.email,
            phone: data.phone || '',
            avatarUrl: data.avatar_url || 'https://i.pravatar.cc/150?u=parent',
            childIds: childIds
        };
    } catch (err) {
        console.error('Error fetching parent by email:', err);
        return null;
    }
}

export async function fetchParentByUserId(userId: string): Promise<Parent | null> {
    try {
        const { data, error } = await supabase
            .from('parents')
            .select(`
        *,
        parent_children(student_id)
      `)
            .eq('user_id', userId)
            .maybeSingle();

        if (error) throw error;
        if (!data) return null;

        // Fetch readable IDs for children
        let childIds: string[] = [];
        if (data.parent_children && data.parent_children.length > 0) {
            const studentIds = data.parent_children.map((c: any) => c.student_id);
            const { data: students, error: stuError } = await supabase
                .from('students')
                .select('school_generated_id, admission_number')
                .in('id', studentIds);

            if (!stuError && students) {
                childIds = students.map((s: any) => s.school_generated_id || s.admission_number || 'Unknown');
            } else {
                childIds = studentIds; // Fallback
            }
        }

        return {
            id: data.id,
            schoolId: data.school_id,
            schoolGeneratedId: data.school_generated_id,
            name: data.name,
            email: data.email,
            phone: data.phone || '',
            avatarUrl: data.avatar_url || 'https://i.pravatar.cc/150?u=parent',
            childIds: childIds
        };
    } catch (err) {
        console.error('Error fetching parent by user id:', err);
        return null;
    }
}

export async function fetchChildrenForParent(parentId: string | number): Promise<Student[]> {
    try {
        // 1. Get student IDs
        const { data: relations, error: relError } = await supabase
            .from('parent_children')
            .select('student_id')
            .eq('parent_id', parentId);

        if (relError) throw relError;
        if (!relations || relations.length === 0) return [];

        const studentIds = relations.map((r: any) => r.student_id);

        // 2. Fetch students
        const { data: students, error: stuError } = await supabase
            .from('students')
            .select('*')
            .in('id', studentIds);

        if (stuError) throw stuError;

        return (students || []).map((s: any) => ({
            id: s.id,
            name: s.name,
            email: s.email || '',
            avatarUrl: s.avatar_url || 'https://i.pravatar.cc/150',
            grade: s.grade,
            section: s.section,
            department: s.department,
            attendanceStatus: s.attendance_status || 'Absent',
            birthday: s.birthday
        }));

    } catch (err) {
        console.error('Error fetching children for parent:', err);
        return [];
    }
}

export async function fetchParentsForStudent(studentId: string | number): Promise<Parent[]> {
    try {
        // 1. Get parent IDs
        const { data: relations, error: relError } = await supabase
            .from('parent_children')
            .select('parent_id')
            .eq('student_id', studentId);

        if (relError) throw relError;
        if (!relations || relations.length === 0) return [];

        const parentIds = relations.map((r: any) => r.parent_id);

        // 2. Fetch parents
        const { data: parents, error: parError } = await supabase
            .from('parents')
            .select('*')
            .in('id', parentIds);

        if (parError) throw parError;

        return (parents || []).map((p: any) => ({
            id: p.id,
            schoolId: p.school_id,
            schoolGeneratedId: p.school_generated_id,
            name: p.name,
            email: p.email,
            phone: p.phone || '',
            avatarUrl: p.avatar_url || 'https://i.pravatar.cc/150?u=parent',
            childIds: []
        }));

    } catch (err) {
        console.error('Error fetching parents for student:', err);
        return [];
    }
}

export async function fetchParentsByClassId(classId: string): Promise<Parent[]> {
    try {
        const { data, error } = await supabase
            .from('student_enrollments')
            .select(`
                student:students (
                    parent_children (
                        parent:parents (*)
                    )
                )
            `)
            .eq('class_id', classId);

        if (error) throw error;

        const parentsMap = new Map<string, Parent>();
        (data || []).forEach((item: any) => {
            if (item.student && item.student.parent_children) {
                item.student.parent_children.forEach((rel: any) => {
                    if (rel.parent) {
                        const p = rel.parent;
                        parentsMap.set(p.id, {
                            id: p.id,
                            user_id: p.user_id,
                            schoolId: p.school_id,
                            schoolGeneratedId: p.school_generated_id,
                            name: p.name,
                            email: p.email,
                            phone: p.phone || '',
                            avatarUrl: p.avatar_url || 'https://i.pravatar.cc/150?u=parent',
                            childIds: []
                        });
                    }
                });
            }
        });

        return Array.from(parentsMap.values());
    } catch (err) {
        console.error(`Error fetching parents for Class ID ${classId}:`, err);
        return [];
    }
}

export async function createParent(parentData: {
    name: string;
    email: string;
    phone?: string;
    childIds?: string[];
    avatarUrl?: string;
}): Promise<Parent | null> {
    try {
        const { data, error } = await supabase
            .from('parents')
            .insert({
                name: parentData.name,
                email: parentData.email,
                phone: parentData.phone,
                avatar_url: parentData.avatarUrl,
                created_at: new Date().toISOString()
            })
            .select()
            .maybeSingle();

        if (error) throw error;

        // Link children if provided
        if (parentData.childIds && parentData.childIds.length > 0) {
            const linkInserts = parentData.childIds.map(studentId => ({
                parent_id: data.id,
                student_id: studentId
            }));
            await supabase.from('parent_children').insert(linkInserts);
        }

        return {
            id: data.id,
            schoolId: data.school_id,
            schoolGeneratedId: data.school_generated_id,
            name: data.name,
            email: data.email,
            phone: data.phone || '',
            avatarUrl: data.avatar_url || 'https://i.pravatar.cc/150?u=parent',
            childIds: parentData.childIds || []
        };
    } catch (err) {
        console.error('Error creating parent:', err);
        return null;
    }
}

export async function updateParent(id: string | number, updates: Partial<{
    name: string;
    email: string;
    phone: string;
    avatarUrl: string;
    childIds: string[];
}>): Promise<boolean> {
    try {
        const dbUpdates: any = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.email !== undefined) dbUpdates.email = updates.email;
        if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
        if (updates.avatarUrl !== undefined) dbUpdates.avatar_url = updates.avatarUrl;

        if (Object.keys(dbUpdates).length > 0) {
            const { error } = await supabase
                .from('parents')
                .update(dbUpdates)
                .eq('id', id);
            if (error) throw error;
        }

        // Update child links if provided
        if (updates.childIds !== undefined) {
            await supabase.from('parent_children').delete().eq('parent_id', id);
            if (updates.childIds.length > 0) {
                const linkInserts = updates.childIds.map(studentId => ({
                    parent_id: id,
                    student_id: studentId
                }));
                await supabase.from('parent_children').insert(linkInserts);
            }
        }

        return true;
    } catch (err) {
        console.error('Error updating parent:', err);
        return false;
    }
}

export async function deleteParent(id: string | number): Promise<boolean> {
    try {
        await supabase.from('parent_children').delete().eq('parent_id', id);
        const { error } = await supabase
            .from('parents')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (err) {
        console.error('Error deleting parent:', err);
        return false;
    }
}

// ============================================
// NOTICES & ANNOUNCEMENTS
// ============================================

export async function fetchNotices(schoolId?: string): Promise<Notice[]> {
    try {
        let query = supabase
            .from('notices')
            .select('id, title, content, timestamp, category, is_pinned, audience, image_url, video_url');

        if (schoolId) {
            query = query.eq('school_id', schoolId);
        }

        const { data, error } = await query
            .order('timestamp', { ascending: false });

        if (error) throw error;

        return (data || []).map((n: any) => ({
            id: n.id,
            title: n.title,
            content: n.content,
            timestamp: n.timestamp,
            category: n.category,
            isPinned: n.is_pinned || false,
            audience: n.audience || ['all'],
            imageUrl: n.image_url,
            videoUrl: n.video_url
        }));
    } catch (err) {
        console.error('Error fetching notices:', err);
        return [];
    }
}

export async function createNotice(noticeData: {
    title: string;
    content: string;
    category: string;
    isPinned?: boolean;
    audience?: string[];
}): Promise<Notice | null> {
    try {
        const { data, error } = await supabase
            .from('notices')
            .insert({
                title: noticeData.title,
                content: noticeData.content,
                category: noticeData.category,
                is_pinned: noticeData.isPinned || false,
                audience: noticeData.audience || ['all'],
                timestamp: new Date().toISOString()
            })
            .select()
            .maybeSingle();

        if (error) throw error;

        return {
            id: data.id,
            title: data.title,
            content: data.content,
            timestamp: data.timestamp,
            category: data.category,
            isPinned: data.is_pinned || false,
            audience: data.audience || ['all']
        };
    } catch (err) {
        console.error('Error creating notice:', err);
        return null;
    }
}

export async function updateNotice(id: number, updates: Partial<{
    title: string;
    content: string;
    category: string;
    isPinned: boolean;
    audience: string[];
}>): Promise<boolean> {
    try {
        const dbUpdates: any = {};
        if (updates.title !== undefined) dbUpdates.title = updates.title;
        if (updates.content !== undefined) dbUpdates.content = updates.content;
        if (updates.category !== undefined) dbUpdates.category = updates.category;
        if (updates.isPinned !== undefined) dbUpdates.is_pinned = updates.isPinned;
        if (updates.audience !== undefined) dbUpdates.audience = updates.audience;

        const { error } = await supabase
            .from('notices')
            .update(dbUpdates)
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (err) {
        console.error('Error updating notice:', err);
        return false;
    }
}

export async function deleteNotice(id: number): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('notices')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (err) {
        console.error('Error deleting notice:', err);
        return false;
    }
}

// ============================================
// QUIZZES
// ============================================

export async function fetchQuizzes(role: 'student' | 'teacher', userId: string, grade?: number): Promise<any[]> {
    try {
        let query = supabase
            .from('quizzes')
            .select('*')
            .eq('is_published', true)
            .order('created_at', { ascending: false });

        if (role === 'student' && grade) {
            query = query.eq('grade', grade);
        } else if (role === 'teacher') {
            query = query.eq('teacher_id', userId);
        }

        const { data, error } = await query;

        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('Error fetching quizzes:', err);
        return [];
    }
}

export async function fetchQuizById(id: string): Promise<any | null> {
    try {
        const { data, error } = await supabase
            .from('quizzes')
            .select(`
                *,
                questions (*)
            `)
            .eq('id', id)
            .maybeSingle();

        if (error) throw error;
        return data;
    } catch (err) {
        console.error('Error fetching quiz:', err);
        return null;
    }
}
// ============================================
// CLASSES
// ============================================

export async function fetchClasses(schoolId?: string, branchId?: string): Promise<ClassInfo[]> {
    try {
        let query = supabase
            .from('classes')
            .select('id, name, grade, section, department, branch_id');

        if (schoolId) {
            query = query.eq('school_id', schoolId);
        }

        if (branchId && branchId !== 'all') {
            query = query.or(`branch_id.eq.${branchId},branch_id.is.null`);
        }

        let { data: classData, error: classError } = await (query as any)
            .order('grade', { ascending: false })
            .order('section', { ascending: true }) as { data: any[] | null, error: any };

        // Fallback to backend API if direct query returns nothing and we're in demo mode
        if ((!classData || classData.length === 0) && (isDemoMode() || !classError)) {
            try {
                const backendData = await backendFetch<any[]>(`/classes?school_id=${schoolId || ''}`);
                if (backendData && backendData.length > 0) {
                    classData = backendData;
                }
            } catch (backendErr) {
                console.error('Backend fallback failed for classes:', backendErr);
            }
        }

        if (classError && !classData) throw classError;

        // Fetch student counts directly from students table for demo accuracy
        // SKIP if we already have student counts from backend fallback data
        const hasBackendCounts = classData?.[0]?.student_count !== undefined || classData?.[0]?.studentCount !== undefined;

        const countMap: Record<string, number> = {};

        if (!hasBackendCounts) {
            const { data: studentData, error: studentError } = await supabase
                .from('students')
                .select('class_id')
                .eq('school_id', schoolId);

            if (studentData) {
                studentData.forEach((s: any) => {
                    if (s.class_id) {
                        countMap[s.class_id] = (countMap[s.class_id] || 0) + 1;
                    }
                });
            }
        }

        const formattedClasses = (classData || []).map(c => ({
            id: c.id,
            name: getFormattedClassName(c.grade, c.section),
            grade: c.grade,
            section: c.section,
            department: c.department,
            studentCount: c.studentCount ?? c.student_count ?? countMap[c.id] ?? 0,
            classTeacher: 'Unassigned',
            branchId: c.branch_id
        }));

        return formattedClasses;
    } catch (err) {
        console.error('Error fetching classes:', err);
        return [];
    }
}

// ============================================
// STUDENT ENROLLMENTS
// ============================================

export async function fetchStudentEnrollments(studentId: string): Promise<any[]> {
    try {
        const { data, error } = await supabase
            .from('student_enrollments')
            .select(`
                id,
                class_id,
                is_primary,
                status,
                classes (
                    id, 
                    name, 
                    grade, 
                    section
                )
            `)
            .eq('student_id', studentId);

        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('Error fetching student enrollments:', err);
        return [];
    }
}

export async function linkStudentToClasses(studentId: string, classIds: string[], schoolId: string, branchId?: string): Promise<boolean> {
    try {
        // 1. Remove existing enrollments
        await supabase.from('student_enrollments').delete().eq('student_id', studentId);

        // 2. Add new enrollments
        if (classIds.length > 0) {
            const inserts = classIds.map((id, index) => ({
                student_id: studentId,
                class_id: id,
                school_id: schoolId,
                branch_id: branchId || null,
                is_primary: index === 0 // First one is primary
            }));

            const { error } = await supabase.from('student_enrollments').insert(inserts);
            if (error) throw error;

            // 3. Update the student table with the primary class_id for backward compatibility
            const primaryClassId = classIds[0];
            const { data: classData } = await supabase.from('classes').select('grade, section').eq('id', primaryClassId).maybeSingle();

            if (classData) {
                await supabase.from('students').update({
                    class_id: primaryClassId,
                    grade: classData.grade,
                    section: classData.section
                }).eq('id', studentId);
            }
        }

        return true;
    } catch (err) {
        console.error('Error linking student to classes:', err);
        return false;
    }
}

// ============================================
// ASSIGNMENTS
// ============================================
// TIMETABLE
// ============================================

export async function fetchTimetableForClass(className: string, schoolId: string): Promise<any[]> {
    try {
        const { data, error } = await supabase
            .from('timetable')
            .select('*')
            .eq('school_id', schoolId)
            .eq('class_name', className);

        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('Error fetching timetable:', err);
        return [];
    }
}

export async function checkTimetableExists(className: string, schoolId: string): Promise<boolean> {
    try {
        const { count, error } = await supabase
            .from('timetable')
            .select('*', { count: 'exact', head: true })
            .eq('school_id', schoolId)
            .eq('class_name', className);

        if (error) throw error;
        return (count || 0) > 0;
    } catch (err) {
        return false;
    }
}

// ============================================
// NOTIFICATIONS
// ============================================

export interface CreateNotificationParams {
    userId?: string;
    studentId?: string | number;
    category: string;
    title: string;
    summary: string;
    relatedId?: string | number;
}

export async function createNotification(params: CreateNotificationParams): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('notifications')
            .insert({
                user_id: params.userId,
                category: params.category,
                title: params.title,
                summary: params.summary,
                student_id: params.studentId,
                related_id: params.relatedId,
                is_read: false,
                timestamp: new Date().toISOString()
            });

        if (error) throw error;
        return true;
    } catch (err) {
        console.error('Error creating notification:', err);
        return false;
    }
}

/**
 * Notify all students in a class
 */
export async function notifyClass(className: string, title: string, summary: string) {
    const gradeMatch = className.match(/Grade\s+(\d+)([A-Za-z0-9]*)/);

    if (gradeMatch) {
        const grade = parseInt(gradeMatch[1]);
        const section = gradeMatch[2];

        const students = await fetchStudentsByClass(grade, section);

        for (const student of students) {
            await createNotification({
                studentId: student.id,
                category: 'Timetable',
                title,
                summary
            });
        }
    }
}

/**
 * Fetch teachers associated with a class
 */
export async function fetchTeachersByClass(className: string): Promise<Teacher[]> {
    return fetchTeachers();
}

/**
 * Call this after creating/updating/deleting data to trigger UI refresh
 */
export function createDataRefreshCallback(callback: () => void) {
    return callback;
}

// ============================================
// PARENT DASHBOARD HELPERS
// ============================================

export async function fetchStudentAssignments(studentId: string | number, grade: number, section: string): Promise<Assignment[]> {
    try {
        const { data, error } = await supabase
            .from('assignments')
            .select('*')
            .order('due_date', { ascending: true });

        if (error) throw error;

        return (data || []).map((a: any) => ({
            id: a.id,
            title: a.title,
            subject: a.subject,
            teacher: 'Unknown',
            dueDate: a.due_date,
            status: 'Pending',
            grade: a.grade || 0,
            description: a.description,
            className: a.class_name || 'General',
            totalStudents: a.total_students || 0,
            submissionsCount: a.submissions_count || 0
        }));
    } catch (err) {
        console.error('Error fetching student assignments:', err);
        return [];
    }
}

export async function submitAssignment(submissionData: {
    studentId: string | number;
    assignmentId: string | number;
    submissionText: string;
    attachmentUrl?: string;
    studentUserId?: string;
    schoolId: string;
}): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('assignment_submissions')
            .insert({
                student_id: submissionData.studentId,
                assignment_id: submissionData.assignmentId,
                submission_text: submissionData.submissionText,
                attachment_url: submissionData.attachmentUrl,
                student_user_id: submissionData.studentUserId,
                school_id: submissionData.schoolId,
                status: 'submitted',
                submitted_at: new Date().toISOString()
            });

        if (error) throw error;
        return true;
    } catch (err) {
        console.error('Error submitting assignment:', err);
        return false;
    }
}

export async function fetchStudentSubmissions(studentId: string | number): Promise<any[]> {
    try {
        const { data, error } = await supabase
            .from('assignment_submissions')
            .select('*')
            .eq('student_id', studentId);

        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('Error fetching student submissions:', err);
        return [];
    }
}

export async function fetchStudentAttendanceStats(studentId: string | number): Promise<{ percentage: number }> {
    try {
        const { data, error } = await supabase
            .from('student_attendance')
            .select('status')
            .eq('student_id', studentId);

        if (error) throw error;

        if (!data || data.length === 0) return { percentage: 100 };

        const presentOrLate = data.filter((r: any) => ['Present', 'Late'].includes(r.status)).length;
        const percentage = Math.round((presentOrLate / data.length) * 100);

        return { percentage };
    } catch (err) {
        console.error('Error fetching attendance stats:', err);
        return { percentage: 0 };
    }
}

export async function fetchStudentFeeSummary(studentId: string | number): Promise<{ totalFee: number; paidAmount: number; status: string; dueDate?: string } | null> {
    try {
        const { data, error } = await supabase
            .from('student_fees')
            .select('*')
            .eq('student_id', studentId);

        if (error) throw error;

        if (!data || data.length === 0) return null;

        const totalFee = data.reduce((sum: number, r: any) => sum + (Number(r.total_fee) || 0), 0);
        const paidAmount = data.reduce((sum: number, r: any) => sum + (Number(r.paid_amount) || 0), 0);
        const latestDue = data.sort((a: any, b: any) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime())[0]?.due_date;

        const status = paidAmount >= totalFee ? 'Paid' : 'Overdue';

        return {
            totalFee,
            paidAmount,
            status,
            dueDate: latestDue
        };
    } catch (err) {
        console.error('Error fetching student fee summary:', err);
        return null;
    }
}


// ============================================
// FEATURE EXPANSION: CURRICULUM & SUBJECTS
// ============================================

export async function fetchCurricula(): Promise<any[]> {
    try {
        const { data, error } = await supabase
            .from('curricula')
            .select('*')
            .order('name');

        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('Error fetching curricula:', err);
        return [];
    }
}

export async function fetchSubjects(curriculumId?: string | number, gradeLevel?: string): Promise<any[]> {
    try {
        let query = supabase
            .from('subjects')
            .select('id, name, code, category, curriculum_id, grade_level_category, school_id')
            .eq('is_active', true)
            .order('name');

        if (curriculumId) {
            query = query.eq('curriculum_id', curriculumId);
        }
        if (gradeLevel) {
            query = query.eq('grade_level_category', gradeLevel);
        }

        const { data, error } = await query;
        if (error) throw error;

        return (data || []).map(s => ({
            id: s.id,
            name: s.name,
            code: s.code,
            category: s.category,
            curriculumId: s.curriculum_id,
            gradeLevel: s.grade_level_category,
            schoolId: s.school_id
        }));
    } catch (err) {
        console.error('Error fetching subjects:', err);
        return [];
    }
}

// ============================================
// FEATURE EXPANSION: LESSON NOTES
// ============================================

export async function fetchLessonNotes(teacherId?: string | number, subjectId?: string | number): Promise<any[]> {
    try {
        let query = supabase
            .from('lesson_notes')
            .select('*')
            .order('created_at', { ascending: false });

        if (teacherId) query = query.eq('teacher_id', teacherId);
        if (subjectId) query = query.eq('subject_id', subjectId);

        const { data, error } = await query;
        if (error) throw error;

        return (data || []).map(note => ({
            id: note.id,
            teacherId: note.teacher_id,
            subjectId: note.subject_id,
            classId: note.class_id,
            week: note.week,
            term: note.term,
            title: note.title,
            content: note.content,
            fileUrl: note.file_url,
            status: note.status,
            adminFeedback: note.admin_feedback,
            createdAt: note.created_at
        }));
    } catch (err) {
        console.error('Error fetching lesson notes:', err);
        return [];
    }
}

export async function createLessonNote(noteData: {
    teacherId: string | number;
    subjectId: string | number;
    classId: string | number;
    schoolId: string;
    branchId?: string | null;
    week: number;
    term: string;
    title: string;
    content: string;
    fileUrl?: string;
}): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('lesson_notes')
            .insert({
                teacher_id: noteData.teacherId,
                subject_id: noteData.subjectId,
                class_id: noteData.classId,
                school_id: noteData.schoolId,
                branch_id: noteData.branchId || null,
                week: noteData.week,
                term: noteData.term,
                title: noteData.title,
                description: noteData.content,
                file_url: noteData.fileUrl,
                status: 'Pending'
            });

        if (error) throw error;
        return true;
    } catch (err) {
        console.error('Error creating lesson note:', err);
        return false;
    }
}

// ============================================
// FEATURE EXPANSION: CBT EXAMS
// ============================================

export async function fetchCBTExams(teacherId?: string | number, isPublished?: boolean): Promise<any[]> {
    try {
        let query = supabase
            .from('quizzes')
            .select('*, classes(grade, section), subjects(name)')
            .order('created_at', { ascending: false });

        if (teacherId) query = query.eq('teacher_id', teacherId);
        if (isPublished !== undefined) query = query.eq('is_published', isPublished);

        const { data, error } = await query;
        if (error) throw error;

        return (data || []).map(quiz => ({
            id: quiz.id,
            title: quiz.title,
            description: quiz.description,
            subjectId: quiz.subject_id,
            subjectName: quiz.subjects?.name,
            classId: quiz.class_id,
            className: quiz.classes ? `Grade ${quiz.classes.grade} ${quiz.classes.section || ''}` : undefined,
            durationMinutes: quiz.duration_minutes,
            totalMarks: quiz.total_marks,
            isPublished: quiz.is_published,
            teacherId: quiz.teacher_id,
            createdAt: quiz.created_at,
            status: quiz.status,
            shuffleQuestions: quiz.shuffle_questions
        }));
    } catch (err) {
        console.error('Error fetching Quizzes:', err);
        return [];
    }
}

export async function fetchCBTQuestions(examId: string): Promise<any[]> {
    try {
        const { data, error } = await supabase
            .from('cbt_questions')
            .select('*')
            .eq('exam_id', examId)
            .order('id', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('Error fetching CBT questions:', err);
        return [];
    }
}

export async function deleteCBTExam(examId: string): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('quizzes')
            .delete()
            .eq('id', examId);

        if (error) throw error;
        return true;
    } catch (err) {
        console.error('Error deleting Quiz:', err);
        return false;
    }
}

export async function fetchSchools(): Promise<{ id: number; name: string }[]> {
    try {
        const { data, error } = await supabase
            .from('schools')
            .select('id, name')
            .order('name');

        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('Error fetching schools:', err);
        return [];
    }
}

// ============================================
// FEATURE EXPANSION: REPORT CARDS & SUBJECTS
// ============================================

export async function fetchStudentSubjects(studentId: string | number): Promise<any[]> {
    try {
        const { data: student, error: sErr } = await supabase
            .from('students')
            .select('current_class_id, grade, section')
            .eq('id', studentId)
            .maybeSingle();
        if (sErr || !student) return [];

        let classId = student.current_class_id;

        if (!classId) {
            const { data: classData, error: cErr } = await supabase
                .from('classes')
                .select('id')
                .eq('grade', student.grade)
                .eq('section', student.section)
                .maybeSingle();

            if (cErr || !classData) return [];
            classId = classData.id;
        }

        const { data: assignments, error: aErr } = await supabase
            .from('teacher_assignments')
            .select('subjects(name)')
            .eq('class_section_id', classId)
            .eq('is_active', true);

        if (aErr) return [];
        return (assignments || []).map((a: any) => ({ name: a.subjects?.name })).filter(s => s.name);
    } catch (e) {
        console.error('Error in fetchStudentSubjects:', e);
        return [];
    }
}

export async function fetchReportCard(studentId: string | number, term: any, session: string, branchId?: string | null): Promise<ReportCard | null> {
    try {
        const termName = typeof term === 'object' ? term.name : term;
        let query = supabase
            .from('report_cards')
            .select(`
                *,
                report_card_records(*)
            `)
            .eq('student_id', studentId)
            .eq('term', termName)
            .eq('session', session);

        if (branchId && branchId !== 'all') {
            query = query.eq('branch_id', branchId);
        }

        const { data, error } = await query.maybeSingle();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }

        if (!data) return null;

        return {
            id: data.id,
            term: data.term,
            session: data.session,
            status: data.status,
            attendance: data.attendance || { total: 0, present: 0, absent: 0, late: 0 },
            skills: data.skills || {},
            psychomotor: data.psychomotor || {},
            teacherComment: data.teacher_comment || '',
            principalComment: data.principal_comment || '',
            academicRecords: (data.report_card_records || []).map((r: any) => ({
                subject: r.subject,
                test1: r.test1 || 0,
                test2: r.test2 || 0,
                exam: r.exam || 0,
                total: r.total || 0,
                grade: r.grade,
                remark: r.remark
            }))
        };
    } catch (err) {
        console.error('Error fetching report card:', err);
        return null;
    }
}

// ============================================
// CBT EXAMS / QUIZZES
// ============================================

export async function upsertReportCard(studentId: string | number, reportCard: ReportCard, schoolId: string, branchId?: string | null): Promise<boolean> {
    try {
        const termName = typeof reportCard.term === 'object' ? (reportCard.term as any).name : reportCard.term;

        const { data: rcData, error: rcError } = await supabase
            .from('report_cards')
            .upsert({
                student_id: studentId,
                school_id: schoolId,
                branch_id: branchId || null,
                term: termName,
                session: reportCard.session,
                status: reportCard.status,
                is_published: reportCard.status === 'Published',
                published_at: reportCard.status === 'Published' ? new Date().toISOString() : null,
                attendance: reportCard.attendance,
                skills: reportCard.skills,
                psychomotor: reportCard.psychomotor,
                teacher_comment: reportCard.teacherComment,
                principal_comment: reportCard.principalComment,
                updated_at: new Date().toISOString()
            }, { onConflict: 'student_id,term,session,school_id' })
            .select()
            .maybeSingle();

        if (rcError) throw rcError;

        const reportCardId = rcData.id;

        await supabase.from('report_card_records').delete().eq('report_card_id', reportCardId);

        const records = reportCard.academicRecords.map(rec => ({
            report_card_id: reportCardId,
            subject: rec.subject,
            test1: rec.test1 || 0,
            test2: rec.test2 || 0,
            exam: rec.exam,
            total: rec.total,
            grade: rec.grade,
            remark: rec.remark
        }));

        if (records.length > 0) {
            const { error: recordsError } = await supabase
                .from('report_card_records')
                .insert(records);
            if (recordsError) throw recordsError;
        }

        for (const rec of reportCard.academicRecords) {
            const score = typeof rec.total === 'number' ? rec.total : parseFloat(rec.total) || 0;
            const { error: syncError } = await supabase.from('academic_performance').upsert({
                student_id: studentId,
                school_id: schoolId,
                subject: rec.subject,
                term: reportCard.term,
                session: reportCard.session || '2023/2024',
                score: score,
                grade: rec.grade,
                remark: rec.remark,
                test1: rec.test1 || 0,
                test2: rec.test2 || 0,
                exam_score: rec.exam,
                last_updated: new Date().toISOString()
            }, { onConflict: 'student_id, subject, term, session' });

            if (syncError) {
                console.error('Error syncing to academic_performance:', syncError);
            }
        }

        return true;
    } catch (err) {
        console.error('Error upserting report card:', err);
        return false;
    }
}

export async function syncCBTToGradebook(
    studentProfileId: string,
    quizId: string,
    scorePercentage: number,
    schoolId: string
): Promise<boolean> {
    try {
        let { data: student, error: studentError } = await supabase
            .from('students')
            .select('id, name, school_id, user_id')
            .eq('user_id', studentProfileId)
            .maybeSingle();

        if (!student) {
            const { data: byId } = await supabase
                .from('students')
                .select('id, name, school_id, user_id')
                .eq('id', studentProfileId)
                .maybeSingle();
            student = byId;
        }

        let targetStudentId = student?.id;

        if (!targetStudentId && studentProfileId === '00000000-0000-0000-0000-000000000001') {
            targetStudentId = '00000000-0000-0000-0000-000000000001';
        }

        if (!targetStudentId) {
            console.error('❌ [syncCBTToGradebook] Could not resolve student record');
            return false;
        }

        const { data: quiz, error: quizError } = await supabase
            .from('quizzes')
            .select('subject, title')
            .eq('id', quizId)
            .maybeSingle();

        if (quizError || !quiz) {
            console.error('❌ [syncCBTToGradebook] Could not find quiz details');
            return false;
        }

        const subjectName = quiz.subject;
        const term = "First Term";
        const session = "2025/2026";

        let reportCard = await fetchReportCard(targetStudentId, term, session);

        if (!reportCard) {
            reportCard = {
                term,
                session,
                status: 'Draft',
                academicRecords: [],
                skills: {},
                psychomotor: {},
                attendance: { total: 0, present: 0, absent: 0, late: 0 },
                teacherComment: '',
                principalComment: ''
            };
        }

        const records = [...(reportCard.academicRecords || [])];
        const recordIndex = records.findIndex(r => r.subject?.toLowerCase() === subjectName?.toLowerCase());
        const newScore = Math.round(scorePercentage);

        if (recordIndex >= 0) {
            records[recordIndex] = {
                ...records[recordIndex],
                exam: newScore,
                total: (parseFloat(records[recordIndex].test1 as any) || 0) + (parseFloat(records[recordIndex].test2 as any) || 0) + newScore,
                remark: "CBT Sync"
            };
        } else {
            records.push({
                subject: subjectName,
                test1: 0,
                test2: 0,
                exam: newScore,
                total: newScore,
                grade: '',
                remark: "CBT Sync"
            });
        }

        reportCard.academicRecords = records as any;
        return await upsertReportCard(targetStudentId, reportCard, student?.school_id || schoolId);
    } catch (err) {
        console.error('❌ [syncCBTToGradebook] Terminal error:', err);
        return false;
    }
}

// ============================================
// AUDIT LOGS
// ============================================

export async function fetchAuditLogs(limit: number = 50, schoolId?: string, branchId?: string): Promise<any[]> {
    try {
        let query = supabase
            .from('audit_logs')
            .select(`
                *,
                profiles:users!audit_logs_user_id_fkey (name, avatar_url)
            `);

        if (schoolId) query = query.eq('school_id', schoolId);
        if (branchId && branchId !== 'all') query = query.or(`branch_id.eq.${branchId},branch_id.is.null`);

        const { data, error } = await query
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('Error fetching audit logs:', err);
        return [];
    }
}

export async function createAuditLog(action: string, tableName: string, recordId: string | number, details?: string): Promise<boolean> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        const { error } = await supabase
            .from('audit_logs')
            .insert({
                user_id: user.id,
                action,
                table_name: tableName,
                record_id: recordId.toString(),
                details,
                created_at: new Date().toISOString()
            });

        if (error) throw error;
        return true;
    } catch (err) {
        console.error('Error creating audit log:', err);
        return false;
    }
}

// ============================================
// BEHAVIOR NOTES
// ============================================

export async function fetchBehaviorNotes(studentId: string | number, schoolId: string, branchId?: string | null): Promise<any[]> {
    try {
        const data = await api.getBehaviorNotes(studentId, schoolId, branchId);
        return (data || []).map(n => ({
            id: n.id,
            studentId: n.student_id,
            type: n.type,
            title: n.title,
            note: n.note,
            date: n.date,
            by: n.teacher_name || 'Teacher'
        }));
    } catch (err) {
        console.error('Error fetching behavior notes:', err);
        return [];
    }
}

export async function createBehaviorNote(noteData: {
    studentId: string | number;
    schoolId: string;
    branchId?: string | null;
    type: 'Positive' | 'Negative';
    title: string;
    note: string;
    date: string;
    teacherName: string;
}): Promise<boolean> {
    try {
        const result = await api.createBehaviorNote(noteData.schoolId, noteData.branchId || undefined, {
            student_id: noteData.studentId,
            type: noteData.type,
            title: noteData.title,
            note: noteData.note,
            date: noteData.date,
            teacher_name: noteData.teacherName
        });

        return !!result;
    } catch (err) {
        console.error('Error creating behavior note:', err);
        return false;
    }
}

// ============================================
// ACADEMIC PERFORMANCE (READ-ONLY VIEW)
// ============================================

export async function fetchAcademicPerformance(studentId: string | number, schoolId?: string): Promise<any[]> {
    try {
        let query = supabase
            .from('academic_performance')
            .select('*')
            .eq('student_id', studentId);

        if (schoolId) {
            query = query.eq('school_id', schoolId);
        }

        const { data, error } = await query;

        if (error) throw error;
        return (data || []).map(p => ({
            subject: p.subject,
            score: p.score,
            grade: p.grade,
            remark: p.remark,
            term: p.term,
            session: p.session
        }));
    } catch (err) {
        console.error('Error fetching academic performance:', err);
        return [];
    }
}

// ============================================
// STUDENT DASHBOARD AGGREGATORS
// ============================================

export async function fetchStudentStats(studentId: string | number, schoolId?: string) {
    try {
        const [attendanceRes, assignmentsRes, activitiesRes] = await Promise.all([
            supabase.from('student_attendance').select('status').eq('student_id', studentId).eq('school_id', schoolId || ''),
            supabase.from('assignment_submissions').select('id').eq('student_id', studentId).eq('school_id', schoolId || ''),
            supabase.from('academic_performance').select('score').eq('student_id', studentId).eq('school_id', schoolId || '')
        ]);

        const attendanceTotal = attendanceRes.data?.length || 0;
        const presentCount = attendanceRes.data?.filter(a => a.status?.toLowerCase() === 'present').length || 0;
        const attendanceRate = attendanceTotal > 0 ? Math.round((presentCount / attendanceTotal) * 100) : 100;

        const assignmentsSubmitted = assignmentsRes.data?.length || 0;
        const scores = (activitiesRes.data?.map(s => s.score) || []).filter(s => s !== null && s !== undefined);
        const average = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

        return {
            attendanceRate,
            assignmentsSubmitted,
            averageScore: average,
            studyHours: 24,
            achievements: Math.floor(average / 20)
        };
    } catch (err) {
        console.error("Error fetching student stats:", err);
        return { attendanceRate: 0, assignmentsSubmitted: 0, averageScore: 0, studyHours: 0, achievements: 0 };
    }
}

export async function fetchUpcomingEvents(grade: number | string, section: string, studentId: string | number) {
    try {
        const today = new Date().toISOString();
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);

        const { data: assignments } = await supabase
            .from('assignments')
            .select('id, title, due_date, subject')
            .gte('due_date', today)
            .lte('due_date', nextWeek.toISOString())
            .limit(3);

        const { data: notices } = await supabase
            .from('notices')
            .select('id, title, timestamp, category')
            .eq('category', 'Event')
            .limit(3);

        const events = [
            ...(assignments || []).map(a => ({
                id: `assign-${a.id}`,
                title: `${a.subject}: ${a.title}`,
                date: a.due_date,
                type: 'Assignment'
            })),
            ...(notices || []).map(n => ({
                id: `notice-${n.id}`,
                title: n.title,
                date: n.timestamp,
                type: 'Event'
            }))
        ];

        return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, 5);
    } catch (err) {
        console.error("Error fetching upcoming events:", err);
        return [];
    }
}

export async function fetchStudentActivities(studentId: string | number): Promise<any[]> {
    try {
        const { data, error } = await supabase
            .from('student_activities')
            .select('*, extracurricular_activities(name, description, category)')
            .eq('student_id', studentId);

        if (error) throw error;
        return (data || []).map(a => ({
            name: a.extracurricular_activities?.name || 'Unknown Activity',
            role: a.notes || 'Participant',
            schedule: 'TBD',
            status: a.status || 'Active',
            color: a.extracurricular_activities?.category === 'Academic' ? 'orange' : 'emerald'
        }));
    } catch (err) {
        console.error('Error fetching student activities:', err);
        return [];
    }
}

export async function fetchStudentDocuments(studentId: string | number): Promise<any[]> {
    try {
        const { data, error } = await supabase
            .from('report_cards')
            .select('id, term, created_at, term_label')
            .eq('student_id', studentId)
            .eq('is_published', true);

        if (error) throw error;

        const reports = (data || []).map(r => ({
            name: `${r.term_label || r.term} Report Card`,
            type: 'PDF',
            date: new Date(r.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
            size: '2.4 MB'
        }));

        const handbook = { name: "Student Handbook", type: "PDF", date: "Sep 01, 2025", size: "4.5 MB" };
        return [...reports, handbook];
    } catch (err) {
        console.error('Error fetching student documents:', err);
        return [];
    }
}

// ============================================
// BUS & TRANSPORT
// ============================================

export async function fetchBuses(schoolId?: string): Promise<Bus[]> {
    try {
        let query = supabase.from('transport_buses').select('*');
        if (schoolId) query = query.eq('school_id', schoolId);
        const { data, error } = await query.order('name', { ascending: true });
        if (error) throw error;

        return (data || []).map((b: any) => ({
            id: b.id,
            name: b.name,
            routeName: b.route_name,
            capacity: b.capacity,
            plateNumber: b.plate_number,
            driverName: b.driver_name,
            status: b.status || 'active',
            createdAt: b.created_at
        }));
    } catch (err) {
        console.error('Error fetching buses:', err);
        return [];
    }
}

export async function createBus(busData: {
    name: string;
    routeName: string;
    capacity: number;
    plateNumber: string;
    driverName?: string;
    status: 'active' | 'inactive' | 'maintenance';
    schoolId?: string;
}): Promise<Bus | null> {
    try {
        const { data, error } = await supabase
            .from('transport_buses')
            .insert({
                name: busData.name,
                route_name: busData.routeName,
                capacity: busData.capacity,
                plate_number: busData.plateNumber,
                driver_name: busData.driverName,
                status: busData.status,
                school_id: busData.schoolId
            })
            .select()
            .maybeSingle();

        if (error) throw error;

        return {
            id: data.id,
            name: data.name,
            routeName: data.route_name,
            capacity: data.capacity,
            plateNumber: data.plate_number,
            driverName: data.driver_name,
            status: data.status,
            createdAt: data.created_at
        };
    } catch (err: any) {
        console.error('Error creating bus:', err);
        return null;
    }
}

export async function updateBus(id: string, updates: Partial<{
    name: string;
    routeName: string;
    capacity: number;
    plateNumber: string;
    driverName: string;
    status: 'active' | 'inactive' | 'maintenance';
}>): Promise<boolean> {
    try {
        const dbUpdates: any = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.routeName !== undefined) dbUpdates.route_name = updates.routeName;
        if (updates.capacity !== undefined) dbUpdates.capacity = updates.capacity;
        if (updates.plateNumber !== undefined) dbUpdates.plate_number = updates.plateNumber;
        if (updates.driverName !== undefined) dbUpdates.driver_name = updates.driverName;
        if (updates.status !== undefined) dbUpdates.status = updates.status;

        const { error } = await supabase
            .from('transport_buses')
            .update(dbUpdates)
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (err: any) {
        console.error('Error updating bus:', err);
        return false;
    }
}

export async function deleteBus(id: string): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('transport_buses')
            .delete()
            .eq('id', id);
        if (error) throw error;
        return true;
    } catch (err: any) {
        console.error('Error deleting bus:', err);
        return false;
    }
}

export async function linkStudentToParent(studentCode: string, relationship: string, parentUserId?: string): Promise<{ success: boolean; message: string }> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        const targetParentId = parentUserId || user?.id;
        
        if (!targetParentId) throw new Error('Parent ID is required');

        // [FIX] Detect if we are working with the Demo School to use specialized RPC
        const isDemoParent = targetParentId === 'd3300000-0000-0000-0000-000000000003'; // Specific check for demo parent UUID
        const rpcName = isDemoParent ? 'manage_demo_student_parent_link' : 'manage_student_parent_link';

        const { data, error } = await supabase.rpc(rpcName, {
            p_parent_user_id: targetParentId,
            p_student_identifier: studentCode,
            p_action: 'link',
            p_relationship: relationship
        });
        
        if (error) throw error;
        return data as { success: boolean; message: string };
    } catch (err: any) {
        console.error('Error linking student:', err);
        return { success: false, message: err.message || 'Failed to link student' };
    }
}

export async function unlinkStudentFromParent(studentId: string, parentUserId?: string): Promise<{ success: boolean; message: string }> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        const targetParentId = parentUserId || user?.id;
        
        if (!targetParentId) throw new Error('Parent ID is required');

        // [FIX] Detect if we are working with the Demo School to use specialized RPC
        const isDemoParent = targetParentId === 'd3300000-0000-0000-0000-000000000003';
        const rpcName = isDemoParent ? 'manage_demo_student_parent_link' : 'manage_student_parent_link';

        const { data, error } = await supabase.rpc(rpcName, {
            p_parent_user_id: targetParentId,
            p_student_identifier: studentId,
            p_action: 'unlink'
        });
        
        if (error) throw error;
        return data as { success: boolean; message: string };
    } catch (err: any) {
        console.error('Error unlinking student:', err);
        return { success: false, message: err.message || 'Failed to unlink student' };
    }
}

// ============================================
// FEATURE EXPANSION: TEACHER FORUM
// ============================================

export async function fetchForumTopics(schoolId?: string): Promise<any[]> {
    try {
        let query = supabase
            .from('forum_topics')
            .select('*')
            .order('last_activity', { ascending: false });

        if (schoolId) query = query.eq('school_id', schoolId);
        const { data, error } = await query;
        if (error) throw error;

        return (data || []).map(t => ({
            id: t.id,
            title: t.title,
            authorName: t.author_name,
            createdAt: t.created_at,
            lastActivity: t.last_activity,
            postCount: t.post_count,
            posts: []
        }));
    } catch (err) {
        console.error('Error fetching forum topics:', err);
        return [];
    }
}

export async function createForumTopic(topicData: {
    title: string;
    content: string;
    authorName: string;
    authorId: string;
    schoolId: string;
    authorAvatarUrl?: string;
}): Promise<boolean> {
    try {
        const { data: topic, error: topicError } = await supabase
            .from('forum_topics')
            .insert({
                title: topicData.title,
                school_id: topicData.schoolId,
                author_name: topicData.authorName,
                author_id: topicData.authorId,
                post_count: 1,
                last_activity: new Date().toISOString()
            })
            .select()
            .maybeSingle();

        if (topicError) throw topicError;

        const { error: postError } = await supabase
            .from('forum_posts')
            .insert({
                topic_id: topic.id,
                school_id: topicData.schoolId,
                author_name: topicData.authorName,
                author_id: topicData.authorId,
                author_avatar_url: topicData.authorAvatarUrl,
                content: topicData.content
            });

        if (postError) {
            await supabase.from('forum_topics').delete().eq('id', topic.id);
            throw postError;
        }
        return true;
    } catch (err) {
        console.error('Error creating forum topic:', err);
        return false;
    }
}
