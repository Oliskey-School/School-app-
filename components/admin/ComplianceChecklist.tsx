import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { CheckCircleIcon, XCircleIcon, ClockIcon } from 'lucide-react';

const ComplianceChecklist = () => {
    const [checks, setChecks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchChecks();
    }, []);

    const fetchChecks = async () => {
        try {
            const { data, error } = await supabase
                .from('compliance_checks')
                .select('*')
                .order('last_run_at', { ascending: false });

            if (error) throw error;
            setChecks(data || []);
        } catch (error) {
            console.error('Error fetching checks:', error);
        } finally {
            setLoading(false);
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
                    <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">
                        Run All Checks
                    </button>
                </div>

                {loading ? (
                    <div className="py-8 text-center text-gray-500">Running compliance diagnostics...</div>
                ) : (
                    <div className="space-y-4">
                        {checks.length === 0 ? (
                            <p className="text-center text-gray-500 py-8">No compliance checks configured.</p>
                        ) : (
                            checks.map((check) => (
                                <div key={check.id} className="border rounded-lg p-4 flex items-center justify-between">
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
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ComplianceChecklist;
