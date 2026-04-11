import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';
import { 
    CheckCircleIcon, 
    XCircleIcon, 
    ChevronLeftIcon,
    SearchIcon,
    LockIcon,
    EyeIcon,
    EyeOffIcon,
    RefreshCwIcon
} from '../../constants';
import { useAutoSync } from '../../hooks/useAutoSync';

const XIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${className || ''}`.trim()} viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
        <path d="M18 6l-12 12" />
        <path d="M6 6l12 12" />
    </svg>
);

const CopyIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${className || ''}`.trim()} viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
        <path d="M7 5h14v14h-14v-14z" />
        <path d="M5 7v14h14v-14h-14z" />
    </svg>
);

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

interface ApprovedStudentCredentials {
    studentId: string;
    fullName: string;
    schoolGeneratedId: string;
    password: string;
}

interface StudentApprovalsScreenProps {
    handleBack: () => void;
    schoolId: string;
    currentBranchId?: string | null;
}

const StudentApprovalsScreen: React.FC<StudentApprovalsScreenProps> = ({ handleBack, schoolId, currentBranchId }) => {
    const [pendingStudents, setPendingStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
    const [showCredentialsModal, setShowCredentialsModal] = useState(false);
    const [approvedCredentials, setApprovedCredentials] = useState<ApprovedStudentCredentials[]>([]);
    const [processingIds, setProcessingIds] = useState<string[]>([]);

    const fetchPendingStudents = async () => {
        setLoading(true);
        try {
            // Optimization: Use specialized endpoint for pending approvals
            const data = await api.getPendingStudentApprovals(schoolId, currentBranchId || undefined);
            setPendingStudents(data || []);
        } catch (error: any) {
            toast.error(error.message || "Failed to load pending students");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (schoolId) fetchPendingStudents();
    }, [schoolId, currentBranchId]);

    useAutoSync(['students'], () => {
        console.log('🔄 [StudentApprovals] Real-time auto-sync triggered');
        fetchPendingStudents();
    });

    const handleToggleSelect = (id: string) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleSelectAll = () => {
        if (selectedIds.length === filteredStudents.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredStudents.map(s => s.id));
        }
    };

    const handleApprove = async (ids: string[]) => {
        if (ids.length === 0) return;
        
        setProcessingIds(ids);
        const credentials: ApprovedStudentCredentials[] = [];
        
        try {
            // individual approvals are preferred here because each generates a unique password/ID response
            for (const id of ids) {
                try {
                    // Send optional branchId if needed by backend for credential generation scoping
                    const result = await api.approveStudent(id, currentBranchId || undefined);
                    if (result) {
                        const student = pendingStudents.find(s => s.id === id);
                        credentials.push({
                            studentId: id,
                            fullName: student?.full_name || student?.name || 'Student',
                            schoolGeneratedId: result.schoolGeneratedId || result.school_generated_id || 'N/A',
                            password: result.password || 'N/A'
                        });
                    }
                } catch (e) {
                    console.error(`Failed to approve student ${id}:`, e);
                }
            }
            
            if (credentials.length > 0) {
                toast.success(`Approved ${credentials.length} student(s)!`);
                setApprovedCredentials(credentials);
                setShowCredentialsModal(true);
                setPendingStudents(prev => prev.filter(s => !ids.includes(s.id)));
                setSelectedIds([]);
            } else if (ids.length > 0) {
                toast.error("Failed to approve selected students.");
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to approve students");
        } finally {
            setProcessingIds([]);
        }
    };

    const handleReject = async (ids: string[]) => {
        if (ids.length === 0) return;
        if (!confirm(`Are you sure you want to reject ${ids.length} student account(s)?`)) return;

        try {
            setProcessingIds(ids);
            // Use bulk update for rejections as it doesn't return credentials
            await api.bulkUpdateStudentStatus(ids, 'Rejected', currentBranchId || undefined);
            
            toast.success(`Rejected ${ids.length} student(s)`);
            setPendingStudents(prev => prev.filter(s => !ids.includes(s.id)));
            setSelectedIds([]);
        } catch (error: any) {
            toast.error(error.message || "Failed to reject students");
        } finally {
            setProcessingIds([]);
        }
    };

    const toggleShowPassword = (studentId: string) => {
        setShowPassword(prev => ({
            ...prev,
            [studentId]: !prev[studentId]
        }));
    };

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success('Copied!');
        } catch {
            toast.error('Failed to copy');
        }
    };

    const filteredStudents = pendingStudents.filter(s => {
        const name = (s.full_name || s.name || '').toLowerCase();
        const email = (s.email || '').toLowerCase();
        const query = searchTerm.toLowerCase();
        return name.includes(query) || email.includes(query);
    });

    return (
        <div className="flex flex-col h-full bg-gray-50">
            {/* Toolbar */}
            <div className="p-4 bg-white border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                    <button onClick={handleBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <ChevronLeftIcon className="w-6 h-6 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-gray-900 leading-none">Student Approvals</h1>
                        <p className="text-[10px] sm:text-xs text-gray-500 mt-1">{pendingStudents.length} awaiting review</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto flex-1 max-w-2xl">
                    <div className="relative flex-1">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Search by name or email..."
                            className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    {selectedIds.length > 0 && (
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-300">
                            <button 
                                onClick={() => handleApprove(selectedIds)}
                                disabled={processingIds.length > 0}
                                className="px-3 py-2 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:opacity-50 shadow-md shadow-green-200"
                            >
                                {processingIds.length > 0 ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <CheckCircleIcon className="w-4 h-4" />
                                )}
                                <span className="hidden sm:inline">Approve</span> ({selectedIds.length})
                            </button>
                            <button 
                                onClick={() => handleReject(selectedIds)}
                                disabled={processingIds.length > 0}
                                className="px-3 py-2 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 flex items-center gap-2 shadow-md shadow-red-200"
                            >
                                <XCircleIcon className="w-4 h-4" />
                                <span className="hidden sm:inline">Reject</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-4">
                        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-sm font-medium">Fetching secure data...</p>
                    </div>
                ) : filteredStudents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-4 py-20">
                        <div className="p-6 bg-green-50 rounded-full">
                            <CheckCircleIcon className="w-16 h-16 text-green-300" />
                        </div>
                        <div className="text-center">
                            <h3 className="font-bold text-gray-800 text-lg">Queue Clear!</h3>
                            <p className="text-sm max-w-xs text-gray-400">All student pending approvals have been processed for this branch.</p>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/50 border-b border-gray-100">
                                        <th className="p-4 w-12 text-center">
                                            <input 
                                                type="checkbox" 
                                                checked={selectedIds.length === filteredStudents.length && filteredStudents.length > 0}
                                                onChange={handleSelectAll}
                                                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                            />
                                        </th>
                                        <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Student Information</th>
                                        <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest hidden md:table-cell">Academic Context</th>
                                        <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest hidden sm:table-cell">Submission Date</th>
                                        <th className="p-4 text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest">Decision</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredStudents.map((student) => (
                                        <tr key={student.id} className={`group hover:bg-indigo-50/30 transition-all ${selectedIds.includes(student.id) ? 'bg-indigo-50/50' : ''}`}>
                                            <td className="p-4 text-center">
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedIds.includes(student.id)}
                                                    onChange={() => handleToggleSelect(student.id)}
                                                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                    disabled={processingIds.includes(student.id)}
                                                />
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="relative">
                                                        <img 
                                                            src={student.avatar_url || student.avatarUrl || `https://ui-avatars.com/api/?name=${student.full_name || student.name}&background=6366f1&color=fff`} 
                                                            className="w-12 h-12 rounded-xl border-2 border-white shadow-sm object-cover"
                                                            alt={student.full_name || student.name}
                                                        />
                                                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-yellow-400 border-2 border-white rounded-full"></div>
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-800 decoration-indigo-500/30 group-hover:underline underline-offset-2">{student.full_name || student.name}</p>
                                                        <p className="text-xs text-gray-400 font-medium truncate max-w-[150px] sm:max-w-xs">{student.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 hidden md:table-cell">
                                                <div className="flex flex-col items-start gap-1">
                                                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md text-[10px] font-bold">
                                                        GRADE {student.grade}{student.section}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400 font-medium">{student.branch_name || 'Main Campus'}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 hidden sm:table-cell">
                                                <p className="text-[11px] font-bold text-gray-600">{new Date(student.created_at || student.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                                <p className="text-[10px] text-gray-400">{new Date(student.created_at || student.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex items-center justify-end gap-1 sm:gap-2">
                                                    <button 
                                                        onClick={() => handleApprove([student.id])}
                                                        disabled={processingIds.includes(student.id)}
                                                        className="p-2 text-green-600 hover:bg-green-100/50 rounded-xl transition-all disabled:opacity-50"
                                                        title="Quick Approve"
                                                    >
                                                        {processingIds.includes(student.id) ? (
                                                            <div className="w-5 h-5 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                                                        ) : (
                                                            <CheckCircleIcon className="w-6 h-6" />
                                                        )}
                                                    </button>
                                                    <button 
                                                        onClick={() => handleReject([student.id])}
                                                        disabled={processingIds.includes(student.id)}
                                                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-100/50 rounded-xl transition-all"
                                                        title="Quick Reject"
                                                    >
                                                        <XCircleIcon className="w-6 h-6" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Credentials Modal */}
            {showCredentialsModal && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl max-w-md w-full max-h-[90vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="p-6 border-b flex items-center justify-between bg-indigo-50/30">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center shadow-inner">
                                    <CheckCircleIcon className="w-7 h-7 text-green-600" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-gray-900 leading-tight">
                                        {approvedCredentials.length === 1 ? 'Registration Complete' : 'Bulk Approval Success'}
                                    </h2>
                                    <p className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest">{approvedCredentials.length} credentials generated</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setShowCredentialsModal(false)}
                                className="p-2 hover:bg-white rounded-full transition-colors shadow-sm"
                            >
                                <XIcon className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto max-h-[50vh] space-y-4">
                            {approvedCredentials.map((cred) => (
                                <div key={cred.studentId} className="bg-gray-50 border border-gray-100 rounded-2xl p-5 relative group overflow-hidden">
                                     <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 -mr-12 -mt-12 rounded-full"></div>
                                    <h3 className="font-black text-gray-800 mb-4 flex items-center gap-2">
                                        <div className="w-1.5 h-4 bg-indigo-500 rounded-full"></div>
                                        {cred.fullName}
                                    </h3>
                                    
                                    <div className="space-y-4 relative">
                                        <div>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <div className="flex items-center gap-2">
                                                    <KeyIcon className="w-3.5 h-3.5 text-gray-400" />
                                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Login Identity</span>
                                                </div>
                                                <button
                                                    onClick={() => copyToClipboard(cred.schoolGeneratedId)}
                                                    className="p-1 hover:bg-white hover:shadow-sm rounded transition-all text-indigo-500"
                                                >
                                                    <CopyIcon className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                            <div className="bg-white p-2.5 rounded-xl border border-gray-100">
                                                <p className="font-mono text-sm font-black text-gray-700">{cred.schoolGeneratedId}</p>
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <div className="flex items-center gap-2">
                                                    <LockIcon className="w-3.5 h-3.5 text-gray-400" />
                                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Initial Password</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => toggleShowPassword(cred.studentId)}
                                                        className="p-1 hover:bg-white hover:shadow-sm rounded transition-all text-gray-400 hover:text-indigo-500"
                                                    >
                                                        {showPassword[cred.studentId] ? (
                                                            <EyeOffIcon className="w-3.5 h-3.5" />
                                                        ) : (
                                                            <EyeIcon className="w-3.5 h-3.5" />
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={() => copyToClipboard(cred.password)}
                                                        className="p-1 hover:bg-white hover:shadow-sm rounded transition-all text-indigo-500"
                                                    >
                                                        <CopyIcon className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="bg-white p-2.5 rounded-xl border border-gray-100 flex items-center justify-between group/pass">
                                                <p className="font-mono text-sm font-black text-gray-700">
                                                    {showPassword[cred.studentId] ? cred.password : '••••••••••••'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        <div className="p-6 bg-gray-50 border-t border-gray-100">
                            <div className="bg-indigo-600/5 rounded-xl p-3 mb-6 flex gap-3">
                                <div className="text-xl">💡</div>
                                <p className="text-[10px] text-indigo-700 font-bold leading-relaxed">
                                    Secure Transfer: Please provide these credentials to students privately. They are required to authenticate and reset their secure access key.
                                </p>
                            </div>
                            <button
                                onClick={() => setShowCredentialsModal(false)}
                                className="w-full py-4 bg-gray-900 text-white font-black text-sm rounded-2xl hover:bg-black transition-all shadow-lg active:scale-[0.98] duration-200"
                            >
                                Confirm Access Issued
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentApprovalsScreen;
