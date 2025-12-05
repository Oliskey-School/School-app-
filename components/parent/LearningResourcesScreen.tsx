

import React, { useState, useMemo } from 'react';
import { mockLearningResources } from '../../data';
import { LearningResource } from '../../types';
import { DocumentTextIcon, PlayIcon } from '../../constants';

const ResourceCard: React.FC<{ resource: LearningResource }> = ({ resource }) => {
    const isVideo = resource.type === 'Video';
    return (
        <a href={resource.url} target="_blank" rel="noopener noreferrer" className="block bg-white rounded-xl shadow-md overflow-hidden group transform hover:-translate-y-1 transition-transform duration-200">
            <div className="relative h-32">
                <img src={resource.thumbnailUrl} alt={resource.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                {isVideo && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-12 h-12 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center transition-transform group-hover:scale-110">
                            <PlayIcon className="h-6 w-6 text-white" />
                        </div>
                    </div>
                )}
            </div>
            <div className="p-4">
                <div className="flex items-start justify-between">
                    <h3 className="font-bold text-gray-800 flex-1 pr-2">{resource.title}</h3>
                    <div className={`p-1.5 rounded-full flex-shrink-0 ${isVideo ? 'bg-blue-100 text-blue-500' : 'bg-red-100 text-red-500'}`}>
                        {isVideo ? <PlayIcon className="w-4 h-4" /> : <DocumentTextIcon className="w-4 h-4" />}
                    </div>
                </div>
                <p className="text-sm text-gray-600 mt-2">{resource.description}</p>
            </div>
        </a>
    );
};

const LearningResourcesScreen: React.FC = () => {
    const [selectedSubject, setSelectedSubject] = useState<string>('All');

    const subjects = useMemo(() => 
        ['All', ...Array.from(new Set(mockLearningResources.map(r => r.subject)))]
    , []);
    
    const filteredResources = useMemo(() => {
        if (selectedSubject === 'All') return mockLearningResources;
        return mockLearningResources.filter(r => r.subject === selectedSubject);
    }, [selectedSubject]);

    return (
        <div className="flex flex-col h-full bg-gray-50">
            <div className="p-4 bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
                <div className="flex space-x-2 overflow-x-auto pb-2 -mb-2">
                    {subjects.map((subject: string) => (
                        <button
                            key={subject}
                            onClick={() => setSelectedSubject(subject)}
                            className={`px-4 py-1.5 text-sm font-semibold rounded-full flex-shrink-0 transition-colors ${
                                selectedSubject === subject
                                    ? 'bg-green-500 text-white shadow'
                                    : 'bg-white text-gray-700 hover:bg-green-100'
                            }`}
                        >
                            {subject}
                        </button>
                    ))}
                </div>
            </div>

            <main className="flex-grow p-4 overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredResources.map(resource => (
                        <ResourceCard key={resource.id} resource={resource} />
                    ))}
                </div>
            </main>
        </div>
    );
};

export default LearningResourcesScreen;