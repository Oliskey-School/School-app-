
import { api } from './api';

/**
 * Migration script to consolidate teacher assignment records for Bisola Odupitan.
 * Her assignments are split across two teacher IDs with the same user_id.
 * 
 * Target ID: f65c2228-566f-4559-9182-4dbcd5985b05 (Primary)
 * Source ID: e7c92f78-3f44-435b-9079-6d77faae023e (Secondary/Duplicate)
 */
export async function fixTeacherAssignments() {
    console.log('🚀 Starting Teacher Assignment Consolidation...');
    
    const primaryId = 'f65c2228-566f-4559-9182-4dbcd5985b05';
    const secondaryId = 'e7c92f78-3f44-435b-9079-6d77faae023e';

    try {
        // 1. Move Assignments
        const { count: assignCount, error: assignError } = await supabase
            .from('assignments')
            .update({ teacher_id: primaryId })
            .eq('teacher_id', secondaryId);
            
        if (assignError) throw assignError;
        console.log(`✅ Migrated ${assignCount || 0} assignments to primary teacher ID.`);

        // 2. Move Quizzes
        const { count: quizCount, error: quizError } = await supabase
            .from('quizzes')
            .update({ teacher_id: primaryId })
            .eq('teacher_id', secondaryId);
            
        if (quizError) throw quizError;
        console.log(`✅ Migrated ${quizCount || 0} quizzes to primary teacher ID.`);

        // 3. Move Teacher Classes
        const { count: classCount, error: classError } = await supabase
            .from('teacher_classes')
            .update({ teacher_id: primaryId })
            .eq('teacher_id', secondaryId);
            
        if (classError) throw classError;
        console.log(`✅ Migrated ${classCount || 0} class links to primary teacher ID.`);

        // 4. Move Teacher Subjects
        const { count: subCount, error: subError } = await supabase
            .from('teacher_subjects')
            .update({ teacher_id: primaryId })
            .eq('teacher_id', secondaryId);
            
        if (subError) throw subError;
        console.log(`✅ Migrated ${subCount || 0} subject links to primary teacher ID.`);

        // 5. Optionally delete the secondary record if it has no user_id or is redundant
        // For now, we'll keep it but it has no active assignments.
        
        return { success: true, assignments: assignCount, quizzes: quizCount };
    } catch (err) {
        console.error('❌ Consolidation failed:', err);
        return { success: false, error: err };
    }
}

