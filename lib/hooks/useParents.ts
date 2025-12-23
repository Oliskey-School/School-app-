import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../supabase';
import { Parent } from '../../types';
import { mockParents } from '../../data';

export interface UseParentsResult {
    parents: Parent[];
    loading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
    createParent: (parent: Partial<Parent>) => Promise<Parent | null>;
    updateParent: (id: number, updates: Partial<Parent>) => Promise<Parent | null>;
    deleteParent: (id: number) => Promise<boolean>;
}

export function useParents(): UseParentsResult {
    const [parents, setParents] = useState<Parent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchParents = useCallback(async () => {
        if (!isSupabaseConfigured) {
            setParents(mockParents);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const { data, error: fetchError } = await supabase
                .from('parents')
                .select('*')
                .order('name', { ascending: true });

            if (fetchError) throw fetchError;

            // Transform Supabase data to match Parent type
            const transformedParents: Parent[] = (data || []).map((p: any) => ({
                id: p.id,
                name: p.name,
                email: p.email,
                phone: p.phone,
                address: p.address,
                occupation: p.occupation,
                childIds: p.child_ids || [],
                avatarUrl: p.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=random`,
                relationship: p.relationship,
                emergencyContact: p.emergency_contact,
            }));

            setParents(transformedParents);
            setError(null);
        } catch (err) {
            console.error('Error fetching parents:', err);
            setError(err as Error);
            setParents(mockParents);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchParents();

        if (!isSupabaseConfigured) return;

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
        if (!isSupabaseConfigured) {
            console.warn('Supabase not configured, cannot create parent');
            return null;
        }

        try {
            const { data, error: insertError } = await supabase
                .from('parents')
                .insert([{
                    name: parentData.name,
                    email: parentData.email,
                    phone: parentData.phone,
                    address: parentData.address,
                    occupation: parentData.occupation,
                    child_ids: parentData.childIds,
                    avatar_url: parentData.avatarUrl,
                    relationship: parentData.relationship,
                    emergency_contact: parentData.emergencyContact,
                }])
                .select()
                .single();

            if (insertError) throw insertError;

            return data as any;
        } catch (err) {
            console.error('Error creating parent:', err);
            setError(err as Error);
            return null;
        }
    };

    const updateParent = async (id: number, updates: Partial<Parent>): Promise<Parent | null> => {
        if (!isSupabaseConfigured) {
            console.warn('Supabase not configured, cannot update parent');
            return null;
        }

        try {
            const updateData: any = {};
            if (updates.name !== undefined) updateData.name = updates.name;
            if (updates.email !== undefined) updateData.email = updates.email;
            if (updates.phone !== undefined) updateData.phone = updates.phone;
            if (updates.address !== undefined) updateData.address = updates.address;
            if (updates.occupation !== undefined) updateData.occupation = updates.occupation;
            if (updates.childIds !== undefined) updateData.child_ids = updates.childIds;
            if (updates.avatarUrl !== undefined) updateData.avatar_url = updates.avatarUrl;
            if (updates.relationship !== undefined) updateData.relationship = updates.relationship;
            if (updates.emergencyContact !== undefined) updateData.emergency_contact = updates.emergencyContact;

            const { data, error: updateError } = await supabase
                .from('parents')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();

            if (updateError) throw updateError;

            return data as any;
        } catch (err) {
            console.error('Error updating parent:', err);
            setError(err as Error);
            return null;
        }
    };

    const deleteParent = async (id: number): Promise<boolean> => {
        if (!isSupabaseConfigured) {
            console.warn('Supabase not configured, cannot delete parent');
            return false;
        }

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
