import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useBranch } from '../../context/BranchContext';
import { toast } from 'react-hot-toast';
import { SearchIcon, GraduationCap, User } from 'lucide-react';

interface PastStudent {
    id: string;
    full_name: string;
    admission_number: string | null;
    school_generated_id: string | null;
    exit_year: number | null;
    exit_class: string | null;
    exit_date: string | null;
    status: string;
    withdrawal_reason: string | null;
    avatar_url: string | null;
    branch?: { name: string } | null;
}

const STATUS_STYLES: Record<string, string> = {
    Graduated: 'bg-green-50 text-green-700',
    Transferred: 'bg-blue-50 text-blue-700',
    Withdrawn: 'bg-gray-100 text-gray-600',
};

interface PastStudentsScreenProps {
    navigateTo: (view: string, title: string, props?: any) => void;
}

const PastStudentsScreen: React.FC<PastStudentsScreenProps> = ({ navigateTo }) => {
    const { currentSchool } = useAuth();
    const { currentBranch } = useBranch();
    const [students, setStudents] = useState<PastStudent[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [year, setYear] = useState('');
    const [status, setStatus] = useState('');

    const fetchStudents = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (year) params.set('year', year);
            if (status) params.set('status', status);
            if (search) params.set('search', search);
            const data = await api.get<PastStudent[]>(`/alumni?${params.toString()}`);
            setStudents(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching past students:', err);
            toast.error('Failed to load past students');
        } finally {
            setLoading(false);
        }
    }, [year, status, search]);

    useEffect(() => {
        if (currentSchool) fetchStudents();
    }, [currentSchool, currentBranch?.id, fetchStudents]);

    const years = Array.from(new Set(students.map(s => s.exit_year).filter(Boolean))).sort((a, b) => (b as number) - (a as number));

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 font-outfit">Past Students</h1>
                <p className="text-gray-500">Graduated, transferred, and withdrawn students — records are permanent.</p>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
                <div className="relative flex-grow">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input type="text" placeholder="Search by name or admission number..."
                        value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <select value={status} onChange={e => setStatus(e.target.value)}
                    className="border border-gray-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none font-semibold text-gray-600">
                    <option value="">All Statuses</option>
                    <option value="Graduated">Graduated</option>
                    <option value="Transferred">Transferred</option>
                    <option value="Withdrawn">Withdrawn</option>
                </select>
                {years.length > 0 && (
                    <select value={year} onChange={e => setYear(e.target.value)}
                        className="border border-gray-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none font-semibold text-gray-600">
                        <option value="">All Years</option>
                        {years.map(y => <option key={y} value={String(y)}>{y}</option>)}
                    </select>
                )}
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-500">Loading past students...</div>
            ) : students.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                    <GraduationCap className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="font-bold text-lg text-gray-900">No past students yet</h3>
                    <p className="text-gray-500 mt-1">Students who graduate, transfer, or withdraw will appear here.</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-gray-400 uppercase text-xs tracking-wider border-b border-gray-100">
                                    <th className="px-5 py-3 font-semibold">Student</th>
                                    <th className="px-5 py-3 font-semibold">Admission No.</th>
                                    <th className="px-5 py-3 font-semibold">Class Graduated From</th>
                                    <th className="px-5 py-3 font-semibold">Year</th>
                                    <th className="px-5 py-3 font-semibold">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {students.map(s => (
                                    <tr key={s.id}
                                        onClick={() => navigateTo('alumniHistory', `${s.full_name}'s Record`, { studentId: s.id })}
                                        className="border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer">
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-3">
                                                {s.avatar_url
                                                    ? <img src={s.avatar_url} alt={s.full_name} className="w-8 h-8 rounded-full object-cover" />
                                                    : <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center"><User className="w-4 h-4 text-indigo-600" /></div>}
                                                <div>
                                                    <p className="font-semibold text-gray-900">{s.full_name}</p>
                                                    {s.school_generated_id && <p className="text-xs text-gray-400 font-mono">{s.school_generated_id}</p>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3 text-gray-600">{s.admission_number || '—'}</td>
                                        <td className="px-5 py-3 text-gray-600">{s.exit_class || '—'}</td>
                                        <td className="px-5 py-3 text-gray-600">{s.exit_year || '—'}</td>
                                        <td className="px-5 py-3">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_STYLES[s.status] || 'bg-gray-100 text-gray-600'}`}>
                                                {s.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PastStudentsScreen;
