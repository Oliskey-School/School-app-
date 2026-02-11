
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!
);

async function debugAssignmentsQuery() {
    const teacherId = 'f1391659-8083-468a-9ba8-c2874edb9128';

    console.log('Testing query for teacherId:', teacherId);

    const { data, error } = await supabase
        .from('class_teachers')
        .select(`
      class_id,
      subject_id,
      classes (
        id,
        grade,
        section
      ),
      subjects (
        id,
        name
      )
    `)
        .in('teacher_id', [teacherId]);

    if (error) {
        console.error('❌ Query failed with error:', error);
    } else {
        console.log('✅ Query succeeded!');
        console.log('Data count:', data?.length);
        if (data && data.length > 0) {
            console.log('Sample row:', JSON.stringify(data[0], null, 2));
        }
    }
}

debugAssignmentsQuery();
