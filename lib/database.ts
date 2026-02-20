import { supabase } from './supabase';
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
            .single();

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
        // Students might not always have an email column in simple schemas, 
        // but assuming they do based on Login auth.
        const { data, error } = await supabase
            .from('students')
            .select('id, school_id, school_generated_id, name, avatar_url, grade, section, department, attendance_status, birthday, email')
            .eq('email', email)
            .single();

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

export async function fetchStudentsByClass(grade: number | string, section: string): Promise<Student[]> {
    try {
        const { data, error } = await supabase
            .from('students')
            .select('id, school_id, school_generated_id, name, email, avatar_url, grade, section, department, attendance_status, birthday')
            .eq('grade', grade)
            .eq('section', section)
            .order('name', { ascending: true });

        if (error) throw error;

        return (data || []).map((s: any) => ({
            id: s.id,
            schoolId: s.school_id, // Fixed: Map to UUID
            schoolGeneratedId: s.school_generated_id, // Map to readable ID
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
            .select('id, school_id, school_generated_id, name, email, avatar_url, grade, section, class_id, department, attendance_status, birthday')
            .eq('class_id', classId)
            .order('name', { ascending: true });

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
            classId: s.class_id,
            department: s.department,
            attendanceStatus: s.attendance_status || 'Absent',
            birthday: s.birthday
        }));
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
            .single();

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
        teacher_classes(class_name)
      `)
            .eq('id', id)
            .single();

        if (error) throw error;
        if (!data) return null;

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
            subjects: (data.teacher_subjects || []).map((s: any) => s.subject),
            classes: (data.teacher_classes || []).map((c: any) => c.class_name)
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
            .single();

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

        const { data, error } = await query;

        if (error) throw error;

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
            childIds: (p.parent_children || []).map((c: any) => studentMap[c.student_id] || c.student_id)
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
            .single();

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
            .single();

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
            schoolId: p.school_id, // Fixed
            schoolGeneratedId: p.school_generated_id, // Fixed
            name: p.name,
            email: p.email,
            phone: p.phone || '',
            avatarUrl: p.avatar_url || 'https://i.pravatar.cc/150?u=parent',
            childIds: [] // We don't necessarily need child IDs here, or we could fetch them if needed
        }));

    } catch (err) {
        console.error('Error fetching parents for student:', err);
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
            .single();

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
            schoolId: data.school_id, // Fixed (though usually empty on client after create, but strict mapping helps)
            schoolGeneratedId: data.school_generated_id, // Fixed
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
            .select('id, title, content, timestamp, category, is_pinned, audience');

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
            audience: n.audience || ['all']
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
            .single();

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
            .single();

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

        const { data, error } = await query
            .order('grade', { ascending: true })
            .order('section', { ascending: true });

        if (error) throw error;

        // Fetch student counts for these classes
        const { data: studentCounts } = await supabase
            .from('students')
            .select('class_id')
            .eq('school_id', schoolId);

        const countMap: Record<string, number> = {};
        if (studentCounts) {
            studentCounts.forEach((s: any) => {
                if (s.class_id) {
                    countMap[s.class_id] = (countMap[s.class_id] || 0) + 1;
                }
            });
        }

        return (data || []).map((c: any) => ({
            id: c.id,
            name: c.name || '',
            level: c.level || '',
            level_category: c.level_category || '',
            subject: c.name || 'General', // Keep for backwards compatibility
            grade: c.grade,
            section: c.section || '',
            department: c.department,
            studentCount: countMap[c.id] || 0
        }));
    } catch (err) {
        console.error('Error fetching classes:', err);
        return [];
    }
}

// ============================================
// ASSIGNMENTS
// ============================================

export async function fetchAssignments(): Promise<Assignment[]> {
    try {
        const { data, error } = await supabase
            .from('assignments')
            .select('id, title, description, class_name, subject, due_date, total_students, submissions_count')
            .order('due_date', { ascending: true });

        if (error) throw error;

        return (data || []).map((a: any) => ({
            id: a.id,
            title: a.title,
            description: a.description,
            className: a.class_name,
            subject: a.subject,
            dueDate: a.due_date,
            totalStudents: a.total_students || 0,
            submissionsCount: a.submissions_count || 0
        }));
    } catch (err) {
        console.error('Error fetching assignments:', err);
        return [];
    }
}

export async function createAssignment(assignmentData: {
    title: string;
    description: string;
    className: string;
    subject: string;
    dueDate: string;
}): Promise<Assignment | null> {
    try {
        const { data, error } = await supabase
            .from('assignments')
            .insert({
                title: assignmentData.title,
                description: assignmentData.description,
                class_name: assignmentData.className,
                subject: assignmentData.subject,
                due_date: assignmentData.dueDate,
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;

        return {
            id: data.id,
            title: data.title,
            description: data.description,
            className: data.class_name,
            subject: data.subject,
            dueDate: data.due_date,
            totalStudents: data.total_students || 0,
            submissionsCount: data.submissions_count || 0
        };
    } catch (err) {
        console.error('Error creating assignment:', err);
        return null;
    }
}

export async function updateAssignment(id: string | number, updates: Partial<{
    title: string;
    description: string;
    className: string;
    subject: string;
    dueDate: string;
}>): Promise<boolean> {
    try {
        const dbUpdates: any = {};
        if (updates.title !== undefined) dbUpdates.title = updates.title;
        if (updates.description !== undefined) dbUpdates.description = updates.description;
        if (updates.className !== undefined) dbUpdates.class_name = updates.className;
        if (updates.subject !== undefined) dbUpdates.subject = updates.subject;
        if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;

        const { error } = await supabase
            .from('assignments')
            .update(dbUpdates)
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (err) {
        console.error('Error updating assignment:', err);
        return false;
    }
}

export async function deleteAssignment(id: string | number): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('assignments')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (err) {
        console.error('Error deleting assignment:', err);
        return false;
    }
}
export async function fetchExams(): Promise<Exam[]> {
    try {
        const { data, error } = await supabase
            .from('exams')
            .select('*')
            .order('date', { ascending: true });

        if (error) throw error;

        return (data || []).map((e: any) => ({
            id: e.id,
            type: e.type,
            date: e.date,
            time: e.time,
            className: e.class_name,
            subject: e.subject,
            isPublished: e.is_published || false,
            teacherId: e.teacher_id
        }));
    } catch (err) {
        console.error('Error fetching exams:', err);
        return [];
    }
}

//============================================
// FEE MANAGEMENT
// ============================================

export async function fetchStudentFees(studentId?: string | number): Promise<any[]> {
    try {
        let query = supabase.from('student_fees').select('*');

        if (studentId) {
            query = query.eq('student_id', studentId);
        }

        const { data, error } = await query.order('due_date', { ascending: true });

        if (error) throw error;
        return (data || []).map((f: any) => ({
            id: f.id,
            studentId: f.student_id,
            totalFee: f.total_fee,
            paidAmount: f.paid_amount,
            status: f.status,
            dueDate: f.due_date,
            title: f.title,
            term: f.term
        }));
    } catch (err) {
        console.error('Error fetching student fees:', err);
        return [];
    }
}

export async function createFeeRecord(feeData: {
    studentId: string | number;
    amount: number;
    title: string;
    dueDate: string;
    term?: string;
    status?: string;
}): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('student_fees')
            .insert({
                student_id: feeData.studentId,
                total_fee: feeData.amount,
                title: feeData.title,
                due_date: feeData.dueDate,
                term: feeData.term || 'Term 1',
                status: feeData.status || 'Unpaid'
            });

        if (error) throw error;
        return true;
    } catch (err) {
        console.error('Error creating fee record:', err);
        return false;
    }
}

export async function updateFeeStatus(feeId: string | number, status: string, amountPaid?: number): Promise<boolean> {
    try {
        const updates: any = { status };
        if (amountPaid !== undefined) {
            updates.paid_amount = amountPaid;
            updates.payment_date = new Date().toISOString();
        }

        const { error } = await supabase
            .from('student_fees')
            .update(updates)
            .eq('id', feeId);

        if (error) throw error;
        return true;
    } catch (err) {
        console.error('Error updating fee status:', err);
        return false;
    }
}

// ============================================
// ATTENDANCE OPERATIONS
// ============================================

export async function saveAttendanceRecords(records: Array<{
    studentId: string | number;
    date: string;
    status: string;
    className?: string;
}>): Promise<boolean> {
    try {
        const inserts = records.map(r => ({
            student_id: r.studentId,
            date: r.date,
            status: r.status,
            class_name: r.className
        }));

        const { error } = await supabase
            .from('student_attendance')
            .upsert(inserts, {
                onConflict: 'student_id,date',
                ignoreDuplicates: false
            });

        if (error) throw error;
        return true;
    } catch (err) {
        console.error('Error saving attendance records:', err);
        return false;
    }
}

export async function fetchAttendanceForClass(className: string, date: string): Promise<any[]> {
    try {
        const { data, error } = await supabase
            .from('student_attendance')
            .select('*')
            .eq('class_name', className)
            .eq('date', date);

        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('Error fetching attendance:', err);
        return [];
    }
}

// ============================================
// CONNECTION CHECK
// ============================================

export async function checkSupabaseConnection(): Promise<boolean> {
    try {
        const { error } = await supabase.from('students').select('id').limit(1);
        if (error) {
            console.error('Supabase connection check failed:', error.message);
            return false;
        }
        console.log('✅ Supabase connected successfully');
        return true;
    } catch (err) {
        console.error('Supabase connection exception:', err);
        return false;
    }
}

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
    userId?: string; // Optional if targeting specific user
    studentId?: string | number; // Optional if targeting specific student
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
    // 1. Parse grade/section from className (e.g. "Grade 10A (Science)")
    // This is a rough parser, assuming format "Grade X..."
    const gradeMatch = className.match(/Grade\s+(\d+)([A-Za-z0-9]+)/);

    if (gradeMatch) {
        const grade = parseInt(gradeMatch[1]);
        const section = gradeMatch[2]; // e.g. "A"

        // 2. Fetch students
        const students = await fetchStudentsByClass(grade, section);

        // 3. Create notifications
        // Ideally prompt backend to do this, but loop here for MVP
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
    // This assumes we have a way to link teachers.
    // For now, we can fetch all teachers and filter if we had that link.
    // Or we rely on the timetable itself to find teachers.
    return fetchTeachers();
}

// ============================================
// HELPER: Refresh Data After Changes
// ============================================

/**
 * Call this after creating/updating/deleting data to trigger UI refresh
 */
export function createDataRefreshCallback(callback: () => void) {
    return callback;
}

// ============================================
// ANALYTICS
// ============================================

export async function fetchAnalyticsMetrics() {
    try {
        const stats = {
            performance: [] as { label: string, value: number, a11yLabel: string }[],
            fees: { paid: 0, overdue: 0, unpaid: 0, total: 0 },
            workload: [] as { label: string, value: number }[],
            attendance: [] as number[], // Last 7 days %
            enrollment: [] as { year: number, count: number }[]
        };

        // 1. Performance Data
        const { data: scores } = await supabase.from('academic_performance').select('score');
        if (scores && scores.length > 0) {
            let excellent = 0, good = 0, average = 0, poor = 0;
            scores.forEach((s: any) => {
                if (s.score >= 90) excellent++;
                else if (s.score >= 70) good++;
                else if (s.score >= 50) average++;
                else poor++;
            });
            const total = scores.length;
            stats.performance = [
                { label: 'Excellent', value: Math.round((excellent / total) * 100), a11yLabel: `${Math.round((excellent / total) * 100)}% Excellent` },
                { label: 'Good', value: Math.round((good / total) * 100), a11yLabel: `${Math.round((good / total) * 100)}% Good` },
                { label: 'Average', value: Math.round((average / total) * 100), a11yLabel: `${Math.round((average / total) * 100)}% Average` },
                { label: 'Poor', value: Math.round((poor / total) * 100), a11yLabel: `${Math.round((poor / total) * 100)}% Poor` },
            ];
        } else {
            // Empty state
            stats.performance = [];
        }

        // 2. Fee Compliance
        const { data: fees } = await supabase.from('student_fees').select('status');
        if (fees && fees.length > 0) {
            let paid = 0, overdue = 0, unpaid = 0;
            fees.forEach((f: any) => {
                const s = f.status.toLowerCase();
                if (s === 'paid') paid++;
                else if (s === 'overdue') overdue++;
                else unpaid++;
            });
            stats.fees = {
                paid: Math.round((paid / fees.length) * 100),
                overdue: Math.round((overdue / fees.length) * 100),
                unpaid: Math.round((unpaid / fees.length) * 100),
                total: fees.length
            };
        } else {
            stats.fees = { paid: 0, overdue: 0, unpaid: 0, total: 0 };
        }

        // 3. Teacher Workload (from timetable)
        const { data: timetable } = await supabase.from('timetable').select('teacher');
        if (timetable && timetable.length > 0) {
            const counts: { [key: string]: number } = {};
            timetable.forEach((t: any) => {
                if (t.teacher) counts[t.teacher] = (counts[t.teacher] || 0) + 1;
            });
            stats.workload = Object.entries(counts)
                .map(([label, value]) => ({ label: label.split(' ').pop() || label, value })) // Use last name
                .sort((a, b) => b.value - a.value)
                .slice(0, 5); // Top 5
        } else {
            stats.workload = [];
        }

        // 4. Enrollment
        const { data: studentsData } = await supabase.from('students').select('created_at');
        if (studentsData) {
            const yearCounts: { [year: number]: number } = {};
            studentsData.forEach((s: any) => {
                const year = new Date(s.created_at).getFullYear();
                yearCounts[year] = (yearCounts[year] || 0) + 1;
            });
            stats.enrollment = Object.entries(yearCounts)
                .map(([year, count]) => ({ year: parseInt(year), count }))
                .sort((a, b) => a.year - b.year)
                .slice(-5);
        }

        // 5. Attendance Trend (Last 7 Days)
        // Harder to aggregate via simple Select, so we might need raw SQL or generic fallback.
        // For MVP, if we don't have enough data, we use mock.
        // Let's try to fetch all attendance for last 7 days.
        const d = new Date();
        d.setDate(d.getDate() - 7);
        const { data: attendance } = await supabase
            .from('student_attendance')
            .select('date, status')
            .gte('date', d.toISOString().split('T')[0]);

        if (attendance && attendance.length > 0) {
            const dailyStats: { [key: string]: { total: number, present: number } } = {};
            attendance.forEach((r: any) => {
                if (!dailyStats[r.date]) dailyStats[r.date] = { total: 0, present: 0 };
                dailyStats[r.date].total++;
                if (r.status === 'Present') dailyStats[r.date].present++;
            });
            // Sort by date key
            const sortedKeys = Object.keys(dailyStats).sort();
            stats.attendance = sortedKeys.map(k => Math.round((dailyStats[k].present / dailyStats[k].total) * 100));
        } else {
            stats.attendance = []; // No data
        }

        return stats;

    } catch (err) {
        console.error("Error fetching analytics metrics:", err);
        return null;
    }
}

// ============================================
// PARENT DASHBOARD HELPERS
// ============================================

export async function fetchStudentAssignments(studentId: string | number, grade: number, section: string): Promise<Assignment[]> {
    try {
        const { data, error } = await supabase
            .from('assignments')
            .select('*')
            .order('due_date', { ascending: true }); // Simple fetch for now, can refine filter later

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
    studentUserId?: string; // Optional if we look it up
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
                week: noteData.week,
                term: noteData.term,
                title: noteData.title,
                description: noteData.content, // Map content to description
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
            .from('quiz_questions')
            .select('*')
            .eq('quiz_id', examId)
            .order('question_order', { ascending: true });

        if (error) throw error;

        return (data || []).map(q => ({
            id: q.id,
            examId: q.quiz_id,
            questionText: q.question_text,
            questionType: q.question_type,
            options: q.options,
            correctOption: q.correct_answer,
            points: q.marks
        }));
    } catch (err) {
        console.error('Error fetching Quiz questions:', err);
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
            .single();
        if (sErr || !student) return [];

        // If we have current_class_id, use it. Otherwise, find the class by grade/section
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

        // Fetch subjects linked to this class via teacher_assignments
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

export async function fetchReportCard(studentId: string | number, term: string, session: string): Promise<ReportCard | null> {
    try {
        const { data, error } = await supabase
            .from('report_cards')
            .select(`
                *,
                report_card_records(*)
            `)
            .eq('student_id', studentId)
            .eq('term', term)
            .eq('session', session)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }

        if (!data) return null;

        return {
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
                ca: r.ca,
                exam: r.exam,
                total: r.total,
                grade: r.grade,
                remark: r.remark
            }))
        };
    } catch (err) {
        console.error('Error fetching report card:', err);
        return null;
    }
}

export async function upsertReportCard(studentId: string | number, reportCard: ReportCard, schoolId: string): Promise<boolean> {
    try {
        // 1. Save Report Card (Master Record)
        const { data: rcData, error: rcError } = await supabase
            .from('report_cards')
            .upsert({
                student_id: studentId,
                school_id: schoolId,
                term: reportCard.term,
                session: reportCard.session,
                status: reportCard.status,
                attendance: reportCard.attendance,
                skills: reportCard.skills,
                psychomotor: reportCard.psychomotor,
                teacher_comment: reportCard.teacherComment,
                principal_comment: reportCard.principalComment,
                updated_at: new Date().toISOString()
            }, { onConflict: 'student_id, term, session' })
            .select()
            .single();

        if (rcError) throw rcError;

        const reportCardId = rcData.id;

        // 2. Save Breakdown Records (Sub-table)
        // First clean up old records for this card to prevent duplicates/orphans
        await supabase.from('report_card_records').delete().eq('report_card_id', reportCardId);

        const records = reportCard.academicRecords.map(rec => ({
            report_card_id: reportCardId,
            subject: rec.subject,
            ca: rec.ca,
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

        // 3. SYNC TO ACADEMIC PERFORMANCE (For Parent/Student Dashboard Visibility)
        // Parents view `academic_performance` table, not `report_cards` usually.
        // We calculate 'score' as the Total.
        for (const rec of reportCard.academicRecords) {
            const score = typeof rec.total === 'number' ? rec.total : parseFloat(rec.total) || 0;
            await supabase.from('academic_performance').upsert({
                student_id: studentId,
                subject: rec.subject,
                term: reportCard.term,
                session: reportCard.session || '2023/2024',
                score: score,
                grade: rec.grade,
                remark: rec.remark,
                ca_score: rec.ca,
                exam_score: rec.exam,
                last_updated: new Date().toISOString()
            }, { onConflict: 'student_id, subject, term, session' });
        }

        return true;
    } catch (err) {
        console.error('Error upserting report card:', err);
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

export async function fetchBehaviorNotes(studentId: string | number): Promise<any[]> {
    try {
        const { data, error } = await supabase
            .from('behavior_notes')
            .select('*')
            .eq('student_id', studentId)
            .order('date', { ascending: false });

        if (error) throw error;
        return (data || []).map(n => ({
            id: n.id,
            studentId: n.student_id,
            type: n.type,
            title: n.title,
            note: n.note,
            date: n.date,
            by: n.teacher_name || 'Teacher' // Assuming teacher name is stored or we join
        }));
    } catch (err) {
        console.error('Error fetching behavior notes:', err);
        return [];
    }
}

export async function createBehaviorNote(noteData: {
    studentId: string | number;
    type: 'Positive' | 'Negative';
    title: string;
    note: string;
    date: string;
    teacherName: string;
}): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('behavior_notes')
            .insert({
                student_id: noteData.studentId,
                type: noteData.type,
                title: noteData.title,
                note: noteData.note,
                date: noteData.date,
                teacher_name: noteData.teacherName
            });

        if (error) throw error;
        return true;
    } catch (err) {
        console.error('Error creating behavior note:', err);
        return false;
    }
}

// ============================================
// ACADEMIC PERFORMANCE (READ-ONLY VIEW)
// ============================================

export async function fetchAcademicPerformance(studentId: string | number): Promise<any[]> {
    try {
        const { data, error } = await supabase
            .from('academic_performance')
            .select('*')
            .eq('student_id', studentId);

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

export async function fetchStudentStats(studentId: string | number) {
    try {
        // Parallel queries for efficiency
        const [attendanceRes, assignmentsRes, activitiesRes] = await Promise.all([
            // Corrected table name: student_attendance
            supabase.from('student_attendance').select('status').eq('student_id', studentId),
            // Corrected table name: assignment_submissions
            supabase.from('assignment_submissions').select('id').eq('student_id', studentId),
            supabase.from('academic_performance').select('score').eq('student_id', studentId) // Proxy for achievements/activities for now
        ]);

        const attendanceTotal = attendanceRes.data?.length || 0;
        const presentCount = attendanceRes.data?.filter(a => a.status === 'Present').length || 0;
        const attendanceRate = attendanceTotal > 0 ? Math.round((presentCount / attendanceTotal) * 100) : 100;

        const assignmentsSubmitted = assignmentsRes.data?.length || 0;

        // Calculate average score
        const scores = activitiesRes.data?.map(s => s.score) || [];
        const average = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

        return {
            attendanceRate,
            assignmentsSubmitted,
            averageScore: average,
            studyHours: 24, // Placeholder until we have a study timer
            achievements: Math.floor(average / 20) // simple gamification derived from score
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

        // 1. Fetch Assignments Due Soon
        const { data: assignments } = await supabase
            .from('assignments')
            .select('id, title, due_date, subject')
            .gte('due_date', today)
            .lte('due_date', nextWeek.toISOString())
            .limit(3);

        // 2. Fetch Notices (Events)
        const { data: notices } = await supabase
            .from('notices')
            .select('id, title, created_at, category')
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
                date: n.created_at, // Ideally notices have an event_date
                type: 'Event'
            }))
        ];

        // Sort by date
        return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, 5);
    } catch (err) {
        console.error("Error fetching upcoming events:", err);
        return [];
    }
}

// ============================================
// BUS & TRANSPORT
// ============================================

export async function fetchBuses(schoolId?: string): Promise<Bus[]> {
    try {
        let query = supabase.from('transport_buses').select('*');

        if (schoolId) {
            query = query.eq('school_id', schoolId);
        }

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
        if (!busData.schoolId) {
            console.warn('createBus called without schoolId. This may fail RLS checks.');
        }

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
            .single();

        if (error) {
            console.error('Supabase error creating bus:', error);
            // Provide more specific feedback via toast if it's an RLS error
            if (error.code === '42501') {
                toast.error('Permission denied: You cannot add buses to this school.');
            } else if (error.code === '23502') {
                toast.error('Required data missing. Please check your inputs.');
            }
            throw error;
        }

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
        console.error('Error in createBus wrapper:', err);
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

        if (error) {
            console.error('Supabase error updating bus:', error);
            if (error.code === '42501') {
                toast.error('Permission denied: You cannot modify this bus.');
            }
            throw error;
        }
        return true;
    } catch (err: any) {
        console.error('Error in updateBus wrapper:', err);
        return false;
    }
}

export async function deleteBus(id: string): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('transport_buses')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Supabase error deleting bus:', error);
            if (error.code === '42501') {
                toast.error('Permission denied: You cannot delete this bus.');
            }
            throw error;
        }
        return true;
    } catch (err: any) {
        console.error('Error in deleteBus wrapper:', err);
        return false;
    }
}

export async function linkStudentToParent(studentCode: string, relationship: string): Promise<{ success: boolean; message: string }> {
    try {
        const { data, error } = await supabase.rpc('link_student_to_parent', {
            p_student_code: studentCode,
            p_relationship: relationship
        });

        if (error) throw error;
        return data as { success: boolean; message: string };
    } catch (err: any) {
        console.error('Error linking student:', err);
        return { success: false, message: err.message || 'Failed to link student' };
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
            posts: [] // We fetch posts separately or on demand
        }));
    } catch (err) {
        console.error('Error fetching forum topics:', err);
        return [];
    }
}

export async function createForumTopic(topicData: {
    title: string;
    content: string; // First post content
    authorName: string;
    authorId: string;
    schoolId: string;
    authorAvatarUrl?: string;
}): Promise<boolean> {
    try {
        // 1. Create Topic
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
            .single();

        if (topicError) throw topicError;

        // 2. Create First Post
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
            // Rollback topic creation if post fails (manual cleanup)
            await supabase.from('forum_topics').delete().eq('id', topic.id);
            throw postError;
        }

        return true;
    } catch (err) {
        console.error('Error creating forum topic:', err);
        return false;
    }
}
