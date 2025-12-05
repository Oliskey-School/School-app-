import React from 'react';
import { ForumTopic } from '../../types';
import { mockForumTopics } from '../../data';
import { ChevronRightIcon, PlusIcon, UserGroupIcon } from '../../constants';

const formatDistanceToNow = (isoDate: string): string => {
  const date = new Date(isoDate);
  const now = new Date();
  const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);

  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};


interface CollaborationForumScreenProps {
  navigateTo: (view: string, title: string, props: any) => void;
}

const CollaborationForumScreen: React.FC<CollaborationForumScreenProps> = ({ navigateTo }) => {
  return (
    <div className="flex flex-col h-full bg-gray-100 relative">
      <main className="flex-grow p-4 overflow-y-auto pb-24">
         <div className="bg-purple-50 p-4 rounded-xl text-center border border-purple-200 mb-4">
            <UserGroupIcon className="h-10 w-10 mx-auto text-purple-400 mb-2"/>
            <h3 className="font-bold text-lg text-purple-800">Teacher Forum</h3>
            <p className="text-sm text-purple-700">Share ideas, ask questions, and collaborate with your peers.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mockForumTopics.map(topic => (
            <button
                key={topic.id}
                onClick={() => navigateTo('forumTopic', topic.title, { topicId: topic.id })}
                className="w-full bg-white rounded-xl shadow-sm p-4 text-left hover:bg-gray-50 hover:ring-2 hover:ring-purple-200 transition-all"
            >
                <h4 className="font-bold text-gray-800">{topic.title}</h4>
                <div className="flex justify-between items-center text-xs text-gray-500 mt-2">
                <span>By {topic.authorName}</span>
                <span>{topic.postCount} replies</span>
                <span>Last activity: {formatDistanceToNow(topic.lastActivity)}</span>
                </div>
            </button>
            ))}
        </div>
      </main>
      <div className="absolute bottom-6 right-6">
        <button
          onClick={() => alert('Create new topic form would open here.')}
          className="bg-purple-600 text-white p-4 rounded-full shadow-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
          aria-label="Create new topic"
        >
          <PlusIcon className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
};

export default CollaborationForumScreen;