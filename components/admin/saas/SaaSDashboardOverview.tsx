import React from 'react';
import { useSaaS } from '../../../contexts/SaaSContext';
import { TrendingUp, Users, Building, AlertCircle, DollarSign } from 'lucide-react';

interface OverviewProps {
    navigateTo: (view: string, title: string) => void;
}

const SaaSDashboardOverview: React.FC<OverviewProps> = ({ navigateTo }) => {
    const { stats, loading } = useSaaS();

    if (loading) return <div className="p-8 text-center text-gray-500">Loading SaaS metrics...</div>;

    const cards = [
        { title: "Monthly Recurring Revenue", value: `$${(stats?.totalRevenue || 0).toFixed(2)}`, icon: DollarSign, color: "bg-green-100 text-green-600" },
        { title: "Total Schools", value: stats?.totalSchools || 0, icon: Building, color: "bg-blue-100 text-blue-600" },
        { title: "Active Subscriptions", value: stats?.activeSubscriptions || 0, icon: TrendingUp, color: "bg-purple-100 text-purple-600" },
        { title: "Pending Approvals", value: "0", icon: AlertCircle, color: "bg-amber-100 text-amber-600" }, // Mock pending
    ];

    return (
        <div className="p-4 sm:p-6 bg-gray-50/50 min-h-full">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-6">SaaS Control Center</h1>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
                {cards.map((card, idx) => (
                    <div key={idx} className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                        <div>
                            <p className="text-xs sm:text-sm font-medium text-gray-500 mb-1">{card.title}</p>
                            <h3 className="text-xl sm:text-2xl font-black text-gray-900">{card.value}</h3>
                        </div>
                        <div className={`p-2 sm:p-3 rounded-lg ${card.color}`}>
                            <card.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="font-bold text-gray-800 mb-4 text-base sm:text-lg">Quick Actions</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <button onClick={() => navigateTo('schools', 'Manage Schools')} className="p-3 sm:p-4 bg-indigo-50 hover:bg-indigo-100 rounded-lg text-indigo-700 font-medium text-left transition text-sm sm:text-base">
                            Manage Schools
                        </button>
                        <button onClick={() => navigateTo('plans', 'Manage Plans')} className="p-3 sm:p-4 bg-purple-50 hover:bg-purple-100 rounded-lg text-purple-700 font-medium text-left transition text-sm sm:text-base">
                            Subscription Plans
                        </button>
                    </div>
                </div>

                <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="font-bold text-gray-800 mb-4 text-base sm:text-lg">System Health</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Database Status</span>
                            <span className="text-green-600 font-bold bg-green-50 px-2 py-1 rounded">Operational</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">API Latency</span>
                            <span className="text-gray-900 font-bold">45ms</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SaaSDashboardOverview;
