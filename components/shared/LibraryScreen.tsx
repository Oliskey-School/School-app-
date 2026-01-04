

import React, { useState, useMemo, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { mockDigitalResources } from '../../data';
import { DigitalResource, VideoLesson } from '../../types';
import { RESOURCE_TYPE_CONFIG, PlayIcon, DownloadIcon } from '../../constants';

interface LibraryScreenProps {
    navigateTo: (view: string, title: string, props?: any) => void;
}

const ResourceCard: React.FC<{ resource: DigitalResource, onClick: () => void }> = ({ resource, onClick }) => {
    const TypeIcon = RESOURCE_TYPE_CONFIG[resource.type].icon;
    const typeColor = RESOURCE_TYPE_CONFIG[resource.type].color;

    const handleDownload = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (resource.url) {
            window.open(resource.url, '_blank');
            toast.success('Download started');
        }
    };

    return (
        <button
            onClick={onClick}
            className="block w-full text-left bg-white rounded-xl shadow-md overflow-hidden group transform hover:-translate-y-1 transition-transform duration-200"
        >
            <div className="relative h-32 bg-gray-200">
                {resource.thumbnailUrl ? (
                    <img src={resource.thumbnailUrl} alt={resource.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100">
                        <TypeIcon className="w-12 h-12 text-gray-300" />
                    </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                {resource.type === 'Video' && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-12 h-12 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center transition-transform group-hover:scale-110">
                            <PlayIcon className="h-6 w-6 text-white" />
                        </div>
                    </div>
                )}
                <div className={`absolute top-2 right-2 p-1.5 rounded-full bg-white/80 backdrop-blur-sm ${typeColor}`}>
                    <TypeIcon className="w-5 h-5" />
                </div>
                {/* Language Tag */}
                {resource.language && (
                    <span className="absolute bottom-2 left-2 px-2 py-0.5 text-[10px] font-bold text-white bg-black/50 rounded backdrop-blur-sm">
                        {resource.language}
                    </span>
                )}
            </div>
            <div className="p-3">
                <h3 className="font-bold text-sm text-gray-800 truncate">{resource.title}</h3>
                <div className="flex justify-between items-center mt-1">
                    <p className="text-xs text-gray-500">{resource.subject}</p>
                    {resource.type !== 'Video' && (
                        <div
                            role="button"
                            onClick={handleDownload}
                            className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-blue-600 transition-colors"
                            title="Download"
                        >
                            <DownloadIcon className="w-4 h-4" />
                        </div>
                    )}
                </div>
            </div>
        </button>
    );
};


const LibraryScreen: React.FC<LibraryScreenProps> = ({ navigateTo }) => {
    const [selectedSubject, setSelectedSubject] = useState<string>('All');
    const [selectedLanguage, setSelectedLanguage] = useState<string>('All');
    const [resources, setResources] = useState<DigitalResource[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchResources = async () => {
            try {
                const { data, error } = await supabase
                    .from('resources')
                    .select('*')
                    .eq('is_public', true)
                    .order('created_at', { ascending: false });

                if (data && data.length > 0) {
                    setResources(data);
                } else {
                    // Fallback to mocks if DB empty or not set up
                    setResources(mockDigitalResources);
                }
            } catch (err) {
                console.error('Error loading resources', err);
                setResources(mockDigitalResources);
            } finally {
                setLoading(false);
            }
        };
        fetchResources();
    }, []);

    const subjects = useMemo(() =>
        ['All', ...Array.from(new Set(resources.map(r => r.subject)))]
        , [resources]);

    const languages = ['All', 'English', 'Hausa', 'Yoruba', 'Igbo'];

    const resourcesBySubject = useMemo(() => {
        const grouped: { [key: string]: DigitalResource[] } = {};

        resources.forEach(resource => {
            // Apply Filters
            if (selectedSubject !== 'All' && resource.subject !== selectedSubject) return;
            if (selectedLanguage !== 'All' && resource.language !== selectedLanguage && resource.language !== undefined) return;

            // Grouping logic (display all matching if 'All' subject selected, else just one group)
            // Actually, if 'All' is selected, we grouping by subject headers is nice.
            // If specific subject is selected, we just show that subject.

            if (!grouped[resource.subject]) {
                grouped[resource.subject] = [];
            }
            grouped[resource.subject].push(resource);
        });
        return grouped;
    }, [resources, selectedSubject, selectedLanguage]);

    const handleResourceClick = (resource: DigitalResource) => {
        if (resource.type === 'Video') {
            navigateTo('videoLesson', resource.title, { lessonId: resource.id });
        } else {
            toast(`Opening ${resource.type}: ${resource.title}`, { icon: '📂' });
            if (resource.url) window.open(resource.url, '_blank');
        }
    };

    const sortedGroups = Object.keys(resourcesBySubject).sort();

    return (
        <div className="flex flex-col h-full bg-gray-50">
            {/* Subject Filters */}
            <div className="p-4 bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10 space-y-3">
                {/* Language Filter Row */}
                <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-hide">
                    {languages.map(lang => (
                        <button
                            key={lang}
                            onClick={() => setSelectedLanguage(lang)}
                            className={`px-3 py-1 text-xs font-bold rounded-full border transition-all ${selectedLanguage === lang
                                    ? 'bg-gray-800 text-white border-gray-800'
                                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                                }`}
                        >
                            {lang}
                        </button>
                    ))}
                </div>

                {/* Subject Filter Row */}
                <div className="flex space-x-2 overflow-x-auto pb-2 -mb-2">
                    {subjects.map((subject: string) => (
                        <button
                            key={subject}
                            onClick={() => setSelectedSubject(subject)}
                            className={`px-4 py-1.5 text-sm font-semibold rounded-full flex-shrink-0 transition-colors ${selectedSubject === subject
                                ? 'bg-orange-500 text-white shadow'
                                : 'bg-white text-gray-700 hover:bg-orange-100'
                                }`}
                        >
                            {subject}
                        </button>
                    ))}
                </div>
            </div>

            {/* Resources Grid */}
            <main className="flex-grow p-4 overflow-y-auto">
                {loading ? (
                    <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div></div>
                ) : (
                    <div className="space-y-6">
                        {sortedGroups.length > 0 ? sortedGroups.map((subject) => (
                            <div key={subject}>
                                <h2 className="text-xl font-bold text-gray-800 mb-3">{subject}</h2>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    {resourcesBySubject[subject].map(resource => (
                                        <ResourceCard
                                            key={resource.id}
                                            resource={resource}
                                            onClick={() => handleResourceClick(resource)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )) : (
                            <div className="text-center py-10 text-gray-400">
                                <p>No resources found matching filters.</p>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};

export default LibraryScreen;
