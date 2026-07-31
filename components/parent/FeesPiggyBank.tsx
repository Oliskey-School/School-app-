import React, { useState, useEffect, useCallback } from 'react';
import { useAutoSync } from '../../hooks/useAutoSync';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { PiggyBank, Target, Calendar, ArrowRight, CheckCircle2 } from 'lucide-react';
import { SavingsService, SavingsPlan } from '../../lib/savings-service';
import { useAuth } from '../../context/AuthContext';

export const FeesPiggyBank: React.FC<{ studentId: string }> = ({ studentId }) => {
    const { user, currentSchool } = useAuth();
    const [plans, setParentsPlans] = useState<any[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [isDepositing, setIsDepositing] = useState(false);
    const [depositAmount, setDepositAmount] = useState(5000);
    const [submittingDeposit, setSubmittingDeposit] = useState(false);
    const [formData, setFormData] = useState({
        target_amount: 150000,
        target_date: '',
        frequency: 'weekly' as 'weekly' | 'monthly'
    });

    const loadPlans = useCallback(async () => {
        if (!user) return;
        const data = await SavingsService.getParentPlans(user.id);
        setParentsPlans(data.filter(p => p.student_id === studentId));
    }, [user, studentId]);

    // Real-time synchronization
    useAutoSync(['savings_plans', 'payments'], loadPlans);

    useEffect(() => {
        loadPlans();
    }, [loadPlans]);

    const handleCreate = async () => {
        if (!currentSchool || !user) return;
        
        await SavingsService.createPlan({
            school_id: currentSchool.id,
            parent_id: user.id,
            student_id: studentId,
            target_amount: formData.target_amount,
            target_date: formData.target_date,
            frequency: formData.frequency
        });

        setIsCreating(false);
        loadPlans();
    };

    const handleDeposit = async () => {
        if (!activePlan || depositAmount <= 0) return;
        setSubmittingDeposit(true);
        try {
            await SavingsService.addFunds(activePlan.id, depositAmount);
            toast.success(`₦${depositAmount.toLocaleString()} added to your savings plan!`);
            setIsDepositing(false);
            setDepositAmount(5000);
            loadPlans();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to record deposit');
        } finally {
            setSubmittingDeposit(false);
        }
    };

    const activePlan = plans[0];

    return (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-indigo-50">
            <div className="flex items-center gap-3 mb-6">
                <div className="bg-indigo-600 p-3 rounded-2xl">
                    <PiggyBank className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h2 className="font-bold text-lg text-gray-900">Fees Piggy Bank</h2>
                    <p className="text-xs text-gray-500">Save smart, pay easy</p>
                </div>
            </div>

            {!activePlan && !isCreating && (
                <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setIsCreating(true)}
                    className="w-full py-4 bg-indigo-50 border-2 border-dashed border-indigo-200 rounded-2xl text-indigo-600 font-bold flex items-center justify-center gap-2 hover:bg-indigo-100 transition-colors"
                >
                    SET UP A SAVINGS PLAN
                </motion.button>
            )}

            <AnimatePresence>
            {isCreating && (
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 12 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4"
                >
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase">Target Amount (₦)</label>
                        <input
                            type="number"
                            className="w-full p-3 bg-gray-50 rounded-xl mt-1 font-bold"
                            value={formData.target_amount}
                            onChange={(e) => setFormData({...formData, target_amount: Number(e.target.value)})}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase">Target Date</label>
                        <input
                            type="date"
                            className="w-full p-3 bg-gray-50 rounded-xl mt-1"
                            value={formData.target_date}
                            onChange={(e) => setFormData({...formData, target_date: e.target.value})}
                        />
                    </div>
                    <div className="flex gap-2">
                        <motion.button
                            whileTap={{ scale: 0.96 }}
                            onClick={() => setFormData({...formData, frequency: 'weekly'})}
                            className={`flex-1 py-2 rounded-xl font-bold text-xs transition-colors ${formData.frequency === 'weekly' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'}`}
                        >
                            WEEKLY
                        </motion.button>
                        <motion.button
                            whileTap={{ scale: 0.96 }}
                            onClick={() => setFormData({...formData, frequency: 'monthly'})}
                            className={`flex-1 py-2 rounded-xl font-bold text-xs transition-colors ${formData.frequency === 'monthly' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'}`}
                        >
                            MONTHLY
                        </motion.button>
                    </div>

                    <div className="p-4 bg-indigo-50 rounded-2xl">
                        <p className="text-sm text-indigo-700 font-medium">
                            💰 Save <span className="font-bold">₦{SavingsService.calculateInstallment(formData.target_amount, formData.target_date, formData.frequency).toLocaleString()}</span> every {formData.frequency.replace('ly', '')} to reach your goal.
                        </p>
                    </div>

                    <div className="flex gap-2 pt-2">
                        <motion.button whileTap={{ scale: 0.96 }} onClick={() => setIsCreating(false)} className="flex-1 py-3 text-gray-400 font-bold">CANCEL</motion.button>
                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }} onClick={handleCreate} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold">START SAVING</motion.button>
                    </div>
                </motion.div>
            )}
            </AnimatePresence>

            {activePlan && (
                <div className="space-y-6">
                    <div className="flex justify-between items-end">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase">Saved So Far</p>
                            <h3 className="text-3xl font-black text-gray-900">₦{activePlan.current_amount.toLocaleString()}</h3>
                        </div>
                        <p className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                            Goal: ₦{activePlan.target_amount.toLocaleString()}
                        </p>
                    </div>

                    {/* Progress Bar */}
                    <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${(activePlan.current_amount / (activePlan.target_amount || 1)) * 100}%` }}
                            className="absolute top-0 left-0 h-full bg-indigo-600 rounded-full"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                            <Target className="w-4 h-4" />
                            <span>{Math.round((activePlan.current_amount / (activePlan.target_amount || 1)) * 100)}% Reached</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-medium text-gray-500 justify-end">
                            <Calendar className="w-4 h-4" />
                            <span>Ends {new Date(activePlan.target_date).toLocaleDateString('en-GB')}</span>
                        </div>
                    </div>

                    <AnimatePresence mode="wait">
                        {isDepositing ? (
                            <motion.div
                                key="deposit-form"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 8 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-3"
                            >
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase">Amount (₦)</label>
                                    <input
                                        type="number"
                                        min={1}
                                        className="w-full p-3 bg-gray-50 rounded-xl mt-1 font-bold"
                                        value={depositAmount}
                                        onChange={(e) => setDepositAmount(Number(e.target.value))}
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <motion.button whileTap={{ scale: 0.96 }} onClick={() => setIsDepositing(false)} className="flex-1 py-3 text-gray-400 font-bold">CANCEL</motion.button>
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.96 }}
                                        onClick={handleDeposit}
                                        disabled={submittingDeposit || depositAmount <= 0}
                                        className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold disabled:opacity-50"
                                    >
                                        {submittingDeposit ? 'Depositing...' : 'Confirm Deposit'}
                                    </motion.button>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.button
                                key="deposit-cta"
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => setIsDepositing(true)}
                                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
                            >
                                DEPOSIT FUNDS
                                <ArrowRight className="w-4 h-4" />
                            </motion.button>
                        )}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
};
