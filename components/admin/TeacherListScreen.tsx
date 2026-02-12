

import React, { useState, useMemo, useEffect } from 'react';
import {
    SearchIcon,
    MailIcon,
    PhoneIcon,
    SUBJECT_COLORS,
    PlusIcon,
    ViewGridIcon,
    ClipboardListIcon
} from '../../constants';
import { Teacher } from '../../types';
import { fetchTeachers } from '../../lib/database';
import { supabase } from '../../lib/supabase';
import { formatSchoolId } from '../../utils/idFormatter';
import { useAuth } from '../../context/AuthContext';
import { useProfile } from '../../context/ProfileContext';

interface TeacherListScreenProps {
    navigateTo: (view: string, title: string, props?: any) => void;
    currentBranchId?: string | null;
    schoolId?: string; // Added prop
}

const TeacherCard: React.FC<{ teacher: Teacher, onSelect: (teacher: Teacher) => void }> = ({ teacher, onSelect }) => {
    return (
        <button
            onClick={() => onSelect(teacher)}
            className="w-full bg-white rounded-2xl shadow-sm p-5 border border-gray-50 flex items-center gap-4 text-left hover:shadow-md transition-all relative group"
        >
            {/* Avatar */}
            <div className="relative flex-shrink-0">
                <img
                    src={teacher.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${teacher.name}`}
                    alt={teacher.name}
                    className="w-16 h-16 rounded-full object-cover ring-2 ring-gray-50"
                />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <p className="font-bold text-lg text-gray-900 truncate">{teacher.name}</p>
                <p className="text-xs text-gray-500 mb-1 font-mono">{formatSchoolId(teacher.schoolGeneratedId || teacher.id, 'Teacher')}</p>
                <div className="mt-1">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                        {teacher.subjects[0] || 'Unassigned'}
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
    const [filterStatus, setFilterStatus] = useState<string>('All');
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (user || profile || propSchoolId) {
            loadTeachers();
        }
        const subscription = supabase
            .channel('public:teachers')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'teachers' }, () => {
                loadTeachers();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [currentBranchId, propSchoolId, profile?.schoolId, user?.id]);

    const loadTeachers = async () => {
        setIsLoading(true);
        try {
            // Robust school ID retrieval: Check prop first, then profile context, then user metadata
            const schoolId = propSchoolId || profile?.schoolId || user?.user_metadata?.school_id;

            console.log('[TeacherList] Context Status:', {
                propSchoolId,
                profileSchoolId: profile?.schoolId,
                metadataSchoolId: user?.user_metadata?.school_id,
                resolvedSchoolId: schoolId,
                branchId: currentBranchId
            });

            if (schoolId) {
                const data = await fetchTeachers(schoolId, currentBranchId || undefined);
                console.log('[TeacherList] Fetched Teachers:', data.length);
                setTeachers(data);
            } else {
                console.warn('[TeacherList] No school context found. Aborting fetch.');
                setTeachers([]);
            }
        } catch (error) {
            console.error("Error loading teachers:", error);
            setTeachers([]);
        } finally {
            setIsLoading(false);
        }
    };

    const allSubjects = useMemo(() => {
        const subjects = new Set<string>(['All']);
        teachers.forEach(t => t.subjects?.forEach(s => subjects.add(s)));
        return Array.from(subjects);
    }, [teachers]);

    const filteredTeachers = useMemo(() => {
        let filtered = teachers.filter(teacher =>
            teacher.name.toLowerCase().includes(searchTerm.toLowerCase())
        );

        if (filterSubject !== 'All') {
            filtered = filtered.filter(t => t.subjects?.includes(filterSubject));
        }

        if (filterStatus !== 'All') {
            filtered = filtered.filter(t => t.status === filterStatus);
        }

        return filtered;
    }, [searchTerm, filterSubject, filterStatus, teachers]);

    const handleSelectTeacher = (teacher: Teacher) => {
        navigateTo('teacherDetailAdminView', teacher.name, { teacher });
    };

    return (
        <div className="flex flex-col h-full bg-[#f8fafc] relative">
            {/* Search and Filters Header */}
            <div className="p-6 pb-2 space-y-4">
                <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search teachers..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm text-gray-700"
                        />
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                        <ClipboardListIcon className="h-6 w-6 text-gray-400" />
                    </div>
                </div>

                <div className="flex gap-3">
                    <select
                        value={filterSubject}
                        onChange={e => setFilterSubject(e.target.value)}
                        className="bg-white px-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none shadow-sm text-gray-600"
                    >
                        <option value="All">All Subjects</option>
                        {allSubjects.filter(s => s !== 'All').map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                    <select
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                        className="bg-white px-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none shadow-sm text-gray-600"
                    >
                        <option value="All">All Status</option>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                    </select>
                </div>
            </div>

            {/* Grid Content */}
            <main className="flex-1 p-6 pt-2 overflow-y-auto">
                {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                ) : filteredTeachers.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                        {filteredTeachers.map(teacher => (
                            <TeacherCard key={teacher.id} teacher={teacher} onSelect={handleSelectTeacher} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-dashed border-gray-200">
                        <p className="text-gray-500 font-medium">No teachers found matching your criteria.</p>
                    </div>
                )}
            </main>

            {/* Floating Action Button */}
            <button
                onClick={() => navigateTo('inviteStaff', 'Invite Staff')}
                className="fixed bottom-8 right-8 w-14 h-14 bg-[#0ea5e9] text-white rounded-full shadow-xl hover:bg-[#0284c7] transform hover:scale-110 transition-all flex items-center justify-center z-50"
            >
                <PlusIcon className="h-8 w-8" />
            </button>
        </div>
    );
};

export default TeacherListScreen;
