import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
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
            const schoolId = sessionStorage.getItem('demo_school_id') || '';
            const data = await api.getParents(schoolId);
            setParents(data || []);
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
    }, [fetchParents]);

    const createParent = async (parentData: Partial<Parent>): Promise<Parent | null> => {
        try {
            return await api.createParent(parentData);
        } catch (err) {
            console.error('Error creating parent:', err);
            setError(err as Error);
            return null;
        }
    };

    const updateParent = async (id: string | number, updates: Partial<Parent>): Promise<Parent | null> => {
        try {
            return await api.updateParent(id, updates);
        } catch (err) {
            console.error('Error updating parent:', err);
            setError(err as Error);
            return null;
        }
    };

    const deleteParent = async (id: string | number): Promise<boolean> => {
        try {
            await api.deleteParent(id);
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

