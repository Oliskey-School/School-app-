import React, { useState, useEffect } from 'react';
import { ForumTopic, ForumPost } from '../../types';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';

const formatTimestamp = (isoDate: string): string => {
  return new Date(isoDate).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
};

interface ForumTopicScreenProps {
  topicId: string | number;
  currentUserId: string;
  teacherProfile?: any;
}

const ForumTopicScreen: React.FC<ForumTopicScreenProps> = ({ topicId, currentUserId, teacherProfile }) => {
  const [topic, setTopic] = useState<ForumTopic | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newReply, setNewReply] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch all topics to find this one (Backend ideally has getTopicById)
      // Since we already have schoolId in context usually, but here we just have topicId.
      // For now, let's fetch posts.
      const data = await api.getForumPosts(String(topicId));
      setPosts(data);
    } catch (error) {
      console.error('Error loading forum posts:', error);
      toast.error('Failed to load conversation.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [topicId]);

  const handlePostReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReply.trim()) return;

    try {
      await api.createForumPost({
        topic_id: topicId,
        content: newReply,
        author_id: currentUserId,
        author_name: teacherProfile?.name || 'Teacher',
        author_avatar_url: teacherProfile?.avatarUrl,
        created_at: new Date().toISOString()
      });
      
      setNewReply('');
      loadData(); // Refresh posts
      toast.success('Reply posted');
    } catch (err) {
      console.error('Error posting reply:', err);
      toast.error('Failed to send reply');
    }
  };

  if (loading && posts.length === 0) {
    return <div className="p-10 text-center flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div></div>;
  }

  return (
    <div className="flex flex-col h-full bg-gray-100">
      <main className="flex-grow p-4 space-y-4 overflow-y-auto">
        {posts.map(post => (
          <div key={post.id} className="flex items-start space-x-3">
            <img src={post.author_avatar_url || `https://ui-avatars.com/api/?name=${post.author_name}&background=random`} alt={post.author_name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
            <div className="flex-grow bg-white p-3 rounded-lg shadow-sm border border-gray-100">
              <div className="flex justify-between items-center">
                <p className="font-bold text-gray-800">{post.author_name}</p>
                <p className="text-xs text-gray-400">{formatTimestamp(post.created_at || post.timestamp)}</p>
              </div>
              <p className="text-gray-700 mt-2 whitespace-pre-wrap">{post.content}</p>
            </div>
          </div>
        ))}
        {posts.length === 0 && <p className="text-center text-gray-500 py-10">No replies yet. Be the first to respond!</p>}
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
