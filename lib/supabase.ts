/// <reference types="vite/client" />

import { createClient } from '@supabase/supabase-js';

// Placeholder for generated types until user runs generation
type Database = any;

// Use environment variables for Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
    console.warn('Supabase URL or Anon Key is missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.');
}

export const isSupabaseConfigured = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;

// Generate a stable tab-specific ID that persists for the tab's lifetime
// This prevents cross-tab auth synchronization while maintaining session persistence within the tab
const getTabSpecificStorageKey = () => {
    const TAB_ID_KEY = 'sb-tab-id';
    let tabId = sessionStorage.getItem(TAB_ID_KEY);

    if (!tabId) {
        // Generate a unique ID for this tab
        tabId = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem(TAB_ID_KEY, tabId);
    }

    return `sb-auth-token-${tabId}`;
};

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: sessionStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        // Use tab-specific storage key to prevent cross-tab session sync
        storageKey: getTabSpecificStorageKey(),
        // PKCE flow for better security
        flowType: 'pkce',
    },
    global: {
        headers: {
            'x-application-name': 'school-management-system',
        },
    },
});

