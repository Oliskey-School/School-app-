import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';
import { WrenchIcon, CheckCircleIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAutoSync } from '../../hooks/useAutoSync';

const CATEGORIES = ['Furniture', 'Electrical', 'Plumbing', 'Water Leakage', 'HVAC/Fan', 'Other'];
const STATUS_FLOW: Record<string, string[]> = { Pending: ['In Progress', 'Completed'], 'In Progress': ['Completed', 'Pending'], Completed: [] };

const MaintenanceTickets = () => {
    const { currentSchool, currentBranchId } = useAuth() as any;
    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [form, setForm] = useState({ issue_title: '', location: '', category: 'Other', priority: 'Medium', issue_description: '' });

    useEffect(() => {
        if (!currentSchool) return;
        fetchTickets();
    }, [currentSchool, currentBranchId]);

    useAutoSync(['maintenance_tickets'], () => {
        fetchTickets();
    });

    const fetchTickets = async () => {
        if (!currentSchool) return;
        try {
            setLoading(true);
            const data = await api.getMaintenanceTickets(currentBranchId || undefined);
            setTickets(data || []);
        } catch (error: any) {
            console.error('Error fetching tickets:', error);
            toast.error('Failed to load maintenance tickets');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.issue_title.trim() || !form.location.trim()) { toast.error('A description and location are required'); return; }
        setSubmitting(true);
        try {
            await api.createMaintenanceTicket(form);
            toast.success('Reported — maintenance has been notified');
            setForm({ issue_title: '', location: '', category: 'Other', priority: 'Medium', issue_description: '' });
            setShowForm(false);
            fetchTickets();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to submit report');
        } finally {
            setSubmitting(false);
        }
    };

    const handleStatusChange = async (id: string, status: string) => {
        setUpdatingId(id);
        try {
            await api.updateMaintenanceTicketStatus(id, status);
            fetchTickets();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to update status');
        } finally {
            setUpdatingId(null);
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
                    <button onClick={() => setShowForm(v => !v)} className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                        <WrenchIcon size={20} />
                        <span>New Request</span>
                    </button>
                </div>

                {showForm && (
                    <form onSubmit={handleSubmit} className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 mb-6 space-y-3">
                        <input value={form.issue_title} onChange={e => setForm(f => ({ ...f, issue_title: e.target.value }))}
                            placeholder="What's wrong? (e.g. Fan not working)" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
                        <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                            placeholder="Where? (e.g. JSS2A)" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
                        <div className="grid grid-cols-2 gap-3">
                            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400">
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400">
                                {['Low', 'Medium', 'High', 'Urgent'].map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <textarea value={form.issue_description} onChange={e => setForm(f => ({ ...f, issue_description: e.target.value }))}
                            placeholder="More detail (optional)" rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
                        <button type="submit" disabled={submitting} className="bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-60">
                            {submitting ? 'Submitting...' : 'Submit Report'}
                        </button>
                    </form>
                )}

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
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asset / Location</th>
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
                                                {ticket.asset?.name || ticket.location || 'Unspecified'}
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
                                                <div className="flex items-center justify-end gap-2">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ticket.status === 'Completed' ? 'bg-green-100 text-green-800' : ticket.status === 'In Progress' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-800'
                                                        }`}>
                                                        {ticket.status}
                                                    </span>
                                                    {STATUS_FLOW[ticket.status]?.map(next => (
                                                        <button key={next} disabled={updatingId === ticket.id} onClick={() => handleStatusChange(ticket.id, next)}
                                                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-50">
                                                            → {next}
                                                        </button>
                                                    ))}
                                                </div>
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
