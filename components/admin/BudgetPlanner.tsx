import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { DollarSign, Plus, TrendingUp, TrendingDown, BarChart2 } from 'lucide-react';
import { useProfile } from '../../context/ProfileContext';

interface BudgetEntry {
    id: string;
    school_id: string;
    fiscal_year: string;
    category: string;
    allocated_amount: number;
    spent_amount: number;
    created_at: string;
}

const BudgetPlanner: React.FC = () => {
    const { profile } = useProfile();
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
        fetchBudgets();
    }, [profile?.schoolId]);

    const fetchBudgets = async () => {
        const schoolId = profile?.schoolId;
        if (!schoolId) {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('budgets')
                .select('*')
                .eq('school_id', schoolId)
                .order('fiscal_year', { ascending: false });

            if (error) throw error;
            const rows: BudgetEntry[] = data || [];
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
        const schoolId = profile?.schoolId;
        if (!newCategory || !newAllocated || !newFiscalYear || !schoolId) {
            toast.error('Please fill all required fields');
            return;
        }
        try {
            const { error } = await supabase
                .from('budgets')
                .insert({
                    school_id: schoolId,
                    fiscal_year: newFiscalYear,
                    category: newCategory,
                    allocated_amount: Number(newAllocated),
                    spent_amount: Number(newSpent) || 0,
                });
            if (error) throw error;
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
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white mb-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">💼 Budget Planner</h1>
                        <p className="text-blue-100">Annual budget management and category tracking</p>
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 font-semibold flex items-center space-x-2"
                    >
                        <Plus className="h-5 w-5" />
                        <span>Add Entry</span>
                    </button>
                </div>
            </div>

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
                        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
                            <p className="text-sm text-gray-500 mb-1">Total Allocated</p>
                            <p className="text-2xl font-bold text-gray-900">₦{totalAllocated.toLocaleString()}</p>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-orange-500">
                            <p className="text-sm text-gray-500 mb-1">Total Spent</p>
                            <p className="text-2xl font-bold text-orange-600">₦{totalSpent.toLocaleString()}</p>
                        </div>
                        <div className={`bg-white rounded-xl shadow-sm p-6 border-l-4 ${totalRemaining >= 0 ? 'border-green-500' : 'border-red-500'}`}>
                            <p className="text-sm text-gray-500 mb-1">Remaining</p>
                            <p className={`text-2xl font-bold ${totalRemaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                ₦{Math.abs(totalRemaining).toLocaleString()}
                                {totalRemaining < 0 && ' (over)'}
                            </p>
                        </div>
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
                                            <tr key={entry.id} className="hover:bg-gray-50">
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
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* Create Entry Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-md w-full p-6">
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
                            <button
                                onClick={() => { setShowCreateModal(false); resetForm(); }}
                                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={createEntry}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold"
                            >
                                Add Entry
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BudgetPlanner;
