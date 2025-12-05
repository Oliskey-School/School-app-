import React, { useState, useMemo } from 'react';
import { ForumTopic, ForumPost } from '../../types';
import { mockForumTopics } from '../../data';

const formatTimestamp = (isoDate: string): string => {
  return new Date(isoDate).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
};

interface ForumTopicScreenProps {
  topicId: number;
}

const ForumTopicScreen: React.FC<ForumTopicScreenProps> = ({ topicId }) => {
  const [topic, setTopic] = useState<ForumTopic | undefined>(() => mockForumTopics.find(t => t.id === topicId));
  const [newReply, setNewReply] = useState('');

  const handlePostReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReply.trim() || !topic) return;

    const newPost: ForumPost = {
      id: Date.now(),
      author: { name: 'You (Mrs. Akintola)', avatarUrl: 'https://i.pravatar.cc/150?u=funke' },
      content: newReply,
      timestamp: new Date().toISOString(),
    };

    const updatedTopic = {
      ...topic,
      posts: [...topic.posts, newPost],
      postCount: topic.postCount + 1,
      lastActivity: newPost.timestamp,
    };
    
    setTopic(updatedTopic);
    
    // In a real app, this would also update the central data store
    const topicIndex = mockForumTopics.findIndex(t => t.id === topicId);
    if(topicIndex > -1) {
        mockForumTopics[topicIndex] = updatedTopic;
    }
    setNewReply('');
  };

  if (!topic) {
    return <div className="p-4 text-center">Topic not found.</div>;
  }

  return (
    <div className="flex flex-col h-full bg-gray-100">
      <main className="flex-grow p-4 space-y-4 overflow-y-auto">
        {topic.posts.map(post => (
          <div key={post.id} className="flex items-start space-x-3">
            <img src={post.author.avatarUrl} alt={post.author.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
            <div className="flex-grow bg-white p-3 rounded-lg shadow-sm">
              <div className="flex justify-between items-center">
                <p className="font-bold text-gray-800">{post.author.name}</p>
                <p className="text-xs text-gray-400">{formatTimestamp(post.timestamp)}</p>
              </div>
              <p className="text-gray-700 mt-2">{post.content}</p>
            </div>
          </div>
        ))}
      </main>
      <div className="p-4 bg-white border-t border-gray-200">
        <form onSubmit={handlePostReply} className="flex items-center space-x-2">
          <input
            type="text"
            value={newReply}
            onChange={(e) => setNewReply(e.target.value)}
            placeholder="Write a reply..."
            className="flex-grow px-4 py-2 bg-gray-100 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
          <button type="submit" disabled={!newReply.trim()} className="px-4 py-2 rounded-full font-semibold text-white bg-purple-600 disabled:bg-purple-300 transition-colors">
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default ForumTopicScreen;
