import { supabase } from './supabase';

/**
 * SMS Provider Simulation (e.g., Termii, Twilio, or AWS SNS)
 * In production, this would call an external API.
 */
export async function sendSMS(phoneNumber: string, message: string): Promise<boolean> {
  console.log(`📱 [SMS Gateway] To: ${phoneNumber}, Message: "${message}"`);
  
  // Real implementation example:
  // await fetch('https://api.termii.com/api/sms/send', { method: 'POST', ... });
  
  return true;
}

/**
 * Send a notification to a list of students and notify their parents via In-App and SMS.
 * @param opts - Notification options
 * @returns Object with success status
 */
export const notifyStudentsAndParents = async (opts: {
  studentIds?: number[];
  className?: string;
  message: string;
  title?: string;
  teacherId?: number | null;
  isUrgent?: boolean; // If true, triggers SMS notification to parents
}) => {
  try {
    let students: any[] = [];

    // 1. Resolve student list
    if (opts.studentIds && opts.studentIds.length > 0) {
      const { data, error } = await supabase
        .from('students')
        .select('id,user_id,name,grade,section')
        .in('id', opts.studentIds as number[]);
      if (!error && data) students = data;
    } else if (opts.className) {
      const className = opts.className.trim();
      const { data, error } = await supabase
        .from('students')
        .select('id,user_id,name,grade,section')
        .or(`grade.eq.${className},section.eq.${className}`);
      if (!error && data) students = data;
    }

    if (!students || students.length === 0) {
      console.warn('No students resolved for notification.');
      return { success: false, error: 'No students found' };
    }

    // 2. Process notifications
    for (const student of students) {
      // Student in-app notification
      try {
        await supabase.from('notifications').insert({
          recipient_type: 'student',
          recipient_id: student.user_id || student.id,
          title: opts.title || 'Class Update',
          message: opts.message,
          metadata: { studentId: student.id, teacherId: opts.teacherId || null },
        });
      } catch (e) {
        console.warn('Student notification insert failed:', e);
      }

      // Parent notifications (In-app + SMS)
      try {
        const { data: parentLinks } = await supabase
          .from('parent_children')
          .select('parent_id')
          .eq('student_id', student.id);

        if (parentLinks && parentLinks.length > 0) {
          const parentIds = parentLinks.map((p: any) => p.parent_id);
          const { data: parents } = await supabase
            .from('parents')
            .select('id,user_id,name,phone_number')
            .in('id', parentIds);

          for (const parent of parents || []) {
            // Parent in-app notification
            await supabase.from('notifications').insert({
              recipient_type: 'parent',
              recipient_id: parent.user_id || parent.id,
              title: opts.title || `School update regarding ${student.name}`,
              message: opts.message,
              metadata: { studentId: student.id, parentId: parent.id, teacherId: opts.teacherId || null },
            });

            // Parent SMS (if urgent)
            if (opts.isUrgent && parent.phone_number) {
              await sendSMS(parent.phone_number, `[URGENT] ${opts.title || 'School Update'}: ${opts.message}`);
            }
          }
        }
      } catch (err) {
        console.warn('Parent notification flow failed for student', student.id, err);
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('notifyStudentsAndParents error:', err);
    return { success: false, error: err.message };
  }
};
