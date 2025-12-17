import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { LearningResource } from '../../types';
import { DocumentTextIcon, PlayIcon, SearchIcon, ElearningIcon, ChevronRightIcon } from '../../constants';

const ResourceCard: React.FC<{ resource: LearningResource }> = ({ resource }) => {
    const isVideo = resource.type === 'Video';
    const isPDF = resource.type === 'PDF';

    return (
        <a
            href={resource.url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="group block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full flex flex-col"
        >
            {/* Thumbnail Section */}
            <div className="relative aspect-video overflow-hidden bg-gray-100 flex-shrink-0">
                {resource.thumbnailUrl ? (
                    <img
                        src={resource.thumbnailUrl}
                        alt={resource.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-300">
                        <ElearningIcon className="w-12 h-12 opacity-50" />
                    </div>
                )}

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity"></div>

                {/* Play Button Overlay (if video) */}
                {isVideo && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/40 shadow-lg group-hover:scale-110 transition-transform duration-300">
                            <PlayIcon className="h-6 w-6 text-white pl-1" />
                        </div>
                    </div>
                )}

                {/* Type Badge */}
                <div className="absolute top-3 left-3">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider backdrop-blur-md border border-white/20 shadow-sm ${isVideo ? 'bg-red-500/90 text-white' :
                            isPDF ? 'bg-blue-500/90 text-white' :
                                'bg-gray-800/90 text-white'
                        } `}>
                        {resource.type}
                    </span>
                </div>
            </div>

            {/* Content Section */}
            <div className="p-5 flex flex-col flex-grow">
                <div className="mb-2">
                    <p className="text-xs font-medium text-green-600 mb-1 uppercase tracking-wide">{resource.subject}</p>
                    <h3 className="font-bold text-gray-900 text-lg leading-tight line-clamp-2 group-hover:text-green-700 transition-colors">
                        {resource.title}
                    </h3>
                </div>

                <p className="text-sm text-gray-500 line-clamp-2 mb-4 h-10">
                    {resource.description || "No description provided."}
                </p>

                <div className="flex items-center justify-between pt-4 border-t border-gray-50 mt-auto">
                    <span className="text-xs font-medium text-gray-400">Tap to view</span>
                    <span className="flex items-center text-sm font-bold text-gray-900 group-hover:text-green-600 transition-colors">
                        Open
                        <ChevronRightIcon className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" />
                    </span>
                </div>
            </div>
        </a>
    );
};

const LearningResourcesScreen: React.FC = () => {
    const [resources, setResources] = useState<LearningResource[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSubject, setSelectedSubject] = useState<string>('All');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchResources();
    }, []);

    const fetchResources = async () => {
        try {
            const { data, error } = await supabase
                .from('learning_resources')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (data) {
                // Map DB columns to Typescript interface if needed (snake_case -> camelCase)
                const mappedData: LearningResource[] = data.map((r: any) => ({
                    id: r.id,
                    title: r.title,
                    type: r.type,
                    subject: r.subject,
                    description: r.description,
                    url: r.url,
                    thumbnailUrl: r.thumbnail_url
                }));
                setResources(mappedData);
            }
        } catch (err) {
            console.error('Error fetching resources:', err);
        } finally {
            setLoading(false);
        }
    };

    const subjects = useMemo(() =>
        ['All', ...Array.from(new Set(resources.map(r => r.subject)))]
        , [resources]);

    const filteredResources = useMemo(() => {
        return resources.filter(r => {
            const matchesSubject = selectedSubject === 'All' || r.subject === selectedSubject;
            const matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (r.description && r.description.toLowerCase().includes(searchQuery.toLowerCase()));
            return matchesSubject && matchesSearch;
        });
    }, [selectedSubject, searchQuery, resources]);

    return (
        <div className="flex flex-col h-full bg-gray-50">
            {/* Sticky Header with Search & Filters */}
            <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-gray-200">
                <div className="p-4 space-y-4 max-w-7xl mx-auto w-full">
                    {/* Search Bar */}
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <SearchIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search resources..."
                            className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all duration-200"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Filter Pills */}
                    <div className="flex space-x-2 overflow-x-auto pb-1 no-scrollbar">
                        {subjects.map((subject: string) => (
                            <button
                                key={subject}
                                onClick={() => setSelectedSubject(subject)}
                                className={`px-5 py-2 text-sm font-semibold rounded-full flex-shrink-0 transition-all duration-200 whitespace-nowrap border ${selectedSubject === subject
                                        ? 'bg-green-600 text-white border-green-600 shadow-md shadow-green-200'
                                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                    } `}
                            >
                                {subject}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <main className="flex-grow p-4 md:p-6 overflow-y-auto w-full max-w-7xl mx-auto">
                {loading ? (
                    <div className="flex justify-center items-center h-40">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                    </div>
                ) : filteredResources.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
                        {filteredResources.map(resource => (
                            <ResourceCard key={resource.id} resource={resource} />
                        ))}
                    </div>
                ) : (
                    /* Empty State */
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                        <div className="bg-white p-6 rounded-full shadow-sm mb-4">
                            <SearchIcon className="w-12 h-12 text-gray-300" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">No resources found</h3>
                        <p className="text-gray-500 max-w-xs mx-auto">
                            We couldn't find any resources matching your search or filter criteria.
                        </p>
                        <button
                            onClick={() => { setSelectedSubject('All'); setSearchQuery(''); }}
                            className="mt-6 px-6 py-2 bg-gray-900 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-shadow"
                        >
                            Clear Filters
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
};

export default LearningResourcesScreen;