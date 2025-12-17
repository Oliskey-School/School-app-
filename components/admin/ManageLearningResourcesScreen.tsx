import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { TrashIcon, PlusIcon, ElearningIcon, LinkIcon, SearchIcon, CheckCircleIcon, XCircleIcon, VideoIcon, DocumentTextIcon, FilePdfIcon } from '../../constants';

const ManageLearningResourcesScreen: React.FC = () => {
    const [resources, setResources] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [newItem, setNewItem] = useState({
        title: '',
        subject: '',
        type: 'Video', // Video, PDF, Article
        url: '',
        thumbnail_url: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('All');
    const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        fetchResources();
    }, []);

    useEffect(() => {
        if (statusMessage) {
            const timer = setTimeout(() => setStatusMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [statusMessage]);

    const fetchResources = async () => {
        try {
            const { data, error } = await supabase
                .from('learning_resources')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            setResources(data || []);
        } catch (err) {
            console.error('Error fetching resources:', err);
            setStatusMessage({ type: 'error', text: 'Failed to load resources.' });
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
                .from('learning_resources')
                .insert([newItem]);

            if (error) throw error;

            setNewItem({ title: '', subject: '', type: 'Video', url: '', thumbnail_url: '' });
            fetchResources();
            setStatusMessage({ type: 'success', text: 'Resource added successfully!' });
        } catch (err) {
            console.error('Error adding resource:', err);
            setStatusMessage({ type: 'error', text: 'Failed to add resource.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Delete this resource?')) return;
        try {
            const { error } = await supabase.from('learning_resources').delete().eq('id', id);
            if (error) throw error;
            fetchResources();
            setStatusMessage({ type: 'success', text: 'Resource deleted.' });
        } catch (err) {
            console.error('Error deleting:', err);
            setStatusMessage({ type: 'error', text: 'Failed to delete.' });
        }
    };

    const filteredResources = resources.filter(res => {
        const matchesSearch = res.title.toLowerCase().includes(searchTerm.toLowerCase()) || res.subject.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = filterType === 'All' || res.type === filterType;
        return matchesSearch && matchesType;
    });

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'Video': return <VideoIcon className="w-5 h-5" />;
            case 'PDF': return <FilePdfIcon className="w-5 h-5" />;
            default: return <LinkIcon className="w-5 h-5" />;
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 p-6 space-y-6 overflow-y-auto">

            {/* Header */}
            <div className="flex flex-col space-y-2">
                <h1 className="text-2xl font-bold text-gray-800">Learning Resources</h1>
                <p className="text-gray-500 text-sm">Curate digital content for student learning.</p>
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
                            <PlusIcon className="w-5 h-5 mr-2 text-blue-600" />
                            Add Resource
                        </h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Intro to Algebra"
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    value={newItem.title}
                                    onChange={e => setNewItem({ ...newItem, title: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                                    <input
                                        type="text"
                                        placeholder="Maths"
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                        value={newItem.subject}
                                        onChange={e => setNewItem({ ...newItem, subject: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                                    <select
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white"
                                        value={newItem.type}
                                        onChange={e => setNewItem({ ...newItem, type: e.target.value })}
                                    >
                                        <option value="Video">Video</option>
                                        <option value="PDF">PDF</option>
                                        <option value="Article">Article</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Resource URL</label>
                                <input
                                    type="url"
                                    placeholder="https://"
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    value={newItem.url}
                                    onChange={e => setNewItem({ ...newItem, url: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Thumbnail URL (Optional)</label>
                                <input
                                    type="url"
                                    placeholder="https://"
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    value={newItem.thumbnail_url}
                                    onChange={e => setNewItem({ ...newItem, thumbnail_url: e.target.value })}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-200"
                            >
                                {isSubmitting ? 'Adding...' : 'Add to Library'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* List Section */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 min-h-[500px] flex flex-col">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                            <h2 className="text-lg font-bold text-gray-800">Library</h2>
                            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                                <select
                                    className="p-2 border border-gray-200 rounded-lg bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                    value={filterType}
                                    onChange={e => setFilterType(e.target.value)}
                                >
                                    <option value="All">All Types</option>
                                    <option value="Video">Video</option>
                                    <option value="PDF">PDF</option>
                                    <option value="Article">Article</option>
                                </select>
                                <div className="relative flex-grow sm:w-64">
                                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search..."
                                        className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-full focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex-grow flex justify-center items-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            </div>
                        ) : filteredResources.length === 0 ? (
                            <div className="flex-grow flex flex-col justify-center items-center text-gray-400 py-12">
                                <ElearningIcon className="w-12 h-12 mb-3 opacity-20" />
                                <p>No resources found.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {filteredResources.map(res => (
                                    <div key={res.id} className="group flex flex-col bg-white border border-gray-100 rounded-xl overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1">
                                        <div className="relative h-32 bg-gray-100 flex items-center justify-center overflow-hidden">
                                            {res.thumbnail_url ? (
                                                <img src={res.thumbnail_url} alt={res.title} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="text-gray-300">
                                                    {getTypeIcon(res.type)}
                                                </div>
                                            )}
                                            <div className="absolute top-2 right-2 px-2 py-1 bg-white/90 backdrop-blur-sm rounded text-xs font-bold shadow-sm">
                                                {res.type}
                                            </div>
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                                                <a
                                                    href={res.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-2 bg-white rounded-full text-blue-600 hover:scale-110 transition-transform"
                                                    title="Open Link"
                                                >
                                                    <LinkIcon className="w-5 h-5" />
                                                </a>
                                                <button
                                                    onClick={() => handleDelete(res.id)}
                                                    className="p-2 bg-white rounded-full text-red-500 hover:scale-110 transition-transform"
                                                    title="Delete"
                                                >
                                                    <TrashIcon className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="p-4 flex-grow flex flex-col">
                                            <div className="text-xs font-semibold text-blue-500 mb-1 uppercase tracking-wide">{res.subject}</div>
                                            <h3 className="font-bold text-gray-800 line-clamp-2 mb-2" title={res.title}>{res.title}</h3>
                                            <div className="mt-auto pt-2 border-t border-gray-50 flex justify-between items-center text-xs text-gray-400">
                                                <span>Added {new Date(res.created_at).toLocaleDateString()}</span>
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

export default ManageLearningResourcesScreen;
