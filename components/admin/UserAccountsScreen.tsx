
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { SearchIcon, UserIcon, RefreshIcon } from '../../constants'; // Assume RefreshIcon exists or use generic icon

interface AuthAccount {
    id: string;
    username: string;
    user_type: string;
    email: string;
    user_id: number | null;
    created_at: string;
    is_active: boolean;
    name?: string;
}

const UserAccountsScreen: React.FC = () => {
    const [accounts, setAccounts] = useState<AuthAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());

    const fetchAccounts = React.useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('auth_accounts')
                .select(`
                    *,
                    user:users ( name )
                `);

            if (error) throw error;

            if (data) {
                const mapped = data.map((acc: any) => ({
                    ...acc,
                    name: acc.user?.name || 'Create via Auth'
                }));
                setAccounts(mapped);
            }
        } catch (err) {
            console.error("Error fetching accounts:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // Initial fetch
        fetchAccounts();

        // Realtime Subscription
        const subscription = supabase
            .channel('public:auth_accounts')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'auth_accounts' }, (payload) => {
                console.log('Realtime change received:', payload);
                fetchAccounts();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [fetchAccounts]);

    // Helper function...

    // Toggle user active status
    const toggleUserStatus = async (accountId: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from('auth_accounts')
                .update({ is_active: !currentStatus })
                .eq('id', accountId);

            if (error) {
                console.error('Error updating user status:', error);
                alert('Failed to update user status. Please try again.');
                return;
            }

            // Update local state
            setAccounts(prev => prev.map(acc =>
                acc.id === accountId ? { ...acc, is_active: !currentStatus } : acc
            ));
        } catch (err) {
            console.error('Error toggling user status:', err);
            alert('An error occurred while updating user status.');
        }
    };

    const filteredAccounts = useMemo(() =>
        accounts.filter(acc =>
            (acc.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (acc.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (acc.email || '').toLowerCase().includes(searchTerm.toLowerCase())
        ),
        [accounts, searchTerm]);

    if (loading) return <div className="p-10 text-center">Loading accounts...</div>;

    return (
        <div className="flex flex-col h-full bg-gray-50">
            <div className="p-4 bg-white border-b border-gray-200">
                <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3"><SearchIcon className="text-gray-400" /></span>
                    <input
                        type="text"
                        placeholder="Search accounts..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-sky-500 focus:border-sky-500"
                    />
                </div>
            </div>

            <div className="flex-grow overflow-y-auto p-4">
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Password</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredAccounts.map(account => (
                                <tr key={account.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="h-10 w-10 flex-shrink-0 bg-gray-100 rounded-full flex items-center justify-center">
                                                <UserIcon className="h-5 w-5 text-gray-500" />
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900">{account.name}</div>
                                                <div className="text-sm text-gray-500">{account.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {account.username}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                            ${account.user_type === 'Student' ? 'bg-sky-100 text-sky-800' :
                                                account.user_type === 'Teacher' ? 'bg-purple-100 text-purple-800' :
                                                    account.user_type === 'Parent' ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-800'}`}>
                                            {account.user_type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono bg-gray-50 px-2 py-1 rounded border border-gray-200">
                                                {visiblePasswords.has(account.id)
                                                    ? getExpectedPassword(account.name || '')
                                                    : '••••••••'}
                                            </span>
                                            <button
                                                className="text-gray-600 hover:text-gray-800 p-1 hover:bg-gray-100 rounded"
                                                onClick={() => togglePasswordVisibility(account.id)}
                                                title={visiblePasswords.has(account.id) ? "Hide password" : "Show password"}
                                            >
                                                {visiblePasswords.has(account.id) ? (
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                                    </svg>
                                                ) : (
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                )}
                                            </button>
                                            <button
                                                className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                                                onClick={() => alert(`Password reset for ${account.username} sent to ${account.email}`)}
                                            >
                                                Reset
                                            </button>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${account.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {account.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <button
                                            onClick={() => toggleUserStatus(account.id, account.is_active)}
                                            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${account.is_active
                                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                                                }`}
                                        >
                                            {account.is_active ? 'Deactivate' : 'Activate'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredAccounts.length === 0 && (
                        <div className="text-center py-10 text-gray-500">No accounts found matching your search.</div>
                    )}
                </div>
                <div className="mt-4 text-xs text-gray-500 bg-blue-50 p-3 rounded-lg border border-blue-100">
                    <p className="font-semibold text-blue-800">Note on Passwords:</p>
                    <p>User passwords follow a pattern: <span className="font-mono bg-white px-1 rounded">surname + "1234"</span>. Click the eye icon to view/hide the generated password for each user. For security, passwords are encrypted in the database. If a user needs a new password, use the "Reset" button.</p>
                </div>
            </div>
        </div>
    );
};

export default UserAccountsScreen;
