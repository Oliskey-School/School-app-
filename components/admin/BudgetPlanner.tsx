import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { DollarSign, Plus, Edit, Trash2, TrendingUp, AlertCircle } from 'lucide-react';

interface Budget {
    id: number;
    budget_year: number;
    budget_name: string;
    total_budget: number;
    allocated_amount: number;
    spent_amount: number;
    remaining_amount: number;
    status: string;
}

interface BudgetLine {
    id: number;
    budget_id: number;
    department: string;
    category: string;
    allocated_amount: number;
    spent_amount: number;
    committed_amount: number;
    available_amount: number;
    variance: number;
}

const BudgetPlanner: React.FC = () => {
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
    const [budgetLines, setBudgetLines] = useState<BudgetLine[]>([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [loading, setLoading] = useState(true);

    // Form state
    const [budgetName, setBudgetName] = useState('');
    const [budgetYear, setBudgetYear] = useState(new Date().getFullYear());
    const [totalBudget, setTotalBudget] = useState('');

    useEffect(() => {
        fetchBudgets();
    }, []);

    useEffect(() => {
        if (selectedBudget) {
            fetchBudgetLines(selectedBudget.id);
        }
    }, [selectedBudget]);

    const fetchBudgets = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('budgets')
                .select('*')
                .order('budget_year', { ascending: false });

            if (error) throw error;
            setBudgets(data || []);
            if (data && data.length > 0 && !selectedBudget) {
                setSelectedBudget(data[0]);
            }
        } catch (error: any) {
            console.error('Error fetching budgets:', error);
            toast.error('Failed to load budgets');
        } finally {
            setLoading(false);
        }
    };

    const fetchBudgetLines = async (budgetId: number) => {
        try {
            const { data, error } = await supabase
                .from('budget_lines')
                .select('*')
                .eq('budget_id', budgetId);

            if (error) throw error;
            setBudgetLines(data || []);
        } catch (error: any) {
            console.error('Error fetching budget lines:', error);
        }
    };

    const createBudget = async () => {
        if (!budgetName || !totalBudget) {
            toast.error('Please fill all required fields');
            return;
        }

        try {
            const { data, error } = await supabase
                .from('budgets')
                .insert({
                    budget_name: budgetName,
                    budget_year: budgetYear,
                    total_budget: Number(totalBudget),
                    status: 'Draft',
                    fiscal_year_start: `${budgetYear}-01-01`,
                    fiscal_year_end: `${budgetYear}-12-31`,
                    created_by: 1 // Current user ID
                })
                .select()
                .single();

            if (error) throw error;

            toast.success('Budget created successfully!');
            setShowCreateModal(false);
            resetForm();
            fetchBudgets();
        } catch (error: any) {
            console.error('Error creating budget:', error);
            toast.error('Failed to create budget');
        }
    };

    const resetForm = () => {
        setBudgetName('');
        setBudgetYear(new Date().getFullYear());
        setTotalBudget('');
    };

    const getVarianceColor = (variance: number) => {
        if (variance > 0) return 'text-green-600';
        if (variance < 0) return 'text-red-600';
        return 'text-gray-600';
    };

    const getUtilizationPercentage = (spent: number, allocated: number) => {
        return allocated > 0 ? (spent / allocated) * 100 : 0;
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white mb-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">💼 Budget Planner</h1>
                        <p className="text-blue-100">Annual budget management and allocation tracking</p>
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 font-semibold flex items-center space-x-2"
                    >
                        <Plus className="h-5 w-5" />
                        <span>New Budget</span>
                    </button>
                </div>
            </div>

            {/* Budget Selection */}
            <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Select Budget</label>
                <select
                    value={selectedBudget?.id || ''}
                    onChange={(e) => {
                        const budget = budgets.find(b => b.id === Number(e.target.value));
                        setSelectedBudget(budget || null);
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                    {budgets.map(budget => (
                        <option key={budget.id} value={budget.id}>
                            {budget.budget_name} - {budget.budget_year} ({budget.status})
                        </option>
                    ))}
                </select>
            </div>

            {selectedBudget && (
                <>
                    {/* Budget Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white rounded-xl shadow-sm p-6">
                            <p className="text-sm text-gray-600">Total Budget</p>
                            <p className="text-2xl font-bold text-gray-900">₦{selectedBudget.total_budget.toLocaleString()}</p>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm p-6">
                            <p className="text-sm text-gray-600">Allocated</p>
                            <p className="text-2xl font-bold text-blue-600">₦{selectedBudget.allocated_amount.toLocaleString()}</p>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm p-6">
                            <p className="text-sm text-gray-600">Spent</p>
                            <p className="text-2xl font-bold text-orange-600">₦{selectedBudget.spent_amount.toLocaleString()}</p>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm p-6">
                            <p className="text-sm text-gray-600">Remaining</p>
                            <p className="text-2xl font-bold text-green-600">₦{selectedBudget.remaining_amount.toLocaleString()}</p>
                        </div>
                    </div>

                    {/* Budget Lines */}
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Department Allocations</h3>
                        {budgetLines.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead>
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Department</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Category</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Allocated</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Spent</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Committed</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Available</th>
                                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Utilization</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Variance</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {budgetLines.map(line => {
                                            const utilization = getUtilizationPercentage(line.spent_amount, line.allocated_amount);
                                            return (
                                                <tr key={line.id} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{line.department}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-700">{line.category}</td>
                                                    <td className="px-4 py-3 text-sm text-right text-gray-900">₦{line.allocated_amount.toLocaleString()}</td>
                                                    <td className="px-4 py-3 text-sm text-right text-orange-600">₦{line.spent_amount.toLocaleString()}</td>
                                                    <td className="px-4 py-3 text-sm text-right text-yellow-600">₦{line.committed_amount.toLocaleString()}</td>
                                                    <td className="px-4 py-3 text-sm text-right text-green-600 font-semibold">₦{line.available_amount.toLocaleString()}</td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex flex-col items-center">
                                                            <span className="text-xs font-semibold mb-1">{utilization.toFixed(1)}%</span>
                                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                                <div
                                                                    className={`h-2 rounded-full ${utilization > 90 ? 'bg-red-500' : utilization > 75 ? 'bg-yellow-500' : 'bg-green-500'
                                                                        }`}
                                                                    style={{ width: `${Math.min(utilization, 100)}%` }}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className={`px-4 py-3 text-sm text-right font-semibold ${getVarianceColor(line.variance)}`}>
                                                        ₦{line.variance.toLocaleString()}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-center text-gray-500 py-8">No budget lines allocated yet</p>
                        )}
                    </div>
                </>
            )}

            {/* Create Budget Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-md w-full p-6">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Create New Budget</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Budget Name *</label>
                                <input
                                    type="text"
                                    value={budgetName}
                                    onChange={(e) => setBudgetName(e.target.value)}
                                    placeholder="e.g., Annual Budget 2026"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Fiscal Year *</label>
                                <input
                                    type="number"
                                    value={budgetYear}
                                    onChange={(e) => setBudgetYear(Number(e.target.value))}
                                    min="2020"
                                    max="2050"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Total Budget (₦) *</label>
                                <input
                                    type="number"
                                    value={totalBudget}
                                    onChange={(e) => setTotalBudget(e.target.value)}
                                    placeholder="50000000"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div className="flex space-x-3 mt-6">
                            <button
                                onClick={() => {
                                    setShowCreateModal(false);
                                    resetForm();
                                }}
                                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={createBudget}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold"
                            >
                                Create Budget
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BudgetPlanner;
