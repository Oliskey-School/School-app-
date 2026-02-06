import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import PaymentStatusBadge from '../shared/PaymentStatusBadge';
import {
    DollarSignIcon,
    CheckCircleIcon,
    CalendarIcon,
    DocumentTextIcon,
    XCircleIcon,
    CloudUploadIcon,
    VideoIcon,
    PhotoIcon,
    MicrophoneIcon
} from '../../constants';

interface Teacher {
    id: string;
    full_name: string;
    email: string;
}

interface Payslip {
    id: string;
    period_start: string;
    period_end: string;
    gross_salary: number;
    net_salary: number;
    status: string;
}

interface PaymentFormData {
    teacher_id: string;
    payslip_id: string;
    amount: number;
    payment_method: 'Bank Transfer' | 'Mobile Money' | 'Cash';
    transaction_reference: string;
    payment_date: string;
    notes?: string;
    // Bank Transfer fields
    bank_name?: string;
    account_number?: string;
    // Mobile Money fields
    mobile_provider?: string;
    mobile_number?: string;
    // Cash fields
    receipt_number?: string;
    witness_name?: string;
}

const PaymentRecording: React.FC = () => {
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [payslips, setPayslips] = useState<Payslip[]>([]);
    const [selectedTeacher, setSelectedTeacher] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState<PaymentFormData>({
        teacher_id: '',
        payslip_id: '',
        amount: 0,
        payment_method: 'Bank Transfer',
        transaction_reference: '',
        payment_date: new Date().toISOString().split('T')[0],
        notes: ''
    });

    useEffect(() => {
        fetchTeachers();
    }, []);

    useEffect(() => {
        if (selectedTeacher) {
            fetchPayslips(selectedTeacher);
        }
    }, [selectedTeacher]);

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

    const fetchPayslips = async (teacherId: string) => {
        try {
            const { data, error } = await supabase
                .from('payslips')
                .select('*')
                .eq('teacher_id', teacherId)
                .in('status', ['Approved', 'Pending'])
                .order('period_start', { ascending: false });

            if (error) throw error;
            setPayslips(data || []);

            // Auto-select first unpaid payslip
            if (data && data.length > 0) {
                setFormData(prev => ({
                    ...prev,
                    teacher_id: teacherId,
                    payslip_id: data[0].id,
                    amount: data[0].net_salary
                }));
            }
        } catch (error: any) {
            console.error('Error fetching payslips:', error);
            toast.error('Failed to load payslips');
        }
    };

    const handlePayslipChange = (payslipId: string) => {
        const payslip = payslips.find(p => p.id === payslipId);
        if (payslip) {
            setFormData(prev => ({
                ...prev,
                payslip_id: payslipId,
                amount: payslip.net_salary
            }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.teacher_id || !formData.payslip_id) {
            toast.error('Please select teacher and payslip');
            return;
        }

        if (!formData.transaction_reference.trim()) {
            toast.error('Please enter transaction reference');
            return;
        }

        try {
            setSubmitting(true);

            // Prepare payment metadata based on method
            let payment_metadata: any = {};

            if (formData.payment_method === 'Bank Transfer') {
                payment_metadata = {
                    bank_name: formData.bank_name,
                    account_number: formData.account_number
                };
            } else if (formData.payment_method === 'Mobile Money') {
                payment_metadata = {
                    provider: formData.mobile_provider,
                    phone_number: formData.mobile_number
                };
            } else if (formData.payment_method === 'Cash') {
                payment_metadata = {
                    receipt_number: formData.receipt_number,
                    witness_name: formData.witness_name
                };
            }

            // Insert payment transaction
            const { error: paymentError } = await supabase
                .from('payment_transactions')
                .insert({
                    payslip_id: formData.payslip_id,
                    amount: formData.amount,
                    payment_method: formData.payment_method,
                    transaction_reference: formData.transaction_reference,
                    payment_date: formData.payment_date,
                    status: 'Completed',
                    notes: formData.notes,
                    payment_metadata
                });

            if (paymentError) throw paymentError;

            // Update payslip status to Paid
            const { error: payslipError } = await supabase
                .from('payslips')
                .update({ status: 'Paid' })
                .eq('id', formData.payslip_id);

            if (payslipError) throw payslipError;

            toast.success('Payment recorded successfully');

            // Reset form
            setFormData({
                teacher_id: '',
                payslip_id: '',
                amount: 0,
                payment_method: 'Bank Transfer',
                transaction_reference: '',
                payment_date: new Date().toISOString().split('T')[0],
                notes: ''
            });
            setSelectedTeacher('');
            setPayslips([]);
        } catch (error: any) {
            console.error('Error recording payment:', error);
            toast.error('Failed to record payment');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Record Payment</h2>
                <p className="text-sm text-gray-600 mt-1">Record salary payments made to teachers</p>
            </div>

            {/* Payment Form */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Teacher Selection */}
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
                                    {teacher.full_name} ({teacher.email})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Payslip Selection */}
                    {selectedTeacher !== '' && payslips.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Select Payslip Period
                            </label>
                            <select
                                value={formData.payslip_id}
                                onChange={(e) => handlePayslipChange(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                required
                            >
                                {payslips.map((payslip) => (
                                    <option key={payslip.id} value={payslip.id}>
                                        {new Date(payslip.period_start).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} -
                                        ₦{payslip.net_salary.toLocaleString()} ({payslip.status})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {selectedTeacher !== '' && payslips.length === 0 && (
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-yellow-800 text-sm">No unpaid/approved payslips found for this teacher.</p>
                        </div>
                    )}

                    {formData.payslip_id !== '' && (
                        <>
                            {/* Payment Details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Amount
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.amount}
                                        onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                        required
                                        min="0"
                                        step="0.01"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Payment Date
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.payment_date}
                                        onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                        required
                                        max={new Date().toISOString().split('T')[0]}
                                    />
                                </div>
                            </div>

                            {/* Payment Method */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Payment Method
                                </label>
                                <select
                                    value={formData.payment_method}
                                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value as any })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                >
                                    <option value="Bank Transfer">Bank Transfer</option>
                                    <option value="Mobile Money">Mobile Money</option>
                                    <option value="Cash">Cash</option>
                                </select>
                            </div>

                            {/* Bank Transfer Fields */}
                            {formData.payment_method === 'Bank Transfer' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
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
                            )}

                            {/* Mobile Money Fields */}
                            {formData.payment_method === 'Mobile Money' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Provider
                                        </label>
                                        <select
                                            value={formData.mobile_provider || ''}
                                            onChange={(e) => setFormData({ ...formData, mobile_provider: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                        >
                                            <option value="">Select provider</option>
                                            <option value="MTN">MTN Mobile Money</option>
                                            <option value="Airtel">Airtel Money</option>
                                            <option value="9Mobile">9Mobile</option>
                                            <option value="Glo">Glo Mobile Money</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Phone Number
                                        </label>
                                        <input
                                            type="tel"
                                            value={formData.mobile_number || ''}
                                            onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                            placeholder="08012345678"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Cash Fields */}
                            {formData.payment_method === 'Cash' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Receipt Number
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.receipt_number || ''}
                                            onChange={(e) => setFormData({ ...formData, receipt_number: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                            placeholder="RCP-001"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Witness Name (Optional)
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.witness_name || ''}
                                            onChange={(e) => setFormData({ ...formData, witness_name: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                            placeholder="Full name"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Transaction Reference */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Transaction Reference *
                                </label>
                                <input
                                    type="text"
                                    value={formData.transaction_reference}
                                    onChange={(e) => setFormData({ ...formData, transaction_reference: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    required
                                    placeholder="e.g., TXN123456789"
                                />
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Notes (Optional)
                                </label>
                                <textarea
                                    value={formData.notes || ''}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    rows={3}
                                    placeholder="Additional payment notes"
                                />
                            </div>

                            {/* Submit Button */}
                            <div className="flex space-x-3 pt-4">
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:bg-gray-400"
                                >
                                    <CheckCircleIcon className="w-5 h-5" />
                                    <span>{submitting ? 'Recording...' : 'Record Payment'}</span>
                                </button>
                            </div>
                        </>
                    )}
                </form>
            </div>
        </div>
    );
};

export default PaymentRecording;
