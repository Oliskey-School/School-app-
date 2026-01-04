import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { HeartIcon, PhoneIcon, BookOpenIcon, ExclamationCircleIcon } from '../../constants';

interface Resource {
    id: number;
    title: string;
    category: string;
    description: string;
    content_url: string;
    is_crisis_resource: boolean;
}

interface Helpline {
    id: number;
    organization_name: string;
    helpline_type: string;
    phone_number: string;
    availability: string;
    is_toll_free: boolean;
}

const MentalHealthResources: React.FC = () => {
    const [resources, setResources] = useState<Resource[]>([]);
    const [helplines, setHelplines] = useState<Helpline[]>([]);
    const [filter, setFilter] = useState('all');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);

            const [resourcesRes, helplinesRes] = await Promise.all([
                supabase.from('mental_health_resources').select('*').eq('is_active', true),
                supabase.from('crisis_helplines').select('*').eq('is_active', true)
            ]);

            setResources(resourcesRes.data || []);
            setHelplines(helplinesRes.data || []);
        } catch (error: any) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleResourceClick = async (resourceId: number, url: string) => {
        // Track view count
        await supabase.from('mental_health_resources')
            .update({ view_count: supabase.rpc('increment_view_count') })
            .eq('id', resourceId);

        if (url) {
            window.open(url, '_blank');
        }
    };

    const filteredResources = filter === 'all'
        ? resources
        : resources.filter(r => r.category === filter);

    const categories = [...new Set(resources.map(r => r.category))];

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Mental Health Resources</h2>
                <p className="text-sm text-gray-600 mt-1">Support and information for your wellbeing</p>
            </div>

            {/* Crisis Helplines */}
            <div className="bg-red-50 border-2 border-red-500 rounded-xl p-6">
                <div className="flex items-center space-x-2 mb-4">
                    <ExclamationCircleIcon className="w-6 h-6 text-red-600" />
                    <h3 className="text-lg font-bold text-red-900">Crisis Helplines - Available 24/7</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {helplines.map((helpline) => (
                        <div key={helpline.id} className="bg-white rounded-lg p-4 border border-red-200">
                            <p className="font-bold text-gray-900">{helpline.organization_name}</p>
                            <p className="text-sm text-gray-600 mb-2">{helpline.helpline_type}</p>
                            <a
                                href={`tel:${helpline.phone_number}`}
                                className="flex items-center space-x-2 text-red-600 font-bold hover:text-red-700"
                            >
                                <PhoneIcon className="w-4 h-4" />
                                <span>{helpline.phone_number}</span>
                                {helpline.is_toll_free && (
                                    <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">Toll-free</span>
                                )}
                            </a>
                            <p className="text-xs text-gray-500 mt-1">{helpline.availability}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Resource Filters */}
            <div className="flex flex-wrap gap-2">
                <button
                    onClick={() => setFilter('all')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'all'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                        }`}
                >
                    All Resources
                </button>
                {categories.map((cat) => (
                    <button
                        key={cat}
                        onClick={() => setFilter(cat)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === cat
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                            }`}
                    >
                        {cat}
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
                        <BookOpenIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p>No resources found</p>
                    </div>
                ) : (
                    filteredResources.map((resource) => (
                        <div
                            key={resource.id}
                            className={`bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition-shadow cursor-pointer ${resource.is_crisis_resource ? 'border-red-500 border-2' : 'border-gray-100'
                                }`}
                            onClick={() => handleResourceClick(resource.id, resource.content_url)}
                        >
                            {resource.is_crisis_resource && (
                                <span className="inline-block px-2 py-1 bg-red-100 text-red-800 text-xs font-bold rounded mb-2">
                                    CRISIS RESOURCE
                                </span>
                            )}
                            <div className="flex items-center space-x-2 mb-2">
                                <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-xs font-medium">
                                    {resource.category}
                                </span>
                            </div>
                            <h3 className="font-bold text-gray-900 mb-2">{resource.title}</h3>
                            <p className="text-sm text-gray-600 mb-4 line-clamp-3">{resource.description}</p>
                            <button className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                                Access Resource →
                            </button>
                        </div>
                    ))
                )}
            </div>

            {/* Encouragement Box */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-6 text-center">
                <HeartIcon className="w-12 h-12 text-purple-600 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-gray-900 mb-2">You're Not Alone</h3>
                <p className="text-gray-700">
                    Taking care of your mental health is important. If you're struggling, please reach out.
                    Help is available, and it's okay to ask for support.
                </p>
            </div>
        </div>
    );
};

export default MentalHealthResources;
