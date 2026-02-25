import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { DollarSign, TrendingUp, TrendingDown, PieChart, Calendar, Download, CreditCard } from 'lucide-react';
import { useAutoSync } from '../../hooks/useAutoSync';
import { useAuth } from '../../context/AuthContext';

interface FinancialSummary {
    period_type: string;
    period_start: string;
    period_end: string;
    fee_revenue: number;
    donation_revenue: number;
    grant_revenue: number;
    other_revenue: number;
    total_revenue: number;
    salary_expenses: number;
    operational_expenses: number;
    maintenance_expenses: number;
    other_expenses: number;
    total_expenses: number;
    net_income: number;
}

interface PaymentMethodBreakdown {
    method: string;
    amount: number;
    count: number;
    percentage: number;
}

const FinanceDashboard: React.FC = () => {
    const { currentSchool } = useAuth();
    const schoolId = currentSchool?.id;

    const [viewMode, setViewMode] = useState<'monthly' | 'quarterly' | 'annual'>('monthly');
    const [selectedPeriod, setSelectedPeriod] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [financialData, setFinancialData] = useState<FinancialSummary | null>(null);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethodBreakdown[]>([]);
    const [feeCollectionRate, setFeeCollectionRate] = useState({ collected: 0, outstanding: 0, rate: 0 });
    const [loading, setLoading] = useState(true);
    const [forecastData, setForecastData] = useState<{ month: string; projected: number }[]>([]);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    useEffect(() => {
        fetchFinancialData();
        fetchPaymentMethods();
        fetchFeeCollection();
        generateForecast();
    }, [viewMode, selectedPeriod, refreshTrigger]);

    // Auto-sync
    useAutoSync(['payments', 'student_fees', 'donations', 'salary_payments'], () => {
        console.log('🔄 [FinanceDashboard] Auto-sync triggered');
        setRefreshTrigger(prev => prev + 1);
    });

    const fetchFinancialData = async () => {
        try {
            setLoading(true);
            if (!schoolId) return;

            // Calculate period dates based on view mode
            const { startDate, endDate } = calculatePeriodDates();

            // Fetch or calculate financial summary
            const { data: summaryData } = await supabase
                .from('financial_summaries')
                .select('*')
                .eq('school_id', schoolId)
                .eq('period_type', viewMode)
                .gte('period_start', startDate)
                .lte('period_end', endDate)
                .single();

            if (summaryData) {
                setFinancialData(summaryData);
            } else {
                // Calculate from raw data if summary doesn't exist
                const calculated = await calculateFinancialSummary(startDate, endDate);
                setFinancialData(calculated);
            }

        } catch (error: any) {
            console.error('Error fetching financial data:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculatePeriodDates = () => {
        const date = new Date(selectedPeriod + '-01');
        let startDate: string;
        let endDate: string;

        if (viewMode === 'monthly') {
            startDate = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
            endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
        } else if (viewMode === 'quarterly') {
            const quarter = Math.floor(date.getMonth() / 3);
            startDate = new Date(date.getFullYear(), quarter * 3, 1).toISOString().split('T')[0];
            endDate = new Date(date.getFullYear(), quarter * 3 + 3, 0).toISOString().split('T')[0];
        } else {
            startDate = new Date(date.getFullYear(), 0, 1).toISOString().split('T')[0];
            endDate = new Date(date.getFullYear(), 11, 31).toISOString().split('T')[0];
        }

        return { startDate, endDate };
    };

    const calculateFinancialSummary = async (startDate: string, endDate: string): Promise<FinancialSummary> => {
        if (!schoolId) throw new Error("School Context Missing");

        // Fetch payments (fees)
        const { data: payments } = await supabase
            .from('payments')
            .select('amount, payment_method')
            .eq('school_id', schoolId)
            .gte('payment_date', startDate)
            .lte('payment_date', endDate)
            .eq('status', 'Completed');

        const feeRevenue = payments?.reduce((sum, p) => sum + p.amount, 0) || 0;

        // Fetch donations
        const { data: donations } = await supabase
            .from('donations')
            .select('amount')
            .eq('school_id', schoolId)
            .gte('donation_date', startDate)
            .lte('donation_date', endDate)
            .eq('status', 'Completed');

        const donationRevenue = donations?.reduce((sum, d) => sum + d.amount, 0) || 0;

        // Fetch salary payments
        const { data: salaries } = await supabase
            .from('salary_payments')
            .select('amount_paid')
            .eq('school_id', schoolId)
            .gte('payment_date', startDate)
            .lte('payment_date', endDate);

        const salaryExpenses = salaries?.reduce((sum, s) => sum + s.amount_paid, 0) || 0;

        const totalRevenue = feeRevenue + donationRevenue;
        const totalExpenses = salaryExpenses;

        return {
            period_type: viewMode,
            period_start: startDate,
            period_end: endDate,
            fee_revenue: feeRevenue,
            donation_revenue: donationRevenue,
            grant_revenue: 0,
            other_revenue: 0,
            total_revenue: totalRevenue,
            salary_expenses: salaryExpenses,
            operational_expenses: 0,
            maintenance_expenses: 0,
            other_expenses: 0,
            total_expenses: totalExpenses,
            net_income: totalRevenue - totalExpenses
        };
    };

    const fetchPaymentMethods = async () => {
        try {
            if (!schoolId) return;
            const { startDate, endDate } = calculatePeriodDates();

            const { data: payments } = await supabase
                .from('payments')
                .select('payment_method, amount')
                .eq('school_id', schoolId)
                .gte('payment_date', startDate)
                .lte('payment_date', endDate)
                .eq('status', 'Completed');

            if (payments) {
                const methodMap: { [key: string]: { amount: number; count: number } } = {};
                let totalAmount = 0;

                payments.forEach(p => {
                    const method = p.payment_method || 'Other';
                    if (!methodMap[method]) {
                        methodMap[method] = { amount: 0, count: 0 };
                    }
                    methodMap[method].amount += p.amount;
                    methodMap[method].count += 1;
                    totalAmount += p.amount;
                });

                const breakdown: PaymentMethodBreakdown[] = Object.entries(methodMap).map(([method, data]) => ({
                    method,
                    amount: data.amount,
                    count: data.count,
                    percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0
                }));

                setPaymentMethods(breakdown.sort((a, b) => b.amount - a.amount));
            }
        } catch (error: any) {
            console.error('Error fetching payment methods:', error);
        }
    };

    const fetchFeeCollection = async () => {
        try {
            if (!schoolId) return;
            const { data: fees } = await supabase
                .from('student_fees')
                .select('total_fee, paid_amount')
                .eq('school_id', schoolId);

            if (fees) {
                const totalFees = fees.reduce((sum, f) => sum + f.total_fee, 0);
                const totalPaid = fees.reduce((sum, f) => sum + f.paid_amount, 0);
                const outstanding = totalFees - totalPaid;
                const rate = totalFees > 0 ? (totalPaid / totalFees) * 100 : 0;

                setFeeCollectionRate({
                    collected: totalPaid,
                    outstanding,
                    rate: Math.round(rate * 10) / 10
                });
            }
        } catch (error: any) {
            console.error('Error fetching fee collection:', error);
        }
    };

    const generateForecast = () => {
        // Simple forecast based on historical average
        if (!financialData) return;

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const currentMonth = new Date().getMonth();
        const avgRevenue = financialData.total_revenue;

        const forecast = months.slice(currentMonth + 1, currentMonth + 4).map((month, index) => ({
            month,
            projected: avgRevenue * (1 + (index * 0.02)) // 2% growth assumption
        }));

        setForecastData(forecast);
    };

    const getMethodIcon = (method: string) => {
        const icons: { [key: string]: string } = {
            'Cash': '💵',
            'Bank Transfer': '🏦',
            'Paystack': '💳',
            'Flutterwave': '🌊',
            'POS': '📱'
        };
        return icons[method] || '💰';
    };

    const exportReport = () => {
        if (!financialData) return;

        const reportData = {
            period: `${financialData.period_start} to ${financialData.period_end}`,
            revenue: {
                fees: financialData.fee_revenue,
                donations: financialData.donation_revenue,
                grants: financialData.grant_revenue,
                other: financialData.other_revenue,
                total: financialData.total_revenue
            },
            expenses: {
                salaries: financialData.salary_expenses,
                operational: financialData.operational_expenses,
                maintenance: financialData.maintenance_expenses,
                other: financialData.other_expenses,
                total: financialData.total_expenses
            },
            netIncome: financialData.net_income,
            feeCollection: feeCollectionRate,
            paymentMethods: paymentMethods
        };

        const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `financial-report-${financialData.period_start}-${financialData.period_end}.json`;
        a.click();
        toast.success('Financial report exported!');
    };

    if (loading || !financialData) {
        return <div className="flex justify-center items-center h-64"><div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>;
    }

    const profitMargin = financialData.total_revenue > 0
        ? ((financialData.net_income / financialData.total_revenue) * 100)
        : 0;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-teal-600 rounded-xl p-6 text-white mb-6">
                <h1 className="text-3xl font-bold mb-2">💰 Financial Dashboard</h1>
                <p className="text-green-100">Comprehensive financial analytics and forecasting</p>
            </div>

            {/* Controls */}
            <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
                <div className="flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">View Mode</label>
                            <div className="flex space-x-2">
                                {(['monthly', 'quarterly', 'annual'] as const).map(mode => (
                                    <button
                                        key={mode}
                                        onClick={() => setViewMode(mode)}
                                        className={`px-4 py-2 rounded-lg font-semibold ${viewMode === mode
                                            ? 'bg-green-600 text-white'
                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                            }`}
                                    >
                                        {mode.charAt(0).toUpperCase() + mode.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Period</label>
                            <input
                                type="month"
                                value={selectedPeriod}
                                onChange={(e) => setSelectedPeriod(e.target.value)}
                                max={new Date().toISOString().slice(0, 7)}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                            />
                        </div>
                    </div>

                    <button
                        onClick={exportReport}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold flex items-center space-x-2"
                    >
                        <Download className="h-5 w-5" />
                        <span>Export Report</span>
                    </button>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Total Revenue</p>
                            <p className="text-2xl font-bold text-gray-900">₦{financialData.total_revenue.toLocaleString()}</p>
                        </div>
                        <div className="p-3 bg-green-100 rounded-lg">
                            <TrendingUp className="h-6 w-6 text-green-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Total Expenses</p>
                            <p className="text-2xl font-bold text-gray-900">₦{financialData.total_expenses.toLocaleString()}</p>
                        </div>
                        <div className="p-3 bg-red-100 rounded-lg">
                            <TrendingDown className="h-6 w-6 text-red-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Net Income</p>
                            <p className={`text-2xl font-bold ${financialData.net_income >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                ₦{financialData.net_income.toLocaleString()}
                            </p>
                        </div>
                        <div className={`p-3 rounded-lg ${financialData.net_income >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                            <DollarSign className={`h-6 w-6 ${financialData.net_income >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Profit Margin</p>
                            <p className="text-2xl font-bold text-gray-900">{profitMargin.toFixed(1)}%</p>
                        </div>
                        <div className="p-3 bg-blue-100 rounded-lg">
                            <PieChart className="h-6 w-6 text-blue-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Revenue vs Expenses Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Revenue Breakdown</h3>
                    <div className="space-y-3">
                        {[
                            { label: 'Fee Revenue', amount: financialData.fee_revenue, color: 'bg-green-500' },
                            { label: 'Donations', amount: financialData.donation_revenue, color: 'bg-blue-500' },
                            { label: 'Grants', amount: financialData.grant_revenue, color: 'bg-purple-500' },
                            { label: 'Other', amount: financialData.other_revenue, color: 'bg-yellow-500' }
                        ].map(item => {
                            const percentage = financialData.total_revenue > 0
                                ? (item.amount / financialData.total_revenue) * 100
                                : 0;
                            return (
                                <div key={item.label}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-gray-700">{item.label}</span>
                                        <span className="font-semibold text-gray-900">₦{item.amount.toLocaleString()} ({percentage.toFixed(1)}%)</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-3">
                                        <div className={`${item.color} h-3 rounded-full`} style={{ width: `${percentage}%` }}></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Expense Breakdown</h3>
                    <div className="space-y-3">
                        {[
                            { label: 'Salaries', amount: financialData.salary_expenses, color: 'bg-red-500' },
                            { label: 'Operational', amount: financialData.operational_expenses, color: 'bg-orange-500' },
                            { label: 'Maintenance', amount: financialData.maintenance_expenses, color: 'bg-amber-500' },
                            { label: 'Other', amount: financialData.other_expenses, color: 'bg-gray-500' }
                        ].map(item => {
                            const percentage = financialData.total_expenses > 0
                                ? (item.amount / financialData.total_expenses) * 100
                                : 0;
                            return (
                                <div key={item.label}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-gray-700">{item.label}</span>
                                        <span className="font-semibold text-gray-900">₦{item.amount.toLocaleString()} ({percentage.toFixed(1)}%)</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-3">
                                        <div className={`${item.color} h-3 rounded-full`} style={{ width: `${percentage}%` }}></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Fee Collection & Payment Methods */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Fee Collection Rate</h3>
                    <div className="mb-4">
                        <div className="flex justify-between text-sm mb-2">
                            <span className="text-gray-700">Collection Rate</span>
                            <span className="font-bold text-green-600">{feeCollectionRate.rate}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-4">
                            <div className="bg-green-500 h-4 rounded-full" style={{ width: `${feeCollectionRate.rate}%` }}></div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-6">
                        <div className="bg-green-50 rounded-lg p-4">
                            <p className="text-sm text-gray-600">Collected</p>
                            <p className="text-xl font-bold text-green-600">₦{feeCollectionRate.collected.toLocaleString()}</p>
                        </div>
                        <div className="bg-red-50 rounded-lg p-4">
                            <p className="text-sm text-gray-600">Outstanding</p>
                            <p className="text-xl font-bold text-red-600">₦{feeCollectionRate.outstanding.toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Payment Methods</h3>
                    {paymentMethods.length > 0 ? (
                        <div className="space-y-3">
                            {paymentMethods.map(method => (
                                <div key={method.method} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div className="flex items-center space-x-3">
                                        <span className="text-2xl">{getMethodIcon(method.method)}</span>
                                        <div>
                                            <p className="font-semibold text-gray-900">{method.method}</p>
                                            <p className="text-xs text-gray-600">{method.count} transactions</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-gray-900">₦{method.amount.toLocaleString()}</p>
                                        <p className="text-xs text-gray-600">{method.percentage.toFixed(1)}%</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-gray-500 py-8">No payment data available</p>
                    )}
                </div>
            </div>

            {/* Forecast */}
            {forecastData.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">📈 Revenue Forecast (Next 3 Months)</h3>
                    <div className="grid grid-cols-3 gap-4">
                        {forecastData.map(item => (
                            <div key={item.month} className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-4">
                                <p className="text-sm text-gray-600">{item.month}</p>
                                <p className="text-xl font-bold text-indigo-600">₦{Math.round(item.projected).toLocaleString()}</p>
                                <p className="text-xs text-gray-500 mt-1">Projected</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default FinanceDashboard;
