import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { formatCurrency, calculateGrossSalary } from '../../lib/payroll';
import { toast } from 'react-hot-toast';
import {
    PlusIcon,
    EditIcon,
    CheckCircleIcon,
    XCircleIcon,
    DollarSignIcon
} from '../../constants';

interface Teacher {
    id: number;
    full_name: string;
    email: string;
}

interface SalaryConfig {
    id?: number;
    teacher_id: number;
    base_salary: number;
    currency: string;
    payment_frequency: string;
    bank_name?: string;
    account_number?: string;
    effective_date: string;
    is_active: boolean;
}

interface SalaryConfigurationProps {
    navigateTo: (view: string, title: string, props?: any) => void;
    handleBack: () => void;
}

const SalaryConfiguration: React.FC<SalaryConfigurationProps> = ({ navigateTo, handleBack }) => {
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState<SalaryConfig>({
        teacher_id: 0,
        base_salary: 0,
        currency: 'NGN',
        payment_frequency: 'Monthly',
        effective_date: new Date().toISOString().split('T')[0],
        is_active: true
    });

    useEffect(() => {
        fetchTeachers();
    }, []);

    const fetchTeachers = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('teachers')
                .select('id, full_name, email')
                .order('full_name');

            if (error) throw error;
            setTeachers(data || []);
        } catch (error: any) {
            console.error('Error fetching teachers:', error);
            toast.error('Failed to load teachers');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.base_salary <= 0) {
            toast.error('Base salary must be greater than zero');
            return;
        }

        try {
            if (editingId) {
                const { error } = await supabase
                    .from('teacher_salaries')
                    .update({
                        base_salary: formData.base_salary,
                        currency: formData.currency,
                        payment_frequency: formData.payment_frequency,
                        bank_name: formData.bank_name,
                        account_number: formData.account_number,
                        effective_date: formData.effective_date,
                        is_active: formData.is_active,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', editingId);

                if (error) throw error;
                toast.success('Salary updated successfully');
            } else {
                const { error } = await supabase
                    .from('teacher_salaries')
                    .insert({
                        teacher_id: formData.teacher_id,
                        base_salary: formData.base_salary,
                        currency: formData.currency,
                        payment_frequency: formData.payment_frequency,
                        bank_name: formData.bank_name,
                        account_number: formData.account_number,
                        effective_date: formData.effective_date,
                        is_active: formData.is_active
                    });

                if (error) throw error;
                toast.success('Salary configuration created');
            }

            resetForm();
            fetchTeachers();
        } catch (error: any) {
            console.error('Error saving salary:', error);
            toast.error('Failed to save salary configuration');
        }
    };

    const resetForm = () => {
        setFormData({
            teacher_id: 0,
            base_salary: 0,
            currency: 'NGN',
            payment_frequency: 'Monthly',
            effective_date: new Date().toISOString().split('T')[0],
            is_active: true
        });
        setShowForm(false);
        setEditingId(null);
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Salary Configuration</h2>
                    <p className="text-sm text-gray-600 mt-1">Manage teacher salary settings</p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                >
                    <PlusIcon className="w-5 h-5" />
                    <span>Add Salary</span>
                </button>
            </div>

            {/* Salary Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <h3 className="text-xl font-bold text-gray-900 mb-4">
                                {editingId ? 'Edit Salary' : 'Add New Salary'}
                            </h3>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Teacher
                                    </label>
                                    <select
                                        value={formData.teacher_id}
                                        onChange={(e) => setFormData({ ...formData, teacher_id: Number(e.target.value) })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                        required
                                        disabled={!!editingId}
                                    >
                                        <option value={0}>Select a teacher</option>
                                        {teachers.map((teacher) => (
                                            <option key={teacher.id} value={teacher.id}>
                                                {teacher.full_name} ({teacher.email})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Base Salary
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.base_salary}
                                            onChange={(e) => setFormData({ ...formData, base_salary: Number(e.target.value) })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                            required
                                            min="0"
                                            step="0.01"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Currency
                                        </label>
                                        <select
                                            value={formData.currency}
                                            onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                        >
                                            <option value="NGN">Nigerian Naira (₦)</option>
                                            <option value="USD">US Dollar ($)</option>
                                            <option value="GBP">British Pound (£)</option>
                                            <option value="EUR">Euro (€)</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Payment Frequency
                                        </label>
                                        <select
                                            value={formData.payment_frequency}
                                            onChange={(e) => setFormData({ ...formData, payment_frequency: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                        >
                                            <option value="Monthly">Monthly</option>
                                            <option value="Bi-weekly">Bi-weekly</option>
                                            <option value="Weekly">Weekly</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Effective Date
                                        </label>
                                        <input
                                            type="date"
                                            value={formData.effective_date}
                                            onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Bank Name
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.bank_name || ''}
                                            onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                            placeholder="e.g., First Bank"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Account Number
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.account_number || ''}
                                            onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                            placeholder="0123456789"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_active}
                                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                        className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                    />
                                    <label className="ml-2 text-sm text-gray-700">Active</label>
                                </div>

                                <div className="flex space-x-3 pt-4">
                                    <button
                                        type="submit"
                                        className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                                    >
                                        {editingId ? 'Update Salary' : 'Create Salary'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Teachers List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900">Teachers</h3>
                </div>
                <div className="divide-y divide-gray-200">
                    {loading ? (
                        <div className="p-8 text-center text-gray-500">Loading...</div>
                    ) : teachers.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">No teachers found</div>
                    ) : (
                        teachers.map((teacher) => (
                            <div key={teacher.id} className="p-6 hover:bg-gray-50">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-semibold text-gray-900">{teacher.full_name}</h4>
                                        <p className="text-sm text-gray-600">{teacher.email}</p>
                                    </div>
                                    <button
                                        onClick={() => navigateTo('teacherSalaryDetail', 'Salary Details', { teacherId: teacher.id })}
                                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                                    >
                                        View Salary
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default SalaryConfiguration;
