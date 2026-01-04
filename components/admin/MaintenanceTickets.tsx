import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { WrenchIcon, AlertCircleIcon, CheckCircleIcon, ClockIcon } from 'lucide-react';

const MaintenanceTickets = () => {
    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTickets();
    }, []);

    const fetchTickets = async () => {
        try {
            const { data, error } = await supabase
                .from('maintenance_tickets')
                .select('*, assets(asset_name)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setTickets(data || []);
        } catch (error) {
            console.error('Error fetching tickets:', error);
            // toast.error('Failed to load tickets'); // Suppress for empty tables
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Maintenance Tickets</h2>
                        <p className="text-sm text-gray-500">Track repairs and equipment issues</p>
                    </div>
                    <button className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                        <WrenchIcon size={20} />
                        <span>New Request</span>
                    </button>
                </div>

                {loading ? (
                    <div className="py-8 text-center text-gray-500">Loading tickets...</div>
                ) : (
                    <div className="overflow-hidden">
                        {tickets.length === 0 ? (
                            <div className="text-center py-12 bg-gray-50 rounded-lg">
                                <CheckCircleIcon className="mx-auto text-green-400 mb-3" size={48} />
                                <h3 className="text-lg font-medium text-gray-900">All Systems Go!</h3>
                                <p className="text-gray-500">No open maintenance tickets at the moment.</p>
                            </div>
                        ) : (
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ticket #</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asset</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issue</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {tickets.map((ticket) => (
                                        <tr key={ticket.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600">
                                                {ticket.ticket_number}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {ticket.assets?.asset_name || 'Unknown Asset'}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                <div className="font-medium text-gray-900">{ticket.issue_title}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ticket.priority === 'Urgent' ? 'bg-red-100 text-red-800' :
                                                        ticket.priority === 'High' ? 'bg-orange-100 text-orange-800' :
                                                            'bg-blue-100 text-blue-800'
                                                    }`}>
                                                    {ticket.priority}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ticket.status === 'Resolved' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                                    }`}>
                                                    {ticket.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MaintenanceTickets;
