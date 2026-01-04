import { toast } from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { TrashIcon, PlusIcon, CheckCircleIcon, XCircleIcon, ClockIcon, CalendarIcon } from '../../constants';
import ConfirmationModal from '../ui/ConfirmationModal';

const ManageVolunteeringScreen: React.FC = () => {
    const [opportunities, setOpportunities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [newItem, setNewItem] = useState({
        title: '',
        date: '',
        time: '',
        role: '',
        description: '',
        status: 'Open'
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Deletion State
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [opportunityToDelete, setOpportunityToDelete] = useState<number | null>(null);

    useEffect(() => {
        fetchOpportunities();
    }, []);

    const fetchOpportunities = async () => {
        try {
            const { data, error } = await supabase
                .from('volunteering_opportunities')
                .select('*')
                .order('date', { ascending: true });

            if (error) throw error;
            setOpportunities(data || []);
        } catch (err) {
            console.error('Error fetching opportunities:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const { error } = await supabase
                .from('volunteering_opportunities')
                .insert([newItem]);

            if (error) throw error;

            setNewItem({
                title: '',
                date: '',
                time: '',
                role: '',
                description: '',
                status: 'Open'
            });
            fetchOpportunities();
            toast.success('Opportunity listed successfully!');
        } catch (err) {
            console.error('Error adding opportunity:', err);
            toast.error('Failed to list opportunity.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const confirmDelete = (id: number) => {
        setOpportunityToDelete(id);
        setShowDeleteModal(true);
    };

    const handleDelete = async () => {
        if (opportunityToDelete === null) return;
        const id = opportunityToDelete;
        setShowDeleteModal(false);
        setOpportunityToDelete(null);

        try {
            const { error } = await supabase.from('volunteering_opportunities').delete().eq('id', id);
            if (error) throw error;
            fetchOpportunities();
            toast.success('Opportunity deleted.');
        } catch (err) {
            console.error('Error deleting:', err);
            toast.error('Failed to delete.');
        }
    };

    const upcomingOpps = opportunities.filter(o => new Date(o.date) >= new Date(new Date().setHours(0, 0, 0, 0)));

    return (
        <div className="flex flex-col h-full bg-gray-50 p-6 space-y-6 overflow-y-auto">

            {/* Header */}
            <div className="flex flex-col space-y-2">
                <h1 className="text-2xl font-bold text-gray-800">Volunteering</h1>
                <p className="text-gray-500 text-sm">Coordinate parent volunteering opportunities.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Form Section */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 sticky top-6">
                        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                            <PlusIcon className="w-5 h-5 mr-2 text-teal-600" />
                            Post Opportunity
                        </h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Event Title</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Sports Day Helper"
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
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
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                                        value={newItem.date}
                                        onChange={e => setNewItem({ ...newItem, date: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                                    <input
                                        type="time"
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                                        value={newItem.time}
                                        onChange={e => setNewItem({ ...newItem, time: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Role / Task</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Refreshment Setup"
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                                    value={newItem.role}
                                    onChange={e => setNewItem({ ...newItem, role: e.target.value })}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Details</label>
                                <textarea
                                    placeholder="Description of duties..."
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all h-24 resize-none"
                                    value={newItem.description}
                                    onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-3 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-teal-200"
                            >
                                {isSubmitting ? 'Posting...' : 'Post Opportunity'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* List Section */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Opportunities */}
                    <div>
                        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                            <PlusIcon className="w-5 h-5 mr-2 text-teal-600" />
                            Active Opportunities
                        </h2>
                        {loading ? (
                            <div className="flex justify-center items-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                            </div>
                        ) : upcomingOpps.length === 0 ? (
                            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center text-gray-400">
                                <p>No volunteering opportunities listed.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {upcomingOpps.map(opp => (
                                    <div key={opp.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-all">
                                        <div>
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="bg-teal-50 text-teal-700 text-xs font-bold px-2 py-1 rounded upercase tracking-wide">
                                                    {new Date(opp.date).toLocaleDateString()}
                                                </div>
                                                <span className="text-xs text-gray-400 flex items-center">
                                                    <ClockIcon className="w-3 h-3 mr-1" />
                                                    {opp.time}
                                                </span>
                                            </div>
                                            <h3 className="font-bold text-gray-800 text-lg mb-1">{opp.title}</h3>
                                            <p className="text-sm font-medium text-teal-600 mb-3">{opp.role}</p>
                                            <p className="text-sm text-gray-500 line-clamp-2">{opp.description}</p>
                                        </div>

                                        <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center">
                                            <span className={`font-medium text-xs ${opp.spots_filled >= opp.spots_available ? 'text-red-600' : 'text-green-600'}`}>
                                                {opp.spots_filled || 0} / {opp.spots_available || 'Unlimited'} Filled
                                            </span>
                                            <button
                                                onClick={() => confirmDelete(opp.id)}
                                                className="text-red-500 hover:text-red-700 text-sm font-medium flex items-center hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                                            >
                                                <TrashIcon className="w-4 h-4 mr-1" />
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <ConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDelete}
                title="Delete Opportunity"
                message="Are you sure you want to delete this volunteering opportunity? This action cannot be undone."
                confirmText="Delete"
                isDanger={true}
            />
        </div>
    );
};

export default ManageVolunteeringScreen;
