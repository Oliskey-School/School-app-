import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';
import { SearchIcon, UserIcon, CheckCircleIcon, ClockIcon, EyeIcon, EyeOffIcon } from '../../constants';

const KeyIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${className || ''}`.trim()} viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
        <path d="M15.5 7.5l-3.5 3.5" />
        <path d="M13 11l4 4" />
        <path d="M17 17l3 3" />
        <path d="M21 21l-3 -3" />
        <circle cx="8" cy="15" r="2" />
        <path d="M8 13v-2" />
        <path d="M5 21l3 -3" />
    </svg>
);

const CopyIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${className || ''}`.trim()} viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
        <path d="M7 5h14v14h-14v-14z" />
        <path d="M5 7v14h14v-14h-14z" />
    </svg>
);

interface StudentWithCredentials {
    id: string;
    full_name: string;
    email: string;
    school_generated_id: string | null;
    status: string;
    grade: number;
    section: string;
    class_name: string;
    class_id: string;
    credentials: {
        login_id: string | null;
        has_password: boolean;
        password: string | null;
    } | null;
    created_at: string;
}

interface StudentCredentialsScreenProps {
    onBack: () => void;
}

const StudentCredentialsScreen: React.FC<StudentCredentialsScreenProps> = ({ onBack }) => {
    const [students, setStudents] = useState<StudentWithCredentials[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'pending'>('active');

    useEffect(() => {
        loadStudents();
    }, []);

    const loadStudents = async () => {
        setLoading(true);
        try {
            const data = await api.getMyStudentsWithCredentials();
            setStudents(data || []);
        } catch (error: any) {
            toast.error(error.message || 'Failed to load students');
        } finally {
            setLoading(false);
        }
    };

    const toggleShowPassword = (studentId: string) => {
        setShowPassword(prev => ({
            ...prev,
            [studentId]: !prev[studentId]
        }));
    };

    const copyToClipboard = async (text: string, label: string) => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success(`${label} copied!`);
        } catch {
            toast.error('Failed to copy');
        }
    };

    const filteredStudents = students.filter(s => {
        const matchesSearch = 
            s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.school_generated_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.email?.toLowerCase().includes(searchTerm.toLowerCase());
        
        if (filterStatus === 'all') return matchesSearch;
        if (filterStatus === 'active') return matchesSearch && s.status === 'Active';
        if (filterStatus === 'pending') return matchesSearch && s.status === 'Pending';
        return matchesSearch;
    });

    const activeCount = students.filter(s => s.status === 'Active').length;
    const pendingCount = students.filter(s => s.status === 'Pending').length;

    return (
        <div className="flex flex-col h-full bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b p-4 sticky top-0 z-10">
                <div className="flex items-center gap-4 mb-4">
                    <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Student Credentials</h1>
                        <p className="text-sm text-gray-500">View login credentials for your students</p>
                    </div>
                </div>

                {/* Search */}
                <div className="relative mb-4">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name or ID..."
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Filter tabs */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setFilterStatus('active')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            filterStatus === 'active' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        Active ({activeCount})
                    </button>
                    <button
                        onClick={() => setFilterStatus('pending')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            filterStatus === 'pending' 
                                ? 'bg-yellow-100 text-yellow-700' 
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        Pending ({pendingCount})
                    </button>
                    <button
                        onClick={() => setFilterStatus('all')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            filterStatus === 'all' 
                                ? 'bg-indigo-100 text-indigo-700' 
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        All ({students.length})
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-full">
                        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="mt-4 text-gray-500">Loading students...</p>
                    </div>
                ) : filteredStudents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                        <UserIcon className="w-16 h-16 text-gray-300 mb-4" />
                        <p className="text-lg font-medium">No students found</p>
                        <p className="text-sm">Students will appear here once added to your classes</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredStudents.map((student) => (
                            <div
                                key={student.id}
                                className="bg-white rounded-xl shadow-sm border p-4"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                                            <span className="text-indigo-600 font-bold">
                                                {student.full_name.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900">{student.full_name}</p>
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <span className="bg-gray-100 px-2 py-0.5 rounded font-mono">
                                                    {student.school_generated_id || 'N/A'}
                                                </span>
                                                <span>Grade {student.grade}{student.section}</span>
                                                <span>•</span>
                                                <span>{student.class_name}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        student.status === 'Active' 
                                            ? 'bg-green-100 text-green-700' 
                                            : 'bg-yellow-100 text-yellow-700'
                                    }`}>
                                        {student.status === 'Active' ? (
                                            <span className="flex items-center gap-1">
                                                <CheckCircleIcon className="w-3 h-3" />
                                                Active
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1">
                                                <ClockIcon className="w-3 h-3" />
                                                Pending
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {student.status === 'Active' && student.credentials && (
                                    <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <KeyIcon className="w-4 h-4 text-gray-400" />
                                                <span className="text-xs font-medium text-gray-500 uppercase">Login ID</span>
                                            </div>
                                            <button
                                                onClick={() => copyToClipboard(student.credentials?.login_id || '', 'Login ID')}
                                                className="p-1 hover:bg-gray-200 rounded transition-colors"
                                            >
                                                <CopyIcon className="w-3 h-3 text-gray-400" />
                                            </button>
                                        </div>
                                        <p className="font-mono text-sm text-gray-800 pl-6">
                                            {student.credentials?.login_id || student.email}
                                        </p>

                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <KeyIcon className="w-4 h-4 text-gray-400" />
                                                <span className="text-xs font-medium text-gray-500 uppercase">Password</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => toggleShowPassword(student.id)}
                                                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                                                >
                                                    {showPassword[student.id] ? (
                                                        <EyeOffIcon className="w-3 h-3 text-gray-400" />
                                                    ) : (
                                                        <EyeIcon className="w-3 h-3 text-gray-400" />
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => copyToClipboard(student.credentials?.password || '', 'Password')}
                                                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                                                >
                                                    <CopyIcon className="w-3 h-3 text-gray-400" />
                                                </button>
                                            </div>
                                        </div>
                                        <p className="font-mono text-sm text-gray-800 pl-6">
                                            {showPassword[student.id] 
                                                ? student.credentials?.password 
                                                : '••••••••'}
                                        </p>
                                    </div>
                                )}

                                {student.status === 'Pending' && (
                                    <div className="bg-yellow-50 rounded-lg p-3 text-sm text-yellow-700">
                                        This student is awaiting admin approval. Credentials will be available once approved.
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentCredentialsScreen;
