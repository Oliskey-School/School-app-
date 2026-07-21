import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useProfile } from '../../context/ProfileContext';
import { toast } from 'react-hot-toast';
import { DocumentTextIcon, DownloadIcon, PlusIcon } from '../../constants';
import ResourceUploadModal from '../admin/ResourceUploadModal';

interface Resource {
    id: number;
    title: string;
    description: string;
    type: string;
    subject: string;
    grade: number;
    url: string;
    author_name: string;
    download_count: number;
    created_at: string;
}

const ResourceSharing: React.FC = () => {
    const { profile } = useProfile();
    const [resources, setResources] = useState<Resource[]>([]);
    const [filter, setFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [isUploadOpen, setIsUploadOpen] = useState(false);

    useEffect(() => {
        fetchResources();
    }, []);

    const fetchResources = async () => {
        try {
            setLoading(true);
            const data = await api.getSharedResources();
            // Field names match the real Resource model — the previous version
            // read resource_type/grade_level/avg_rating/rating_count, none of
            // which the backend has ever returned, so every card silently
            // rendered blanks/zeros for that data.
            const formatted: Resource[] = (data || []).map((r: any) => ({
                id: r.id,
                title: r.title,
                description: r.description,
                type: r.type || 'Document',
                subject: r.subject,
                grade: r.grade,
                url: r.url,
                author_name: r.teacher?.full_name || r.author_name || 'Anonymous',
                download_count: r.download_count || 0,
                created_at: r.created_at
            }));
            setResources(formatted);
        } catch (error: any) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = (resource: Resource) => {
        if (!resource.url) {
            toast.error('No file is attached to this resource.');
            return;
        }
        window.open(resource.url, '_blank', 'noopener,noreferrer');
    };

    const filteredResources = filter === 'all'
        ? resources
        : resources.filter(r => r.type === filter);

    const resourceTypes = ['PDF', 'Video', 'Slides', 'Audio'];

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'PDF': return 'bg-red-100 text-red-800';
            case 'Video': return 'bg-purple-100 text-purple-800';
            case 'Slides': return 'bg-blue-100 text-blue-800';
            case 'Audio': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Resource Sharing</h2>
                    <p className="text-sm text-gray-600 mt-1">Share and discover teaching materials</p>
                </div>
                <button
                    onClick={() => setIsUploadOpen(true)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center space-x-2"
                >
                    <PlusIcon className="w-4 h-4" />
                    <span>Upload Resource</span>
                </button>
            </div>

            <ResourceUploadModal
                isOpen={isUploadOpen}
                onClose={() => setIsUploadOpen(false)}
                onUploadComplete={fetchResources}
                teacherId={profile?.id || ''}
            />

            {/* Filters */}
            <div className="flex space-x-2">
                <button
                    onClick={() => setFilter('all')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'all'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-300'
                        }`}
                >
                    All Resources
                </button>
                {resourceTypes.map(type => (
                    <button
                        key={type}
                        onClick={() => setFilter(type)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === type
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white text-gray-700 border border-gray-300'
                            }`}
                    >
                        {type}
                    </button>
                ))}
            </div>

            {/* Resources Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full flex justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                    </div>
                ) : filteredResources.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-gray-500">
                        <DocumentTextIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p>No resources found</p>
                    </div>
                ) : (
                    filteredResources.map(resource => (
                        <div key={resource.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between mb-3">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${getTypeColor(resource.type)}`}>
                                    {resource.type}
                                </span>
                            </div>

                            <h3 className="font-bold text-gray-900 mb-2">{resource.title}</h3>
                            <p className="text-sm text-gray-600 mb-4 line-clamp-2">{resource.description}</p>

                            <div className="space-y-2 text-sm text-gray-600 mb-4">
                                <p><strong>Subject:</strong> {resource.subject}</p>
                                {!!resource.grade && <p><strong>Grade:</strong> {resource.grade}</p>}
                                <p><strong>By:</strong> {resource.author_name}</p>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-500">
                                    {resource.download_count} downloads
                                </span>
                                <button
                                    onClick={() => handleDownload(resource)}
                                    className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium flex items-center space-x-1"
                                >
                                    <DownloadIcon className="w-4 h-4" />
                                    <span>Download</span>
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default ResourceSharing;

