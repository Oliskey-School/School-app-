import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../context/ProfileContext';
import { toast } from 'react-hot-toast';
import { MessageSquareIcon, PlusIcon, SearchIcon } from '../../constants';

interface Thread {
    id: number;
    title: string;
    content: string;
    author_name: string;
    created_at: string;
    reply_count: number;
    category_name: string;
}

const TeacherForum: React.FC = () => {
    const { profile } = useProfile();
    const [threads, setThreads] = useState<Thread[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);

            const { data: cats } = await supabase
                .from('forum_categories')
                .select('*')
                .order('order_index');

            setCategories(cats || []);

            const { data, error } = await supabase
                .from('forum_threads')
                .select(`
          *,
          teachers(full_name),
          forum_categories(name)
        `)
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;

            const formatted: Thread[] = (data || []).map((t: any) => ({
                id: t.id,
                title: t.title,
                content: t.content,
                author_name: (t.teachers as any)?.full_name || 'Anonymous',
                created_at: t.created_at,
                reply_count: 0,
                category_name: (t.forum_categories as any)?.name || 'General'
            }));

            setThreads(formatted);
        } catch (error: any) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredThreads = selectedCategory === 0
        ? threads
        : threads.filter(t => categories.find(c => c.name === t.category_name)?.id === selectedCategory);

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Teacher Forum</h2>
                    <p className="text-sm text-gray-600 mt-1">Connect and discuss with fellow teachers</p>
                </div>
                <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center space-x-2">
                    <PlusIcon className="w-4 h-4" />
                    <span>New Thread</span>
                </button>
            </div>

            <div className="flex space-x-2">
                <button
                    onClick={() => setSelectedCategory(0)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedCategory === 0
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white text-gray-700 border border-gray-300'
                        }`}
                >
                    All
                </button>
                {categories.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedCategory === cat.id
                                ? 'bg-indigo-600 text-white'
                                : 'bg-white text-gray-700 border border-gray-300'
                            }`}
                    >
                        {cat.icon} {cat.name}
                    </button>
                ))}
            </div>

            <div className="space-y-4">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                    </div>
                ) : filteredThreads.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <MessageSquareIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p>No threads found</p>
                    </div>
                ) : (
                    filteredThreads.map(thread => (
                        <div key={thread.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow cursor-pointer">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center space-x-2 mb-2">
                                        <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-xs font-medium">
                                            {thread.category_name}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-gray-900 text-lg">{thread.title}</h3>
                                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">{thread.content}</p>
                                    <div className="flex items-center space-x-4 mt-3 text-sm text-gray-500">
                                        <span>By {thread.author_name}</span>
                                        <span>•</span>
                                        <span>{new Date(thread.created_at).toLocaleDateString()}</span>
                                        <span>•</span>
                                        <span>{thread.reply_count} replies</span>
                                    </div>
                                </div>
                                <MessageSquareIcon className="w-6 h-6 text-gray-400" />
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default TeacherForum;
