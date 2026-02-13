import React, { useState, useEffect } from 'react';
import { ForumTopic } from '../../types';
import { mockForumTopics } from '../../data';
import { ChevronRightIcon, PlusIcon, UserGroupIcon } from '../../constants';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useProfile } from '../../context/ProfileContext';
import { fetchForumTopics } from '../../lib/database';
import CreateForumTopicModal from './CreateForumTopicModal';

// ... (keep formatDistanceToNow)

interface CollaborationForumScreenProps {
  navigateTo: (view: string, title: string, props: any) => void;
}

const CollaborationForumScreen: React.FC<CollaborationForumScreenProps> = ({ navigateTo }) => {
  const { user, currentSchool } = useAuth();
  const { profile } = useProfile();
  const [topics, setTopics] = useState<ForumTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadTopics = async () => {
    setLoading(true);
    try {
      const schoolId = currentSchool?.id;
      const realTopics = await fetchForumTopics(schoolId);
      if (realTopics.length > 0) {
        setTopics(realTopics);
      } else {
        setTopics(mockForumTopics); // Fallback to mock so UI isn't empty during demo
      }
    } catch (error) {
      console.error('Error loading topics:', error);
      toast.error('Failed to load forum topics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTopics();
  }, [currentSchool?.id]);

  const handleTopicCreated = () => {
    loadTopics(); // Refresh list
  };

  return (
    <div className="flex flex-col h-full bg-gray-100 relative">
      <main className="flex-grow p-4 overflow-y-auto pb-24">
        <div className="bg-purple-50 p-4 rounded-xl text-center border border-purple-200 mb-4">
          <UserGroupIcon className="h-10 w-10 mx-auto text-purple-400 mb-2" />
          <h3 className="font-bold text-lg text-purple-800">Teacher Forum</h3>
          <p className="text-sm text-purple-700">Share ideas, ask questions, and collaborate with your peers.</p>
        </div>

        {loading ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {topics.map(topic => (
              <button
                key={topic.id}
                onClick={() => navigateTo('forumTopic', topic.title, { topicId: topic.id })}
                className="w-full bg-white rounded-xl shadow-sm p-4 text-left hover:bg-gray-50 hover:ring-2 hover:ring-purple-200 transition-all group"
              >
                <h4 className="font-bold text-gray-800 group-hover:text-purple-700 transition-colors">{topic.title}</h4>
                <div className="flex justify-between items-center text-xs text-gray-500 mt-2">
                  <span>By {topic.authorName}</span>
                  <span className="bg-gray-100 px-2 py-1 rounded-full">{topic.postCount} replies</span>
                  <span>{formatDistanceToNow(topic.lastActivity)}</span>
                </div>
              </button>
            ))}

            {topics.length === 0 && (
              <div className="col-span-full text-center py-10 text-gray-500">
                No topics found. Start a conversation!
              </div>
            )}
          </div>
        )}
      </main>

      <div className="absolute bottom-6 right-6">
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-purple-600 text-white p-4 rounded-full shadow-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-transform hover:scale-105 active:scale-95"
          aria-label="Create new topic"
        >
          <PlusIcon className="h-6 w-6" />
        </button>
      </div>

      <CreateForumTopicModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onTopicCreated={handleTopicCreated}
        currentUser={{
          id: user?.id || '',
          name: profile?.name || user?.email || 'Teacher',
          schoolId: currentSchool?.id || '',
          avatarUrl: profile?.avatarUrl
        }}
      />
    </div>
  );
};

export default CollaborationForumScreen;