import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../context/ProfileContext';
import PaymentStatusBadge from '../shared/PaymentStatusBadge';
import {
    DocumentTextIcon,
    CalendarIcon,
    DollarSignIcon,
    DownloadIcon
} from '../../constants';

interface Payslip {
    id: number;
    period_start: string;
    period_end: string;
    base_salary: number;
    gross_salary: number;
    tax: number;
    pension: number;
    net_salary: number;
    status: string;
    items: Array<{
        description: string;
        amount: number;
        item_type: string;
    }>;
}

const PayslipViewer: React.FC = () => {
    const { profile } = useProfile();
    const [payslips, setPayslips] = useState<Payslip[]>([]);
    const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPayslips();
    }, []);

    const fetchPayslips = async () => {
        try {
            setLoading(true);

            // Get teacher ID
            const { data: teacherData, error: teacherError } = await supabase
                .from('teachers')
                .select('id')
                .eq('email', profile.email)
                .single();

            if (teacherError || !teacherData) {
                console.error('Teacher not found');
                setLoading(false);
                return;
            }

            // Get payslips
            const { data: payslipsData, error } = await supabase
                .from('payslips')
                .select(`
          *,
          payslip_items (
            description,
            amount,
            item_type
          )
        `)
                .eq('teacher_id', teacherData.id)
                .order('period_start', { ascending: false });

            if (error) throw error;

            const formatted: Payslip[] = (payslipsData || []).map((p: any) => ({
                id: p.id,
                period_start: p.period_start,
                period_end: p.period_end,
                base_salary: p.base_salary,
                gross_salary: p.gross_salary,
                tax: p.tax,
                pension: p.pension,
                net_salary: p.net_salary,
                status: p.status,
                items: p.payslip_items || []
            }));

            setPayslips(formatted);
        } catch (error: any) {
            console.error('Error fetching payslips:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadgeStatus = (status: string): 'Pending' | 'Completed' | 'Failed' | 'Processing' => {
        if (status === 'Paid') return 'Completed';
        if (status === 'Approved') return 'Processing';
        return 'Pending';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-gray-900">My Payslips</h2>
                <p className="text-sm text-gray-600 mt-1">View and download your salary payslips</p>
            </div>

            {/* Payslips List */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {payslips.length === 0 ? (
                    <div className="col-span-2 text-center py-12 text-gray-500">
                        <DocumentTextIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p>No payslips available yet</p>
                    </div>
                ) : (
                    payslips.map((payslip) => (
                        <div
                            key={payslip.id}
                            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => setSelectedPayslip(payslip)}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="font-semibold text-gray-900">
                                        {new Date(payslip.period_start).toLocaleDateString('en-US', {
                                            month: 'long',
                                            year: 'numeric'
                                        })}
                                    </h3>
                                    <p className="text-sm text-gray-600">
                                        {new Date(payslip.period_start).toLocaleDateString()} - {new Date(payslip.period_end).toLocaleDateString()}
                                    </p>
                                </div>
                                <PaymentStatusBadge status={getStatusBadgeStatus(payslip.status)} size="sm" />
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Gross Salary</span>
                                    <span className="font-medium">₦{payslip.gross_salary.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Deductions</span>
                                    <span className="font-medium text-red-600">
                                        ₦{(payslip.tax + payslip.pension).toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex justify-between font-bold pt-2 border-t">
                                    <span>Net Salary</span>
                                    <span className="text-green-600">₦{payslip.net_salary.toLocaleString()}</span>
                                </div>
                            </div>

                            <button className="w-full mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium">
                                View Details
                            </button>
                        </div>
                    ))
                )}
            </div>

            {/* Payslip Detail Modal */}
            {selectedPayslip && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-6 pb-4 border-b">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">Payslip</h3>
                                    <p className="text-sm text-gray-600">
                                        {new Date(selectedPayslip.period_start).toLocaleDateString('en-US', {
                                            month: 'long',
                                            year: 'numeric'
                                        })}
                                    </p>
                                </div>
                                <PaymentStatusBadge status={getStatusBadgeStatus(selectedPayslip.status)} />
                            </div>

                            {/* Employee Info */}
                            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-gray-600">Employee Name</p>
                                        <p className="font-semibold">{profile.name}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-600">Period</p>
                                        <p className="font-semibold">
                                            {new Date(selectedPayslip.period_start).toLocaleDateString()} - {new Date(selectedPayslip.period_end).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Earnings */}
                            <div className="mb-6">
                                <h4 className="font-semibold text-gray-900 mb-3">Earnings</h4>
                                <div className="space-y-2">
                                    {selectedPayslip.items
                                        .filter((item) => item.item_type === 'Earning')
                                        .map((item, idx) => (
                                            <div key={idx} className="flex justify-between text-sm">
                                                <span className="text-gray-700">{item.description}</span>
                                                <span className="font-medium">₦{item.amount.toLocaleString()}</span>
                                            </div>
                                        ))}
                                    <div className="flex justify-between font-semibold pt-2 border-t">
                                        <span>Gross Salary</span>
                                        <span>₦{selectedPayslip.gross_salary.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Deductions */}
                            <div className="mb-6">
                                <h4 className="font-semibold text-gray-900 mb-3">Deductions</h4>
                                <div className="space-y-2">
                                    {selectedPayslip.items
                                        .filter((item) => item.item_type === 'Deduction')
                                        .map((item, idx) => (
                                            <div key={idx} className="flex justify-between text-sm">
                                                <span className="text-gray-700">{item.description}</span>
                                                <span className="font-medium text-red-600">₦{item.amount.toLocaleString()}</span>
                                            </div>
                                        ))}
                                    <div className="flex justify-between font-semibold pt-2 border-t">
                                        <span>Total Deductions</span>
                                        <span className="text-red-600">
                                            ₦{selectedPayslip.items
                                                .filter((i) => i.item_type === 'Deduction')
                                                .reduce((sum, i) => sum + i.amount, 0)
                                                .toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Net Salary */}
                            <div className="p-6 bg-gradient-to-r from-green-600 to-green-800 rounded-lg text-white mb-6">
                                <p className="text-sm text-green-100">Net Salary</p>
                                <p className="text-3xl font-bold mt-1">₦{selectedPayslip.net_salary.toLocaleString()}</p>
                            </div>

                            {/* Actions */}
                            <div className="flex space-x-3">
                                <button
                                    onClick={() => setSelectedPayslip(null)}
                                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                                >
                                    Close
                                </button>
                                <button
                                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center justify-center space-x-2"
                                    onClick={() => alert('PDF download would be implemented here')}
                                >
                                    <DownloadIcon className="w-5 h-5" />
                                    <span>Download PDF</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PayslipViewer;
