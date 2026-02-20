import { createClient } from '@supabase/supabase-js';
import { config } from './env';

const url = config.supabaseUrl || 'https://placeholder.supabase.co';
const key = config.supabaseServiceKey || 'placeholder-key';

export const supabase = createClient(url, key, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});
