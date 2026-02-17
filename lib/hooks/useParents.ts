import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../supabase';
import { Parent } from '../../types';

export interface UseParentsResult {
    parents: Parent[];
    loading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
    createParent: (parent: Partial<Parent>) => Promise<Parent | null>;
    updateParent: (id: string | number, updates: Partial<Parent>) => Promise<Parent | null>;
    deleteParent: (id: string | number) => Promise<boolean>;
}

export function useParents(): UseParentsResult {
    const [parents, setParents] = useState<Parent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchParents = useCallback(async () => {
        try {
            setLoading(true);
            const { data, error: fetchError } = await supabase
                .from('parents')
                .select('*')
                .order('name', { ascending: true });

            if (fetchError) throw fetchError;

            // Transform Supabase data to match Parent type
            const transformedParents: Parent[] = (data || []).map(transformSupabaseParent);

            setParents(transformedParents);
            setError(null);
        } catch (err) {
            console.error('Error fetching parents:', err);
            setError(err as Error);
            setParents([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchParents();

        const channel = supabase
            .channel('parents-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'parents' },
                (payload) => {
                    console.log('Parent change detected:', payload);
                    fetchParents();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchParents]);

    const createParent = async (parentData: Partial<Parent>): Promise<Parent | null> => {
        try {
            const { data, error: insertError } = await supabase
                .from('parents')
                .insert([{
                    name: parentData.name,
                    email: parentData.email,
                    phone: parentData.phone,
                    address: parentData.address,
                    occupation: parentData.occupation,
                    avatar_url: parentData.avatarUrl,
                    relationship: parentData.relationship,
                    emergency_contact: parentData.emergency_contact,
                }])
                .select()
                .single();

            if (insertError) throw insertError;

            return transformSupabaseParent(data);
        } catch (err) {
            console.error('Error creating parent:', err);
            setError(err as Error);
            return null;
        }
    };

    const updateParent = async (id: string | number, updates: Partial<Parent>): Promise<Parent | null> => {
        try {
            const { data, error: updateError } = await supabase
                .from('parents')
                .update({
                    name: updates.name,
                    email: updates.email,
                    phone: updates.phone,
                    address: updates.address,
                    occupation: updates.occupation,
                    avatar_url: updates.avatarUrl,
                    relationship: updates.relationship,
                    emergency_contact: updates.emergency_contact,
                })
                .eq('id', id)
                .select()
                .single();

            if (updateError) throw updateError;

            return transformSupabaseParent(data);
        } catch (err) {
            console.error('Error updating parent:', err);
            setError(err as Error);
            return null;
        }
    };

    const deleteParent = async (id: string | number): Promise<boolean> => {
        try {
            const { error: deleteError } = await supabase
                .from('parents')
                .delete()
                .eq('id', id);

            if (deleteError) throw deleteError;

            return true;
        } catch (err) {
            console.error('Error deleting parent:', err);
            setError(err as Error);
            return false;
        }
    };

    return {
        parents,
        loading,
        error,
        refetch: fetchParents,
        createParent,
        updateParent,
        deleteParent,
    };
}

const transformSupabaseParent = (p: any): Parent => ({
    id: p.id,
    name: p.name,
    email: p.email,
    phone: p.phone,
    address: p.address,
    occupation: p.occupation,
    childIds: p.child_ids || [],
    avatarUrl: p.avatar_url,
    relationship: p.relationship,
    emergency_contact: p.emergency_contact,
});
