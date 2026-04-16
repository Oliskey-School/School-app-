import { useState, useEffect, useCallback } from 'react';

/**
 * A hook to persist form state to localStorage.
 * @param storageKey The unique key to use for localStorage.
 * @param initialData The default state if no draft is found.
 */
export function usePersistentForm<T>(storageKey: string, initialData: T) {
    // 1. Initialize state from localStorage if available, otherwise use initialData
    const [formData, setFormData] = useState<T>(() => {
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                return JSON.parse(saved) as T;
            }
        } catch (error) {
            console.error(`Error loading draft for ${storageKey}:`, error);
        }
        return initialData;
    });

    // 2. Sync state to localStorage whenever it changes
    useEffect(() => {
        try {
            localStorage.setItem(storageKey, JSON.stringify(formData));
        } catch (error) {
            console.error(`Error saving draft for ${storageKey}:`, error);
        }
    }, [formData, storageKey]);

    // 3. Method to manually update specific fields (helper for object-based state)
    const updateField = useCallback((field: keyof T, value: any) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    }, []);

    // 4. Method to clear the draft (call after successful submit)
    const clearDraft = useCallback(() => {
        try {
            localStorage.removeItem(storageKey);
            setFormData(initialData);
        } catch (error) {
            console.error(`Error clearing draft for ${storageKey}:`, error);
        }
    }, [storageKey, initialData]);

    return {
        formData,
        setFormData,
        updateField,
        clearDraft
    };
}
