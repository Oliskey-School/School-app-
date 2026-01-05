import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { TrashIcon, PlusIcon, DocumentTextIcon, LinkIcon, SearchIcon, CheckCircleIcon, XCircleIcon } from '../../constants';

const ManagePoliciesScreen: React.FC = () => {
    const [policies, setPolicies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [newPolicy, setNewPolicy] = useState({ title: '', description: '', url: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        fetchPolicies();
    }, []);

    useEffect(() => {
        if (statusMessage) {
            const timer = setTimeout(() => setStatusMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [statusMessage]);

    const fetchPolicies = async () => {
        try {
            const { data, error } = await supabase
                .from('school_policies')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            setPolicies(data || []);
        } catch (err) {
            console.error('Error fetching policies:', err);
            setStatusMessage({ type: 'error', text: 'Failed to load policies.' });
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
                .from('school_policies')
                .insert([newPolicy]);

            if (error) throw error;

            setNewItem({ title: '', description: '', url: '' });
            fetchPolicies();
            setStatusMessage({ type: 'success', text: 'Policy published successfully!' });
        } catch (err) {
            console.error('Error creating policy:', err);
            setStatusMessage({ type: 'error', text: 'Failed to create policy. Please try again.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Helper to clear form
    const setNewItem = (item: typeof newPolicy) => setNewPolicy(item);

    const handleDelete = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this policy?')) return;
        try {
            const { error } = await supabase
                .from('school_policies')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchPolicies();
            setStatusMessage({ type: 'success', text: 'Policy deleted successfully.' });
        } catch (err) {
            console.error('Error deleting policy:', err);
            setStatusMessage({ type: 'error', text: 'Failed to delete policy.' });
        }
    };

    const filteredPolicies = policies.filter(p =>
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const ensureProtocol = (url: string) => {
        if (!url) return '';
        return url.startsWith('http') ? url : `https://${url}`;
    };

    useEffect(() => {
        const channel = supabase.channel('policies_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'school_policies' }, () => {
                fetchPolicies();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    return (
        <div className="flex flex-col h-full bg-gray-50 p-6 space-y-6 overflow-y-auto">

            {/* Header & Status */}
            <div className="flex flex-col space-y-2">
                <h1 className="text-2xl font-bold text-gray-800">School Policies</h1>
                <p className="text-gray-500 text-sm">Manage and publish official school documents and guidelines.</p>
                {statusMessage && (
                    <div className={`p-4 rounded-lg flex items-center space-x-2 animate-fade-in-down ${statusMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {statusMessage.type === 'success' ? <CheckCircleIcon className="w-5 h-5" /> : <XCircleIcon className="w-5 h-5" />}
                        <span>{statusMessage.text}</span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Form Section */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 sticky top-6">
                        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                            <PlusIcon className="w-5 h-5 mr-2 text-indigo-600" />
                            Add New Policy
                        </h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Policy Title</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Uniform Policy"
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                    value={newPolicy.title}
                                    onChange={e => setNewItem({ ...newPolicy, title: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Document URL</label>
                                <input
                                    type="text"
                                    placeholder="Link to PDF/Doc..."
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                    value={newPolicy.url}
                                    onChange={e => setNewItem({ ...newPolicy, url: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea
                                    placeholder="Brief summary..."
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all h-28 resize-none"
                                    value={newPolicy.description}
                                    onChange={e => setNewItem({ ...newPolicy, description: e.target.value })}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-200"
                            >
                                {isSubmitting ? 'Publishing...' : 'Publish Policy'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* List Section */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 min-h-[500px] flex flex-col">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                            <h2 className="text-lg font-bold text-gray-800">Existing Policies</h2>
                            <div className="relative w-full sm:w-64">
                                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search policies..."
                                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-full focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex-grow flex justify-center items-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                            </div>
                        ) : filteredPolicies.length === 0 ? (
                            <div className="flex-grow flex flex-col justify-center items-center text-gray-400 py-12">
                                <DocumentTextIcon className="w-12 h-12 mb-3 opacity-20" />
                                <p>No policies found matching your search.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {filteredPolicies.map(policy => (
                                    <div key={policy.id} className="group flex items-start justify-between p-4 bg-gray-50 rounded-xl hover:bg-white hover:shadow-md transition-all border border-gray-100 border-l-4 border-l-transparent hover:border-l-indigo-500">
                                        <div className="flex items-start space-x-4">
                                            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-100 transition-colors">
                                                <DocumentTextIcon className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-800 text-lg group-hover:text-indigo-700 transition-colors">{policy.title}</h3>
                                                <p className="text-gray-600 mt-1 text-sm leading-relaxed">{policy.description}</p>
                                                {policy.url && (
                                                    <a href={ensureProtocol(policy.url)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-xs font-semibold text-indigo-600 mt-2 hover:underline bg-indigo-50 px-2 py-1 rounded">
                                                        <LinkIcon className="w-3 h-3 mr-1" />
                                                        View Document
                                                    </a>
                                                )}
                                                <p className="text-xs text-gray-400 mt-2">Added: {new Date(policy.created_at).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDelete(policy.id)}
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                            title="Delete Policy"
                                        >
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
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

export default ManagePoliciesScreen;
