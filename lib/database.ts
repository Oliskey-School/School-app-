import { supabase } from './supabase';
import {
    Student,
    Teacher,
    Parent,
    Notice,
    ClassInfo,
    Assignment,
    Exam,
    Conversation,
    Message
} from '../types';

/**
 * Complete Database Service for School Management System
 * All data fetching happens here - NO mock data!
 */

// ============================================
// STUDENTS
// ============================================

export async function fetchStudents(): Promise<Student[]> {
    try {
        const { data, error } = await supabase
            .from('students')
            .select('*')
            .order('grade', { ascending: false });

        if (error) throw error;

        return (data || []).map((s: any) => ({
            id: s.id,
            name: s.name,
            avatarUrl: s.avatar_url || 'https://i.pravatar.cc/150',
            grade: s.grade,
            section: s.section,
            department: s.department,
            attendanceStatus: s.attendance_status || 'Absent',
            birthday: s.birthday
        }));
    } catch (err) {
        console.error('Error fetching students:', err);
        return [];
    }
}

export async function fetchStudentById(id: number): Promise<Student | null> {
    try {
        const { data, error } = await supabase
            .from('students')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        if (!data) return null;

        return {
            id: data.id,
            name: data.name,
            avatarUrl: data.avatar_url || 'https://i.pravatar.cc/150',
            grade: data.grade,
            section: data.section,
            department: data.department,
            attendanceStatus: data.attendance_status || 'Absent',
            birthday: data.birthday
        };
    } catch (err) {
        console.error('Error fetching student:', err);
        return null;
    }
}

// ============================================
// TEACHERS
// ============================================

export async function fetchTeachers(): Promise<Teacher[]> {
    try {
        const { data, error } = await supabase
            .from('teachers')
            .select(`
        *,
        teacher_subjects(subject),
        teacher_classes(class_name)
      `);

        if (error) throw error;

        return (data || []).map((t: any) => ({
            id: t.id,
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

export async function fetchTeacherById(id: number): Promise<Teacher | null> {
    try {
        const { data, error } = await supabase
            .from('teachers')
            .select(`
        *,
        teacher_subjects(subject),
        teacher_classes(class_name)
      `)
            .eq('id', id)
            .single();

        if (error) throw error;
        if (!data) return null;

        return {
            id: data.id,
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

// ============================================
// PARENTS
// ============================================

export async function fetchParents(): Promise<Parent[]> {
    try {
        const { data, error } = await supabase
            .from('parents')
            .select(`
        *,
        parent_children(student_id)
      `);

        if (error) throw error;

        return (data || []).map((p: any) => ({
            id: p.id,
            name: p.name,
            email: p.email,
            phone: p.phone || '',
            avatarUrl: p.avatar_url || 'https://i.pravatar.cc/150?u=parent',
            childIds: (p.parent_children || []).map((c: any) => c.student_id)
        }));
    } catch (err) {
        console.error('Error fetching parents:', err);
        return [];
    }
}

// ============================================
// NOTICES & ANNOUNCEMENTS
// ============================================

export async function fetchNotices(): Promise<Notice[]> {
    try {
        const { data, error } = await supabase
            .from('notices')
            .select('*')
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

// ============================================
// CLASSES
// ============================================

export async function fetchClasses(): Promise<ClassInfo[]> {
    try {
        const { data, error } = await supabase
            .from('classes')
            .select('*')
            .order('grade', { ascending: false });

        if (error) throw error;

        return (data || []).map((c: any) => ({
            id: c.id,
            subject: c.subject,
            grade: c.grade,
            section: c.section,
            department: c.department,
            studentCount: c.student_count || 0
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
            .select('*')
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

// ============================================
// EXAMS
// ============================================

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
// HELPER: Refresh Data After Changes
// ============================================

/**
 * Call this after creating/updating/deleting data to trigger UI refresh
 */
export function createDataRefreshCallback(callback: () => void) {
    return callback;
}
