import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../context/ProfileContext';
import { ChartBarIcon, ClockIcon, UsersIcon } from '../../constants';

interface WorkloadData {
    total_periods: number;
    total_hours: number;
    number_of_classes: number;
    avg_class_size: number;
    workload_score: number;
}

const WorkloadCalculator: React.FC = () => {
    const { profile } = useProfile();
    const [workload, setWorkload] = useState<WorkloadData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchWorkload();
    }, []);

    const fetchWorkload = async () => {
        try {
            setLoading(true);
            const { data: teacherData } = await supabase
                .from('teachers')
                .select('id')
                .eq('email', profile.email)
                .single();

            if (!teacherData) return;

            const { data } = await supabase
                .from('teacher_workload')
                .select('*')
                .eq('teacher_id', teacherData.id)
                .order('week_start_date', { ascending: false })
                .limit(1)
                .single();

            if (data) {
                setWorkload(data);
            }
        } catch (error: any) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const getWorkloadLevel = (score: number) => {
        if (score >= 80) return { label: 'High', color: 'text-red-600 bg-red-100' };
        if (score >= 60) return { label: 'Moderate', color: 'text-yellow-600 bg-yellow-100' };
        return { label: 'Light', color: 'text-green-600 bg-green-100' };
    };

    if (loading) {
        return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
    }

    const level = workload ? getWorkloadLevel(workload.workload_score) : null;

    return (
        <div className="p-6 space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Workload Analysis</h2>
                <p className="text-sm text-gray-600 mt-1">Current teaching workload metrics</p>
            </div>

            {workload ? (
                <>
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-indigo-100 text-sm">Workload Score</p>
                                <h3 className="text-4xl font-bold mt-2">{workload.workload_score}/100</h3>
                                <p className="text-indigo-100 text-sm mt-2">
                                    Status: <span className="font-semibold">{level?.label}</span>
                                </p>
                            </div>
                            <ChartBarIcon className="w-12 h-12 text-indigo-200" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <p className="text-sm text-gray-600">Total Periods</p>
                            <p className="text-2xl font-bold text-gray-900">{workload.total_periods}</p>
                        </div>
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <p className="text-sm text-gray-600">Total Hours</p>
                            <p className="text-2xl font-bold text-gray-900">{workload.total_hours}h</p>
                        </div>
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <p className="text-sm text-gray-600">Classes</p>
                            <p className="text-2xl font-bold text-gray-900">{workload.number_of_classes}</p>
                        </div>
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <p className="text-sm text-gray-600">Avg Class Size</p>
                            <p className="text-2xl font-bold text-gray-900">{workload.avg_class_size}</p>
                        </div>
                    </div>
                </>
            ) : (
                <div className="text-center py-12 text-gray-500">
                    <ChartBarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p>No workload data available</p>
                </div>
            )}
        </div>
    );
};

export default WorkloadCalculator;
