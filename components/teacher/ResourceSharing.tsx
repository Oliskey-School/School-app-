import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../context/ProfileContext';
import { toast } from 'react-hot-toast';
import { DocumentTextIcon, DownloadIcon, StarIcon, PlusIcon } from '../../constants';

interface Resource {
    id: number;
    title: string;
    description: string;
    resource_type: string;
    subject: string;
    grade_level: string;
    author_name: string;
    download_count: number;
    avg_rating: number;
    created_at: string;
}

const ResourceSharing: React.FC = () => {
    const { profile } = useProfile();
    const [resources, setResources] = useState<Resource[]>([]);
    const [filter, setFilter] = useState('all');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchResources();
    }, []);

    const fetchResources = async () => {
        try {
            setLoading(true);

            const { data, error } = await supabase
                .from('shared_resources')
                .select(`
          *,
          teachers(full_name)
        `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const formatted: Resource[] = (data || []).map((r: any) => ({
                id: r.id,
                title: r.title,
                description: r.description,
                resource_type: r.resource_type,
                subject: r.subject,
                grade_level: r.grade_level,
                author_name: (r.teachers as any)?.full_name || 'Anonymous',
                download_count: r.download_count,
                avg_rating: r.rating_count > 0 ? r.rating_sum / r.rating_count : 0,
                created_at: r.created_at
            }));

            setResources(formatted);
        } catch (error: any) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredResources = filter === 'all'
        ? resources
        : resources.filter(r => r.resource_type === filter);

    const resourceTypes = ['Lesson Plan', 'Worksheet', 'Presentation', 'Assessment'];

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'Lesson Plan': return 'bg-blue-100 text-blue-800';
            case 'Worksheet': return 'bg-green-100 text-green-800';
            case 'Presentation': return 'bg-purple-100 text-purple-800';
            case 'Assessment': return 'bg-orange-100 text-orange-800';
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
                <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center space-x-2">
          <PlusIcon className="w-4 h-4" />
          <span>Upload Resource</span>
        </button>
            </div>

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
                                <span className={`px-2 py-1 rounded text-xs font-medium ${getTypeColor(resource.resource_type)}`}>
                                    {resource.resource_type}
                                </span>
                                {resource.avg_rating > 0 && (
                                    <div className="flex items-center space-x-1">
                                        <StarIcon className="w-4 h-4 text-yellow-500" />
                                        <span className="text-sm font-medium">{resource.avg_rating.toFixed(1)}</span>
                                    </div>
                                )}
                            </div>

                            <h3 className="font-bold text-gray-900 mb-2">{resource.title}</h3>
                            <p className="text-sm text-gray-600 mb-4 line-clamp-2">{resource.description}</p>

                            <div className="space-y-2 text-sm text-gray-600 mb-4">
                                <p><strong>Subject:</strong> {resource.subject}</p>
                                <p><strong>Grade:</strong> {resource.grade_level}</p>
                                <p><strong>By:</strong> {resource.author_name}</p>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-500">
                                    {resource.download_count} downloads
                                </span>
                                <button className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium flex items-center space-x-1">
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
