import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { UserCheck, XCircle, Key, Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

const StudentApprovalScreen: React.FC = () => {
    const { currentSchool, currentBranchId } = useAuth();
    const [pendingStudents, setPendingStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (currentSchool?.id) loadPending();
    }, [currentSchool?.id]);

    const loadPending = async () => {
        if (!currentSchool?.id) return;
        setLoading(true);
        try {
            const data = await api.getPendingStudentApprovals(currentSchool.id, currentBranchId || undefined);
            setPendingStudents(data || []);
        } catch (err: any) {
            toast.error(err?.message || 'Failed to load pending students');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id: string) => {
        try {
            await api.approveStudent(id, currentBranchId || undefined);
            toast.success('Student approved successfully');
            setPendingStudents(prev => prev.filter(s => s.id !== id));
        } catch (err: any) {
            toast.error(err?.message || 'Failed to approve student');
        }
    };

    const handleReject = async (id: string) => {
        if (!confirm('Reject this student application?')) return;
        try {
            await api.bulkUpdateStudentStatus([id], 'Rejected', currentBranchId || undefined);
            toast.success('Student rejected');
            setPendingStudents(prev => prev.filter(s => s.id !== id));
        } catch (err: any) {
            toast.error(err?.message || 'Failed to reject student');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <h2 className="text-2xl font-bold">Pending Student Approvals</h2>

            <div className="grid gap-4">
                {pendingStudents.map((student) => (
                    <motion.div
                        key={student.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-white p-5 rounded-2xl shadow-sm border flex items-center justify-between"
                    >
                        <div className="space-y-1">
                            <p className="font-bold text-lg">{student.full_name || student.name}</p>
                            <p className="text-sm text-gray-500">{student.email}</p>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded text-xs font-mono">
                                    ID: {student.school_generated_id || 'Pending'}
                                </span>
                                {student.temp_password && (
                                    <div className="flex items-center gap-1 text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded">
                                        <Key className="w-3 h-3" />
                                        <span>{showPassword[student.id] ? student.temp_password : '••••••••'}</span>
                                        <button onClick={() => setShowPassword(prev => ({ ...prev, [student.id]: !prev[student.id] }))}>
                                            {showPassword[student.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => handleApprove(student.id)}
                                className="bg-emerald-600 text-white p-3 rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-100"
                                title="Approve"
                            >
                                <UserCheck className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => handleReject(student.id)}
                                className="bg-red-50 text-red-600 p-3 rounded-xl hover:bg-red-100"
                                title="Reject"
                            >
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>
                    </motion.div>
                ))}

                {pendingStudents.length === 0 && (
                    <div className="text-center py-20 text-gray-400">
                        <p>No students awaiting approval.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentApprovalScreen;
