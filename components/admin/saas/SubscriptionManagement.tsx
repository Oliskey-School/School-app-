import React, { useState, useEffect } from 'react';
import { api } from '../../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import {
    Calendar,
    CreditCard,
    AlertCircle,
    CheckCircle,
    XCircle,
    Clock,
    RefreshCw,
    Search,
    Filter,
    Download,
    CreditCard as PaymentIcon,
    Globe
} from 'lucide-react';
import { initializePaystackPayment, initializeFlutterwavePayment } from '../../../lib/paymentGateways';
import { toast } from 'react-hot-toast';


interface Subscription {
    id: string;
    school_id: string;
    plan_id: number;
    status: 'active' | 'past_due' | 'canceled' | 'trial';
    current_period_start: string;
    current_period_end: string;
    trial_ends_at: string | null;
    auto_renew: boolean;
    school_name?: string;
    plan_name?: string;
    contact_email?: string;
}

interface SubscriptionManagementProps {
    navigateTo?: (screen: string) => void;
}

export const SubscriptionManagement: React.FC<SubscriptionManagementProps> = ({ navigateTo }) => {
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'active' | 'trial' | 'past_due' | 'canceled'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        trial: 0,
        past_due: 0,
        canceled: 0
    });

    useEffect(() => {
        fetchSubscriptions();
    }, []);

    const fetchSubscriptions = async () => {
        try {
            setLoading(true);

            // Fetch subscriptions with school and plan details
            const { data, error } = await api
                .from('subscriptions')
                .select(`
                    *,
                    schools (name, email),
                    plans (name)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const formatted = data?.map(sub => ({
                ...sub,
                school_name: sub.schools?.name || 'Unknown School',
                contact_email: sub.schools?.email || 'admin@school.com',
                plan_name: sub.plans?.name || 'Unknown Plan'
            })) || [];

            setSubscriptions(formatted);

            // Calculate stats
            const statsData = {
                total: formatted.length,
                active: formatted.filter(s => s.status === 'active').length,
                trial: formatted.filter(s => s.status === 'trial').length,
                past_due: formatted.filter(s => s.status === 'past_due').length,
                canceled: formatted.filter(s => s.status === 'canceled').length
            };
            setStats(statsData);

        } catch (error) {
            console.error('Error fetching subscriptions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRenewSubscription = async (subscription: Subscription) => {
        const gateway = confirm('Renew with Paystack? (Cancel for Flutterwave)') ? 'paystack' : 'flutterwave';

        try {
            const config = {
                email: subscription.contact_email || 'admin@school.com',
                amount: 50000, // Monthly fee example in NGN
                currency: 'NGN',
                reference: `RNW-${subscription.id}-${Date.now()}`,
                callback_url: window.location.href,
                metadata: { subscriptionId: subscription.id }
            };

            if (gateway === 'paystack') {
                initializePaystackPayment(config);
            } else {
                initializeFlutterwavePayment(config);
            }

            toast.success(`Redirecting to ${gateway}...`);
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleCancelSubscription = async (subscriptionId: string) => {
        if (!confirm('Are you sure you want to cancel this subscription?')) return;

        try {
            const { error } = await api
                .from('subscriptions')
                .update({
                    status: 'canceled',
                    canceled_at: new Date().toISOString(),
                    auto_renew: false,
                    updated_at: new Date().toISOString()
                })
                .eq('id', subscriptionId);

            if (error) throw error;

            fetchSubscriptions();
            alert('Subscription canceled successfully!');
        } catch (error) {
            console.error('Error canceling subscription:', error);
            alert('Failed to cancel subscription');
        }
    };

    const filteredSubscriptions = subscriptions.filter(sub => {
        const matchesFilter = filter === 'all' || sub.status === filter;
        const matchesSearch = sub.school_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            sub.plan_name?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'active': return <CheckCircle className="w-5 h-5 text-green-500" />;
            case 'trial': return <Clock className="w-5 h-5 text-blue-500" />;
            case 'past_due': return <AlertCircle className="w-5 h-5 text-orange-500" />;
            case 'canceled': return <XCircle className="w-5 h-5 text-red-500" />;
            default: return null;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-green-100 text-green-800';
            case 'trial': return 'bg-blue-100 text-blue-800';
            case 'past_due': return 'bg-orange-100 text-orange-800';
            case 'canceled': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const exportToCSV = () => {
        const headers = ['School Name', 'Plan', 'Status', 'Start Date', 'End Date', 'Auto Renew'];
        const rows = filteredSubscriptions.map(sub => [
            sub.school_name,
            sub.plan_name,
            sub.status,
            formatDate(sub.current_period_start),
            formatDate(sub.current_period_end),
            sub.auto_renew ? 'Yes' : 'No'
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `subscriptions_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Subscription Management</h1>
                    <p className="text-gray-600 mt-1">Manage and monitor all school subscriptions</p>
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
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <StatCard
                    title="Total Subscriptions"
                    value={stats.total}
                    icon={<CreditCard className="w-6 h-6 text-indigo-600" />}
                    color="bg-indigo-50"
                />
                <StatCard
                    title="Active"
                    value={stats.active}
                    icon={<CheckCircle className="w-6 h-6 text-green-600" />}
                    color="bg-green-50"
                />
                <StatCard
                    title="Trial"
                    value={stats.trial}
                    icon={<Clock className="w-6 h-6 text-blue-600" />}
                    color="bg-blue-50"
                />
                <StatCard
                    title="Past Due"
                    value={stats.past_due}
                    icon={<AlertCircle className="w-6 h-6 text-orange-600" />}
                    color="bg-orange-50"
                />
                <StatCard
                    title="Canceled"
                    value={stats.canceled}
                    icon={<XCircle className="w-6 h-6 text-red-600" />}
                    color="bg-red-50"
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
                                placeholder="Search by school or plan name..."
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
                                <option value="active">Active</option>
                                <option value="trial">Trial</option>
                                <option value="past_due">Past Due</option>
                                <option value="canceled">Canceled</option>
                            </select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Subscriptions Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span>Subscriptions ({filteredSubscriptions.length})</span>
                        <button
                            onClick={fetchSubscriptions}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <RefreshCw className="w-5 h-5 text-gray-600" />
                        </button>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center items-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                        </div>
                    ) : filteredSubscriptions.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            No subscriptions found
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">School</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Auto Renew</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredSubscriptions.map((sub) => (
                                        <tr key={sub.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="font-medium text-gray-900">{sub.school_name}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-800 rounded-full">
                                                    {sub.plan_name}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    {getStatusIcon(sub.status)}
                                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(sub.status)}`}>
                                                        {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="w-4 h-4" />
                                                    {formatDate(sub.current_period_start)} - {formatDate(sub.current_period_end)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${sub.auto_renew ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                    {sub.auto_renew ? 'Yes' : 'No'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <div className="flex items-center gap-2">
                                                    {sub.status !== 'active' && sub.status !== 'canceled' && (
                                                        <button
                                                            onClick={() => handleRenewSubscription(sub)}
                                                            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                                                        >
                                                            Renew
                                                        </button>
                                                    )}
                                                    {sub.status !== 'canceled' && (
                                                        <button
                                                            onClick={() => handleCancelSubscription(sub.id)}
                                                            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                                                        >
                                                            Cancel
                                                        </button>
                                                    )}
                                                </div>
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
const StatCard: React.FC<{ title: string; value: number; icon: React.ReactNode; color: string }> = ({ title, value, icon, color }) => (
    <Card>
        <CardContent className="p-4">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-600">{title}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
                </div>
                <div className={`p-3 rounded-lg ${color}`}>
                    {icon}
                </div>
            </div>
        </CardContent>
    </Card>
);

export default SubscriptionManagement;

