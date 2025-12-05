

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

interface TeacherListScreenProps {
    navigateTo: (view: string, title: string, props?: any) => void;
}

const TeacherCard: React.FC<{ teacher: Teacher, onSelect: (teacher: Teacher) => void }> = ({ teacher, onSelect }) => {
    return (
        <button
            onClick={() => onSelect(teacher)}
            className="w-full bg-white rounded-xl shadow-sm p-4 flex flex-col space-y-3 text-left hover:shadow-md hover:ring-2 hover:ring-sky-200 transition-all duration-200"
            aria-label={`View details for ${teacher.name}`}
        >
            <div className="flex items-center space-x-4">
                <img src={teacher.avatarUrl} alt={teacher.name} className="w-16 h-16 rounded-full object-cover" />
                <div className="flex-grow">
                    <p className="font-bold text-lg text-gray-800">{teacher.name}</p>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${SUBJECT_COLORS[teacher.subjects[0]] || 'bg-gray-100 text-gray-800'}`}>
                        {teacher.subjects[0]}
                    </span>
                </div>
            </div>
            <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
                <div>
                    <p className="text-sm font-medium text-gray-700 truncate max-w-[150px]">{teacher.classes.join(', ')}</p>
                </div>
                <div className="flex items-center space-x-2">
                    <span className={`text-xs px-2 py-1 rounded ${teacher.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {teacher.status}
                    </span>
                </div>
            </div>
        </button>
    );
};

const TeacherListScreen: React.FC<TeacherListScreenProps> = ({ navigateTo }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
    const [filterSubject, setFilterSubject] = useState<string>('All');
    const [filterStatus, setFilterStatus] = useState<string>('All');
    const [sortConfig, setSortConfig] = useState<{ key: keyof Teacher; direction: 'asc' | 'desc' } | null>(null);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch teachers from Supabase
    useEffect(() => {
        loadTeachers();
    }, []);

    const loadTeachers = async () => {
        setIsLoading(true);
        const data = await fetchTeachers();
        setTeachers(data);
        setIsLoading(false);
    };

    // Derive unique subjects for filter
    const allSubjects = useMemo(() => {
        const subjects = new Set<string>(['All']);
        teachers.forEach(t => t.subjects.forEach(s => subjects.add(s)));
        return Array.from(subjects);
    }, [teachers]);

    const filteredTeachers = useMemo(() => {
        let filtered = teachers.filter(teacher =>
            teacher.name.toLowerCase().includes(searchTerm.toLowerCase())
        );

        if (filterSubject !== 'All') {
            filtered = filtered.filter(t => t.subjects.includes(filterSubject));
        }

        if (filterStatus !== 'All') {
            filtered = filtered.filter(t => t.status === filterStatus);
        }

        if (sortConfig) {
            filtered.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];
                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return filtered;
    }, [searchTerm, filterSubject, filterStatus, sortConfig, teachers]);

    const requestSort = (key: keyof Teacher) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const handleSelectTeacher = (teacher: Teacher) => {
        navigateTo('teacherDetailAdminView', teacher.name, { teacher });
    };

    return (
        <div className="flex flex-col h-full bg-gray-100 relative">
            {/* Controls Header */}
            <div className="p-4 bg-gray-100 z-10 space-y-3">
                <div className="flex gap-2">
                    <div className="relative flex-grow">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                            <SearchIcon className="text-gray-400" />
                        </span>
                        <input
                            type="text"
                            placeholder="Search teachers..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg focus:ring-sky-500 focus:border-sky-500"
                        />
                    </div>
                    <button onClick={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')} className="p-2 bg-white border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">
                        {viewMode === 'grid' ? <ClipboardListIcon className="w-6 h-6" /> : <ViewGridIcon className="w-6 h-6" />}
                    </button>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2">
                    <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)} className="p-2 text-sm border border-gray-300 rounded-lg bg-white">
                        {allSubjects.map(s => <option key={s} value={s}>{s === 'All' ? 'All Subjects' : s}</option>)}
                    </select>
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="p-2 text-sm border border-gray-300 rounded-lg bg-white">
                        <option value="All">All Status</option>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                    </select>
                </div>
            </div>

            {/* Content */}
            <main className="flex-grow p-4 pb-24 overflow-y-auto">
                {isLoading ? (
                    <div className="flex justify-center items-center h-full">
                        <div className="text-gray-500">Loading teachers...</div>
                    </div>
                ) : filteredTeachers.length > 0 ? (
                    viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {filteredTeachers.map(teacher => (
                                <TeacherCard key={teacher.id} teacher={teacher} onSelect={handleSelectTeacher} />
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th onClick={() => requestSort('name')} className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Subject</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredTeachers.map(teacher => (
                                        <tr key={teacher.id} onClick={() => handleSelectTeacher(teacher)} className="hover:bg-gray-50 cursor-pointer">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <img className="h-10 w-10 rounded-full object-cover mr-3" src={teacher.avatarUrl} alt="" />
                                                    <div className="text-sm font-medium text-gray-900">{teacher.name}</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{teacher.subjects[0]}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${teacher.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                    {teacher.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <span className="text-indigo-600 hover:text-indigo-900">View</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )
                ) : (
                    <div className="text-center py-10">
                        <p className="text-gray-500">No teachers found.</p>
                    </div>
                )}
            </main>

            <div className="absolute bottom-6 right-6">
                <button onClick={() => navigateTo('addTeacher', 'Add New Teacher')} className="bg-sky-500 text-white p-4 rounded-full shadow-lg hover:bg-sky-600">
                    <PlusIcon className="h-6 w-6" />
                </button>
            </div>
        </div>
    );
};

export default TeacherListScreen;
