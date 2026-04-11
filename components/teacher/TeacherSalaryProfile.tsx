import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
// import { useProfile } from '../../context/ProfileContext';
import { formatCurrency } from '../../lib/payroll';
import {
    DocumentTextIcon,
    CheckCircleIcon,
    ClockIcon,
    DollarSignIcon,
    CalendarIcon
} from '../../constants';

interface TeacherSalaryProfileProps {
    navigateTo?: (view: string, title: string, props?: any) => void;
    teacherId: string;
}

const TeacherSalaryProfile: React.FC<TeacherSalaryProfileProps> = ({ teacherId }) => {
    const [salaryData, setSalaryData] = useState<any>(null);
    const [payslips, setPayslips] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorOccurred, setErrorOccurred] = useState(false);

    useEffect(() => {
        fetchSalaryData();
        fetchPayslips();
    }, []);

    const fetchSalaryData = async () => {
        if (!teacherId) return;
        try {
            // Get data from our custom API
            const data = await api.getTeacherSalaryProfile(teacherId);

            if (data) {
                setSalaryData({
                    base_salary: data.base_salary || data.salary || 0,
                    currency: data.currency || 'NGN', 
                    effective_date: data.effective_date || data.hire_date || data.created_at,
                    payment_frequency: data.payment_frequency || 'Monthly',
                    is_active: data.is_active ?? true,
                    bank_name: data.bank_name || 'Not Set',
                    account_number: data.account_number || 'Not Set'
                });
            }
        } catch (error: any) {
            console.error('Error fetching salary:', error);
            // Check for specific backend errors if needed
            if (error.message?.includes('not found')) {
                setSalaryData(null);
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchPayslips = async () => {
        if (!teacherId) return;
        try {
            const data = await api.getPayslips(teacherId);
            setPayslips(data || []);
        } catch (error: any) {
            console.error('Error fetching payslips:', error);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Paid':
                return 'bg-green-100 text-green-800';
            case 'Approved':
                return 'bg-blue-100 text-blue-800';
            case 'Draft':
                return 'bg-yellow-100 text-yellow-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (errorOccurred) {
        return (
            <div className="p-6">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-8 text-center">
                    <DollarSignIcon className="w-16 h-16 text-blue-300 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-blue-900 mb-2">Salary Profile Coming Soon</h3>
                    <p className="text-blue-700 max-w-md mx-auto">Your digital salary profile and configuration are being finalized. Please check back later or contact the finance department for details.</p>
                </div>
            </div>
        );
    }

    if (!salaryData) {
        return (
            <div className="p-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
                    <p className="text-yellow-800">No salary configuration found. Please contact HR.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-gray-900">My Salary</h2>
                <p className="text-sm text-gray-600 mt-1">View your salary details and payslips</p>
            </div>

            {/* Salary Overview */}
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-xl p-6 text-white">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-indigo-100 text-sm">Monthly Salary</p>
                        <h3 className="text-4xl font-bold mt-2">
                            {formatCurrency(salaryData.base_salary, salaryData.currency)}
                        </h3>
                        <p className="text-indigo-100 text-sm mt-2">
                            Effective from {new Date(salaryData.effective_date).toLocaleDateString()}
                        </p>
                    </div>
                    <DollarSignIcon className="w-12 h-12 text-indigo-200" />
                </div>
            </div>

            {/* Salary Details */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Salary Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <p className="text-sm text-gray-600">Base Salary</p>
                        <p className="text-lg font-semibold text-gray-900">
                            {formatCurrency(salaryData.base_salary, salaryData.currency)}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Payment Frequency</p>
                        <p className="text-lg font-semibold text-gray-900">{salaryData.payment_frequency}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Currency</p>
                        <p className="text-lg font-semibold text-gray-900">{salaryData.currency}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Status</p>
                        <span className="inline-flex px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                            {salaryData.is_active ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                </div>

                {salaryData.bank_name && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-900 mb-2">Payment Details</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-600">Bank Name</p>
                                <p className="text-base font-medium text-gray-900">{salaryData.bank_name}</p>
                            </div>
                            {salaryData.account_number && (
                                <div>
                                    <p className="text-sm text-gray-600">Account Number</p>
                                    <p className="text-base font-medium text-gray-900">{salaryData.account_number}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Recent Payslips */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900">Recent Payslips</h3>
                </div>
                <div className="divide-y divide-gray-200">
                    {payslips.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            No payslips generated yet
                        </div>
                    ) : (
                        payslips.map((payslip) => (
                            <div key={payslip.id} className="p-6 hover:bg-gray-50">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-2">
                                            <CalendarIcon className="w-5 h-5 text-gray-400" />
                                            <p className="font-semibold text-gray-900">
                                                {new Date(payslip.period_start).toLocaleDateString('en-US', {
                                                    month: 'long',
                                                    year: 'numeric'
                                                })}
                                            </p>
                                        </div>
                                        <p className="text-sm text-gray-600 mt-1">
                                            {new Date(payslip.period_start).toLocaleDateString()} - {new Date(payslip.period_end).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-bold text-gray-900">
                                            {formatCurrency(payslip.net_salary, salaryData.currency)}
                                        </p>
                                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium mt-1 ${getStatusColor(payslip.status)}`}>
                                            {payslip.status}
                                        </span>
                                    </div>
                                    <button className="ml-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium">
                                        View Details
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Info Note */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm text-blue-800">
                    <strong>Note:</strong> Your salary includes base pay plus any allowances, bonuses, and deductions.
                    Tax and pension (8%) are automatically calculated based on Nigerian requirements.
                </p>
            </div>
        </div>
    );
};

export default TeacherSalaryProfile;
