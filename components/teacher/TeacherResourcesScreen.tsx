import React from 'react';
import { BookOpenIcon, SparklesIcon, UserGroupIcon, GameControllerIcon } from '../../constants';

interface TeacherResourcesScreenProps {
    navigateTo: (view: string, title: string, props?: any) => void;
}

const ResourceCard: React.FC<{ title: string, description: string, icon: React.ReactNode, onClick: () => void, color: string }> = ({ title, description, icon, onClick, color }) => (
    <button onClick={onClick} className={`w-full text-left p-6 rounded-2xl shadow-lg transition-transform transform hover:-translate-y-1 ${color}`}>
        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">{icon}</div>
        <h3 className="font-bold text-xl text-white">{title}</h3>
        <p className="text-sm text-white/80 mt-1">{description}</p>
    </button>
);


const TeacherResourcesScreen: React.FC<TeacherResourcesScreenProps> = ({ navigateTo }) => {
    const resources = [
        { 
            title: "AI Lesson Planner", 
            description: "Generate schemes, lesson plans, and assessments.",
            icon: <SparklesIcon className="w-7 h-7 text-white"/>,
            color: "bg-gradient-to-br from-purple-500 to-indigo-600",
            action: () => navigateTo('lessonPlanner', 'AI Lesson Planner', {}) 
        },
        { 
            title: "E-Learning Library", 
            description: "Access videos, PDFs, and shared resources.",
            icon: <BookOpenIcon className="w-7 h-7 text-white"/>,
            color: "bg-gradient-to-br from-sky-500 to-blue-600",
            action: () => navigateTo('library', 'E-Learning Library', {}) 
        },
        { 
            title: "Collaboration Forum", 
            description: "Share ideas and strategies with other teachers.",
            icon: <UserGroupIcon className="w-7 h-7 text-white"/>,
            color: "bg-gradient-to-br from-teal-500 to-green-600",
            action: () => navigateTo('collaborationForum', 'Collaboration Forum', {}) 
        },
        { 
            title: "Educational Games", 
            description: "Find and create games for your students.",
            icon: <GameControllerIcon className="w-7 h-7 text-white"/>,
            color: "bg-gradient-to-br from-amber-500 to-orange-600",
            action: () => navigateTo('educationalGames', 'Educational Games', {}) 
        },
    ];

    return (
        <div className="p-4 space-y-4 bg-gray-100 h-full overflow-y-auto">
            {resources.map(res => (
                <ResourceCard 
                    key={res.title}
                    title={res.title}
                    description={res.description}
                    icon={res.icon}
                    onClick={res.action}
                    color={res.color}
                />
            ))}
        </div>
    );
};

export default TeacherResourcesScreen;
