import React, { useState, useEffect } from 'react';
import { api } from '../../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import {
    Users,
    Shield,
    Plus,
    Edit,
    Trash2,
    Save,
    X,
    CheckCircle
} from 'lucide-react';

interface Role {
    id: number;
    role_name: string;
    resource: string;
    action: string;
    allowed: boolean;
    created_at: string;
}

interface RoleManagementScreenProps {
    navigateTo?: (screen: string) => void;
}

const DEFAULT_ROLES = ['Super Admin', 'Admin', 'Teacher', 'Parent', 'Student', 'Proprietor', 'Inspector'];
const DEFAULT_RESOURCES = ['schools', 'plans', 'subscriptions', 'payments', 'students', 'teachers', 'classes', 'attendance', 'grades', 'fees', 'assignments', 'profile'];
const DEFAULT_ACTIONS = ['create', 'read', 'update', 'delete', 'manage'];

export const RoleManagementScreen: React.FC<RoleManagementScreenProps> = ({ navigateTo }) => {
    const [permissions, setPermissions] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRole, setSelectedRole] = useState('Admin');
    const [editMode, setEditMode] = useState(false);
    const [newPermission, setNewPermission] = useState({
        resource: '',
        action: 'read' as 'create' | 'read' | 'update' | 'delete' | 'manage',
        allowed: true
    });

    useEffect(() => {
        fetchPermissions();
    }, []);

    const fetchPermissions = async () => {
        try {
            setLoading(true);
            const { data, error } = await api
                .from('role_permissions')
                .select('*')
                .order('role_name', { ascending: true })
                .order('resource', { ascending: true });

            if (error) throw error;
            setPermissions(data || []);
        } catch (error) {
            console.error('Error fetching permissions:', error);
        } finally {
            setLoading(false);
        }
    };

    const rolePermissions = permissions.filter(p => p.role_name === selectedRole);

    const handleAddPermission = async () => {
        if (!newPermission.resource) {
            alert('Please select a resource');
            return;
        }

        try {
            const { error } = await api
                .from('role_permissions')
                .insert({
                    role_name: selectedRole,
                    resource: newPermission.resource,
                    action: newPermission.action,
                    allowed: newPermission.allowed
                });

            if (error) throw error;

            setNewPermission({ resource: '', action: 'read', allowed: true });
            fetchPermissions();
            alert('Permission added successfully!');
        } catch (error: any) {
            console.error('Error adding permission:', error);
            if (error.code === '23505') {
                alert('This permission already exists for this role');
            } else {
                alert('Failed to add permission');
            }
        }
    };

    const handleTogglePermission = async (permissionId: number, currentAllowed: boolean) => {
        try {
            const { error } = await api
                .from('role_permissions')
                .update({ allowed: !currentAllowed })
                .eq('id', permissionId);

            if (error) throw error;
            fetchPermissions();
        } catch (error) {
            console.error('Error updating permission:', error);
            alert('Failed to update permission');
        }
    };

    const handleDeletePermission = async (permissionId: number) => {
        if (!confirm('Are you sure you want to delete this permission?')) return;

        try {
            const { error } = await api
                .from('role_permissions')
                .delete()
                .eq('id', permissionId);

            if (error) throw error;
            fetchPermissions();
            alert('Permission deleted successfully!');
        } catch (error) {
            console.error('Error deleting permission:', error);
            alert('Failed to delete permission');
        }
    };

    const getActionColor = (action: string) => {
        switch (action) {
            case 'create': return 'bg-green-100 text-green-800';
            case 'read': return 'bg-blue-100 text-blue-800';
            case 'update': return 'bg-yellow-100 text-yellow-800';
            case 'delete': return 'bg-red-100 text-red-800';
            case 'manage': return 'bg-purple-100 text-purple-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const groupedPermissions = rolePermissions.reduce((acc, perm) => {
        if (!acc[perm.resource]) {
            acc[perm.resource] = [];
        }
        acc[perm.resource].push(perm);
        return acc;
    }, {} as Record<string, Role[]>);

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Role & Permission Management</h1>
                    <p className="text-gray-600 mt-1">Configure access control for different user roles</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Total Roles</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">
                                    {new Set(permissions.map(p => p.role_name)).size}
                                </p>
                            </div>
                            <div className="p-3 rounded-lg bg-indigo-50">
                                <Users className="w-6 h-6 text-indigo-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Total Permissions</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">{permissions.length}</p>
                            </div>
                            <div className="p-3 rounded-lg bg-green-50">
                                <Shield className="w-6 h-6 text-green-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Active Permissions</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">
                                    {permissions.filter(p => p.allowed).length}
                                </p>
                            </div>
                            <div className="p-3 rounded-lg bg-blue-50">
                                <CheckCircle className="w-6 h-6 text-blue-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Role Selector */}
                <div className="lg:col-span-1">
                    <Card>
                        <CardHeader>
                            <CardTitle>Select Role</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {DEFAULT_ROLES.map(role => (
                                    <button
                                        key={role}
                                        onClick={() => setSelectedRole(role)}
                                        className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${selectedRole === role
                                                ? 'bg-indigo-600 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium">{role}</span>
                                            <span className="text-xs">
                                                {permissions.filter(p => p.role_name === role).length}
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Permissions List */}
                <div className="lg:col-span-3">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>Permissions for {selectedRole}</CardTitle>
                                <button
                                    onClick={() => setEditMode(!editMode)}
                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                                >
                                    {editMode ? (
                                        <>
                                            <X className="w-4 h-4" />
                                            Cancel
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="w-4 h-4" />
                                            Add Permission
                                        </>
                                    )}
                                </button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {/* Add Permission Form */}
                            {editMode && (
                                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                                    <h3 className="font-semibold text-gray-900 mb-4">Add New Permission</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Resource
                                            </label>
                                            <select
                                                value={newPermission.resource}
                                                onChange={(e) => setNewPermission({ ...newPermission, resource: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                            >
                                                <option value="">Select resource...</option>
                                                {DEFAULT_RESOURCES.map(resource => (
                                                    <option key={resource} value={resource}>{resource}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Action
                                            </label>
                                            <select
                                                value={newPermission.action}
                                                onChange={(e) => setNewPermission({ ...newPermission, action: e.target.value as any })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                            >
                                                {DEFAULT_ACTIONS.map(action => (
                                                    <option key={action} value={action}>{action}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="flex items-end">
                                            <button
                                                onClick={handleAddPermission}
                                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                            >
                                                <Save className="w-4 h-4" />
                                                Add
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Permissions Table */}
                            {loading ? (
                                <div className="flex justify-center items-center py-12">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                                </div>
                            ) : Object.keys(groupedPermissions).length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    No permissions configured for this role
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {Object.entries(groupedPermissions).map(([resource, perms]) => (
                                        <div key={resource} className="border border-gray-200 rounded-lg p-4">
                                            <h3 className="font-semibold text-gray-900 mb-3 capitalize">{resource}</h3>
                                            <div className="space-y-2">
                                                {perms.map(perm => (
                                                    <div key={perm.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                        <div className="flex items-center gap-3">
                                                            <span className={`px-3 py-1 text-xs font-medium rounded-full ${getActionColor(perm.action)}`}>
                                                                {perm.action}
                                                            </span>
                                                            <label className="flex items-center gap-2 cursor-pointer">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={perm.allowed}
                                                                    onChange={() => handleTogglePermission(perm.id, perm.allowed)}
                                                                    className="rounded text-indigo-600 focus:ring-indigo-500"
                                                                />
                                                                <span className="text-sm text-gray-700">
                                                                    {perm.allowed ? 'Allowed' : 'Denied'}
                                                                </span>
                                                            </label>
                                                        </div>
                                                        <button
                                                            onClick={() => handleDeletePermission(perm.id)}
                                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default RoleManagementScreen;

