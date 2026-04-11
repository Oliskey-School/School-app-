/**
 * WhatsApp Business Notification Bridge
 * Simulates a WhatsApp bot for parents to query fee balances and child attendance.
 */

import { api } from './api';
import { sendSMS } from './notifications';

export type WhatsAppCommand = 'balance' | 'attendance' | 'grades' | 'help';

/**
 * Handles an incoming WhatsApp-style command.
 */
export async function handleWhatsAppMessage(
    phoneNumber: string, 
    command: string
): Promise<string> {
    const cmd = command.toLowerCase().trim() as WhatsAppCommand;

    try {
        // Find parent by phone number
        const { data: parent, error: parentError } = await api
            .from('parents')
            .select('id, name')
            .eq('phone_number', phoneNumber)
            .single();

        if (parentError || !parent) return "❌ Phone number not linked to any student profile. Contact your school.";

        // Find child(ren)
        const { data: children } = await api
            .from('parent_children')
            .select('students(id, name, grade, section)')
            .eq('parent_id', parent.id);

        if (!children || children.length === 0) return "❌ No student profiles linked to your account.";

        switch (cmd) {
            case 'balance':
                return await fetchBalances(parent.id);
            case 'attendance':
                return await fetchAttendance(children);
            case 'grades':
                return await fetchGrades(children);
            case 'help':
            default:
                return "💡 *Oliskey School Assistant Commands:*\n- *balance*: View your fee balance.\n- *attendance*: View child's arrival today.\n- *grades*: View recent academic results.";
        }

    } catch (error) {
        return "⚠️ An error occurred while processing your request. Please try again later.";
    }
}

async function fetchBalances(parentId: string): Promise<string> {
    const { data: fees } = await api
        .from('student_fees')
        .select('amount, status, title')
        .eq('parent_id', parentId)
        .neq('status', 'paid');

    if (!fees || fees.length === 0) return "✅ All fee accounts are up to date! Well done.";

    const total = fees.reduce((sum, f) => sum + f.amount, 0);
    return `💰 *Outstanding Fees:* \n` + 
           fees.map(f => `- ${f.title}: ₦${f.amount.toLocaleString()}`).join('\n') + 
           `\n\nTotal: *₦${total.toLocaleString()}*`;
}

async function fetchAttendance(children: any[]): Promise<string> {
    const childIds = children.map(c => c.students.id);
    const today = new Date().toISOString().split('T')[0];

    const { data: attendance } = await api
        .from('attendance_records')
        .select('status, students(name)')
        .in('student_id', childIds)
        .gte('check_in_time', today);

    if (!attendance || attendance.length === 0) return "🕒 No arrival data recorded for today yet.";

    return `🎒 *Attendance Today:* \n` + 
           attendance.map(a => `- ${(a.students as any)[0]?.name || 'Unknown Student'}: *${a.status.toUpperCase()}*`).join('\n');
}

async function fetchGrades(children: any[]): Promise<string> {
    // Logic to fetch most recent exam_results or report_card data
    return "📈 *Recent Academic Results:* \n(Grade functionality coming soon for your school)";
}

