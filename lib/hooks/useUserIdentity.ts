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

    const customId = user?.user_metadata?.custom_id || user?.app_metadata?.custom_id;

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
        return id;
    }, []);

    return {
        customId,
        formatId,
        copyToClipboard,
        copied
    };
};
