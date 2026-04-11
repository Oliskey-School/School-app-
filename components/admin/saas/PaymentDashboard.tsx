import React, { useState, useEffect } from 'react';
import { api } from '../../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import {
    DollarSign,
    TrendingUp,
    AlertCircle,
    CheckCircle,
    XCircle,
    Clock,
    Download,
    Search,
    Filter,
    FileText,
    CreditCard
} from 'lucide-react';

interface Payment {
    id: string;
    school_id: string;
    subscription_id: string | null;
    amount: number;
    currency: string;
    status: 'pending' | 'completed' | 'failed' | 'refunded';
    payment_method: string;
    transaction_reference: string;
    created_at: string;
    completed_at: string | null;
    school_name?: string;
}

interface PaymentStats {
    totalRevenue: number;
    completedPayments: number;
    pendingPayments: number;
    failedPayments: number;
    monthlyRevenue: number;
}

interface PaymentDashboardProps {
    navigateTo?: (screen: string) => void;
}

export const PaymentDashboard: React.FC<PaymentDashboardProps> = ({ navigateTo }) => {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'completed' | 'pending' | 'failed' | 'refunded'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [stats, setStats] = useState<PaymentStats>({
        totalRevenue: 0,
        completedPayments: 0,
        pendingPayments: 0,
        failedPayments: 0,
        monthlyRevenue: 0
    });

    useEffect(() => {
        fetchPayments();
    }, []);

    const fetchPayments = async () => {
        try {
            setLoading(true);

            // Fetch payments with school details
            const { data, error } = await api
                .from('payments')
                .select(`
                    *,
                    schools (name)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const formatted = data?.map(payment => ({
                ...payment,
                school_name: payment.schools?.name || 'Unknown School'
            })) || [];

            setPayments(formatted);

            // Calculate stats
            const completed = formatted.filter(p => p.status === 'completed');
            const totalRevenue = completed.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);

            // Calculate monthly revenue (last 30 days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const monthlyRevenue = completed
                .filter(p => new Date(p.created_at) > thirtyDaysAgo)
                .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);

            setStats({
                totalRevenue,
                completedPayments: completed.length,
                pendingPayments: formatted.filter(p => p.status === 'pending').length,
                failedPayments: formatted.filter(p => p.status === 'failed').length,
                monthlyRevenue
            });

        } catch (error) {
            console.error('Error fetching payments:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateInvoice = async (payment: Payment) => {
        try {
            // Check if invoice already exists
            const { data: existingInvoice } = await api
                .from('invoices')
                .select('id')
                .eq('school_id', payment.school_id)
                .eq('subscription_id', payment.subscription_id)
                .single();

            if (existingInvoice) {
                alert('Invoice already exists for this payment');
                return;
            }

            // Generate invoice number
            const { data: invoiceNumberData } = await api
                .rpc('generate_invoice_number');

            const invoiceNumber = invoiceNumberData || `INV-${Date.now()}`;

            // Create invoice
            const { error } = await api
                .from('invoices')
                .insert({
                    school_id: payment.school_id,
                    subscription_id: payment.subscription_id,
                    invoice_number: invoiceNumber,
                    amount: payment.amount,
                    due_date: new Date().toISOString().split('T')[0],
                    status: payment.status === 'completed' ? 'paid' : 'sent',
                    paid_at: payment.completed_at
                });

            if (error) throw error;

            alert(`Invoice ${invoiceNumber} generated successfully!`);
        } catch (error) {
            console.error('Error generating invoice:', error);
            alert('Failed to generate invoice');
        }
    };

    const filteredPayments = payments.filter(payment => {
        const matchesFilter = filter === 'all' || payment.status === filter;
        const matchesSearch = payment.school_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            payment.transaction_reference?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed': return <CheckCircle className="w-5 h-5 text-green-500" />;
            case 'pending': return <Clock className="w-5 h-5 text-orange-500" />;
            case 'failed': return <XCircle className="w-5 h-5 text-red-500" />;
            case 'refunded': return <AlertCircle className="w-5 h-5 text-blue-500" />;
            default: return null;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-green-100 text-green-800';
            case 'pending': return 'bg-orange-100 text-orange-800';
            case 'failed': return 'bg-red-100 text-red-800';
            case 'refunded': return 'bg-blue-100 text-blue-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const formatCurrency = (amount: number, currency: string = 'NGN') => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: currency
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const exportToCSV = () => {
        const headers = ['School Name', 'Amount', 'Currency', 'Status', 'Payment Method', 'Transaction Ref', 'Date'];
        const rows = filteredPayments.map(payment => [
            payment.school_name,
            payment.amount,
            payment.currency,
            payment.status,
            payment.payment_method || 'N/A',
            payment.transaction_reference || 'N/A',
            formatDate(payment.created_at)
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `payments_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Payment Dashboard</h1>
                    <p className="text-gray-600 mt-1">Track and manage all payment transactions</p>
                </div>
                <button
                    onClick={exportToCSV}
                    className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total Revenue"
                    value={formatCurrency(stats.totalRevenue)}
                    icon={<DollarSign className="w-6 h-6 text-green-600" />}
                    color="bg-green-50"
                    trend="+12% from last month"
                />
                <StatCard
                    title="Monthly Revenue"
                    value={formatCurrency(stats.monthlyRevenue)}
                    icon={<TrendingUp className="w-6 h-6 text-blue-600" />}
                    color="bg-blue-50"
                    trend="Last 30 days"
                />
                <StatCard
                    title="Completed Payments"
                    value={stats.completedPayments.toString()}
                    icon={<CheckCircle className="w-6 h-6 text-green-600" />}
                    color="bg-green-50"
                />
                <StatCard
                    title="Pending Payments"
                    value={stats.pendingPayments.toString()}
                    icon={<Clock className="w-6 h-6 text-orange-600" />}
                    color="bg-orange-50"
                />
            </div>

            {/* Filters and Search */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Search */}
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by school or transaction reference..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                        </div>

                        {/* Filter */}
                        <div className="flex items-center gap-2">
                            <Filter className="w-5 h-5 text-gray-400" />
                            <select
                                value={filter}
                                onChange={(e) => setFilter(e.target.value as any)}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            >
                                <option value="all">All Status</option>
                                <option value="completed">Completed</option>
                                <option value="pending">Pending</option>
                                <option value="failed">Failed</option>
                                <option value="refunded">Refunded</option>
                            </select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Payments Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Payment Transactions ({filteredPayments.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center items-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                        </div>
                    ) : filteredPayments.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            No payments found
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">School</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction Ref</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredPayments.map((payment) => (
                                        <tr key={payment.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="font-medium text-gray-900">{payment.school_name}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="font-semibold text-gray-900">
                                                    {formatCurrency(payment.amount, payment.currency)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    {getStatusIcon(payment.status)}
                                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(payment.status)}`}>
                                                        {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-1">
                                                    <CreditCard className="w-4 h-4 text-gray-400" />
                                                    <span className="text-sm text-gray-600">
                                                        {payment.payment_method || 'N/A'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {payment.transaction_reference || 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {formatDate(payment.created_at)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <button
                                                    onClick={() => handleGenerateInvoice(payment)}
                                                    className="flex items-center gap-1 px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
                                                >
                                                    <FileText className="w-4 h-4" />
                                                    Invoice
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

// Helper Component
const StatCard: React.FC<{
    title: string;
    value: string;
    icon: React.ReactNode;
    color: string;
    trend?: string;
}> = ({ title, value, icon, color, trend }) => (
    <Card>
        <CardContent className="p-4">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-600">{title}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
                    {trend && <p className="text-xs text-gray-500 mt-1">{trend}</p>}
                </div>
                <div className={`p-3 rounded-lg ${color}`}>
                    {icon}
                </div>
            </div>
        </CardContent>
    </Card>
);

export default PaymentDashboard;

