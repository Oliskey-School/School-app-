import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';
import { Wrench, CheckCircle2 } from 'lucide-react';

const CATEGORIES = ['Furniture', 'Electrical', 'Plumbing', 'Water Leakage', 'HVAC/Fan', 'Other'];

const STATUS_STYLES: Record<string, string> = {
    Pending: 'bg-gray-100 text-gray-600',
    'In Progress': 'bg-amber-50 text-amber-700',
    Completed: 'bg-green-50 text-green-700',
};

const ReportMaintenanceIssue = () => {
    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({ issue_title: '', location: '', category: 'Other', priority: 'Medium', issue_description: '' });

    const fetchMine = async () => {
        try {
            const data = await api.getMaintenanceTickets(undefined, true);
            setTickets(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error loading my maintenance reports:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchMine(); }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.issue_title.trim() || !form.location.trim()) { toast.error('A description and location are required'); return; }
        setSubmitting(true);
        try {
            await api.createMaintenanceTicket(form);
            toast.success('Reported — maintenance has been notified');
            setForm({ issue_title: '', location: '', category: 'Other', priority: 'Medium', issue_description: '' });
            fetchMine();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to submit report');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="p-6 max-w-2xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 font-outfit">Report an Issue</h1>
                <p className="text-gray-500">Broken chairs, fans, electrical faults, leaks — let maintenance know.</p>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3">
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

            <div>
                <h2 className="font-bold text-gray-900 mb-3">My Reports</h2>
                {loading ? (
                    <p className="text-sm text-gray-400">Loading...</p>
                ) : tickets.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
                        <Wrench className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-400">You haven't reported anything yet.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {tickets.map(t => (
                            <div key={t.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center justify-between gap-3">
                                <div>
                                    <p className="font-semibold text-gray-900 text-sm">{t.issue_title}</p>
                                    <p className="text-xs text-gray-400">{t.location || t.asset?.name} · {t.ticket_number}</p>
                                </div>
                                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_STYLES[t.status] || 'bg-gray-100 text-gray-600'}`}>
                                    {t.status === 'Completed' && <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />}
                                    {t.status}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReportMaintenanceIssue;
