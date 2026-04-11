import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { UserCheck, XCircle, Key, Eye, EyeOff } from 'lucide-react';
import { AdminAuthService } from '../../lib/admin-auth-service';
import { api } from '../../lib/api';

export const StudentApprovalScreen: React.FC = () => {
    const [pendingStudents, setPendingStudents] = useState<any[]>([]);
    const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});

    useEffect(() => {
        loadPending();
    }, []);

    const loadPending = async () => {
        const { data } = await api
            .from('students')
            .select('*, teachers(name)')
            .eq('is_approved', false);
        setPendingStudents(data || []);
    };

    const handleApprove = async (id: string) => {
        await AdminAuthService.approveStudent(id);
        loadPending();
    };

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
                            <p className="font-bold text-lg">{student.name}</p>
                            <p className="text-sm text-gray-500">Proposed by: {student.teachers?.name}</p>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded text-xs font-mono">
                                    ID: {student.school_generated_id}
                                </span>
                                <div className="flex items-center gap-1 text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded">
                                    <Key className="w-3 h-3" />
                                    <span>{showPassword[student.id] ? student.temp_password : '••••••••'}</span>
                                    <button onClick={() => setShowPassword({ ...showPassword, [student.id]: !showPassword[student.id] })}>
                                        {showPassword[student.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button 
                                onClick={() => handleApprove(student.id)}
                                className="bg-emerald-600 text-white p-3 rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-100"
                            >
                                <UserCheck className="w-5 h-5" />
                            </button>
                            <button className="bg-red-50 text-red-600 p-3 rounded-xl hover:bg-red-100">
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

