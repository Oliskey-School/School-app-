import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAutoSync } from '../../hooks/useAutoSync';
import { toast } from 'react-hot-toast';
import { api } from '../../lib/api';
import { CalendarIcon, ClipboardListIcon, CheckCircleIcon, XCircleIcon, MapPinIcon } from '../../constants';
import PremiumLoader from '../ui/PremiumLoader';
import ConfirmationModal from '../ui/ConfirmationModal';

interface PermissionSlipScreenProps {
    students?: any[];
    schoolId?: string;
}

const PermissionSlipScreen: React.FC<PermissionSlipScreenProps> = ({ students = [], schoolId }) => {
    const [slips, setSlips] = useState<any[]>([]);
    const [currentSlipIndex, setCurrentSlipIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [pendingResponse, setPendingResponse] = useState<'Approved' | 'Rejected' | null>(null);

    const fetchSlips = useCallback(async () => {
        if (!students || students.length === 0) {
            setSlips([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const relevantGrades = students.map(s => s.grade);

            // Use Central API
            const data = await api.getPermissionSlips(schoolId || '');

            const filteredSlips = data?.filter((slip: any) =>
                !slip.target_grades || slip.target_grades.length === 0 ||
                slip.target_grades.some((g: string) => relevantGrades.includes(g))
            ) || [];

            setSlips(filteredSlips);
        } catch (err) {
            console.error('Error fetching slips:', err);
            toast.error('Failed to load permission slips');
        } finally {
            setLoading(false);
        }
    }, [students, schoolId]);

    // Real-time synchronization
    useAutoSync(['permission_slips'], fetchSlips);

    useEffect(() => {
        fetchSlips();
    }, [fetchSlips]);

    const handleResponse = async (status: 'Approved' | 'Rejected') => {
        if (!currentSlip) return;

        try {
            await api.updatePermissionSlipStatus(currentSlip.id, status);

            toast.success(`Slip ${status.toLowerCase()} successfully`);

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
        return <div className="flex justify-center items-center h-full"><PremiumLoader message="Loading slips..." /></div>;
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
                <div className="bg-green-50 p-6 rounded-2xl text-center border border-green-200 shadow-sm transition-all duration-300">
                    <ClipboardListIcon className="h-10 w-10 mx-auto text-green-500 mb-2" />
                    <h3 className="font-bold text-lg text-green-800">Digital Permission Slip</h3>
                    {slips.length > 1 && (
                        <p className="text-xs text-green-600 mt-1">Showing {currentSlipIndex + 1} of {slips.length}</p>
                    )}
                </div>

                <motion.div
                    key={currentSlip.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100"
                >
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">{currentSlip.title}</h2>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-6 pb-4 border-b border-gray-100">
                        <div className="flex items-center space-x-2 bg-gray-50 px-3 py-1.5 rounded-lg">
                            <CalendarIcon className="w-4 h-4 text-green-600" />
                            <span>{new Date(currentSlip.date).toLocaleDateString(undefined, { dateStyle: 'long' })}</span>
                        </div>
                        {currentSlip.location && (
                            <div className="flex items-center space-x-2 bg-gray-50 px-3 py-1.5 rounded-lg">
                                <MapPinIcon className="w-4 h-4 text-green-600" />
                                <span>{currentSlip.location}</span>
                            </div>
                        )}
                    </div>

                    <div className="prose prose-sm max-w-none text-gray-600 mb-6 font-sans leading-relaxed">
                        <p>{currentSlip.description}</p>
                    </div>

                    {slips.length > 1 && (
                        <div className="flex justify-between items-center text-sm text-gray-400 pt-4 border-t border-gray-50">
                            <motion.button
                                whileTap={{ scale: currentSlipIndex === 0 ? 1 : 0.95 }}
                                disabled={currentSlipIndex === 0}
                                onClick={() => setCurrentSlipIndex(prev => prev - 1)}
                                className="disabled:opacity-30 hover:text-green-600 font-bold transition-colors"
                            >
                                Previous
                            </motion.button>
                            <motion.button
                                whileTap={{ scale: currentSlipIndex === slips.length - 1 ? 1 : 0.95 }}
                                disabled={currentSlipIndex === slips.length - 1}
                                onClick={() => setCurrentSlipIndex(prev => prev + 1)}
                                className="disabled:opacity-30 hover:text-green-600 font-bold transition-colors"
                            >
                                Next
                            </motion.button>
                        </div>
                    )}
                </motion.div>

                <AnimatePresence>
                {currentSlip.status !== 'Pending' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.25 }}
                        className={`p-6 rounded-2xl text-center border-2 ${currentSlip.status === 'Approved' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}
                    >
                        <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-2 ${currentSlip.status === 'Approved' ? 'bg-green-100' : 'bg-red-100'}`}>
                            {currentSlip.status === 'Approved' ? <CheckCircleIcon className="w-6 h-6" /> : <XCircleIcon className="w-6 h-6" />}
                        </div>
                        <p className="font-bold text-lg">You have {currentSlip.status.toLowerCase()} this slip.</p>
                    </motion.div>
                )}
                </AnimatePresence>
            </main>

            {currentSlip.status === 'Pending' && (
                <div className="p-4 mt-auto bg-white border-t border-gray-100 grid grid-cols-2 gap-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setPendingResponse('Rejected')}
                        className="flex justify-center items-center space-x-2 py-3.5 px-4 font-bold rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors border border-red-100"
                    >
                        <XCircleIcon className="w-5 h-5" />
                        <span>Reject</span>
                    </motion.button>
                    <motion.button
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setPendingResponse('Approved')}
                        className="flex justify-center items-center space-x-2 py-3.5 px-4 font-bold rounded-xl bg-green-500 text-white hover:bg-green-600 shadow-md shadow-green-200 transition-shadow"
                    >
                        <CheckCircleIcon className="w-5 h-5" />
                        <span>Approve</span>
                    </motion.button>
                </div>
            )}

            <ConfirmationModal
                isOpen={!!pendingResponse}
                onClose={() => setPendingResponse(null)}
                onConfirm={() => pendingResponse && handleResponse(pendingResponse)}
                title={pendingResponse === 'Rejected' ? 'Reject this permission slip?' : 'Approve this permission slip?'}
                message={`This decision for "${currentSlip.title}" will be recorded and cannot be undone from here.`}
                confirmText={pendingResponse === 'Rejected' ? 'Reject' : 'Approve'}
                isDanger={pendingResponse === 'Rejected'}
            />
        </div>
    );
};

export default PermissionSlipScreen;