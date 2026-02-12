import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { 
    CheckCircleIcon, 
    XCircleIcon, 
    ChevronLeftIcon,
    SearchIcon,
    FilterIcon
} from '../../constants';

interface StudentApprovalsScreenProps {
    handleBack: () => void;
    schoolId: string;
}

const StudentApprovalsScreen: React.FC<StudentApprovalsScreenProps> = ({ handleBack, schoolId }) => {
    const [pendingStudents, setPendingStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchPendingStudents = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('students')
                .select('*')
                .eq('school_id', schoolId)
                .eq('status', 'Pending')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPendingStudents(data || []);
        } catch (error: any) {
            toast.error(error.message || "Failed to load pending students");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (schoolId) fetchPendingStudents();
    }, [schoolId]);

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
        
        try {
            const { error } = await supabase
                .from('students')
                .update({ status: 'Active' })
                .in('id', ids);

            if (error) throw error;
            
            toast.success(`Approved ${ids.length} student(s)`);
            setPendingStudents(prev => prev.filter(s => !ids.includes(s.id)));
            setSelectedIds([]);
        } catch (error: any) {
            toast.error(error.message || "Failed to approve students");
        }
    };

    const handleReject = async (ids: string[]) => {
        if (ids.length === 0) return;
        if (!confirm("Are you sure you want to reject these student accounts?")) return;

        try {
            // Option 1: Update status to 'Rejected'
            const { error } = await supabase
                .from('students')
                .update({ status: 'Rejected' })
                .in('id', ids);

            // Option 2: Delete? (Might be cleaner if they were mistakenly added)
            // const { error } = await supabase.from('students').delete().in('id', ids);

            if (error) throw error;
            
            toast.success(`Rejected ${ids.length} student(s)`);
            setPendingStudents(prev => prev.filter(s => !ids.includes(s.id)));
            setSelectedIds([]);
        } catch (error: any) {
            toast.error(error.message || "Failed to reject students");
        }
    };

    const filteredStudents = pendingStudents.filter(s => 
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full bg-gray-50">
            {/* Toolbar */}
            <div className="p-4 bg-white border-b flex items-center justify-between gap-4 sticky top-0 z-10">
                <div className="flex items-center gap-4 flex-1">
                    <button onClick={handleBack} className="p-2 hover:bg-gray-100 rounded-full">
                        <ChevronLeftIcon className="w-6 h-6 text-gray-600" />
                    </button>
                    <div className="relative flex-1 max-w-md">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Search pending students..."
                            className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    {selectedIds.length > 0 && (
                        <div className="flex items-center gap-2 animate-fade-in">
                            <button 
                                onClick={() => handleApprove(selectedIds)}
                                className="px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700 flex items-center gap-2"
                            >
                                <CheckCircleIcon className="w-4 h-4" />
                                Approve ({selectedIds.length})
                            </button>
                            <button 
                                onClick={() => handleReject(selectedIds)}
                                className="px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-lg hover:bg-red-700 flex items-center gap-2"
                            >
                                <XCircleIcon className="w-4 h-4" />
                                Reject
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-4">
                        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        <p>Fetching pending approvals...</p>
                    </div>
                ) : filteredStudents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-4">
                        <div className="p-4 bg-gray-100 rounded-full">
                            <CheckCircleIcon className="w-12 h-12 text-gray-300" />
                        </div>
                        <div className="text-center">
                            <h3 className="font-bold text-gray-700">All caught up!</h3>
                            <p className="text-sm">There are no students awaiting approval.</p>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b">
                                    <th className="p-4 w-10">
                                        <input 
                                            type="checkbox" 
                                            checked={selectedIds.length === filteredStudents.length && filteredStudents.length > 0}
                                            onChange={handleSelectAll}
                                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                                        />
                                    </th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Student</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Class</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Date Added</th>
                                    <th className="p-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredStudents.map((student) => (
                                    <tr key={student.id} className="hover:bg-indigo-50 transition-colors">
                                        <td className="p-4">
                                            <input 
                                                type="checkbox" 
                                                checked={selectedIds.includes(student.id)}
                                                onChange={() => handleToggleSelect(student.id)}
                                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                                            />
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <img 
                                                    src={student.avatar_url || `https://ui-avatars.com/api/?name=${student.name}&background=random`} 
                                                    className="w-10 h-10 rounded-full border border-gray-100"
                                                    alt={student.name}
                                                />
                                                <div>
                                                    <p className="font-bold text-gray-800">{student.name}</p>
                                                    <p className="text-xs text-gray-500">{student.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="px-2 py-1 bg-gray-100 rounded-md text-xs font-medium text-gray-600">
                                                Grade {student.grade}{student.section}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm text-gray-500">
                                            {new Date(student.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button 
                                                    onClick={() => handleApprove([student.id])}
                                                    className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                    title="Approve"
                                                >
                                                    <CheckCircleIcon className="w-5 h-5" />
                                                </button>
                                                <button 
                                                    onClick={() => handleReject([student.id])}
                                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Reject"
                                                >
                                                    <XCircleIcon className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentApprovalsScreen;
