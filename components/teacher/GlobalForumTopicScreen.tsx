import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useRealtimeRefresh } from '../../hooks/useRealtimeRefresh';

const formatTimestamp = (isoDate: string): string =>
    new Date(isoDate).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

interface Props {
    topicId: string;
    topicTitle?: string;
    topicContent?: string;
    topicAuthor?: string;
}

const GlobalForumTopicScreen: React.FC<Props> = ({ topicId, topicTitle, topicContent, topicAuthor }) => {
    const { user } = useAuth();
    const isTeacher = (user?.role || '').toUpperCase() === 'TEACHER';
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [newReply, setNewReply] = useState('');
    const [sending, setSending] = useState(false);

    const loadData = async () => {
        try {
            const data = await api.getGlobalForumPosts(String(topicId));
            setPosts(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error loading community replies:', error);
            toast.error('Failed to load conversation.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [topicId]);
    useRealtimeRefresh(['global_forum'], loadData);

    const handlePostReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newReply.trim()) return;
        setSending(true);
        try {
            await api.createGlobalForumPost({ topic_id: String(topicId), content: newReply.trim() });
            setNewReply('');
            loadData();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to send reply');
        } finally {
            setSending(false);
        }
    };

    if (loading && posts.length === 0) {
        return <div className="p-10 text-center flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;
    }

    return (
        <div className="flex flex-col h-full bg-gray-100">
            <main className="flex-grow p-4 space-y-4 overflow-y-auto">
                {topicTitle && (
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-800">{topicTitle}</h3>
                        {topicAuthor && <p className="text-xs text-gray-500 mt-1">By {topicAuthor}</p>}
                        {topicContent && <p className="text-gray-700 mt-2 whitespace-pre-wrap">{topicContent}</p>}
                        <p className="text-xs text-gray-400 mt-2">Global Teacher Community · replies are visible to teachers from all schools</p>
                    </div>
                )}
                {posts.map(post => (
                    <div key={post.id} className="flex items-start space-x-3">
                        <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(post.author_name || 'Teacher')}&background=random`} alt={post.author_name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                        <div className="flex-grow bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                            <div className="flex justify-between items-center">
                                <p className="font-bold text-gray-800">{post.author_name || 'Teacher'} <span className="text-xs font-normal text-gray-400">· Teacher</span></p>
                                <p className="text-xs text-gray-400">{formatTimestamp(post.created_at)}</p>
                            </div>
                            <p className="text-gray-700 mt-2 whitespace-pre-wrap">{post.content}</p>
                        </div>
                    </div>
                ))}
                {posts.length === 0 && <p className="text-center text-gray-500 py-10">No replies yet. Be the first to respond!</p>}
            </main>
            {isTeacher ? (
                <div className="p-4 bg-white border-t border-gray-200">
                    <form onSubmit={handlePostReply} className="flex items-center space-x-2">
                        <input
                            type="text"
                            value={newReply}
                            onChange={(e) => setNewReply(e.target.value)}
                            placeholder="Write a reply..."
                            className="flex-grow px-4 py-2 bg-gray-100 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                        <button type="submit" disabled={!newReply.trim() || sending} className="px-4 py-2 rounded-full font-semibold text-white bg-indigo-600 disabled:bg-indigo-300 transition-colors">
                            Send
                        </button>
                    </form>
                </div>
            ) : (
                <div className="p-4 bg-white border-t border-gray-200 text-center text-xs text-gray-400">
                    Only teachers can reply in the global community.
                </div>
            )}
        </div>
    );
};

export default GlobalForumTopicScreen;
