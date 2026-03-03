import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { api } from '../../lib/api';
import PaymentStatusBadge from '../shared/PaymentStatusBadge';
import {
    DocumentTextIcon,
    CalendarIcon,
    DollarSignIcon,
    DownloadIcon
} from '../../constants';

interface Payslip {
    id: string;
    period_start: string;
    period_end: string;
    gross_salary: number;
    total_deductions: number;
    net_salary: number;
    status: string;
    tax: number;
    pension: number;
    items: Array<{
        name: string;
        amount: number;
        category: string;
    }>;
}

interface PayslipViewerProps {
    teacherId: string;
}

const PayslipViewer: React.FC<PayslipViewerProps> = ({ teacherId }) => {
    const [payslips, setPayslips] = useState<Payslip[]>([]);
    const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
    const [loading, setLoading] = useState(true);
    const [errorOccurred, setErrorOccurred] = useState(false);

    useEffect(() => {
        if (teacherId) {
            fetchPayslips();
        }
    }, [teacherId]);

    const fetchPayslips = async () => {
        try {
            setLoading(true);
            const data = await api.getPayslips(teacherId);

            if (data && data.length > 0) {
                const formatted: Payslip[] = data.map((item: any) => {
                    const items = item.payslip_items || [];
                    const taxItem = items.find((i: any) => i.name.toLowerCase().includes('tax'));
                    const pensionItem = items.find((i: any) => i.name.toLowerCase().includes('pension'));

                    return {
                        id: item.id,
                        period_start: item.period_start,
                        period_end: item.period_end,
                        gross_salary: item.gross_salary,
                        total_deductions: item.total_deductions,
                        net_salary: item.net_salary,
                        status: item.status,
                        tax: taxItem ? Math.abs(taxItem.amount) : 0,
                        pension: pensionItem ? Math.abs(pensionItem.amount) : 0,
                        items: items.map((p: any) => ({
                            name: p.name,
                            amount: p.amount,
                            category: p.category
                        }))
                    };
                });
                setPayslips(formatted);
            } else {
                setPayslips([]);
            }
        } catch (error: any) {
            console.error('Error fetching payslips:', error);
            setErrorOccurred(true);
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
                {errorOccurred ? (
                    <div className="col-span-2 bg-blue-50 border border-blue-200 rounded-xl p-8 text-center">
                        <DollarSignIcon className="w-16 h-16 text-blue-300 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-blue-900 mb-2">Payroll Feature Coming Soon</h3>
                        <p className="text-blue-700">Digital payslip generation is being integrated into your portal. Please contact the HR Department for your current salary statements.</p>
                    </div>
                ) : payslips.length === 0 ? (
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
                                        ₦{payslip.total_deductions.toLocaleString()}
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
                                    <h3 className="text-xl font-bold text-gray-900">Payslip Details</h3>
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
                                        <p className="text-gray-600">Employee ID</p>
                                        <p className="font-semibold">{teacherId}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-600">Period</p>
                                        <p className="font-semibold">
                                            {new Date(selectedPayslip.period_start).toLocaleDateString()} - {new Date(selectedPayslip.period_end).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Payslip Items */}
                            <div className="mb-6">
                                <h4 className="font-semibold text-gray-900 mb-3">Line Items</h4>
                                <div className="space-y-2 border rounded-lg p-4">
                                    {selectedPayslip.items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-sm">
                                            <span className="text-gray-700">{item.name}</span>
                                            <span className={`font-medium ${item.category === 'Earning' ? 'text-green-600' : 'text-red-600'}`}>
                                                {item.category === 'Earning' ? '+' : '-'}₦{Math.abs(item.amount).toLocaleString()}
                                            </span>
                                        </div>
                                    ))}
                                    <div className="pt-4 mt-2 border-t space-y-2">
                                        <div className="flex justify-between font-semibold">
                                            <span className="text-gray-700">Gross Salary</span>
                                            <span>₦{selectedPayslip.gross_salary.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between font-semibold text-red-600">
                                            <span>Total Deductions</span>
                                            <span>-₦{selectedPayslip.total_deductions.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Net Salary */}
                            <div className="p-6 bg-gradient-to-r from-green-600 to-green-800 rounded-lg text-white mb-6">
                                <p className="text-sm text-green-100 font-medium">Net Payout</p>
                                <p className="text-3xl font-bold mt-1">₦{selectedPayslip.net_salary.toLocaleString()}</p>
                            </div>

                            {/* Actions */}
                            <div className="flex space-x-3">
                                <button
                                    onClick={() => setSelectedPayslip(null)}
                                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium border"
                                >
                                    Close
                                </button>
                                <button
                                    onClick={() => toast('PDF download feature coming soon!', { icon: 'ℹ️' })}
                                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center justify-center space-x-2"
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
