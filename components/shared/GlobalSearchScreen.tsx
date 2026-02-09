import React, { useState, useEffect, useMemo } from 'react';
import { DashboardType } from '../../types';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../context/ProfileContext';
import {
    SearchIcon,
    XCircleIcon,
    UserIcon,
    BriefcaseIcon,
    MegaphoneIcon,
    StaffIcon,
    DocumentTextIcon,
    ExamIcon,
    BookOpenIcon,
    BuildingLibraryIcon
} from '../../constants';

interface SearchResult {
    id: number | string;
    title: string;
    subtitle: string;
    type: 'Student' | 'Teacher' | 'Assignment' | 'Notice' | 'Quiz' | 'Class' | 'Resource';
    data?: any;
    onClick: () => void;
}

interface GlobalSearchScreenProps {
    dashboardType: DashboardType;
    navigateTo: (view: string, title: string, props?: any) => void;
    onClose: () => void;
}

const getIconForType = (type: SearchResult['type']) => {
    switch (type) {
        case 'Student': return <UserIcon className="text-sky-500" />;
        case 'Teacher': return <StaffIcon className="text-purple-500" />;
        case 'Assignment': return <DocumentTextIcon className="text-orange-500" />;
        case 'Notice': return <MegaphoneIcon className="text-green-500" />;
        case 'Quiz': return <ExamIcon className="text-indigo-500" />;
        case 'Class': return <BuildingLibraryIcon className="text-teal-500" />;
        case 'Resource': return <BookOpenIcon className="text-amber-500" />;
        default: return <SearchIcon className="text-gray-400" />;
    }
};

const GlobalSearchScreen: React.FC<GlobalSearchScreenProps> = ({ dashboardType, navigateTo, onClose }) => {
    const { profile } = useProfile();
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        const handler = setTimeout(() => {
            if (searchTerm.trim().length > 1) {
                performSearch(searchTerm.trim());
            } else {
                setResults([]);
            }
        }, 400);

        return () => clearTimeout(handler);
    }, [searchTerm, dashboardType]);

    const performSearch = async (term: string) => {
        const schoolId = profile?.schoolId;
        if (!schoolId) return;

        setIsSearching(true);
        const newResults: SearchResult[] = [];

        try {
            // Parallel fetch from multiple tables
            const [
                { data: students },
                { data: teachers },
                { data: classes },
                { data: assignments },
                { data: quizzes },
                { data: notices },
                { data: parents }
            ] = await Promise.all([
                supabase.from('students').select('*').eq('school_id', schoolId).or(`name.ilike.%${term}%,school_generated_id.ilike.%${term}%`).limit(10),
                supabase.from('teachers').select('*').eq('school_id', schoolId).or(`name.ilike.%${term}%,email.ilike.%${term}%`).limit(5),
                supabase.from('classes').select('*').eq('school_id', schoolId).ilike('name', `%${term}%`).limit(5),
                supabase.from('assignments').select('*').eq('school_id', schoolId).ilike('title', `%${term}%`).limit(5),
                supabase.from('quizzes').select('*').eq('school_id', schoolId).ilike('title', `%${term}%`).limit(5),
                supabase.from('notices').select('*').eq('school_id', schoolId).or(`title.ilike.%${term}%,content.ilike.%${term}%`).limit(5),
                supabase.from('parents').select('*').eq('school_id', schoolId).or(`name.ilike.%${term}%,email.ilike.%${term}%`).limit(5)
            ]);

            // Map Students
            students?.forEach(s => {
                newResults.push({
                    id: s.id,
                    title: s.name,
                    subtitle: s.school_generated_id || `Grade ${s.grade}${s.section || ''}`,
                    type: 'Student',
                    onClick: () => {
                        if (dashboardType === DashboardType.Admin) navigateTo('studentProfileAdminView', s.name, { student: s });
                        else if (dashboardType === DashboardType.Teacher) navigateTo('studentProfile', s.name, { student: s });
                        else if (dashboardType === DashboardType.Parent) navigateTo('childDetail', s.name, { student: s });
                    }
                });
            });

            // Map Teachers
            teachers?.forEach(t => {
                newResults.push({
                    id: t.id,
                    title: t.name,
                    subtitle: t.email,
                    type: 'Teacher',
                    onClick: () => {
                        if (dashboardType === DashboardType.Admin) navigateTo('teacherDetailAdminView', t.name, { teacher: t });
                    }
                });
            });

            // Map Classes
            classes?.forEach(c => {
                newResults.push({
                    id: c.id,
                    title: c.name,
                    subtitle: `Grade ${c.grade}${c.section || ''}`,
                    type: 'Class',
                    onClick: () => {
                        if (dashboardType === DashboardType.Admin) navigateTo('classListScreen', 'Classes', {});
                        else if (dashboardType === DashboardType.Teacher) navigateTo('classDetail', c.name, { classInfo: c });
                    }
                });
            });

            // Map Assignments
            assignments?.forEach(a => {
                newResults.push({
                    id: a.id,
                    title: a.title,
                    subtitle: `Due: ${a.due_date ? new Date(a.due_date).toLocaleDateString() : 'N/A'}`,
                    type: 'Assignment',
                    onClick: () => {
                        if (dashboardType === DashboardType.Teacher) navigateTo('assignmentSubmissions', `Submissions: ${a.title}`, { assignment: a });
                        else if (dashboardType === DashboardType.Student) navigateTo('assignmentDetail', a.title, { assignment: a });
                    }
                });
            });

            // Map Quizzes
            quizzes?.forEach(q => {
                newResults.push({
                    id: q.id,
                    title: q.title,
                    subtitle: `ID: ${q.id.slice(0, 8)}`,
                    type: 'Quiz',
                    onClick: () => {
                        if (dashboardType === DashboardType.Student) navigateTo('takeQuiz', q.title, { quiz: q });
                        else navigateTo('quizList', 'Quizzes', {});
                    }
                });
            });

            // Map Notices
            notices?.forEach(n => {
                newResults.push({
                    id: n.id,
                    title: n.title,
                    subtitle: n.category || 'Announcement',
                    type: 'Notice',
                    onClick: () => navigateTo('noticeboard', 'Noticeboard', {})
                });
            });

            // Map Parents
            parents?.forEach(p => {
                newResults.push({
                    id: p.id,
                    title: p.name,
                    subtitle: p.email || 'No email',
                    type: 'Teacher', // Reusing StaffIcon for now as Parent icon
                    onClick: () => {
                        if (dashboardType === DashboardType.Admin) navigateTo('parentDetailAdminView', p.name, { parentId: p.id });
                    }
                });
            });

        } catch (error) {
            console.error('Global search error:', error);
        } finally {
            setIsSearching(false);
        }

        setResults(newResults);
    };

    const groupedResults = useMemo(() => {
        return results.reduce((acc, result) => {
            (acc[result.type] = acc[result.type] || []).push(result);
            return acc;
        }, {} as Record<SearchResult['type'], SearchResult[]>);
    }, [results]);

    const handleResultClick = (result: SearchResult) => {
        result.onClick();
        onClose();
    };

    return (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col animate-fade-in">
            <div className="p-4 border-b border-gray-200">
                <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                        <SearchIcon className="text-gray-500" />
                    </span>
                    <input
                        type="search"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder={`Search in ${dashboardType} Dashboard...`}
                        autoFocus
                        className={`w-full pl-10 pr-10 py-3 text-lg bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent ${isSearching ? 'opacity-70' : ''}`}
                    />
                    {isSearching && (
                        <div className="absolute right-12 inset-y-0 flex items-center">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-sky-500"></div>
                        </div>
                    )}
                    <button onClick={onClose} className="absolute inset-y-0 right-0 flex items-center pr-3">
                        <XCircleIcon className="text-gray-400 hover:text-gray-600 w-7 h-7" />
                    </button>
                </div>
            </div>
            <div className="flex-grow overflow-y-auto p-4">
                {searchTerm.trim().length > 1 && results.length === 0 && (
                    <div className="text-center py-16">
                        <p className="font-semibold text-gray-700">No results found for "{searchTerm}"</p>
                        <p className="text-sm text-gray-500 mt-1">Try searching for something else.</p>
                    </div>
                )}
                {/* FIX: Explicitly typed the parameters of the `map` callback to resolve a TypeScript type inference issue. */}
                {Object.entries(groupedResults).map(([type, items]: [string, SearchResult[]]) => (
                    <div key={type} className="mb-6">
                        <h3 className="font-bold text-gray-500 uppercase text-sm tracking-wider px-2 mb-2">{type}s</h3>
                        <div className="space-y-2">
                            {items.map(item => (
                                <button key={item.id} onClick={() => handleResultClick(item)} className="w-full text-left flex items-center p-3 bg-white rounded-lg shadow-sm hover:bg-sky-50 transition-colors">
                                    <div className="p-2 bg-gray-100 rounded-lg mr-4">
                                        {getIconForType(item.type as SearchResult['type'])}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-800">{item.title}</p>
                                        <p className="text-sm text-gray-500">{item.subtitle}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default GlobalSearchScreen;