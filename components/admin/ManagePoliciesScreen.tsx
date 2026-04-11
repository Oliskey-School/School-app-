import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';
import { TrashIcon, PlusIcon, DocumentTextIcon, LinkIcon, SearchIcon, CheckCircleIcon, XCircleIcon } from '../../constants';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

const ManagePoliciesScreen: React.FC = () => {
    const { currentSchool } = useAuth();
    const schoolId = currentSchool?.id;
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
            if (!schoolId) return;
            const data = await api.getPolicies();
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
            if (!schoolId) {
                toast.error("School context missing.");
                return;
            }
            await api.createPolicy({ ...newPolicy, school_id: schoolId });

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

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this policy?')) return;
        try {
            if (!schoolId) return;
            await api.deletePolicy(id);
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

    // Realtime removed - using state-based management for now to avoid complexity during migration
    // Real-time can be re-enabled later using our custom WebSockets server if needed.

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
                                        className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all h-32 resize-none text-gray-700"
                                        value={newPolicy.description}
                                        onChange={e => setNewItem({ ...newPolicy, description: e.target.value })}
                                    />
                                </div>
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-100 flex items-center justify-center space-x-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span>Publishing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <PlusIcon className="w-5 h-5" />
                                            <span>Publish Policy</span>
                                        </>
                                    )}
                                </motion.button>
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
                            <div className="flex-grow flex flex-col justify-center items-center py-20">
                                <div className="relative">
                                    <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse"></div>
                                    </div>
                                </div>
                                <p className="mt-4 text-gray-400 font-medium animate-pulse">Loading policies...</p>
                            </div>
                        ) : filteredPolicies.length === 0 ? (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex-grow flex flex-col justify-center items-center text-center py-12 px-6"
                            >
                                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                    <DocumentTextIcon className="w-10 h-10 text-gray-300" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-700">No policies found</h3>
                                <p className="text-gray-500 max-w-xs mt-2 text-sm">
                                    {searchTerm ? `We couldn't find any results for "${searchTerm}". Try a different search term.` : "Start by adding your first school policy using the form on the left."}
                                </p>
                                {searchTerm && (
                                    <button 
                                        onClick={() => setSearchTerm('')}
                                        className="mt-4 text-indigo-600 font-semibold text-sm hover:underline"
                                    >
                                        Clear search
                                    </button>
                                )}
                            </motion.div>
                        ) : (
                            <div className="space-y-4">
                                <AnimatePresence mode="popLayout">
                                    {filteredPolicies.map((policy, index) => (
                                        <motion.div
                                            key={policy.id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            transition={{ delay: index * 0.05 }}
                                            layout
                                            className="group flex items-start justify-between p-5 bg-white border border-gray-100 rounded-2xl hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 relative overflow-hidden"
                                        >
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300" />
                                            
                                            <div className="flex items-start space-x-5">
                                                <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shadow-sm">
                                                    <DocumentTextIcon className="w-6 h-6" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-bold text-gray-800 text-lg group-hover:text-indigo-700 transition-colors truncate">{policy.title}</h3>
                                                    <p className="text-gray-500 mt-1 text-sm leading-relaxed line-clamp-2">{policy.description}</p>
                                                    <div className="flex flex-wrap items-center gap-4 mt-4">
                                                        {policy.url && (
                                                            <a 
                                                                href={ensureProtocol(policy.url)} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer" 
                                                                className="inline-flex items-center text-xs font-bold text-indigo-600 hover:text-white hover:bg-indigo-600 px-3 py-1.5 rounded-lg border border-indigo-100 transition-all"
                                                            >
                                                                <LinkIcon className="w-3.5 h-3.5 mr-1.5" />
                                                                View Document
                                                            </a>
                                                        )}
                                                        <div className="flex items-center text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                                                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2" />
                                                            Added {new Date(policy.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <button
                                                onClick={() => handleDelete(policy.id)}
                                                className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 border border-transparent hover:border-red-100"
                                                title="Delete Policy"
                                            >
                                                <TrashIcon className="w-5 h-5" />
                                            </button>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ManagePoliciesScreen;

