import { api } from './api';

export class ResultService {
    /**
     * Triggers the automated class ranking process.
     */
    static async generateClassResults(classId: string, term: string, session: string) {
        const { error } = await api.rpc('calculate_class_ranking', {
            p_class_id: classId,
            p_term: term,
            p_session: session
        });

        if (error) throw error;
        return { success: true };
    }

    /**
     * Publishes all results for a class so parents can see them.
     */
    static async publishClassResults(classId: string, term: string, session: string) {
        const { error } = await api
            .from('report_cards')
            .update({ is_published: true })
            .eq('class_id', classId)
            .eq('term', term)
            .eq('session', session);

        if (error) throw error;
        return { success: true };
    }

    /**
     * Fetches the full breakdown for a single student's report card.
     */
    static async getStudentReportDetails(studentId: string, term: string, session: string) {
        const { data: summary } = await api
            .from('report_cards')
            .select('*')
            .eq('student_id', studentId)
            .eq('term', term)
            .eq('session', session)
            .single();

        const { data: grades } = await api
            .from('academic_performance')
            .select('*')
            .eq('student_id', studentId)
            .eq('term', term)
            .eq('session', session);

        return { summary, grades };
    }
}

