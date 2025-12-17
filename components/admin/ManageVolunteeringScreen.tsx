import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { TrashIcon, PlusIcon, HelpingHandIcon, CalendarIcon, UsersIcon, SearchIcon, CheckCircleIcon, XCircleIcon } from '../../constants';

const ManageVolunteeringScreen: React.FC = () => {
    const [opportunities, setOpportunities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [newItem, setNewItem] = useState({
        title: '',
        description: '',
        date: '',
        spots_available: 10
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (statusMessage) {
            const timer = setTimeout(() => setStatusMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [statusMessage]);

    const fetchData = async () => {
        try {
            const { data, error } = await supabase
                .from('volunteering_opportunities')
                .select('*')
                .order('date', { ascending: true });
            if (error) throw error;
            setOpportunities(data || []);
        } catch (err) {
            console.error('Error fetching data:', err);
            setStatusMessage({ type: 'error', text: 'Failed to load opportunities.' });
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setStatusMessage(null);
        try {
            const { error } = await supabase
                .from('volunteering_opportunities')
                .insert([newItem]);

            if (error) throw error;

            setNewItem({ title: '', description: '', date: '', spots_available: 10 });
            fetchData();
            setStatusMessage({ type: 'success', text: 'Opportunity posted successfully!' });
        } catch (err) {
            console.error('Error creating opportunity:', err);
            setStatusMessage({ type: 'error', text: 'Failed to create opportunity. Please try again.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this opportunity?')) return;
        try {
            const { error } = await supabase
                .from('volunteering_opportunities')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchData();
            setStatusMessage({ type: 'success', text: 'Opportunity removed.' });
        } catch (err) {
            console.error('Error deleting:', err);
            setStatusMessage({ type: 'error', text: 'Failed to delete.' });
        }
    };

    const isPast = (dateStr: string) => {
        return new Date(dateStr) < new Date();
    }

    const filteredOpportunities = opportunities.filter(op =>
        op.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        op.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full bg-gray-50 p-6 space-y-6 overflow-y-auto">

            {/* Header */}
            <div className="flex flex-col space-y-2">
                <h1 className="text-2xl font-bold text-gray-800">Volunteering Management</h1>
                <p className="text-gray-500 text-sm">Post and manage school volunteering events.</p>
                {statusMessage && (
                    <div className={`p-4 rounded-lg flex items-center space-x-2 animate-fade-in-down ${statusMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {statusMessage.type === 'success' ? <CheckCircleIcon className="w-5 h-5" /> : <XCircleIcon className="w-5 h-5" />}
                        <span>{statusMessage.text}</span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Create Form */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 sticky top-6">
                        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                            <PlusIcon className="w-5 h-5 mr-2 text-green-600" />
                            Post New Opportunity
                        </h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Event Title</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Science Fair Judge"
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                                    value={newItem.title}
                                    onChange={e => setNewItem({ ...newItem, title: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                    <input
                                        type="date"
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                                        value={newItem.date}
                                        onChange={e => setNewItem({ ...newItem, date: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Total Spots</label>
                                    <input
                                        type="number"
                                        min="1"
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                                        value={newItem.spots_available}
                                        onChange={e => setNewItem({ ...newItem, spots_available: parseInt(e.target.value) })}
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Role Description</label>
                                <textarea
                                    placeholder="Describe responsibilities..."
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all h-28 resize-none"
                                    value={newItem.description}
                                    onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-green-200"
                            >
                                {isSubmitting ? 'Posting...' : 'Post Opportunity'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* List View */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 min-h-[500px] flex flex-col">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                            <h2 className="text-lg font-bold text-gray-800">Current Opportunities</h2>
                            <div className="relative w-full sm:w-64">
                                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search events..."
                                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-full focus:ring-2 focus:ring-green-500 outline-none transition-all text-sm"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex-grow flex justify-center items-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                            </div>
                        ) : filteredOpportunities.length === 0 ? (
                            <div className="flex-grow flex flex-col justify-center items-center text-gray-400 py-12">
                                <HelpingHandIcon className="w-12 h-12 mb-3 opacity-20" />
                                <p>No volunteering opportunities found.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {filteredOpportunities.map(item => (
                                    <div key={item.id} className={`group flex flex-col p-5 rounded-xl border transition-all ${isPast(item.date) ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-green-100 hover:shadow-lg hover:-translate-y-1'}`}>
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center space-x-3">
                                                <div className={`p-2 rounded-lg ${isPast(item.date) ? 'bg-gray-100 text-gray-400' : 'bg-green-50 text-green-600'}`}>
                                                    <HelpingHandIcon className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-gray-800 leading-tight">{item.title}</h3>
                                                    {isPast(item.date) && <span className="inline-block mt-1 text-[10px] font-bold text-gray-400 uppercase bg-gray-100 px-1.5 py-0.5 rounded">Past Event</span>}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Delete"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>

                                        <p className="text-gray-600 text-sm mb-4 flex-grow line-clamp-3 leading-relaxed">{item.description}</p>

                                        <div className="flex items-center justify-between text-xs text-gray-500 mt-auto pt-4 border-t border-gray-100">
                                            <div className="flex items-center" title="Event Date">
                                                <CalendarIcon className="w-4 h-4 mr-1.5 text-gray-400" />
                                                <span className="font-medium">{new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                            </div>
                                            <div className="flex items-center" title="Spots Filled">
                                                <UsersIcon className="w-4 h-4 mr-1.5 text-gray-400" />
                                                <span className={`font-medium ${item.spots_filled >= item.spots_available ? 'text-green-600' : ''}`}>
                                                    {item.spots_filled || 0} / {item.spots_available} Filled
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ManageVolunteeringScreen;
