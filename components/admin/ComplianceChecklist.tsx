import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useAutoSync } from '../../hooks/useAutoSync';
import { CheckCircleIcon, XCircleIcon, ClockIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';
import CenteredLoader from '../ui/CenteredLoader';

const ComplianceChecklist = () => {
    const { currentSchool } = useAuth();
    const [checks, setChecks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [running, setRunning] = useState(false);

    useEffect(() => {
        if (currentSchool) {
            fetchChecks();
        }
    }, [currentSchool]);

    useAutoSync(['compliance_checklists'], () => {
        console.log('🔄 [ComplianceChecklist] Real-time auto-sync triggered');
        fetchChecks();
    });

    const fetchChecks = async () => {
        if (!currentSchool) return;
        try {
            const data = await api.getComplianceChecks();
            setChecks(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching checks:', error);
        } finally {
            setLoading(false);
        }
    };

    const runAllChecks = async () => {
        setRunning(true);
        try {
            const data = await api.runComplianceChecks();
            setChecks(Array.isArray(data) ? data : []);
            toast.success('Compliance checks completed');
        } catch (error: any) {
            console.error('Error running checks:', error);
            toast.error('Failed to run checks');
        } finally {
            setRunning(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Compliance Checklist</h2>
                        <p className="text-sm text-gray-500">Automated regulatory system health checks</p>
                    </div>
                    <motion.button
                        whileHover={!running ? { scale: 1.02 } : {}}
                        whileTap={!running ? { scale: 0.98 } : {}}
                        onClick={runAllChecks}
                        disabled={running}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm disabled:opacity-50"
                    >
                        {running ? 'Running...' : 'Run All Checks'}
                    </motion.button>
                </div>

                {loading ? (
                    <CenteredLoader message="Running compliance diagnostics..." className="py-8" />
                ) : (
                    <div className="space-y-4">
                        {checks.length === 0 ? (
                            <p className="text-center text-gray-500 py-8">No compliance checks configured.</p>
                        ) : (
                            checks.map((check, ci) => (
                                <motion.div key={check.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: Math.min(ci, 15) * 0.03 }} className="border rounded-lg p-4 flex items-center justify-between">
                                    <div className="flex items-center space-x-4">
                                        {check.last_result === 'Pass' ? (
                                            <CheckCircleIcon className="text-green-500" size={24} />
                                        ) : check.last_result === 'Fail' ? (
                                            <XCircleIcon className="text-red-500" size={24} />
                                        ) : (
                                            <ClockIcon className="text-gray-400" size={24} />
                                        )}
                                        <div>
                                            <h3 className="font-semibold text-gray-900">{check.check_name}</h3>
                                            <p className="text-sm text-gray-500">{check.description}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`text-sm font-bold ${check.last_result === 'Pass' ? 'text-green-600' :
                                            check.last_result === 'Fail' ? 'text-red-600' : 'text-gray-600'
                                            }`}>{check.last_result || 'Pending'}</div>
                                        <div className="text-xs text-gray-400">Freq: {check.check_frequency}</div>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ComplianceChecklist;

