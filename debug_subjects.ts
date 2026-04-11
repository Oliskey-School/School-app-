
import { api } from './lib/api';

async function debugSubjects() {
    const { data, error } = await api
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
