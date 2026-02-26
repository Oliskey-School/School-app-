import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { CalendarIcon, ClipboardListIcon, CheckCircleIcon, XCircleIcon } from '../../constants';

interface PermissionSlipScreenProps {
    students?: any[];
}

const PermissionSlipScreen: React.FC<PermissionSlipScreenProps> = ({ students = [] }) => {
    const [slips, setSlips] = useState<any[]>([]);
    const [currentSlipIndex, setCurrentSlipIndex] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSlips();
    }, [students]);

    const fetchSlips = async () => {
        if (!students || students.length === 0) {
            setSlips([]);
            setLoading(false);
            return;
        }

        try {
            const relevantGrades = students.map(s => s.grade);

            const { data, error } = await supabase
                .from('permission_slips')
                .select('*')
                .order('id', { ascending: false });

            if (error) throw error;

            const filteredSlips = data?.filter(slip =>
                !slip.target_grades || slip.target_grades.length === 0 ||
                slip.target_grades.some((g: string) => relevantGrades.includes(g))
            ) || [];

            setSlips(filteredSlips || []);
        } catch (err) {
            console.error('Error fetching slips:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleResponse = async (status: 'Approved' | 'Rejected') => {
        if (!currentSlip) return;

        try {
            const { error } = await supabase
                .from('permission_slips')
                .update({ status })
                .eq('id', currentSlip.id);

            if (error) throw error;

            // Optimistic update
            const updatedSlips = [...slips];
            updatedSlips[currentSlipIndex] = { ...currentSlip, status };
            setSlips(updatedSlips);

        } catch (err) {
            console.error('Error updating slip:', err);
            toast.error('Failed to update status');
        }
    };

    const currentSlip = slips[currentSlipIndex];

    if (loading) {
        return <div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div></div>;
    }

    if (!currentSlip) {
        return (
            <div className="flex flex-col h-full bg-gray-50 items-center justify-center p-6 text-center">
                <div className="bg-green-50 p-4 rounded-full mb-4">
                    <ClipboardListIcon className="h-12 w-12 text-green-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-800">No Slips Found</h3>
                <p className="text-gray-500 mt-2">You have no permission slips to review at this time.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-gray-50">
            <main className="flex-grow p-4 space-y-4 overflow-y-auto">
                <div className="bg-green-50 p-6 rounded-2xl text-center border border-green-200 shadow-sm">
                    <ClipboardListIcon className="h-10 w-10 mx-auto text-green-500 mb-2" />
                    <h3 className="font-bold text-lg text-green-800">Digital Permission Slip</h3>
                    {slips.length > 1 && (
                        <p className="text-xs text-green-600 mt-1">Showing {currentSlipIndex + 1} of {slips.length}</p>
                    )}
                </div>

                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">{currentSlip.title}</h2>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-6 pb-4 border-b border-gray-100">
                        <div className="flex items-center space-x-2 bg-gray-50 px-3 py-1.5 rounded-lg">
                            <CalendarIcon className="w-4 h-4 text-green-600" />
                            <span>{new Date(currentSlip.date).toLocaleDateString(undefined, { dateStyle: 'long' })}</span>
                        </div>
                        {currentSlip.location && (
                            <div className="flex items-center space-x-2 bg-gray-50 px-3 py-1.5 rounded-lg">
                                <span className="font-semibold text-green-600">@</span>
                                <span>{currentSlip.location}</span>
                            </div>
                        )}
                    </div>

                    <div className="prose prose-sm max-w-none text-gray-600 mb-6">
                        <p className="leading-relaxed">{currentSlip.description}</p>
                    </div>

                    {slips.length > 1 && (
                        <div className="flex justify-between items-center text-sm text-gray-400 pt-4 border-t border-gray-50">
                            <button
                                disabled={currentSlipIndex === 0}
                                onClick={() => setCurrentSlipIndex(prev => prev - 1)}
                                className="disabled:opacity-30 hover:text-green-600 font-medium"
                            >
                                Previous
                            </button>
                            <button
                                disabled={currentSlipIndex === slips.length - 1}
                                onClick={() => setCurrentSlipIndex(prev => prev + 1)}
                                className="disabled:opacity-30 hover:text-green-600 font-medium"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>

                {currentSlip.status !== 'Pending' && (
                    <div className={`p-6 rounded-2xl text-center border-2 ${currentSlip.status === 'Approved' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                        <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-2 ${currentSlip.status === 'Approved' ? 'bg-green-100' : 'bg-red-100'}`}>
                            {currentSlip.status === 'Approved' ? <CheckCircleIcon className="w-6 h-6" /> : <XCircleIcon className="w-6 h-6" />}
                        </div>
                        <p className="font-bold text-lg">You have {currentSlip.status} this slip.</p>
                    </div>
                )}
            </main>

            {currentSlip.status === 'Pending' && (
                <div className="p-4 mt-auto bg-white border-t border-gray-100 grid grid-cols-2 gap-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                    <button
                        onClick={() => handleResponse('Rejected')}
                        className="flex justify-center items-center space-x-2 py-3.5 px-4 font-bold rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors border border-red-100"
                    >
                        <XCircleIcon className="w-5 h-5" />
                        <span>Reject</span>
                    </button>
                    <button
                        onClick={() => handleResponse('Approved')}
                        className="flex justify-center items-center space-x-2 py-3.5 px-4 font-bold rounded-xl bg-green-500 text-white hover:bg-green-600 shadow-md shadow-green-200 transition-all hover:translate-y-[-1px]"
                    >
                        <CheckCircleIcon className="w-5 h-5" />
                        <span>Approve</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default PermissionSlipScreen;