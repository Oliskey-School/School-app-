
import React, { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { VideoLesson, DigitalResource } from '../../types';
import { mockDigitalResources } from '../../data';
import { ChevronRightIcon, DocumentTextIcon, RESOURCE_TYPE_CONFIG } from '../../constants';

interface VideoLessonScreenProps {
  lessonId: number;
  navigateTo: (view: string, title: string, props?: any) => void;
}

const RelatedResourceCard: React.FC<{ resource: DigitalResource, onClick: () => void }> = ({ resource, onClick }) => {
    const TypeIcon = RESOURCE_TYPE_CONFIG[resource.type].icon;
    return (
        <button onClick={onClick} className="w-full flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <div className="p-2 bg-white rounded-lg border mr-3">
                <TypeIcon className={`w-5 h-5 ${RESOURCE_TYPE_CONFIG[resource.type].color}`} />
            </div>
            <div className="flex-grow text-left">
                <p className="font-semibold text-sm text-gray-800 truncate">{resource.title}</p>
                <p className="text-xs text-gray-500">{resource.type}</p>
            </div>
            <ChevronRightIcon className="h-5 w-5 text-gray-400" />
        </button>
    )
};


const VideoLessonScreen: React.FC<VideoLessonScreenProps> = ({ lessonId, navigateTo }) => {
  const [notesExpanded, setNotesExpanded] = useState(true);

  const lesson = useMemo(() => 
    mockDigitalResources.find(r => r.id === lessonId && r.type === 'Video') as VideoLesson | undefined
  , [lessonId]);

  const relatedResources = useMemo(() => {
    if (!lesson?.relatedResourceIds) return [];
    return mockDigitalResources.filter(r => lesson.relatedResourceIds.includes(r.id));
  }, [lesson]);
  
  const handleResourceClick = (resource: DigitalResource) => {
    if (resource.type === 'Video') {
        // In a real app, you might want a better way to handle this, 
        // perhaps replacing the current view in the stack.
        // For simplicity, we'll navigate, allowing back-and-forth.
        navigateTo('videoLesson', resource.title, { lessonId: resource.id });
    } else {
        alert(`Opening ${resource.type}: ${resource.title}`);
    }
  };

  if (!lesson) {
    return <div className="p-4 text-center">Video lesson not found.</div>;
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <main className="flex-grow overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
            <div className="lg:col-span-2 space-y-4">
                {/* Video Player */}
                <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-lg">
                    <iframe
                        width="100%"
                        height="100%"
                        src={lesson.videoUrl}
                        title={lesson.title}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    ></iframe>
                </div>

                {/* Title and Description */}
                <div className="bg-white p-4 rounded-xl shadow-sm">
                    <h2 className="text-2xl font-bold text-gray-800">{lesson.title}</h2>
                    <p className="text-sm text-gray-500 mt-1">{lesson.subject} &bull; {lesson.duration}</p>
                    <p className="text-gray-700 mt-3">{lesson.description}</p>
                </div>
            </div>

            <div className="lg:col-span-1 space-y-4">
                {/* Lesson Notes */}
                <div className="bg-white rounded-xl shadow-sm">
                    <button onClick={() => setNotesExpanded(!notesExpanded)} className="w-full flex justify-between items-center p-4 text-left">
                        <div className="flex items-center space-x-3">
                            <DocumentTextIcon className="w-6 h-6 text-orange-500"/>
                            <h3 className="text-lg font-bold text-gray-800">Lesson Notes</h3>
                        </div>
                        <ChevronRightIcon className={`h-6 w-6 text-gray-400 transition-transform ${notesExpanded ? 'rotate-90' : ''}`} />
                    </button>
                    {notesExpanded && (
                        <div className="px-4 pb-4 border-t border-gray-100 max-h-96 overflow-y-auto">
                            <div className="prose prose-sm max-w-none prose-p:my-2 prose-headings:my-3 prose-li:my-1 text-gray-700">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{lesson.notes}</ReactMarkdown>
                            </div>
                        </div>
                    )}
                </div>

                {/* Related Resources */}
                {relatedResources.length > 0 && (
                    <div className="bg-white p-4 rounded-xl shadow-sm">
                        <h3 className="text-lg font-bold text-gray-800 mb-3">Related Resources</h3>
                        <div className="space-y-2">
                            {relatedResources.map(res => (
                                <RelatedResourceCard key={res.id} resource={res} onClick={() => handleResourceClick(res)} />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
      </main>
    </div>
  );
};

export default VideoLessonScreen;