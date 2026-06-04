import React, { useState, useEffect } from 'react';
import { GlobeIcon, PlusIcon, ShieldCheckIcon, XIcon } from '../../constants';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { useRealtimeRefresh } from '../../hooks/useRealtimeRefresh';

const timeAgo = (date: string | Date | undefined | null) => {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
};

interface Props {
    navigateTo: (view: string, title: string, props?: any) => void;
}

const GlobalTeacherCommunityScreen: React.FC<Props> = ({ navigateTo }) => {
    const { user } = useAuth();
    const isSuperAdmin = (user?.role || '').toUpperCase() === 'SUPER_ADMIN';
    const [topics, setTopics] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const loadTopics = async () => {
        try {
            const data = await api.getGlobalForumTopics();
            setTopics(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error loading global topics:', error);
            toast.error('Failed to load community topics.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadTopics(); }, []);
    useRealtimeRefresh(['global_forum'], loadTopics);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        setSubmitting(true);
        try {
            await api.createGlobalForumTopic({ title: title.trim(), content: content.trim() });
            setTitle('');
            setContent('');
            setShowCreate(false);
            toast.success('Topic posted to the community');
            loadTopics();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to post topic');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!window.confirm('Remove this topic from the community?')) return;
        try {
            await api.deleteGlobalForumTopic(id);
            toast.success('Topic removed');
            loadTopics();
        } catch {
            toast.error('Failed to remove topic');
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-100 relative">
            <main className="flex-grow p-4 overflow-y-auto pb-24">
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-xl text-center border border-indigo-200 mb-4">
                    <GlobeIcon className="h-10 w-10 mx-auto text-indigo-500 mb-2" />
                    <h3 className="font-bold text-lg text-indigo-800">Global Teacher Community</h3>
                    <p className="text-sm text-indigo-700">Connect with teachers from every school on the platform.</p>
                    <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-indigo-600 bg-white/60 rounded-full px-3 py-1.5 w-fit mx-auto">
                        <ShieldCheckIcon className="h-4 w-4" />
                        <span>Private &amp; safe — only first names are shown. Your school is never revealed.</span>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center p-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {topics.map(topic => (
                            <button
                                key={topic.id}
                                onClick={() => navigateTo('globalForumTopic', topic.title, { topicId: topic.id, topicTitle: topic.title })}
                                className="relative w-full bg-white rounded-xl shadow-sm p-4 text-left hover:bg-gray-50 hover:ring-2 hover:ring-indigo-200 transition-all group"
                            >
                                <h4 className="font-bold text-gray-800 group-hover:text-indigo-700 transition-colors pr-6">{topic.title}</h4>
                                {topic.content && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{topic.content}</p>}
                                <div className="flex justify-between items-center text-xs text-gray-500 mt-2">
                                    <span>By {topic.author_name || 'Teacher'} · Teacher</span>
                                    <span className="bg-gray-100 px-2 py-1 rounded-full">{topic.post_count || 0} replies</span>
                                    <span>{timeAgo(topic.last_activity)}</span>
                                </div>
                                {isSuperAdmin && (
                                    <span
                                        onClick={(e) => handleDelete(e, topic.id)}
                                        className="absolute top-2 right-2 p-1 text-gray-300 hover:text-red-500"
                                        title="Remove (moderator)"
                                    >
                                        <XIcon className="h-4 w-4" />
                                    </span>
                                )}
                            </button>
                        ))}

                        {topics.length === 0 && (
                            <div className="col-span-full text-center py-10 text-gray-500">
                                No topics yet. Start the first conversation!
                            </div>
                        )}
                    </div>
                )}
            </main>

            <div className="fixed bottom-24 right-6 lg:bottom-12 lg:right-12 z-40">
                <button
                    onClick={() => setShowCreate(true)}
                    className="bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-transform hover:scale-110 active:scale-95"
                    aria-label="Create new topic"
                >
                    <PlusIcon className="h-6 w-6" />
                </button>
            </div>

            {showCreate && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
                    <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-800">New Community Topic</h3>
                            <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">
                                <XIcon className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Topic title"
                                maxLength={140}
                                className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            />
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="Share your idea or question with teachers everywhere..."
                                rows={4}
                                className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            />
                            <button
                                type="submit"
                                disabled={!title.trim() || submitting}
                                className="w-full py-3 rounded-xl font-bold text-white bg-indigo-600 disabled:bg-indigo-300 transition-colors"
                            >
                                {submitting ? 'Posting...' : 'Post to Community'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GlobalTeacherCommunityScreen;
