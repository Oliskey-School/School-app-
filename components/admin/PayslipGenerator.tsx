import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { generatePayslip, savePayslip, approvePayslip, PayslipItem, generateBulkPayslips } from '../../lib/payslipGenerator';
import { formatCurrency } from '../../lib/payroll';
import {
    PlusIcon,
    CheckCircleIcon,
    DocumentTextIcon,
    UserGroupIcon,
    CalendarIcon
} from '../../constants';

interface Teacher {
    id: string;
    full_name: string;
}

const PayslipGenerator: React.FC = () => {
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [selectedTeacher, setSelectedTeacher] = useState<string>('');
    const [periodStart, setPeriodStart] = useState('');
    const [periodEnd, setPeriodEnd] = useState('');
    const [allowances, setAllowances] = useState<PayslipItem[]>([]);
    const [bonuses, setBonuses] = useState<PayslipItem[]>([]);
    const [deductions, setDeductions] = useState<PayslipItem[]>([]);
    const [preview, setPreview] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        fetchTeachers();
        // Set default period to current month
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        setPeriodStart(start.toISOString().split('T')[0]);
        setPeriodEnd(end.toISOString().split('T')[0]);
    }, []);

    const fetchTeachers = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('teacher_salaries')
                .select(`
          teacher_id,
          teachers (
            id,
            full_name
          )
        `)
                .eq('is_active', true);

            if (error) throw error;

            const teacherList: Teacher[] = (data || []).map((item: any) => ({
                id: item.teacher_id,
                full_name: item.teachers?.full_name || 'Unknown'
            }));

            setTeachers(teacherList);
        } catch (error: any) {
            console.error('Error fetching teachers:', error);
            toast.error('Failed to load teachers');
        } finally {
            setLoading(false);
        }
    };

    const handleGeneratePreview = async () => {
        if (!selectedTeacher) {
            toast.error('Please select a teacher');
            return;
        }

        if (!periodStart || !periodEnd) {
            toast.error('Please select period dates');
            return;
        }

        try {
            setGenerating(true);
            const payslipData = await generatePayslip(
                selectedTeacher,
                periodStart,
                periodEnd,
                allowances,
                bonuses,
                deductions
            );

            if (payslipData) {
                setPreview(payslipData);
            } else {
                toast.error('Failed to generate payslip');
            }
        } catch (error: any) {
            console.error('Error generating preview:', error);
            toast.error('Error generating payslip');
        } finally {
            setGenerating(false);
        }
    };

    const handleSavePayslip = async () => {
        if (!preview) return;

        try {
            const payslipId = await savePayslip(preview);
            if (payslipId) {
                toast.success('Payslip saved successfully');
                setPreview(null);
                setAllowances([]);
                setBonuses([]);
                setDeductions([]);
            } else {
                toast.error('Failed to save payslip');
            }
        } catch (error: any) {
            console.error('Error saving:', error);
            toast.error('Error saving payslip');
        }
    };

    const handleBulkGenerate = async () => {
        if (!periodStart || !periodEnd) {
            toast.error('Please select period dates');
            return;
        }

        if (!confirm(`Generate payslips for all ${teachers.length} teachers?`)) {
            return;
        }

        try {
            setGenerating(true);
            const result = await generateBulkPayslips(periodStart, periodEnd);
            toast.success(`Generated ${result.success} payslips. Failed: ${result.failed}`);
        } catch (error: any) {
            console.error('Error in bulk generation:', error);
            toast.error('Error generating payslips');
        } finally {
            setGenerating(false);
        }
    };

    const addItem = (type: 'allowance' | 'bonus' | 'deduction') => {
        const description = prompt(`Enter ${type} description:`);
        const amountStr = prompt(`Enter ${type} amount:`);

        if (description && amountStr) {
            const amount = parseFloat(amountStr);
            if (!isNaN(amount) && amount > 0) {
                const item: PayslipItem = { description, amount, type: 'earning' };

                if (type === 'allowance') {
                    setAllowances([...allowances, item]);
                } else if (type === 'bonus') {
                    setBonuses([...bonuses, item]);
                } else {
                    setDeductions([...deductions, { ...item, type: 'deduction' }]);
                }
            }
        }
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Payslip Generator</h2>
                    <p className="text-sm text-gray-600 mt-1">Generate monthly payslips for teachers</p>
                </div>
                <button
                    onClick={handleBulkGenerate}
                    disabled={generating}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:bg-gray-400"
                >
                    Bulk Generate All
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Input Form */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
                    <h3 className="text-lg font-bold text-gray-900">Generate Payslip</h3>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select Teacher
                        </label>
                        <select
                            value={selectedTeacher}
                            onChange={(e) => setSelectedTeacher(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                            <option value="">Choose a teacher</option>
                            {teachers.map((teacher) => (
                                <option key={teacher.id} value={teacher.id}>
                                    {teacher.full_name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Period Start
                            </label>
                            <input
                                type="date"
                                value={periodStart}
                                onChange={(e) => setPeriodStart(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Period End
                            </label>
                            <input
                                type="date"
                                value={periodEnd}
                                onChange={(e) => setPeriodEnd(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Allowances */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-gray-700">Allowances</label>
                            <button
                                onClick={() => addItem('allowance')}
                                className="text-sm text-indigo-600 hover:text-indigo-700"
                            >
                                + Add
                            </button>
                        </div>
                        <div className="space-y-1">
                            {allowances.map((item, idx) => (
                                <div key={idx} className="flex justify-between text-sm p-2 bg-green-50 rounded">
                                    <span>{item.description}</span>
                                    <span className="font-medium">₦{item.amount.toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Bonuses */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-gray-700">Bonuses</label>
                            <button
                                onClick={() => addItem('bonus')}
                                className="text-sm text-indigo-600 hover:text-indigo-700"
                            >
                                + Add
                            </button>
                        </div>
                        <div className="space-y-1">
                            {bonuses.map((item, idx) => (
                                <div key={idx} className="flex justify-between text-sm p-2 bg-blue-50 rounded">
                                    <span>{item.description}</span>
                                    <span className="font-medium">₦{item.amount.toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Deductions */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-gray-700">Additional Deductions</label>
                            <button
                                onClick={() => addItem('deduction')}
                                className="text-sm text-indigo-600 hover:text-indigo-700"
                            >
                                + Add
                            </button>
                        </div>
                        <div className="space-y-1">
                            {deductions.map((item, idx) => (
                                <div key={idx} className="flex justify-between text-sm p-2 bg-red-50 rounded">
                                    <span>{item.description}</span>
                                    <span className="font-medium">₦{item.amount.toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={handleGeneratePreview}
                        disabled={generating || !selectedTeacher}
                        className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:bg-gray-400"
                    >
                        {generating ? 'Generating...' : 'Generate Preview'}
                    </button>
                </div>

                {/* Preview */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Payslip Preview</h3>

                    {preview ? (
                        <div className="space-y-4">
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <h4 className="font-semibold text-gray-900">{preview.teacher_name}</h4>
                                <p className="text-sm text-gray-600">
                                    {new Date(preview.period_start).toLocaleDateString()} - {new Date(preview.period_end).toLocaleDateString()}
                                </p>
                            </div>

                            <div className="space-y-2">
                                <h5 className="font-semibold text-gray-900">Earnings</h5>
                                {preview.items.filter((i: PayslipItem) => i.type === 'earning').map((item: PayslipItem, idx: number) => (
                                    <div key={idx} className="flex justify-between text-sm">
                                        <span>{item.description}</span>
                                        <span className="font-medium">₦{item.amount.toLocaleString()}</span>
                                    </div>
                                ))}
                                <div className="flex justify-between font-semibold pt-2 border-t">
                                    <span>Gross Salary</span>
                                    <span>₦{preview.gross_salary.toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h5 className="font-semibold text-gray-900">Deductions</h5>
                                {preview.items.filter((i: PayslipItem) => i.type === 'deduction').map((item: PayslipItem, idx: number) => (
                                    <div key={idx} className="flex justify-between text-sm">
                                        <span>{item.description}</span>
                                        <span className="font-medium text-red-600">₦{item.amount.toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                                <div className="flex justify-between font-bold text-lg">
                                    <span>Net Salary</span>
                                    <span className="text-indigo-600">₦{preview.net_salary.toLocaleString()}</span>
                                </div>
                            </div>

                            <button
                                onClick={handleSavePayslip}
                                className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center space-x-2"
                            >
                                <CheckCircleIcon className="w-5 h-5" />
                                <span>Save Payslip</span>
                            </button>
                        </div>
                    ) : (
                        <div className="text-center py-12 text-gray-500">
                            <DocumentTextIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <p>Generate a payslip to see preview</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PayslipGenerator;
