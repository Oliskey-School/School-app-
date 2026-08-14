import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { Globe, CheckCircle2, Search } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useBranch } from '../../context/BranchContext';
import CenteredLoader from '../ui/CenteredLoader';

// One hub for the three separate places curriculum is set across the app:
// 1. School.curricula_config   — which curricula the school is accredited to offer at all
// 2. Branch.curriculum_type    — a branch's own focus (nigerian/british/american/dual)
// 3. Student.curriculum_type   — the actual track each individual student is enrolled in
// (Teachers' "Mark by Curriculum Track" attendance screen filters students by #3.)

const SCHOOL_CURRICULA = [
    { code: 'NIGERIAN', label: 'Nigerian (NERDC)' },
    { code: 'BRITISH', label: 'British (UK NC)' },
];

const BRANCH_FOCUS_OPTIONS = [
    { value: 'nigerian', label: 'Nigerian (NERDC)' },
    { value: 'british', label: 'British (UK NC)' },
    { value: 'american', label: 'American (Common Core)' },
    { value: 'dual', label: 'Dual Curriculum' },
];

const STUDENT_TRACK_OPTIONS = ['Nigerian', 'British', 'Both'];

interface CurriculumManagementScreenProps {
    navigateTo?: (view: string, title: string, props?: any) => void;
}

const CurriculumManagementScreen: React.FC<CurriculumManagementScreenProps> = () => {
    const { currentSchool, currentBranchId } = useAuth();
    const { branches, refreshBranches } = useBranch();

    const [schoolCurricula, setSchoolCurricula] = useState<string[]>([]);
    const [savingSchool, setSavingSchool] = useState(false);

    const [branchDrafts, setBranchDrafts] = useState<Record<string, string>>({});
    const [savingBranchId, setSavingBranchId] = useState<string | null>(null);

    const [students, setStudents] = useState<any[]>([]);
    const [studentsLoading, setStudentsLoading] = useState(true);
    const [studentSearch, setStudentSearch] = useState('');
    const [savingStudentId, setSavingStudentId] = useState<string | null>(null);

    const [loading, setLoading] = useState(true);

    const fetchSchool = useCallback(async () => {
        if (!currentSchool?.id) return;
        try {
            const data = await api.getSchoolById?.(currentSchool.id) ?? currentSchool;
            setSchoolCurricula((data as any)?.curricula_config || ['NIGERIAN']);
        } catch {
            setSchoolCurricula((currentSchool as any)?.curricula_config || ['NIGERIAN']);
        }
    }, [currentSchool]);

    const fetchStudents = useCallback(async () => {
        if (!currentSchool?.id) return;
        setStudentsLoading(true);
        try {
            const data = await api.getStudents(
                currentSchool.id,
                currentBranchId && currentBranchId !== 'all' ? currentBranchId : undefined
            );
            setStudents(data || []);
        } catch (err) {
            console.error('Error loading students for curriculum management:', err);
            toast.error('Failed to load students.');
        } finally {
            setStudentsLoading(false);
        }
    }, [currentSchool?.id, currentBranchId]);

    useEffect(() => {
        setBranchDrafts(
            branches.reduce((acc, b: any) => ({ ...acc, [b.id]: b.curriculum_type || 'nigerian' }), {})
        );
    }, [branches]);

    useEffect(() => {
        (async () => {
            setLoading(true);
            await Promise.all([fetchSchool(), fetchStudents()]);
            setLoading(false);
        })();
    }, [fetchSchool, fetchStudents]);

    const toggleSchoolCurriculum = (code: string) => {
        setSchoolCurricula(prev =>
            prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
        );
    };

    const saveSchoolCurricula = async () => {
        if (!currentSchool?.id) return;
        setSavingSchool(true);
        try {
            await api.updateSchoolInfo(currentSchool.id, { curricula_config: schoolCurricula });
            toast.success('School curricula updated.');
        } catch (err) {
            console.error('Error saving school curricula:', err);
            toast.error('Failed to save school curricula.');
        } finally {
            setSavingSchool(false);
        }
    };

    const saveBranchFocus = async (branchId: string) => {
        setSavingBranchId(branchId);
        try {
            await api.updateBranch(branchId, { curriculum_type: branchDrafts[branchId] });
            toast.success('Branch curriculum focus updated.');
            await refreshBranches();
        } catch (err) {
            console.error('Error saving branch curriculum:', err);
            toast.error('Failed to save branch curriculum.');
        } finally {
            setSavingBranchId(null);
        }
    };

    const changeStudentTrack = async (studentId: string, track: string) => {
        setSavingStudentId(studentId);
        const prev = students;
        setStudents(cur => cur.map(s => s.id === studentId ? { ...s, curriculum_type: track } : s));
        try {
            await api.updateStudent(studentId, { curriculum_type: track });
            toast.success('Student curriculum updated.');
        } catch (err) {
            console.error('Error updating student curriculum:', err);
            toast.error('Failed to update student curriculum.');
            setStudents(prev);
        } finally {
            setSavingStudentId(null);
        }
    };

    const filteredStudents = students.filter(s =>
        (s.full_name || s.name || '').toLowerCase().includes(studentSearch.toLowerCase()) ||
        (s.admission_number || '').toLowerCase().includes(studentSearch.toLowerCase())
    );

    if (loading) return <CenteredLoader message="Loading curriculum settings..." className="py-12" />;

    return (
        <div className="p-4 space-y-6 bg-gray-100 min-h-full">
            {/* 1. School-wide curricula */}
            <div className="bg-white rounded-xl shadow-sm p-5">
                <div className="flex items-center gap-2 mb-1">
                    <Globe className="w-5 h-5 text-indigo-600" />
                    <h2 className="font-bold text-lg text-gray-800">School Curricula</h2>
                </div>
                <p className="text-sm text-gray-500 mb-4">Which curricula this school is accredited to offer overall.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {SCHOOL_CURRICULA.map(c => (
                        <button
                            key={c.code}
                            onClick={() => toggleSchoolCurriculum(c.code)}
                            className={`flex items-center justify-between p-4 rounded-xl border-2 text-left transition-colors ${schoolCurricula.includes(c.code) ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}
                        >
                            <span className="font-semibold text-gray-800">{c.label}</span>
                            {schoolCurricula.includes(c.code) && <CheckCircle2 className="w-5 h-5 text-indigo-600" />}
                        </button>
                    ))}
                </div>
                <div className="mt-4 flex justify-end">
                    <motion.button
                        whileTap={{ scale: 0.97 }}
                        disabled={savingSchool}
                        onClick={saveSchoolCurricula}
                        className="px-5 py-2 rounded-lg bg-indigo-600 text-white font-semibold text-sm disabled:opacity-50"
                    >
                        {savingSchool ? 'Saving...' : 'Save School Curricula'}
                    </motion.button>
                </div>
            </div>

            {/* 2. Per-branch curriculum focus */}
            <div className="bg-white rounded-xl shadow-sm p-5">
                <h2 className="font-bold text-lg text-gray-800 mb-1">Branch Curriculum Focus</h2>
                <p className="text-sm text-gray-500 mb-4">
                    Set each branch to a single curriculum, or "Dual Curriculum" to let teachers mark
                    attendance separately per curriculum track for that branch.
                </p>
                <div className="space-y-3">
                    {branches.map((b: any) => (
                        <div key={b.id} className="flex items-center justify-between gap-3 p-3 border border-gray-200 rounded-lg">
                            <div className="min-w-0">
                                <p className="font-semibold text-gray-800 truncate">{b.name}</p>
                                <p className="text-xs text-gray-500">{b.code}</p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <select
                                    value={branchDrafts[b.id] || 'nigerian'}
                                    onChange={(e) => setBranchDrafts(prev => ({ ...prev, [b.id]: e.target.value }))}
                                    className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white"
                                >
                                    {BRANCH_FOCUS_OPTIONS.map(o => (
                                        <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                </select>
                                <button
                                    disabled={savingBranchId === b.id || branchDrafts[b.id] === (b.curriculum_type || 'nigerian')}
                                    onClick={() => saveBranchFocus(b.id)}
                                    className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold disabled:opacity-40"
                                >
                                    {savingBranchId === b.id ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                        </div>
                    ))}
                    {branches.length === 0 && (
                        <p className="text-sm text-gray-500 text-center py-4">No branches found.</p>
                    )}
                </div>
            </div>

            {/* 3. Per-student curriculum track */}
            <div className="bg-white rounded-xl shadow-sm p-5">
                <h2 className="font-bold text-lg text-gray-800 mb-1">Student Curriculum Tracks</h2>
                <p className="text-sm text-gray-500 mb-4">
                    Which curriculum each student is enrolled in — this is what teachers and parents see.
                </p>
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        placeholder="Search students by name or admission number..."
                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                </div>
                {studentsLoading ? (
                    <CenteredLoader message="Loading students..." className="py-8" />
                ) : (
                    <div className="max-h-[420px] overflow-y-auto divide-y divide-gray-100">
                        {filteredStudents.map(s => (
                            <div key={s.id} className="flex items-center justify-between gap-3 py-3">
                                <div className="min-w-0">
                                    <p className="font-medium text-gray-800 truncate">{s.full_name || s.name}</p>
                                    <p className="text-xs text-gray-500">
                                        {s.grade ? `Grade ${s.grade}${s.section ? ` ${s.section}` : ''}` : s.admission_number}
                                    </p>
                                </div>
                                <select
                                    value={s.curriculum_type || 'Nigerian'}
                                    disabled={savingStudentId === s.id}
                                    onChange={(e) => changeStudentTrack(s.id, e.target.value)}
                                    className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white flex-shrink-0 disabled:opacity-50"
                                >
                                    {STUDENT_TRACK_OPTIONS.map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>
                        ))}
                        {filteredStudents.length === 0 && (
                            <p className="text-sm text-gray-500 text-center py-8">No students found.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CurriculumManagementScreen;
