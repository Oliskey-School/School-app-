import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';
import { DollarSign, Plus, TrendingUp, TrendingDown, BarChart2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAutoSync } from '../../hooks/useAutoSync';
import CenteredLoader from '../ui/CenteredLoader';

interface BudgetEntry {
    id: string;
    school_id: string;
    branch_id?: string;
    fiscal_year: string;
    category: string;
    allocated_amount: number;
    spent_amount: number;
    created_at: string;
}

const BudgetPlanner: React.FC = () => {
    const { currentSchool } = useAuth();
    const schoolId = currentSchool?.id;
    const branchId = currentSchool?.branch_id;
    const [entries, setEntries] = useState<BudgetEntry[]>([]);
    const [selectedYear, setSelectedYear] = useState<string>('');
    const [availableYears, setAvailableYears] = useState<string[]>([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [loading, setLoading] = useState(true);

    // Form state
    const [newCategory, setNewCategory] = useState('');
    const [newFiscalYear, setNewFiscalYear] = useState(String(new Date().getFullYear()));
    const [newAllocated, setNewAllocated] = useState('');
    const [newSpent, setNewSpent] = useState('');

    useEffect(() => {
        if (schoolId) {
            fetchBudgets();
        }
    }, [schoolId]);

    useAutoSync(['budgets'], () => {
        console.log('🔄 [BudgetPlanner] Real-time auto-sync triggered');
        fetchBudgets();
    });

    const fetchBudgets = async () => {
        if (!schoolId) {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const data = await api.getBudgets(schoolId, branchId || undefined);
            
            const rows: BudgetEntry[] = (data || []).map((item: any) => ({
                id: item.id,
                school_id: item.school_id,
                branch_id: item.branch_id,
                fiscal_year: item.fiscal_year,
                category: item.category,
                allocated_amount: item.allocated_amount,
                spent_amount: item.spent_amount,
                created_at: item.created_at
            }));

            setEntries(rows);

            // Derive unique fiscal years
            const years = Array.from(new Set(rows.map(r => r.fiscal_year))).sort((a, b) => b.localeCompare(a));
            setAvailableYears(years);
            if (!selectedYear && years.length > 0) {
                setSelectedYear(years[0]);
            }
        } catch (error: any) {
            console.error('Error fetching budgets:', error);
            toast.error('Failed to load budgets');
        } finally {
            setLoading(false);
        }
    };

    const createEntry = async () => {
        if (!newCategory || !newAllocated || !newFiscalYear || !schoolId) {
            toast.error('Please fill all required fields');
            return;
        }
        try {
            await api.createBudget({
                school_id: schoolId,
                branch_id: branchId,
                fiscal_year: newFiscalYear,
                category: newCategory,
                allocated_amount: Number(newAllocated),
                spent_amount: Number(newSpent) || 0,
            });
            
            toast.success('Budget entry created!');
            setShowCreateModal(false);
            resetForm();
            fetchBudgets();
        } catch (error: any) {
            console.error('Error creating budget entry:', error);
            toast.error('Failed to create budget entry');
        }
    };

    const resetForm = () => {
        setNewCategory('');
        setNewFiscalYear(String(new Date().getFullYear()));
        setNewAllocated('');
        setNewSpent('');
    };

    const filteredEntries = entries.filter(e => !selectedYear || e.fiscal_year === selectedYear);
    const totalAllocated = filteredEntries.reduce((s, e) => s + (e.allocated_amount || 0), 0);
    const totalSpent = filteredEntries.reduce((s, e) => s + (e.spent_amount || 0), 0);
    const totalRemaining = totalAllocated - totalSpent;

    const getUtilization = (spent: number, allocated: number) =>
        allocated > 0 ? Math.min((spent / allocated) * 100, 100) : 0;

    if (loading) {
        return <CenteredLoader className="h-64" />;
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white mb-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">💼 Budget Planner</h1>
                        <p className="text-blue-100">Annual budget management and category tracking</p>
                    </div>
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setShowCreateModal(true)}
                        className="px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 font-semibold flex items-center space-x-2"
                    >
                        <Plus className="h-5 w-5" />
                        <span>Add Entry</span>
                    </motion.button>
                </div>
            </motion.div>

            {/* Year Selector */}
            <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
                <div className="flex items-center gap-4">
                    <label className="text-sm font-semibold text-gray-700">Fiscal Year:</label>
                    <select
                        value={selectedYear}
                        onChange={e => setSelectedYear(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">All Years</option>
                        {availableYears.map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
            </div>

            {entries.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-dashed border-gray-200">
                    <DollarSign className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                    <p className="text-gray-500 font-medium">No budget entries yet. Click "Add Entry" to get started.</p>
                </div>
            ) : (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="bg-blue-50 rounded-xl shadow-sm p-6 border border-blue-100">
                            <p className="text-sm text-gray-500 mb-1">Total Allocated</p>
                            <p className="text-2xl font-bold text-gray-900">₦{totalAllocated.toLocaleString()}</p>
                        </motion.div>
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.05 }} className="bg-orange-50 rounded-xl shadow-sm p-6 border border-orange-100">
                            <p className="text-sm text-gray-500 mb-1">Total Spent</p>
                            <p className="text-2xl font-bold text-orange-600">₦{totalSpent.toLocaleString()}</p>
                        </motion.div>
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.1 }} className={`rounded-xl shadow-sm p-6 border ${totalRemaining >= 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                            <p className="text-sm text-gray-500 mb-1">Remaining</p>
                            <p className={`text-2xl font-bold ${totalRemaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                ₦{Math.abs(totalRemaining).toLocaleString()}
                                {totalRemaining < 0 && ' (over)'}
                            </p>
                        </motion.div>
                    </div>

                    {/* Entries Table */}
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Category Breakdown</h3>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead>
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Fiscal Year</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Category</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Allocated</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Spent</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Remaining</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Utilization</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {filteredEntries.map(entry => {
                                        const remaining = (entry.allocated_amount || 0) - (entry.spent_amount || 0);
                                        const utilization = getUtilization(entry.spent_amount, entry.allocated_amount);
                                        return (
                                            <motion.tr key={entry.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 text-sm text-gray-700 font-mono">{entry.fiscal_year}</td>
                                                <td className="px-4 py-3 text-sm font-medium text-gray-900">{entry.category}</td>
                                                <td className="px-4 py-3 text-sm text-right text-gray-900">₦{(entry.allocated_amount || 0).toLocaleString()}</td>
                                                <td className="px-4 py-3 text-sm text-right text-orange-600">₦{(entry.spent_amount || 0).toLocaleString()}</td>
                                                <td className={`px-4 py-3 text-sm text-right font-semibold ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    ₦{Math.abs(remaining).toLocaleString()}{remaining < 0 && ' (over)'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-xs font-semibold mb-1">{utilization.toFixed(1)}%</span>
                                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                                            <div
                                                                className={`h-2 rounded-full ${utilization > 90 ? 'bg-red-500' : utilization > 75 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                                                style={{ width: `${utilization}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* Create Entry Modal */}
            <AnimatePresence>
            {showCreateModal && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} transition={{ type: 'spring', stiffness: 400, damping: 32 }} className="bg-white rounded-xl max-w-md w-full p-6">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Add Budget Entry</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Fiscal Year *</label>
                                <input
                                    type="text"
                                    value={newFiscalYear}
                                    onChange={e => setNewFiscalYear(e.target.value)}
                                    placeholder="e.g., 2026"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Category *</label>
                                <input
                                    type="text"
                                    value={newCategory}
                                    onChange={e => setNewCategory(e.target.value)}
                                    placeholder="e.g., Staff Salaries"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Allocated Amount (₦) *</label>
                                <input
                                    type="number"
                                    value={newAllocated}
                                    onChange={e => setNewAllocated(e.target.value)}
                                    placeholder="50000000"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Spent Amount (₦)</label>
                                <input
                                    type="number"
                                    value={newSpent}
                                    onChange={e => setNewSpent(e.target.value)}
                                    placeholder="0"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div className="flex space-x-3 mt-6">
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => { setShowCreateModal(false); resetForm(); }}
                                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
                            >
                                Cancel
                            </motion.button>
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={createEntry}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold"
                            >
                                Add Entry
                            </motion.button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
            </AnimatePresence>
        </div>
    );
};

export default BudgetPlanner;

