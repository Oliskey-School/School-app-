import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { api } from '../../lib/api';
import { UserGroupIcon } from '../../constants';

interface CreateForumTopicScreenProps {
    navigateTo?: (view: string, title: string, props?: any) => void;
    handleBack?: () => void;
    onTopicCreated?: () => void;
    currentUser: {
        id: string;
        name: string;
        schoolId: string;
        avatarUrl?: string;
    };
}

const CreateForumTopicScreen: React.FC<CreateForumTopicScreenProps> = ({ handleBack, onTopicCreated, currentUser }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [category, setCategory] = useState('general');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) {
            toast.error('Please fill in both the title and content.');
            return;
        }

        setIsSubmitting(true);
        try {
            await api.createForumTopic({
                title,
                content,
                author_name: currentUser.name,
                author_id: currentUser.id,
                school_id: currentUser.schoolId,
                author_avatar_url: currentUser.avatarUrl,
                last_activity: new Date().toISOString(),
                post_count: 0
            });

            toast.success('Topic posted successfully!');
            setTitle('');
            setContent('');
            onTopicCreated?.();
            handleBack?.();
        } catch (error) {
            console.error('Error submitting topic:', error);
            toast.error('Failed to create topic. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const categories = [
        { id: 'general', label: '💬 General Discussion', color: 'bg-blue-50 border-blue-200 text-blue-700' },
        { id: 'curriculum', label: '📚 Curriculum & Lesson', color: 'bg-purple-50 border-purple-200 text-purple-700' },
        { id: 'events', label: '🎉 Events & Activities', color: 'bg-green-50 border-green-200 text-green-700' },
        { id: 'help', label: '🆘 Help & Support', color: 'bg-orange-50 border-orange-200 text-orange-700' },
    ];

    return (
        <div className="min-h-full bg-gray-50 pb-24">
            {/* Header */}
            <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
                <div className="max-w-2xl mx-auto px-4 py-4 flex items-center space-x-4">
                    <button
                        onClick={handleBack}
                        className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-gray-900">Create New Topic</h1>
                        <p className="text-xs text-gray-500">Share your thoughts with the teacher community</p>
                    </div>
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-4 py-6">
                {/* Author Preview */}
                <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6 flex items-center space-x-3 shadow-sm">
                    {currentUser.avatarUrl ? (
                        <img src={currentUser.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                            <span className="text-purple-600 font-bold text-sm">{currentUser.name?.charAt(0) || 'T'}</span>
                        </div>
                    )}
                    <div>
                        <p className="font-semibold text-gray-800 text-sm">{currentUser.name || 'Teacher'}</p>
                        <p className="text-xs text-gray-400">Posting as yourself</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Category Selection */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">Category</label>
                        <div className="grid grid-cols-2 gap-2">
                            {categories.map(cat => (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => setCategory(cat.id)}
                                    className={`px-3 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${category === cat.id
                                            ? `${cat.color} ring-2 ring-offset-1 ring-purple-300 scale-[1.02]`
                                            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                                        }`}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Topic Title */}
                    <div>
                        <label htmlFor="topic-title" className="block text-sm font-semibold text-gray-700 mb-2">
                            Topic Title <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            id="topic-title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-gray-800 font-medium focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none transition-all placeholder-gray-400"
                            placeholder="e.g., Ideas for Science Fair 2026"
                            required
                            maxLength={120}
                        />
                        <p className="text-xs text-gray-400 mt-1 text-right">{title.length}/120</p>
                    </div>

                    {/* Content */}
                    <div>
                        <label htmlFor="topic-content" className="block text-sm font-semibold text-gray-700 mb-2">
                            Your Post <span className="text-red-400">*</span>
                        </label>
                        <textarea
                            id="topic-content"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-gray-800 focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none transition-all placeholder-gray-400 resize-none"
                            placeholder="Share your ideas, questions, or start a discussion..."
                            required
                            rows={8}
                        />
                        <p className="text-xs text-gray-400 mt-1 text-right">{content.length} characters</p>
                    </div>

                    {/* Submit Buttons */}
                    <div className="flex items-center space-x-3 pt-2">
                        <button
                            type="button"
                            onClick={handleBack}
                            className="flex-1 py-3.5 px-6 text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !title.trim() || !content.trim()}
                            className="flex-1 py-3.5 px-6 text-sm font-semibold text-white bg-purple-600 rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-purple-100 flex items-center justify-center"
                        >
                            {isSubmitting ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Posting...
                                </>
                            ) : '🚀 Post Topic'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateForumTopicScreen;
