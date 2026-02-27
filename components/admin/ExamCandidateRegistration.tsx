import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { UserGroupIcon, SearchIcon, DownloadIcon, PlusIcon, XIcon, FolderIcon, DocumentTextIcon } from '../../constants';

interface ExamBody {
    id: string;
    name: string;
    code: string;
    curriculum_type?: string;
}

interface Student {
    id: string;
    name: string;
    grade: number;
    attendance_status: string;
    enrollment_number?: string;
    school_generated_id?: string;
    track_status?: string;
    avatarUrl?: string;
}

interface ExamCandidateRegistrationProps {
    schoolId?: string;
    currentBranchId?: string;
    onSelectionChange?: (count: number) => void;
    externalActions?: {
        registering: boolean;
        setRegistering: (val: boolean) => void;
    };
}

export interface ExamCandidateRegistrationHandle {
    handleExport: () => void;
    handleBulkRegister: () => void;
}

export const ExamCandidateRegistration = React.forwardRef<ExamCandidateRegistrationHandle, ExamCandidateRegistrationProps>(({
    schoolId,
    currentBranchId,
    onSelectionChange,
    externalActions
}, ref) => {
    // ... existing state ...

    // Expose actions to parent
    React.useImperativeHandle(ref, () => ({
        handleExport,
        handleBulkRegister
    }));
    const [examBodies, setExamBodies] = useState<ExamBody[]>([]);
    const [selectedExam, setSelectedExam] = useState<string>('');
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [internalRegistering, setInternalRegistering] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
    const [selectedGrade, setSelectedGrade] = useState<string>('');
    const [registeredIds, setRegisteredIds] = useState<Set<string>>(new Set());

    const registering = externalActions?.registering ?? internalRegistering;
    const setRegistering = externalActions?.setRegistering ?? setInternalRegistering;

    // Setup Modal State
    const [showSetupModal, setShowSetupModal] = useState(false);
    const [newBodyName, setNewBodyName] = useState('');
    const [newBodyCode, setNewBodyCode] = useState('');

    useEffect(() => {
        fetchExamBodies();
    }, []);

    useEffect(() => {
        if (selectedExam) {
            fetchEligibleStudents(selectedExam);
        } else {
            setStudents([]);
        }
    }, [selectedExam]);

    // Update parent about selection changes
    useEffect(() => {
        onSelectionChange?.(selectedStudents.size);
    }, [selectedStudents.size, onSelectionChange]);

    const fetchExamBodies = async () => {
        const { data, error } = await supabase.from('exam_bodies').select('*').order('code');
        if (data) setExamBodies(data);
    };

    const handleCreateExamBody = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newBodyName || !newBodyCode) return toast.error('Please fill all fields');

        try {
            const { data: { user } } = await supabase.auth.getUser();
            const activeSchoolId = schoolId || user?.user_metadata?.school_id || user?.app_metadata?.school_id;

            const { error } = await supabase.from('exam_bodies').insert({
                name: newBodyName,
                code: newBodyCode.toUpperCase(),
                school_id: activeSchoolId
            });
            if (error) throw error;

            toast.success('Exam body added successfully');
            setShowSetupModal(false);
            setNewBodyName('');
            setNewBodyCode('');
            await fetchExamBodies();
        } catch (error: any) {
            toast.error(error.message || 'Failed to add exam body');
        }
    };

    const fetchRegistrations = async (bodyId: string) => {
        let query = supabase.from('exam_registrations').select('student_id').eq('exam_body_id', bodyId);
        if (schoolId) query = query.eq('school_id', schoolId);
        const { data } = await query;
        if (data) setRegisteredIds(new Set(data.map(r => r.student_id)));
        else setRegisteredIds(new Set());
    };

    const fetchEligibleStudents = async (bodyId: string) => {
        setLoading(true);
        const body = examBodies.find(b => b.id === bodyId);
        await fetchRegistrations(bodyId);

        let query = supabase.from('students').select('*').eq('attendance_status', 'Present');
        if (schoolId) query = query.eq('school_id', schoolId);

        const { data, error } = await query.order('name');

        if (data) {
            setStudents(data.filter(s => {
                if (body?.curriculum_type === 'Nigerian') return true;
                if (body?.curriculum_type === 'British') return s.grade >= 9;
                return true;
            }));
        }
        setLoading(false);
    };

    const handleExport = () => {
        const body = examBodies.find(b => b.id === selectedExam);
        const headers = ["Candidate Name", "Student ID", "Grade", "Board", "Curriculum"];
        const rows = filteredStudents.map(s => [
            s.name,
            s.school_generated_id || s.enrollment_number || s.id.slice(0, 8),
            s.grade,
            body?.code || 'Board',
            body?.curriculum_type || 'General'
        ]);

        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.setAttribute("href", URL.createObjectURL(blob));
        link.setAttribute("download", `${body?.code || 'Exam'}_Candidates_2026.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(`Exported ${filteredStudents.length} candidates for ${body?.code}`);
    };

    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        (selectedGrade === '' || s.grade.toString() === selectedGrade)
    );

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedStudents);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedStudents(newSet);
    };

    const toggleSelectAll = () => {
        if (selectedStudents.size === filteredStudents.length) {
            setSelectedStudents(new Set());
        } else {
            setSelectedStudents(new Set(filteredStudents.map(s => s.id)));
        }
    };

    const registerCandidates = async (candidateIds: string[]) => {
        if (candidateIds.length === 0) return;
        setRegistering(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            const activeSchoolId = schoolId || user?.user_metadata?.school_id || user?.app_metadata?.school_id;

            const registrations = candidateIds.map(sId => ({
                student_id: sId,
                exam_body_id: selectedExam,
                school_id: activeSchoolId,
                status: 'registered'
            }));

            const { error: regError } = await supabase.from('exam_registrations').insert(registrations);

            if (regError) throw regError;

            toast.success(`Successfully registered ${candidateIds.length} candidates.`);

            if (selectedExam) await fetchEligibleStudents(selectedExam);
            setSelectedStudents(new Set());

        } catch (err: any) {
            console.error('Registration failed:', err);
            toast.error(`Registration failed: ${err.message || 'Unknown error'}`);
        } finally {
            setRegistering(false);
        }
    };

    const handleBulkRegister = () => {
        if (selectedStudents.size === 0) return;
        registerCandidates(Array.from(selectedStudents));
    };

    function getAvatarFallbackUrl(name: string) {
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
    }

    return (
        <div className="p-4 lg:p-10 space-y-8 font-sans">
            {/* Main content grid - matching screenshot layout */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">

                {/* Examination Body Selection - Left Sidebar Style */}
                <div className="md:col-span-4 bg-[#F9FAFB] p-6 rounded-[24px] border border-gray-100 min-h-[400px]">
                    <div className="flex justify-between items-center mb-6 px-1">
                        <label className="block text-base font-bold text-[#1A1C21]">Examination Body</label>
                        {examBodies.length > 0 && (
                            <button
                                onClick={() => setShowSetupModal(true)}
                                className="text-[#5850EC] hover:text-[#4338CA] text-sm font-bold flex items-center gap-1 group transition-all"
                            >
                                <PlusIcon className="w-4 h-4" />
                                <span className="group-hover:underline">Setup</span>
                            </button>
                        )}
                    </div>

                    {examBodies.length === 0 ? (
                        <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-8 text-center shadow-sm">
                            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FolderIcon className="w-8 h-8 text-[#5850EC] opacity-40" />
                            </div>
                            <h3 className="text-[15px] font-bold text-[#1A1C21] mb-2">No active exam bodies</h3>
                            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                                You need to configure exam bodies before registering students.
                            </p>
                            <button
                                onClick={() => setShowSetupModal(true)}
                                className="inline-flex items-center space-x-2 px-6 py-2.5 bg-[#5850EC] text-white rounded-xl shadow-md shadow-indigo-100 hover:bg-[#4338CA] text-sm font-bold transition-all"
                            >
                                <PlusIcon className="w-4 h-4" />
                                <span>Setup Exam Bodies</span>
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">Select Active Board</p>
                            <select
                                value={selectedExam}
                                onChange={(e) => setSelectedExam(e.target.value)}
                                className="w-full bg-white border border-gray-200 text-[#1A1C21] text-sm font-semibold rounded-2xl focus:ring-4 focus:ring-indigo-50 focus:border-[#5850EC] block p-4 shadow-sm transition-all appearance-none"
                                style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundPosition: "right 1rem center", backgroundRepeat: "no-repeat", backgroundSize: "1.5em 1.5em" }}
                            >
                                <option value="" disabled>Choose an exam board...</option>
                                {examBodies.map(exam => (
                                    <option key={exam.id} value={exam.id}>
                                        {exam.code} - {exam.name}
                                    </option>
                                ))}
                            </select>
                            {selectedExam && (
                                <div className="mt-4 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                                    <p className="text-xs text-indigo-700 font-medium leading-relaxed">
                                        You are currently managing registrations for <span className="font-bold">{examBodies.find(b => b.id === selectedExam)?.code}</span>. All students registered will be linked to this board.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Main Data Table Area - Matches Screenshot's clean list view */}
                <div className="md:col-span-8 min-h-[500px]">
                    {selectedExam ? (
                        <div className="bg-white rounded-[32px] border border-gray-100 overflow-hidden">
                            <div className="p-6 border-b border-gray-50 flex flex-col sm:flex-row justify-between items-center gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                                        <UserGroupIcon className="w-5 h-5 text-[#5850EC]" />
                                    </div>
                                    <div>
                                        <h2 className="font-bold text-[#1A1C21] text-lg">Eligible Candidates</h2>
                                        <p className="text-sm text-gray-500 font-medium">Matching criteria students</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-2xl border border-gray-100 w-full sm:w-auto">
                                    <select
                                        value={selectedGrade}
                                        onChange={(e) => setSelectedGrade(e.target.value)}
                                        className="border-none bg-transparent rounded-xl text-sm font-bold text-gray-600 focus:ring-0 cursor-pointer px-3"
                                    >
                                        <option value="">All Classes</option>
                                        <option value="9">Grade 9</option>
                                        <option value="10">Grade 10</option>
                                        <option value="11">Grade 11</option>
                                        <option value="12">Grade 12</option>
                                    </select>
                                    <div className="w-px h-6 bg-gray-200 mx-1"></div>
                                    <div className="relative flex-grow">
                                        <SearchIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                                        <input
                                            type="text"
                                            placeholder="Quick find..."
                                            className="pl-9 pr-4 py-2 w-full border-none bg-transparent rounded-xl text-sm font-medium focus:ring-0"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            {loading ? (
                                <div className="flex flex-col justify-center items-center h-80">
                                    <div className="relative">
                                        <div className="w-12 h-12 rounded-full border-4 border-indigo-50 border-t-indigo-500 animate-spin"></div>
                                    </div>
                                    <p className="mt-4 text-sm font-bold text-gray-400 uppercase tracking-widest">Gathering Data</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-50 font-sans">
                                        <thead className="bg-[#F9FAFB]">
                                            <tr>
                                                <th className="px-8 py-4 text-left w-12">
                                                    <input
                                                        type="checkbox"
                                                        className="rounded-lg border-gray-300 text-[#5850EC] focus:ring-4 focus:ring-indigo-50 h-5 w-5 transition-all"
                                                        checked={filteredStudents.length > 0 && selectedStudents.size === filteredStudents.length}
                                                        onChange={toggleSelectAll}
                                                    />
                                                </th>
                                                <th className="px-4 py-4 text-left text-xs font-extrabold text-[#9CA3AF] uppercase tracking-widest">Student Details</th>
                                                <th className="px-4 py-4 text-left text-xs font-extrabold text-[#9CA3AF] uppercase tracking-widest">ID Reference</th>
                                                <th className="px-4 py-4 text-left text-xs font-extrabold text-[#9CA3AF] uppercase tracking-widest">Level</th>
                                                <th className="px-8 py-4 text-right text-xs font-extrabold text-[#9CA3AF] uppercase tracking-widest">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-50">
                                            {filteredStudents.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} className="px-8 py-20 text-center">
                                                        <div className="flex flex-col items-center">
                                                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                                                <SearchIcon className="w-10 h-10 text-gray-200" />
                                                            </div>
                                                            <h3 className="text-[17px] font-bold text-gray-900">No students found</h3>
                                                            <p className="text-sm text-gray-400 mt-1">Try adjusting your filters or search keywords.</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : filteredStudents.map(student => (
                                                <tr key={student.id} className="hover:bg-gray-50/50 transition-all group border-l-4 border-transparent hover:border-indigo-500">
                                                    <td className="px-8 py-5 whitespace-nowrap">
                                                        <input
                                                            type="checkbox"
                                                            disabled={registeredIds.has(student.id)}
                                                            className="rounded-lg border-gray-300 text-[#5850EC] focus:ring-4 focus:ring-indigo-50 h-5 w-5 disabled:opacity-30 cursor-pointer transition-all"
                                                            checked={selectedStudents.has(student.id)}
                                                            onChange={() => toggleSelection(student.id)}
                                                        />
                                                    </td>
                                                    <td className="px-4 py-5 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            <div className="relative">
                                                                <img className="h-12 w-12 rounded-2xl border-2 border-white shadow-sm object-cover" src={student.avatarUrl || getAvatarFallbackUrl(student.name)} alt="" />
                                                                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white bg-green-500"></div>
                                                            </div>
                                                            <div className="ml-4">
                                                                <div className="text-[15px] font-bold text-[#1A1C21]">{student.name}</div>
                                                                <div className="text-[13px] font-bold text-[#5850EC] opacity-80">{student.attendance_status}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-5 whitespace-nowrap">
                                                        <div className="text-[13px] text-gray-500 font-extrabold tracking-tight">
                                                            {student.school_generated_id || student.id.slice(0, 8).toUpperCase()}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-5 whitespace-nowrap">
                                                        <div className="text-[12px] font-extrabold text-[#5850EC] bg-indigo-50 inline-flex px-3 py-1 rounded-full uppercase tracking-wider">
                                                            Primary {student.grade}
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-5 whitespace-nowrap text-right">
                                                        {registeredIds.has(student.id) ? (
                                                            <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-[12px] font-bold bg-[#E8FBF4] text-[#10B981] border border-[#D1FAE5]">
                                                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                                </svg>
                                                                REGISTERED
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={() => registerCandidates([student.id])}
                                                                className="text-white hover:text-white text-xs font-bold bg-[#1A1C21] px-5 py-2.5 rounded-xl shadow-lg shadow-gray-100 hover:bg-black transition-all transform hover:-translate-y-0.5"
                                                            >
                                                                Register
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-[#F9FAFB] rounded-[40px] border border-gray-100 p-16 flex flex-col items-center justify-center text-center h-full min-h-[500px]">
                            <div className="w-24 h-24 bg-white rounded-[32px] shadow-xl shadow-indigo-50 border border-gray-50 flex items-center justify-center mb-8 transform transition-transform hover:scale-110">
                                <DocumentTextIcon className="w-10 h-10 text-[#5850EC]" />
                            </div>
                            <h3 className="text-2xl font-extrabold text-[#1A1C21] tracking-tight">Register Candidates</h3>
                            <p className="text-gray-500 max-w-sm mt-3 text-lg leading-relaxed">
                                Select an examination body from the dropdown on the left to begin registration.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Setup Modal - MATCHING SCREENSHOT EXACTLY */}
            {showSetupModal && (
                <div className="fixed inset-0 bg-[#0F172ACC]/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-[480px] overflow-hidden border border-gray-100 transform animate-in slide-in-from-bottom-8 duration-500">
                        {/* Modal Header */}
                        <div className="px-10 pt-10 pb-4 flex justify-between items-center">
                            <h3 className="text-[22px] font-extrabold text-[#1A1C21] tracking-tight">Setup New Exam Body</h3>
                            <button
                                onClick={() => setShowSetupModal(false)}
                                className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all font-light text-2xl"
                            >
                                <XIcon className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleCreateExamBody} className="px-10 pb-10 pt-4 space-y-6">
                            <div className="space-y-2">
                                <label className="block text-[15px] font-bold text-[#1A1C21] tracking-tight">Exam Code</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. WAEC"
                                    value={newBodyCode}
                                    onChange={e => setNewBodyCode(e.target.value)}
                                    className="w-full bg-[#F9FAFB] border border-gray-200 rounded-2xl px-5 py-4 text-base font-medium text-[#1A1C21] placeholder:text-gray-400 focus:ring-4 focus:ring-indigo-50 focus:border-[#5850EC] transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[15px] font-bold text-[#1A1C21] tracking-tight">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. West African Examinations Council"
                                    value={newBodyName}
                                    onChange={e => setNewBodyName(e.target.value)}
                                    className="w-full bg-[#F9FAFB] border border-gray-200 rounded-2xl px-5 py-4 text-base font-medium text-[#1A1C21] placeholder:text-gray-400 focus:ring-4 focus:ring-indigo-50 focus:border-[#5850EC] transition-all"
                                />
                            </div>

                            {/* Modal Footer */}
                            <div className="pt-6 flex items-center justify-center gap-4">
                                <button
                                    type="button"
                                    onClick={() => setShowSetupModal(false)}
                                    className="flex-1 py-4 text-[15px] font-extrabold text-[#4B5563] bg-white border border-gray-200 rounded-2xl hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-95 shadow-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-4 text-[15px] font-extrabold text-white bg-[#5850EC] rounded-2xl shadow-lg shadow-indigo-100 ring-2 ring-indigo-50 hover:bg-[#4338CA] transition-all transform hover:-translate-y-0.5 active:scale-95 active:translate-y-0"
                                >
                                    Save Exam Body
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
});

export default ExamCandidateRegistration;
