import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { Phone, Activity, BarChart3, Hash } from 'lucide-react';

interface USSDMenu {
    id: number;
    menu_code: string;
    menu_level: number;
    parent_menu_id: number | null;
    menu_text: string;
    menu_option: string;
    action_type: string;
    response_template: string;
    is_active: boolean;
}

interface USSDSession {
    id: number;
    session_id: string;
    phone_number: string;
    started_at: string;
    last_interaction: string;
    status: string;
    ussd_menu_structure?: {
        menu_text: string;
    };
}

interface USSDTransaction {
    id: number;
    phone_number: string;
    transaction_type: string;
    amount: number;
    status: string;
    created_at: string;
}

const USSDWorkflow: React.FC = () => {
    const [menus, setMenus] = useState<USSDMenu[]>([]);
    const [sessions, setSessions] = useState<USSDSession[]>([]);
    const [transactions, setTransactions] = useState<USSDTransaction[]>([]);
    const [activeTab, setActiveTab] = useState<'structure' | 'sessions' | 'analytics'>('structure');
    const [loading, setLoading] = useState(true);

    // Stats
    const [totalSessions, setTotalSessions] = useState(0);
    const [activeSessions, setActiveSessions] = useState(0);
    const [completedSessions, setCompletedSessions] = useState(0);
    const [totalTransactions, setTotalTransactions] = useState(0);

    useEffect(() => {
        fetchMenus();
        fetchSessions();
        fetchTransactions();
        fetchStats();
    }, []);

    const fetchMenus = async () => {
        try {
            const { data, error } = await supabase
                .from('ussd_menu_structure')
                .select('*')
                .order('menu_level', { ascending: true })
                .order('menu_option', { ascending: true });

            if (error) throw error;
            setMenus(data || []);
        } catch (error: any) {
            console.error('Error fetching menus:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSessions = async () => {
        try {
            const { data, error } = await supabase
                .from('ussd_sessions')
                .select(`
          *,
          ussd_menu_structure (menu_text)
        `)
                .order('started_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            setSessions(data || []);
        } catch (error: any) {
            console.error('Error fetching sessions:', error);
        }
    };

    const fetchTransactions = async () => {
        try {
            const { data, error } = await supabase
                .from('ussd_transactions')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            setTransactions(data || []);
        } catch (error: any) {
            console.error('Error fetching transactions:', error);
        }
    };

    const fetchStats = async () => {
        try {
            const today = new Date();
            const thirtyDaysAgo = new Date(today.setDate(today.getDate() - 30));

            // Total sessions in last 30 days
            const { count: total } = await supabase
                .from('ussd_sessions')
                .select('*', { count: 'exact', head: true })
                .gte('started_at', thirtyDaysAgo.toISOString());

            setTotalSessions(total || 0);

            // Active sessions
            const { count: active } = await supabase
                .from('ussd_sessions')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'Active');

            setActiveSessions(active || 0);

            // Completed sessions
            const { count: completed } = await supabase
                .from('ussd_sessions')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'Completed')
                .gte('started_at', thirtyDaysAgo.toISOString());

            setCompletedSessions(completed || 0);

            // Total transactions
            const { count: txns } = await supabase
                .from('ussd_transactions')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', thirtyDaysAgo.toISOString());

            setTotalTransactions(txns || 0);

        } catch (error: any) {
            console.error('Error fetching stats:', error);
        }
    };

    const getStatusColor = (status: string) => {
        const colors: { [key: string]: string } = {
            Active: 'bg-green-100 text-green-800',
            Completed: 'bg-blue-100 text-blue-800',
            Timeout: 'bg-yellow-100 text-yellow-800',
            Error: 'bg-red-100 text-red-800'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    const getTransactionStatusColor = (status: string) => {
        const colors: { [key: string]: string } = {
            Initiated: 'bg-yellow-100 text-yellow-800',
            Completed: 'bg-green-100 text-green-800',
            Failed: 'bg-red-100 text-red-800',
            Cancelled: 'bg-gray-100 text-gray-800'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    const completionRate = totalSessions > 0 ? ((completedSessions / totalSessions) * 100).toFixed(0) : 0;

    if (loading) {
        return <div className="flex justify-center items-center h-64"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>;
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white mb-6">
                <h1 className="text-3xl font-bold mb-2">📞 USSD Workflow Manager</h1>
                <p className="text-blue-100">Feature phone access via *347*123#</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <div className="flex items-center space-x-3">
                        <div className="p-3 bg-blue-100 rounded-lg">
                            <Phone className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{totalSessions}</p>
                            <p className="text-sm text-gray-600">Sessions (30d)</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6">
                    <div className="flex items-center space-x-3">
                        <div className="p-3 bg-green-100 rounded-lg">
                            <Activity className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{activeSessions}</p>
                            <p className="text-sm text-gray-600">Active Now</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6">
                    <div className="flex items-center space-x-3">
                        <div className="p-3 bg-purple-100 rounded-lg">
                            <BarChart3 className="h-6 w-6 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{completionRate}%</p>
                            <p className="text-sm text-gray-600">Completion Rate</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6">
                    <div className="flex items-center space-x-3">
                        <div className="p-3 bg-orange-100 rounded-lg">
                            <Hash className="h-6 w-6 text-orange-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{totalTransactions}</p>
                            <p className="text-sm text-gray-600">Transactions</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-2 mb-6">
                <button
                    onClick={() => setActiveTab('structure')}
                    className={`px-6 py-3 rounded-lg font-semibold transition-colors ${activeTab === 'structure'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                >
                    Menu Structure
                </button>
                <button
                    onClick={() => setActiveTab('sessions')}
                    className={`px-6 py-3 rounded-lg font-semibold transition-colors ${activeTab === 'sessions'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                >
                    Sessions ({sessions.length})
                </button>
                <button
                    onClick={() => setActiveTab('analytics')}
                    className={`px-6 py-3 rounded-lg font-semibold transition-colors ${activeTab === 'analytics'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                >
                    Transactions ({transactions.length})
                </button>
            </div>

            {/* Menu Structure Tab */}
            {activeTab === 'structure' && (
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">USSD Menu Structure</h2>

                    <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                        <p className="font-semibold text-blue-900 mb-2">📱 Dial Code: *347*123#</p>
                        <p className="text-sm text-blue-700">This USSD shortcode allows parents with feature phones to access key features without internet.</p>
                    </div>

                    <div className="space-y-4">
                        {menus.filter(m => m.menu_level === 0).map(mainMenu => (
                            <div key={mainMenu.id} className="border border-gray-200 rounded-lg overflow-hidden">
                                <div className="bg-gray-50 p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="font-bold text-gray-900">Level 0: Main Menu</h3>
                                            <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{mainMenu.menu_text}</p>
                                        </div>
                                        <span className={`px-3 py-1 ${mainMenu.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'} rounded-full text-xs font-semibold`}>
                                            {mainMenu.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                </div>

                                {/* Sub-menus */}
                                <div className="p-4 space-y-2">
                                    {menus
                                        .filter(m => m.menu_level === 1 && m.parent_menu_id === mainMenu.id)
                                        .map(subMenu => (
                                            <div key={subMenu.id} className="pl-6 py-3 border-l-4 border-blue-400 bg-blue-50 rounded">
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <p className="font-semibold text-gray-900">
                                                            Option {subMenu.menu_option}: {subMenu.action_type}
                                                        </p>
                                                        <p className="text-sm text-gray-600 mt-1">{subMenu.menu_text}</p>
                                                    </div>
                                                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold ml-4 whitespace-nowrap">
                                                        {subMenu.action_type}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-700">
                            <strong>How it works:</strong> Parents dial *347*123# from any phone (no internet needed), navigate the menu using number keys, and access features like fee checking, attendance viewing, and small payments.
                        </p>
                    </div>
                </div>
            )}

            {/* Sessions Tab */}
            {activeTab === 'sessions' && (
                <div className="space-y-4">
                    {sessions.length === 0 ? (
                        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-500">
                            <Phone className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                            <p className="text-lg">No USSD sessions yet</p>
                            <p className="text-sm">Sessions will appear once users dial *347*123#</p>
                        </div>
                    ) : (
                        sessions.map(session => (
                            <div key={session.id} className="bg-white rounded-xl shadow-sm p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900">Session #{session.session_id.slice(0, 8)}...</h3>
                                        <p className="text-sm text-gray-600">{session.phone_number}</p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(session.status)}`}>
                                        {session.status}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                    <div>
                                        <p className="text-gray-500">Started</p>
                                        <p className="font-semibold text-gray-900">
                                            {new Date(session.started_at).toLocaleString()}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500">Last Interaction</p>
                                        <p className="font-semibold text-gray-900">
                                            {new Date(session.last_interaction).toLocaleString()}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500">Duration</p>
                                        <p className="font-semibold text-gray-900">
                                            {Math.round((new Date(session.last_interaction).getTime() - new Date(session.started_at).getTime()) / 1000)}s
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Transactions Tab */}
            {activeTab === 'analytics' && (
                <div className="space-y-4">
                    {transactions.length === 0 ? (
                        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-500">
                            <Hash className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                            <p className="text-lg">No USSD transactions yet</p>
                        </div>
                    ) : (
                        transactions.map(txn => (
                            <div key={txn.id} className="bg-white rounded-xl shadow-sm p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900">{txn.transaction_type}</h3>
                                        <p className="text-sm text-gray-600">{txn.phone_number}</p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getTransactionStatusColor(txn.status)}`}>
                                        {txn.status}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    {txn.amount && (
                                        <div>
                                            <p className="text-sm text-gray-500">Amount</p>
                                            <p className="text-lg font-bold text-gray-900">₦{txn.amount.toLocaleString()}</p>
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-sm text-gray-500">Date</p>
                                        <p className="text-sm font-semibold text-gray-900">
                                            {new Date(txn.created_at).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default USSDWorkflow;
