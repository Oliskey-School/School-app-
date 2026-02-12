import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

export const useUserIdentity = () => {
    const { user } = useAuth();
    const [copied, setCopied] = useState(false);

    // Prioritize custom_id from database (synced to metadata if possible, or we fetch it)
    // For now assuming it might be in metadata or we pass it in props. 
    // Ideally AuthContext should provide the full profile including custom_id.

    // If not in AuthContext, we might need to fetch it, but let's assume for this hook 
    // we primarily format and handle the ID passed to it, or derive from user object if available.

    const customId = user?.app_metadata?.school_generated_id || 
                     user?.user_metadata?.school_generated_id || 
                     user?.app_metadata?.custom_id || 
                     user?.user_metadata?.custom_id ||
                     user?.app_metadata?.school_id || 
                     user?.user_metadata?.school_id;

    const copyToClipboard = useCallback(async (text: string) => {
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            toast.success('ID copied to clipboard');
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
            toast.error('Failed to copy ID');
        }
    }, []);

    const formatId = useCallback((id: string | null | undefined) => {
        if (!id) return '';
        // Enforce School_branch_role_number format with underscores
        const clean = id.replace(/-/g, '_').toUpperCase();
        if (!clean.includes('OLISKEY')) {
            // Logic to prefix if it's just a sequence or fragment (simplified)
            return clean; 
        }
        return clean;
    }, []);

    return {
        customId,
        formatId,
        copyToClipboard,
        copied
    };
};
