
import { supabase } from './lib/supabase';

async function debugSubjects() {
    const { data, error } = await supabase
        .from('classes')
        .select('subject, grade, section');

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Total classes rows:', data.length);
    const validSubjects = data.map(c => c.subject).filter(s => s !== null);
    console.log('Unique subjects:', [...new Set(validSubjects)]);
    console.log('Sample rows:', data.slice(0, 5));
}

debugSubjects();
