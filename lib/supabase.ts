/// <reference types="vite/client" />

import { createClient } from '@supabase/supabase-js';

// Use environment variables for Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://nijgkstffuqxqltlmchu.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pamdrc3RmZnVxeHFsdGxtY2h1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0MjU3MzksImV4cCI6MjA4MDAwMTczOX0.3KQBB2WD9HUX3LYw_UtpLBAnzobky2WUoVSZjm_VtCo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
