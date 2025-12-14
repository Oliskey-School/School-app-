import { supabase } from './supabase';

/**
 * Send a notification to a list of students and notify their parents.
 * This writes rows to a `notifications` table (if available) and attempts
 * to insert parent notifications. It will not throw on missing tables but
 * will log errors for debugging.
 */
export const notifyStudentsAndParents = async (opts: {
  studentIds?: number[]; // optional list of student.id values
  className?: string; // optional class name/identifier to lookup students
  message: string;
  title?: string;
  teacherId?: number | null;
}) => {
  try {
    let students: any[] = [];

    if (opts.studentIds && opts.studentIds.length > 0) {
      const { data, error } = await supabase
        .from('students')
        .select('id,user_id,name,grade,section')
        .in('id', opts.studentIds as number[]);
      if (error) {
        console.warn('Could not fetch students by ids:', error);
      } else if (data) {
        students = data;
      }
    } else if (opts.className) {
      // try to match by grade or grade+section
      const className = opts.className.trim();
      // Attempt grade+section (e.g. "10A") or "Grade 10"
      let query = supabase.from('students').select('id,user_id,name,grade,section').eq('grade', className);
      // Best effort fallback: try equality on a combined field
      const { data, error } = await supabase.from('students').select('id,user_id,name,grade,section').or(`grade.eq.${className},section.eq.${className}`);
      if (!error && data) students = data;
    }

    // If no students found (or DB not available), fall back to an empty array
    if (!students || students.length === 0) {
      console.warn('No students resolved for notification. The notification will be recorded locally (no DB rows).');
    }

    // Insert notifications for each student (in-app)
    for (const student of students) {
      try {
        await supabase.from('notifications').insert({
          recipient_type: 'student',
          recipient_id: student.user_id || student.id,
          title: opts.title || 'Class Notification',
          message: opts.message,
          metadata: { studentId: student.id, teacherId: opts.teacherId || null },
        });
      } catch (e) {
        console.warn('Could not insert student notification (maybe table missing):', e);
      }

      // Find parents for the student and insert notifications for them
      try {
        const { data: parentLinks, error: parentLinksError } = await supabase
          .from('parent_children')
          .select('parent_id,student_id')
          .eq('student_id', student.id);

        if (parentLinksError) {
          console.warn('Could not query parent_children for student', student.id, parentLinksError);
          continue;
        }

        if (parentLinks && parentLinks.length > 0) {
          const parentIds = parentLinks.map((p: any) => p.parent_id);
          const { data: parents, error: parentsError } = await supabase
            .from('parents')
            .select('id,user_id,name,email')
            .in('id', parentIds);

          if (parentsError) {
            console.warn('Could not fetch parent records:', parentsError);
            continue;
          }

          for (const parent of parents || []) {
            try {
              await supabase.from('notifications').insert({
                recipient_type: 'parent',
                recipient_id: parent.user_id || parent.id,
                title: opts.title || 'Class Notification for your child',
                message: opts.message,
                metadata: { studentId: student.id, parentId: parent.id, teacherId: opts.teacherId || null },
              });
            } catch (err) {
              console.warn('Could not insert parent notification (maybe table missing):', err);
            }
          }
        }
      } catch (err) {
        console.warn('Parent notification flow error for student', student.id, err);
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('notifyStudentsAndParents error:', err);
    return { success: false, error: err.message };
  }
};
