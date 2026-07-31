import React from 'react';
import { motion } from 'framer-motion';
import { Clock, BookOpen, ChevronRight } from 'lucide-react';

interface TaskProps {
    title: string;
    subject: string;
    dueDate: string;
    timeRemaining: string;
    daysLeft?: number;
    type: 'assignment' | 'quiz' | 'lesson';
    onClick: () => void;
}

// Scale the urgency chip by how much time is actually left, so a task due
// in three weeks doesn't look as alarming as one due today (cry-wolf effect).
const getUrgencyClasses = (daysLeft?: number) => {
    if (daysLeft === undefined || daysLeft <= 1) return 'bg-red-400/30 text-red-100';
    if (daysLeft <= 3) return 'bg-amber-400/30 text-amber-100';
    return 'bg-white/15 text-purple-50';
};

/**
 * NextUpTask - Focused hero card for students.
 * Implements "Progressive Information Disclosure" by highlighting 
 * only the most immediate and relevant task.
 */
export const NextUpTask: React.FC<TaskProps> = ({
    title,
    subject,
    dueDate,
    timeRemaining,
    daysLeft,
    type,
    onClick
}) => {
    return (
        <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            whileHover={{ scale: 1.02, boxShadow: '0 20px 40px -12px rgba(79, 70, 229, 0.45)' }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className="group w-full text-left cursor-pointer bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-6 text-white shadow-xl overflow-hidden relative focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-300"
        >
            {/* Background Decorative Element */}
            <div className="absolute -right-8 -bottom-8 bg-white/10 w-40 h-40 rounded-full blur-3xl" />
            
            <div className="flex justify-between items-start mb-4">
                <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-medium uppercase tracking-wider">
                    Next Priority
                </span>
                <div className="bg-white/10 p-2 rounded-xl">
                    <BookOpen className="w-5 h-5" />
                </div>
            </div>

            <div className="mb-6">
                <p className="text-purple-100 text-sm font-medium mb-1">{subject}</p>
                <h2 className="text-2xl font-bold leading-tight">{title}</h2>
            </div>

            <div className="flex items-center gap-4 text-sm text-purple-50">
                <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    <span>Due {dueDate}</span>
                </div>
                <div className={`px-2 py-0.5 rounded font-semibold text-xs ${getUrgencyClasses(daysLeft)}`}>
                    {timeRemaining} left
                </div>
            </div>

            <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-4">
                <span className="text-sm font-medium opacity-80">
                    {type === 'assignment' ? 'Submit Work' : type === 'quiz' ? 'Start Quiz' : 'View Lesson'}
                </span>
                <ChevronRight className="w-5 h-5 opacity-80 transition-transform duration-200 group-hover:translate-x-1" />
            </div>
        </motion.button>
    );
};
