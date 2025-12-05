import React, { useState, useEffect, useMemo } from 'react';
import { DashboardType } from '../../types';
import { mockStudents, mockTeachers, mockAssignments, mockNotices } from '../../data';
import { SearchIcon, XCircleIcon, UserIcon, BriefcaseIcon, MegaphoneIcon } from '../../constants';

interface SearchResult {
    id: number | string;
    title: string;
    subtitle: string;
    type: 'Student' | 'Teacher' | 'Assignment' | 'Notice';
    onClick: () => void;
}

interface GlobalSearchScreenProps {
    dashboardType: DashboardType;
    navigateTo: (view: string, title:string, props?: any) => void;
    onClose: () => void;
}

const getIconForType = (type: SearchResult['type']) => {
    switch (type) {
        case 'Student': return <UserIcon className="text-sky-500" />;
        case 'Teacher': return <BriefcaseIcon className="text-purple-500" />;
        case 'Assignment': return <BriefcaseIcon className="text-orange-500" />;
        case 'Notice': return <MegaphoneIcon className="text-green-500" />;
        default: return null;
    }
};

const GlobalSearchScreen: React.FC<GlobalSearchScreenProps> = ({ dashboardType, navigateTo, onClose }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);

    useEffect(() => {
        // Debounce search
        const handler = setTimeout(() => {
            if (searchTerm.trim().length > 1) {
                performSearch(searchTerm.trim().toLowerCase());
            } else {
                setResults([]);
            }
        }, 300);

        return () => {
            clearTimeout(handler);
        };
    }, [searchTerm, dashboardType]);

    const performSearch = (term: string) => {
        const newResults: SearchResult[] = [];

        // Admin can search almost everything
        if (dashboardType === DashboardType.Admin) {
            mockStudents.filter(s => s.name.toLowerCase().includes(term)).forEach(s => {
                newResults.push({
                    id: s.id,
                    title: s.name,
                    subtitle: `Grade ${s.grade}${s.section}`,
                    type: 'Student',
                    onClick: () => navigateTo('studentProfileAdminView', s.name, { student: s })
                });
            });
            mockTeachers.filter(t => t.name.toLowerCase().includes(term)).forEach(t => {
                newResults.push({
                    id: t.id,
                    title: t.name,
                    subtitle: t.subjects.join(', '),
                    type: 'Teacher',
                    onClick: () => navigateTo('teacherDetailAdminView', t.name, { teacher: t })
                });
            });
        }

        // Teacher search
        if (dashboardType === DashboardType.Teacher) {
            const teacher = mockTeachers.find(t => t.id === 2); // Logged in teacher
            const teacherClassNames = teacher?.classes.map(c => c) || [];
             mockStudents.filter(s => s.name.toLowerCase().includes(term) && teacherClassNames.some(cn => `${s.grade}${s.section}` === cn)).forEach(s => {
                newResults.push({
                    id: s.id,
                    title: s.name,
                    subtitle: `Grade ${s.grade}${s.section}`,
                    type: 'Student',
                    onClick: () => navigateTo('studentProfile', s.name, { student: s })
                });
            });
            mockAssignments.filter(a => a.title.toLowerCase().includes(term) && teacherClassNames.some(cn => a.className.includes(cn))).forEach(a => {
                newResults.push({
                    id: a.id,
                    title: a.title,
                    subtitle: `Due: ${new Date(a.dueDate).toLocaleDateString()}`,
                    type: 'Assignment',
                    onClick: () => navigateTo('assignmentSubmissions', `Submissions: ${a.title}`, { assignment: a })
                });
            });
        }

        // Parent search (children and announcements)
        if (dashboardType === DashboardType.Parent) {
            const parentChildrenIds = [3, 4];
            mockStudents.filter(s => s.name.toLowerCase().includes(term) && parentChildrenIds.includes(s.id)).forEach(s => {
                newResults.push({
                    id: s.id,
                    title: s.name,
                    subtitle: `Your child`,
                    type: 'Student',
                    onClick: () => navigateTo('childDetail', s.name, { student: s })
                });
            });
        }

        // Student search
        if (dashboardType === DashboardType.Student) {
            mockAssignments.filter(a => a.title.toLowerCase().includes(term)).forEach(a => {
                newResults.push({
                    id: a.id,
                    title: a.title,
                    subtitle: `Subject: ${a.subject}`,
                    type: 'Assignment',
                    onClick: () => navigateTo('assignments', 'Assignments', {}) // Navigate to list view
                });
            });
        }

        // Announcements for all relevant users
        const relevantAudiences = ['all', dashboardType.toLowerCase() + 's'];
        mockNotices.filter(n => (n.title.toLowerCase().includes(term) || n.content.toLowerCase().includes(term)) && n.audience.some(aud => relevantAudiences.includes(aud))).forEach(n => {
            newResults.push({
                id: n.id,
                title: n.title,
                subtitle: `Category: ${n.category}`,
                type: 'Notice',
                onClick: () => navigateTo('noticeboard', 'Noticeboard', {})
            });
        });
        
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
                        className="w-full pl-10 pr-10 py-3 text-lg bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    />
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