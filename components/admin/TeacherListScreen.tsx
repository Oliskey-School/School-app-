import React, { useState, useEffect } from 'react';
import { SearchIcon, PlusIcon, FilterIcon, UsersIcon, AcademicCapIcon, ClipboardListIcon } from '../../constants';
import { useAuth } from '../../context/AuthContext';
import { useProfile } from '../../context/ProfileContext';
import { api } from '../../lib/api';
import { useAutoSync } from '../../hooks/useAutoSync';
import { formatSchoolId } from '../../utils/idFormatter';
import { toast } from 'react-hot-toast';

interface Teacher {
    id: string;
    name: string;
    avatarUrl?: string;
    email: string;
    status: 'Active' | 'Inactive';
    schoolGeneratedId?: string;
    subjects?: string[];
    department?: string;
    joinDate?: string;
}

interface TeacherListScreenProps {
    navigateTo: (view: string, title: string, props?: any) => void;
    currentBranchId?: string | null;
    schoolId: string;
}

const TeacherCard: React.FC<{ teacher: Teacher; onSelect: (teacher: Teacher) => void }> = ({ teacher, onSelect }) => {
    return (
        <button
            onClick={() => onSelect(teacher)}
            className="w-full bg-white rounded-2xl shadow-sm p-5 border border-gray-50 flex items-center gap-4 text-left hover:shadow-md transition-all relative group"
        >
            {/* Avatar */}
            <div className="relative flex-shrink-0">
                <img
                    src={teacher.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(teacher.name)}&background=random`}
                    alt={teacher.name}
                    className="w-16 h-16 rounded-full object-cover ring-2 ring-gray-50 bg-gray-100"
                    onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(teacher.name)}&background=random`;
                    }}
                />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <p className="font-bold text-lg text-gray-900 truncate">{teacher.name}</p>
                <p className="text-xs text-gray-500 mb-1 font-mono">{formatSchoolId(teacher.schoolGeneratedId || teacher.id, 'Teacher')}</p>
                <div className="mt-1">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                        {Array.isArray(teacher.subjects) && teacher.subjects.length > 0 ? teacher.subjects[0] : 'Unassigned'}
                    </span>
                </div>
            </div>

            {/* Status Badge in Bottom Right */}
            <div className="absolute bottom-4 right-4">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${teacher.status === 'Active'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                    }`}>
                    {teacher.status}
                </span>
            </div>
        </button>
    );
};

const TeacherListScreen: React.FC<TeacherListScreenProps> = ({ navigateTo, currentBranchId, schoolId: propSchoolId }) => {
    const { user } = useAuth();
    const { profile } = useProfile();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterSubject, setFilterSubject] = useState<string>('All');
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [loading, setLoading] = useState(true);

    const schoolId = propSchoolId || profile?.schoolId || user?.user_metadata?.school_id;

    useEffect(() => {
        // Resolve schoolId more robustly within the effect, prioritizing prop, then profile, then user metadata
        const effectiveSchoolId = propSchoolId || profile?.schoolId || profile?.school_id || user?.user_metadata?.school_id;

        if (effectiveSchoolId) {
            console.log('🔄 [TeacherList] Context Status:', {
                propSchoolId,
                schoolIdFromProfile: profile?.schoolId,
                schoolIdFromProfileSnake: profile?.school_id,
                schoolIdFromMetadata: user?.user_metadata?.school_id,
                resolvedSchoolId: effectiveSchoolId,
                branchId: currentBranchId
            });
            loadTeachers(effectiveSchoolId); // Pass effectiveSchoolId to loadTeachers
        }
    }, [propSchoolId, profile?.schoolId, profile?.school_id, user?.user_metadata?.school_id, currentBranchId]); // Add all dependencies

    useAutoSync(['teachers'], () => {
        const effectiveSchoolId = propSchoolId || profile?.schoolId || profile?.school_id || user?.user_metadata?.school_id;
        if (effectiveSchoolId) {
            console.log('🔄 [TeacherList] Real-time auto-sync triggered');
            loadTeachers(effectiveSchoolId);
        }
    });

    const loadTeachers = async (id: string) => { // Accept schoolId as a parameter
        try {
            console.log('🔍 [TeacherList] Loading teachers for school:', id, 'Branch:', currentBranchId);
            console.log('📦 [TeacherList] sessionStorage is_demo_mode:', sessionStorage.getItem('is_demo_mode'));
            console.log('📦 [TeacherList] api.isDemoMode():', (api as any).isDemoMode?.());

            setLoading(true);
            const rawData = await api.getTeachers(id, currentBranchId || undefined);
            console.log('[TeacherList] Fetched Teachers Result:', rawData?.length || 0, rawData);

            // Map raw data to Teacher interface with safe defaults
            const mappedData: Teacher[] = (rawData || []).map((t: any) => ({
                id: t.id,
                name: t.full_name || t.name || 'Unknown Teacher',
                avatarUrl: t.avatar_url || t.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${t.full_name || t.name || t.id}`,
                email: t.email || '',
                status: t.status === 'Inactive' ? 'Inactive' : 'Active',
                schoolGeneratedId: t.school_generated_id || t.schoolGeneratedId,
                subjects: Array.isArray(t.subjects) ? t.subjects :
                    (Array.isArray(t.teacher_subjects) ? t.teacher_subjects.map((s: any) => s.subject) : []),
                department: t.department,
                joinDate: t.joinDate || t.created_at,
                classes: Array.isArray(t.classes) ? t.classes.map((c: any) => 
                    typeof c === 'string' ? c : (c?.class?.name || c?.name || 'Unknown Class')
                ) : []
            }));

            setTeachers(mappedData);
        } catch (error) {
            console.error('Error loading teachers:', error);
            toast.error('Failed to load teachers');
        } finally {
            setLoading(false);
        }
    };

    const subjects = ['All', ...new Set(teachers.flatMap(t => Array.isArray(t.subjects) ? t.subjects : []))];

    const filteredTeachers = teachers.filter(teacher => {
        const safeName = (teacher.name || '').toLowerCase();
        const safeEmail = (teacher.email || '').toLowerCase();
        const safeSearch = (searchTerm || '').toLowerCase();

        const matchesSearch = safeName.includes(safeSearch) || safeEmail.includes(safeSearch);
        const matchesSubject = filterSubject === 'All' || (Array.isArray(teacher.subjects) && teacher.subjects.includes(filterSubject));
        return matchesSearch && matchesSubject;
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Teacher Management</h1>
                    <p className="text-sm text-gray-500">Manage and oversee school faculty.</p>
                </div>
                <button
                    onClick={() => navigateTo('AddTeacherScreen', 'Add New Teacher')}
                    className="inline-flex items-center justify-center px-4 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-sm shadow-blue-200 gap-2"
                >
                    <PlusIcon className="h-5 w-5" />
                    <span>Add Teacher</span>
                </button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-50 flex items-center gap-4">
                    <div className="p-3 bg-blue-50 rounded-xl">
                        <UsersIcon className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Total Teachers</p>
                        <p className="text-xl font-bold text-gray-900">{teachers.length}</p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-50 flex items-center gap-4">
                    <div className="p-3 bg-green-50 rounded-xl">
                        <AcademicCapIcon className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Active Faculty</p>
                        <p className="text-xl font-bold text-gray-900">{teachers.filter(t => t.status === 'Active').length}</p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-50 flex items-center gap-4">
                    <div className="p-3 bg-purple-50 rounded-xl">
                        <ClipboardListIcon className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Departments</p>
                        <p className="text-xl font-bold text-gray-900">{[...new Set(teachers.map(t => t.department).filter(Boolean))].length || '0'}</p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-50 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    <div className="relative">
                        <FilterIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <select
                            className="pl-9 pr-8 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 transition-all text-sm appearance-none"
                            value={filterSubject}
                            onChange={(e) => setFilterSubject(e.target.value)}
                        >
                            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* List */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-500 animate-pulse">Loading faculty records...</p>
                </div>
            ) : filteredTeachers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredTeachers.map(teacher => (
                        <TeacherCard
                            key={teacher.id}
                            teacher={teacher}
                            onSelect={(t) => navigateTo('TeacherDetailAdminView', t.name, { teacher: t })}
                        />
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-gray-200">
                    <UsersIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-gray-900 mb-1">No Teachers Found</h3>
                    <p className="text-gray-500">Try adjusting your search or filters to find what you're looking for.</p>
                </div>
            )}
        </div>
    );
};

export default TeacherListScreen;
