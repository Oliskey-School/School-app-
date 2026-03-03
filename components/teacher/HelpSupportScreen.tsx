import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import {
    HelpingHandIcon,
    PlusIcon,
    SendIcon,
    CheckCircleIcon,
    ClockIcon,
    ExclamationCircleIcon
} from '../../constants';

const HelpSupportScreen: React.FC = () => {
    const { user, currentSchool } = useAuth();
    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showNewTicketModal, setShowNewTicketModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: 'General',
        priority: 'Low'
    });

    useEffect(() => {
        fetchTickets();
    }, [user]);

    const fetchTickets = async () => {
        if (!user) return;
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('support_tickets')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setTickets(data || []);
        } catch (error) {
            console.error('Error fetching tickets:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !currentSchool) return;

        try {
            setSubmitting(true);
            await api.createSupportTicket({
                school_id: currentSchool.id,
                user_id: user.id,
                ...formData
            });

            toast.success('Support ticket submitted successfully');
            setShowNewTicketModal(false);
            setFormData({ title: '', description: '', category: 'General', priority: 'Low' });
            fetchTickets();
        } catch (error: any) {
            toast.error('Failed to submit ticket: ' + error.message);
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'Open': return <ExclamationCircleIcon className="w-5 h-5 text-blue-500" />;
            case 'In Progress': return <ClockIcon className="w-5 h-5 text-yellow-500" />;
            case 'Resolved': return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
            default: return <ClockIcon className="w-5 h-5 text-gray-400" />;
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Help & Support</h2>
                    <p className="text-sm text-gray-600 mt-1">Submit tickets and get assistance from the administration</p>
                </div>
                <button
                    onClick={() => setShowNewTicketModal(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-sm"
                >
                    <PlusIcon className="w-5 h-5" />
                    <span>New Ticket</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Knowledge Base Card */}
                <div className="col-span-1 md:col-span-1 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <HelpingHandIcon className="w-10 h-10 text-indigo-500 mb-4" />
                    <h3 className="text-lg font-bold text-gray-900 mb-2">KB / Documentation</h3>
                    <p className="text-sm text-gray-600 mb-4">Find answers to common questions in our documentation portal.</p>
                    <button className="w-full py-2 bg-gray-50 text-indigo-600 font-semibold rounded-lg hover:bg-indigo-50 transition-colors">
                        Browse Guides
                    </button>
                </div>

                {/* Tickets List */}
                <div className="col-span-1 md:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                        <h3 className="font-bold text-gray-900 text-lg">My Support Tickets</h3>
                    </div>

                    <div className="divide-y divide-gray-100">
                        {loading ? (
                            <div className="p-12 text-center text-gray-400">Loading tickets...</div>
                        ) : tickets.length === 0 ? (
                            <div className="p-12 text-center text-gray-400">
                                <SendIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                <p>No tickets found. Need help? Create one!</p>
                            </div>
                        ) : (
                            tickets.map(ticket => (
                                <div key={ticket.id} className="p-6 hover:bg-gray-50 transition-colors cursor-pointer group">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-2 mb-1">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${ticket.priority === 'High' || ticket.priority === 'Urgent' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
                                                    }`}>
                                                    {ticket.priority}
                                                </span>
                                                <h4 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{ticket.title}</h4>
                                            </div>
                                            <p className="text-sm text-gray-600 line-clamp-2">{ticket.description}</p>
                                            <div className="flex items-center space-x-4 mt-3 text-xs text-gray-400">
                                                <span>Category: {ticket.category}</span>
                                                <span>ID: {ticket.id.split('-')[0]}</span>
                                                <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        <div className="ml-4 flex flex-col items-end">
                                            <div className="flex items-center space-x-1.5 px-2 py-1 rounded bg-slate-50 border border-slate-100">
                                                {getStatusIcon(ticket.status)}
                                                <span className="text-xs font-bold text-gray-700">{ticket.status}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* New Ticket Modal */}
            {showNewTicketModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-indigo-600 text-white">
                            <h3 className="text-xl font-bold">New Support Request</h3>
                            <button onClick={() => setShowNewTicketModal(false)} className="hover:bg-white/20 p-1 rounded-full text-white transition-colors">
                                <SendIcon className="w-5 h-5 rotate-45" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Issue Title</label>
                                <input
                                    required
                                    type="text"
                                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                    placeholder="Brief summary of the issue"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Category</label>
                                    <select
                                        className="w-full px-4 py-2 rounded-xl border border-gray-200"
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                    >
                                        <option value="General">General</option>
                                        <option value="Technical">Technical</option>
                                        <option value="Payroll">Payroll</option>
                                        <option value="Academic">Academic</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Priority</label>
                                    <select
                                        className="w-full px-4 py-2 rounded-xl border border-gray-200"
                                        value={formData.priority}
                                        onChange={e => setFormData({ ...formData, priority: e.target.value })}
                                    >
                                        <option value="Low">Low</option>
                                        <option value="Medium">Medium</option>
                                        <option value="High">High</option>
                                        <option value="Urgent">Urgent</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
                                <textarea
                                    required
                                    className="w-full px-4 py-2 rounded-xl border border-gray-200 h-32 resize-none"
                                    placeholder="Provide more details about the problem..."
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                            <div className="pt-4 flex space-x-3">
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition-all disabled:opacity-50"
                                >
                                    {submitting ? 'Submitting...' : 'Send Ticket'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowNewTicketModal(false)}
                                    className="px-6 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HelpSupportScreen;
