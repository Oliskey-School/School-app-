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

export async function fetchAssignments(teacherId?: string): Promise<Assignment[]> {
    try {
        let query = supabase
            .from('assignments')
            .select('id, title, description, class_name, subject, due_date, total_students, submissions_count, teacher_id, class_id')
            .order('due_date', { ascending: true });

        if (teacherId) {
            query = query.eq('teacher_id', teacherId);
        }

        const { data, error } = await query;

        if (error) throw error;

        return (data || []).map((a: any) => ({
            id: a.id,
            title: a.title,
            description: a.description,
            className: a.class_name,
            subject: a.subject,
            dueDate: a.due_date,
            totalStudents: a.total_students || 0,
            submissionsCount: a.submissions_count || 0,
            teacherId: a.teacher_id,
            classId: a.class_id
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
    teacherId?: string;
    classId?: string;
    schoolId?: string;
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
                teacher_id: assignmentData.teacherId,
                class_id: assignmentData.classId,
                school_id: assignmentData.schoolId,
                created_at: new Date().toISOString()
            })
            .select()
            .maybeSingle();

        if (error) throw error;

        return {
            id: data.id,
            title: data.title,
            description: data.description,
            className: data.class_name,
            subject: data.subject,
            dueDate: data.due_date,
            totalStudents: data.total_students || 0,
            submissionsCount: data.submissions_count || 0,
            teacherId: data.teacher_id,
            classId: data.class_id
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
export async function fetchExams(schoolId?: string): Promise<Exam[]> {
    try {
        let query = supabase
            .from('exams')
            .select('*')

        if (schoolId) {
            query = query.eq('school_id', schoolId);
        }

        let { data, error } = await query.order('date', { ascending: true });

        // Fallback to backend API if direct query returns nothing and we're in demo mode
        if ((!data || data.length === 0) && (isDemoMode() || !error)) {
            try {
                const backendData = await backendFetch<any[]>(`/exams?school_id=${schoolId || ''}`);
                if (backendData && backendData.length > 0) {
                    data = backendData;
                }
            } catch (backendErr) {
                console.error('Backend fallback failed for exams:', backendErr);
            }
        }

        if (error && !data) throw error;

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
// ANALYTICS
// ============================================

export async function fetchAnalyticsMetrics(schoolId?: string, branchId?: string) {
    if (!schoolId) {
        const { data: session } = await supabase.auth.getSession();
        schoolId = session?.session?.user?.user_metadata?.school_id;
        if (!schoolId) return null;
    }

    try {
        const stats = {
            performance: [] as { label: string, value: number, a11yLabel: string }[],
            fees: { paid: 0, overdue: 0, unpaid: 0, total: 0 },
            workload: [] as { label: string, value: number }[],
            attendance: [] as number[],
            enrollment: [] as { year: number, count: number }[]
        };

        const branchFilter = branchId && branchId !== 'all' ? branchId : null;

        // 1. Performance Data
        let performanceQuery = supabase.from('academic_performance').select('score').eq('school_id', schoolId);
        if (branchFilter) performanceQuery = performanceQuery.eq('branch_id', branchFilter);
        const { data: scores } = await performanceQuery;

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
        }

        // 2. Fee Compliance
        let feeQuery = supabase.from('student_fees').select('status').eq('school_id', schoolId);
        if (branchFilter) feeQuery = feeQuery.eq('branch_id', branchFilter);
        const { data: fees } = await feeQuery;

        if (fees && fees.length > 0) {
            let paid = 0, overdue = 0, unpaid = 0;
            fees.forEach((f: any) => {
                const s = f.status?.toLowerCase();
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
        }

        // 3. Teacher Workload
        let timetableQuery = supabase.from('timetable').select('subject, class_name, teacher_id').eq('school_id', schoolId);
        if (branchFilter) timetableQuery = timetableQuery.eq('branch_id', branchFilter);
        const { data: timetable } = await timetableQuery;

        if (timetable && timetable.length > 0) {
            const teacherIds = Array.from(new Set(timetable.map(t => t.teacher_id).filter(Boolean)));
            const { data: teacherProfiles } = await supabase.from('teachers').select('id, name').in('id', teacherIds);

            const counts: { [key: string]: number } = {};
            timetable.forEach((t: any) => {
                const profile = teacherProfiles?.find(p => p.id === t.teacher_id);
                const name = profile?.name || 'Unknown';
                counts[name] = (counts[name] || 0) + 1;
            });

            stats.workload = Object.entries(counts)
                .map(([label, value]) => ({ label: label.split(' ').pop() || label, value }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 5);
        }

        // 4. Enrollment
        let studentQuery = supabase.from('students').select('created_at').eq('school_id', schoolId);
        if (branchFilter) studentQuery = studentQuery.eq('branch_id', branchFilter);
        const { data: studentsData } = await studentQuery;

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

        // 5. Attendance Trend
        const d = new Date();
        d.setDate(d.getDate() - 7);
        let attendanceQuery = supabase.from('student_attendance').select('date, status').eq('school_id', schoolId).gte('date', d.toISOString().split('T')[0]);
        if (branchFilter) attendanceQuery = attendanceQuery.eq('branch_id', branchFilter);
        const { data: attendance } = await attendanceQuery;

        if (attendance && attendance.length > 0) {
            const dailyStats: { [key: string]: { total: number, present: number } } = {};
            attendance.forEach((r: any) => {
                if (!dailyStats[r.date]) dailyStats[r.date] = { total: 0, present: 0 };
                dailyStats[r.date].total++;
                if (r.status === 'Present') dailyStats[r.date].present++;
            });

            const sortedDates = Object.keys(dailyStats).sort();
            stats.attendance = sortedDates.map(date =>
                Math.round((dailyStats[date].present / dailyStats[date].total) * 100)
            );
        } else {
            stats.attendance = [];
        }

        return stats;
    } catch (err) {
        console.error('Error fetching analytics metrics:', err);
        return null;
    }
}

