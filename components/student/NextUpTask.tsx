import React from 'react';
import { motion } from 'framer-motion';
import { Clock, BookOpen, ChevronRight } from 'lucide-react';

interface TaskProps {
    title: string;
    subject: string;
    dueDate: string;
    timeRemaining: string;
    type: 'assignment' | 'quiz' | 'lesson';
    onClick: () => void;
}

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
    type,
    onClick
}) => {
    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className="cursor-pointer bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-6 text-white shadow-xl overflow-hidden relative"
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
                <div className="px-2 py-0.5 bg-red-400/30 rounded text-red-100 font-semibold text-xs">
                    {timeRemaining} left
                </div>
            </div>

            <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-4">
                <span className="text-sm font-medium opacity-80">
                    {type === 'assignment' ? 'Submit Work' : type === 'quiz' ? 'Start Quiz' : 'View Lesson'}
                </span>
                <ChevronRight className="w-5 h-5 opacity-80" />
            </div>
        </motion.div>
    );
};
