import { toast } from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { TrashIcon, PlusIcon, ElearningIcon, LinkIcon, SearchIcon, VideoIcon, FilePdfIcon, CloudUploadIcon } from '../../constants';
import ConfirmationModal from '../ui/ConfirmationModal';
import ResourceUploadModal from './ResourceUploadModal';

const ManageLearningResourcesScreen: React.FC = () => {
    const { user } = useAuth();
    const [resources, setResources] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('All');
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

    // Deletion State
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [resourceToDelete, setResourceToDelete] = useState<number | null>(null);

    useEffect(() => {
        fetchResources();
    }, []);

    const fetchResources = async () => {
        try {
            const { data, error } = await supabase
                .from('resources') // V2 Table
                .select('*')
                .eq('school_id', user?.user_metadata?.school_id || '')
                .order('created_at', { ascending: false });

            // Fallback for empty table or error during migration transition
            if (!data && !error) {
                // Try legacy table if needed or just empty
                setResources([]);
                return;
            }

            if (error) {
                // If error is "relation does not exist", it means V2 table isn't ready, fallback to V1 or empty
                console.warn("V2 Resources table might not exist yet, trying legacy 'learning_resources'");
                const { data: legacyData } = await supabase
                    .from('learning_resources')
                    .select('*')
                    .eq('school_id', user?.user_metadata?.school_id || '');
                setResources(legacyData || []);
            } else {
                setResources(data || []);
            }
        } catch (err) {
            console.error('Error fetching resources:', err);
            // Silent fail or toast
        } finally {
            setLoading(false);
        }
    };

    const confirmDelete = (id: number) => {
        setResourceToDelete(id);
        setShowDeleteModal(true);
    };

    const handleDelete = async () => {
        if (resourceToDelete === null) return;
        const id = resourceToDelete;
        setShowDeleteModal(false);
        setResourceToDelete(null);

        try {
            // Try deleting from 'resources' first
            const { error } = await supabase.from('resources').delete().eq('id', id);

            if (error) {
                // If failed, maybe it's legacy
                await supabase.from('learning_resources').delete().eq('id', id);
            }
            fetchResources();
            toast.success('Resource deleted.');
        } catch (err) {
            console.error('Error deleting:', err);
            toast.error('Failed to delete.');
        }
    };

    const filteredResources = resources.filter(res => {
        const matchesSearch = res.title?.toLowerCase().includes(searchTerm.toLowerCase()) || res.subject?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = filterType === 'All' || res.type === filterType;
        return matchesSearch && matchesType;
    });

    const ensureProtocol = (url: string) => {
        if (!url) return '';
        return url.startsWith('http') ? url : `https://${url}`;
    };

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
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex flex-col space-y-2">
                    <h1 className="text-2xl font-bold text-gray-800">Learning Resources</h1>
                    <p className="text-gray-500 text-sm">Curate digital content for student learning.</p>
                </div>
                <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-2.5 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all font-semibold"
                >
                    <CloudUploadIcon className="w-5 h-5" />
                    <span>Upload Resource</span>
                </button>
            </div>

            {/* Main Content */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 min-h-[500px] flex flex-col">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    <div className="flex items-center space-x-4 w-full md:w-auto">
                        <h2 className="text-lg font-bold text-gray-800 hidden md:block">Library Content</h2>
                        <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold">{filteredResources.length} Items</span>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                        <select
                            className="p-2.5 border border-gray-200 rounded-lg bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            value={filterType}
                            onChange={e => setFilterType(e.target.value)}
                        >
                            <option value="All">All Types</option>
                            <option value="Video">Video</option>
                            <option value="PDF">PDF</option>
                            <option value="Audio">Audio</option>
                            <option value="Slides">Slides</option>
                        </select>
                        <div className="relative flex-grow sm:w-64">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search title, subject..."
                                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
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
                    <div className="flex-grow flex flex-col justify-center items-center text-gray-400 py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                        <ElearningIcon className="w-16 h-16 mb-4 opacity-20" />
                        <p className="font-semibold text-lg">No resources found</p>
                        <p className="text-sm">Upload content to get started.</p>
                        <button
                            onClick={() => setIsUploadModalOpen(true)}
                            className="mt-4 text-blue-600 font-semibold hover:underline"
                        >
                            Upload Now
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredResources.map(res => (
                            <div key={res.id} className="group flex flex-col bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-xl transition-all hover:-translate-y-1 duration-300">
                                <div className="relative h-40 bg-gray-100 flex items-center justify-center overflow-hidden">
                                    {res.thumbnail_url ? (
                                        <img src={res.thumbnail_url} alt={res.title} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                    ) : (
                                        <div className="text-gray-300 transform group-hover:scale-110 transition-transform">
                                            {React.cloneElement(getTypeIcon(res.type), { className: "w-12 h-12" } as any)}
                                        </div>
                                    )}
                                    <div className="absolute top-2 right-2 px-2.5 py-1 bg-white/90 backdrop-blur-sm rounded-lg text-xs font-bold shadow-sm z-10">
                                        {res.type}
                                    </div>
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-3 p-4">
                                        <a
                                            href={ensureProtocol(res.url)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2.5 bg-white rounded-full text-blue-600 hover:scale-110 transition-transform shadow-lg"
                                            title="Open Link"
                                        >
                                            <LinkIcon className="w-5 h-5" />
                                        </a>
                                        <button
                                            onClick={() => confirmDelete(res.id)}
                                            className="p-2.5 bg-white rounded-full text-red-500 hover:scale-110 transition-transform shadow-lg"
                                            title="Delete"
                                        >
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                    {/* Language Badge */}
                                    {res.language && (
                                        <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 text-white rounded text-[10px] backdrop-blur-sm">
                                            {res.language}
                                        </div>
                                    )}
                                </div>
                                <div className="p-4 flex-grow flex flex-col">
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="text-xs font-bold text-blue-600 uppercase tracking-wide truncate pr-2">{res.subject}</div>
                                        {res.grade && <div className="text-[10px] px-1.5 py-0.5 bg-gray-100 rounded text-gray-500 font-mono">GR {res.grade}</div>}
                                    </div>
                                    <h3 className="font-bold text-gray-800 line-clamp-2 mb-2 text-sm leading-snug" title={res.title}>{res.title}</h3>
                                    <div className="mt-auto pt-3 border-t border-gray-50 flex justify-between items-center text-xs text-gray-400">
                                        <span>{new Date(res.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <ResourceUploadModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                onUploadComplete={fetchResources}
                teacherId={user?.id || ''}
            />

            <ConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDelete}
                title="Delete Resource"
                message="Are you sure you want to delete this learning resource? This cannot be undone."
                confirmText="Delete Permanently"
                isDanger
            />
        </div>
    );
};
export default ManageLearningResourcesScreen;
