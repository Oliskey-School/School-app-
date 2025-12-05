

import React, { useState, useMemo } from 'react';
import { mockDigitalResources } from '../../data';
import { DigitalResource, VideoLesson } from '../../types';
import { RESOURCE_TYPE_CONFIG, PlayIcon } from '../../constants';

interface LibraryScreenProps {
    navigateTo: (view: string, title: string, props?: any) => void;
}

const ResourceCard: React.FC<{ resource: DigitalResource, onClick: () => void }> = ({ resource, onClick }) => {
    const TypeIcon = RESOURCE_TYPE_CONFIG[resource.type].icon;
    const typeColor = RESOURCE_TYPE_CONFIG[resource.type].color;

    return (
        <button 
            onClick={onClick} 
            className="block w-full text-left bg-white rounded-xl shadow-md overflow-hidden group transform hover:-translate-y-1 transition-transform duration-200"
        >
            <div className="relative h-32">
                <img src={resource.thumbnailUrl} alt={resource.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
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
            </div>
            <div className="p-3">
                <h3 className="font-bold text-sm text-gray-800 truncate">{resource.title}</h3>
                <p className="text-xs text-gray-500">{resource.subject}</p>
            </div>
        </button>
    );
};


const LibraryScreen: React.FC<LibraryScreenProps> = ({ navigateTo }) => {
    const [selectedSubject, setSelectedSubject] = useState<string>('All');

    const subjects = useMemo(() => 
        ['All', ...Array.from(new Set(mockDigitalResources.map(r => r.subject)))]
    , []);

    const resourcesBySubject = useMemo(() => {
        const grouped: { [key: string]: DigitalResource[] } = {};
        mockDigitalResources.forEach(resource => {
            if (!grouped[resource.subject]) {
                grouped[resource.subject] = [];
            }
            grouped[resource.subject].push(resource);
        });
        return grouped;
    }, []);

    const handleResourceClick = (resource: DigitalResource) => {
        if (resource.type === 'Video') {
            navigateTo('videoLesson', resource.title, { lessonId: resource.id });
        } else {
            alert(`Opening ${resource.type}: ${resource.title}`);
        }
    };

    const filteredSubjects = selectedSubject === 'All' ? Object.keys(resourcesBySubject) : [selectedSubject];

    return (
        <div className="flex flex-col h-full bg-gray-50">
            {/* Subject Filters */}
            <div className="p-4 bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
                <div className="flex space-x-2 overflow-x-auto pb-2 -mb-2">
                    {subjects.map((subject: string) => (
                        <button
                            key={subject}
                            onClick={() => setSelectedSubject(subject)}
                            className={`px-4 py-1.5 text-sm font-semibold rounded-full flex-shrink-0 transition-colors ${
                                selectedSubject === subject
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
                <div className="space-y-6">
                {filteredSubjects.map((subject) => (
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
                ))}
                </div>
            </main>
        </div>
    );
};

export default LibraryScreen;
