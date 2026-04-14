import { api } from '@/lib/api';
import { Parent } from '@/types';

/**
 * Parent Service
 * Handles all parent-related operations via the backend API.
 */

function transformParent(parent: any): Parent {
    return {
        id: parent.id,
        user_id: parent.user_id,
        schoolId: parent.school_id,
        branchId: parent.branch_id,
        schoolGeneratedId: parent.school_generated_id,
        name: parent.full_name || parent.name,
        email: parent.email,
        phone: parent.phone,
        avatarUrl: parent.avatar_url || parent.avatarUrl,
        address: parent.address,
        occupation: parent.occupation,
        relationship: parent.relationship,
        emergency_contact: parent.emergency_contact,
        childIds: parent.childIds || [],
        children: parent.children
    };
}

export async function fetchParents(schoolId: string, branchId?: string): Promise<Parent[]> {
    try {
        const data = await api.getParents(schoolId, branchId);
        return (data || []).map(transformParent);
    } catch (err) {
        console.error('Error fetching parents:', err);
        return [];
    }
}

export async function fetchParentsByClassId(classId: string): Promise<Parent[]> {
    if (!classId) return [];
    try {
        const data = await api.getParentsByClass(classId);
        return (data || []).map(transformParent);
    } catch (err) {
        console.error(`Error fetching parents for class ${classId}:`, err);
        return [];
    }
}

export async function fetchParentById(id: string): Promise<Parent | null> {
    try {
        const data = await api.getParentById(id);
        return data ? transformParent(data) : null;
    } catch (err) {
        console.error('Error fetching parent:', err);
        return null;
    }
}

export async function createParent(parentData: any): Promise<Parent | null> {
    try {
        return await api.createParent(parentData);
    } catch (err) {
        console.error('Error creating parent:', err);
        return null;
    }
}

export async function deleteParent(id: string): Promise<boolean> {
    try {
        await api.deleteParent(id);
        return true;
    } catch (err) {
        console.error('Error deleting parent:', err);
        return false;
    }
}

export async function fetchMyChildren(): Promise<any[]> {
    try {
        return await api.getMyChildren();
    } catch (err) {
        console.error('Error fetching children:', err);
        return [];
    }
}
